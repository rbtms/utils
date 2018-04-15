// ==UserScript==
// @name         DrrrUtil.js
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Multiple utilities for Drrr Chat
// @author       nishinishi9999
// @match        http://drrrkari.com/room/
// @grant        none
// ==/UserScript==


/**
* TODO
*
* - User update is not updated each request
* - Remove users when they leave or overwrite ROOM.users on each request
* - Put a limit to notifications
* - Notifications appearing on the top right of the screen sometimes?
*
**/

/*
interface NotificationOptions {
    icon :string;
    body :string;
}
*/


(function($, XHR_proto, _Notification) {
    'use strict';
    
    /**
    * Global variables
    **/
    let ROOM :Room;
    
    
    /**
    * Namespaces
    **/
    namespace Config {
        export const is_hover_data = true;
        export const is_autoban    = true;
        export const is_notify     = true;
        export const is_talk_info  = true;
        
        export const notify_triggers = [''];
        
        export const autoban = {
            kick: {
                id   : ['1'],
                names: ['getkicked'],
                msg  : ['kickme']
            },
            ban: {
                id   : ['1'],
                names: ['getbanned'],
                msg  : ['banme']
            }
        };
    }
    
    
    /**
    * Classes
    **/
    class Room {
        host  :string;
        talks :{ [propName :string] :Talk };
        users :{ [propName :string] :User };

        //this.style :any;
        
        flags :{
            [propName :string] :boolean;
        }
        
        
        constructor() {
            this.host  = '';
            this.talks = {};
            this.users = {};
            
            this.flags = { HAS_LOADED: false };
        }
        
        // Hook outcoming requests
        hook_send(callback :(body :any) => any) :void {
            const _send = XHR_proto.send;
    
            XHR_proto.send = function(body :any) {
                const _body = callback(body);
    
                _send.call(this, _body);
            };
        }

        // Hook completed requests
        hook_response(callback :(xhr_room :any) => void) :void {
            $.ajaxSetup({
                'complete': (xhr :any, status :any) =>
                    callback( xhr.responseXML.children[0] ) // <Room>
            });
        }

        own_name() :string {
            return $('.profname').text();
        }
        
        own_id() :string {
            const name = this.own_name();
            
            return this.users[ Object.keys(this.users).find( (id) =>
                this.users[id].name === name
            ) ].id || 'null';
        }

        // Set new host (just locally)
        set_host(_host :any) :void {
            let _xml = new XMLUtil(_host[0]);
            
            this.host = _xml.text();
        }

        // Format and get new users
        get_users(users :any) :User[] {
            let new_users = [];
            
            for(let i = 0; i < users.length; i++) {
                let user = new User(users[i]);
                
                if( !user.is_registered() )
                    new_users.push(user);
            }
            
            return new_users;
        }
        
        // Format and get new talks
        get_talks(talks :any) :Talk[] {
            let new_talks = [];

            for(let i = 0; i < talks.length; i++) {
                let talk = new Talk(talks[i]);

                if( !talk.is_registered() ) {
                    new_talks.push(talk);
                }
            }

            return new_talks;
        }
        
        is_flag(flag :string) :boolean {
            return this.flags[flag];
        }
        
        set_flag(flag :string) :void {
            this.flags[flag] = true;
        }
        
        send_message(msg :string) :void {
            const url  = 'http://drrrkari.com/room/?ajax=1';
            const _msg = msg.split(' ').join('+');
            
            $.post(url, { valid: 1, message: _msg });
            /*
                .done  ( (data) => console.log('Message success:', data) )
                .fail  ( (err)  => console.error('Couldn\'t send message:', err) )
                .always( ()     => console.log('Message sent:', msg) );
            */
        }

        // Inject a CSS JSON into the page
        inject_css(css :any) :void {
            // Unimplemented
        }

        // Convert epoch timestamps to locale time
        epoch_to_time(time :number) :string {
            return (new Date( time*1000 ))
                .toLocaleTimeString();
        }

        // Send a notification (untested on chrome)
        send_notification(title :string, options :NotificationOptions) :void {
            if(_Notification.permission === 'granted') {
                new _Notification(title, options);
            }
            else if (Notification.permission === "default") {
                _Notification.requestPermission( (permission) => {
                    if (permission === "granted")
                        new _Notification(title, options);
                });
            }
            else {
                console.error('Can\'t send notification: ' + _Notification.permission);
            }
        }
    
        autoban(talks :Talk[], users :User[]) :void {
            let kick_list = Config.autoban.kick;
            let ban_list  = Config.autoban.ban;
            
            talks.forEach( (talk) => {
                // By message
                if( kick_list.msg.includes(talk.message) )
                    ROOM.users[ talk.uid ].kick();
                else if( ban_list.msg.includes(talk.message) )
                    ROOM.users[ talk.uid ].ban();
            });
            
            users.forEach( (user) => {
                // By uid
                if( kick_list.id.includes(user.id) )
                    user.kick();
                else if( ban_list.id.includes(user.id) )
                    user.ban();
                
                //// By name (change to regex matching)
                /*
                else if( kick_list.name.includes(talk.message) )
                    user.kick();
                else if( ban_list.name.includes(talk.message) )
                    user.ban();
                */
            });
        }
    }
    
    class XMLUtil {
        xml :any;
        
        constructor(xml :any) {
            this.xml = xml;
        }
        
        // Get the text content of a XML node
        text() :string {
            return this.xml.textContent;
        }

        // Get the text content of a XML's child node
        child_text(t_nodeName :string) :string {
            for(let i = 0; i < this.xml.children.length; i++) {
                if(this.xml.children[i].nodeName === t_nodeName) {
                    let _xml = new XMLUtil(this.xml.children[i]);
                    
                    return _xml.text();
                }
            }

            return '';
        }
    
        // Filter XML children by nodeName
        filter_children(t_nodeName :string) :any[] {
            let filtered = [];
        
            for(let i = 0; i < this.xml.children.length; i++) {
                if(this.xml.children[i].nodeName === t_nodeName) {
                    filtered.push(this.xml.children[i]);
                }
            }
    
            return filtered;
        }
    }
    
    class Talk {
        id      :string;
        type    :string;
        uid     :string;
        encip   :string;
        name    :string;
        message :string;
        icon    :string;
        time    :number;
        el      :any;
        
        constructor(xml :any) {
            let _xml = new XMLUtil(xml);
            
            this.id      = _xml.child_text('id');
            this.type    = _xml.child_text('type');
            this.uid     = _xml.child_text('uid');
            this.encip   = _xml.child_text('encip');
            this.name    = _xml.child_text('name');
            this.message = _xml.child_text('message');
            this.icon    = _xml.child_text('icon');
            this.time    = parseInt( _xml.child_text('time') );
            this.el      = $('#' + _xml.child_text('id'));
        }
        
        has_trigger() :boolean {
            return Config.notify_triggers.includes( this.message );
        }
        
        // IO
        has_own_name() :boolean {
            return !!this.message.match( ROOM.own_name() );
        }
        
        // IO
        is_mine() :boolean {
            return this.name === ROOM.own_name();
        }
        
        // IO
        is_registered() :boolean {
            return ROOM.talks[this.id] !== undefined;
        }

        // IO
        // Search for a match for notify()
        try_notify() :void {
           if( this.has_trigger() )
               this.notify();
        }
        
        // IO
        notify() :void {
            const icon_url = 'http://drrrkari.com/css/icon_girl.png'; // Fixed ATM
            const title    = this.name;
            
            let options = {
                icon: icon_url,
                body: this.message
            }
            
            ROOM.send_notification(title, options);
        }

        // IO
        print_info() :void {
            console.log(this.message);
            console.log('ID',   this.id);
            console.log('UID',  this.uid);
            console.log('TIME', ROOM.epoch_to_time(this.time));
            console.log();
        }
        
        // IO
        append_hover_data() :void {
            let icon_el = $(this.el.children()[0]);
            
            /*
            let tooltip = $( document.createElement('DIV') )
                .addClass('talk-tooltip')
                .text(this.uid);
            */
            
            icon_el.on('click', () => {
                console.log(this.message);
                console.log('ID',   this.id);
                console.log('UID',  this.uid);
                console.log('TIME', ROOM.epoch_to_time(this.time));
                console.log();
            });
        }
        
        // IO
        register() :void {
            ROOM.talks[this.id] = this;
        }
    }
    
    class User {
        name   :string;
        id     :string;
        icon   :string;
        trip   :string;
        update :number;
        
        constructor(xml :any) {
            let _xml = new XMLUtil(xml);
            
            this.name   = _xml.child_text('name');
            this.id     = _xml.child_text('id');
            this.icon   = _xml.child_text('icon');
            this.trip   = _xml.child_text('trip');
            this.update = parseFloat( _xml.child_text('update') );
        }
        
        is_registered() :boolean {
            return ROOM.users[ this.id ] !== undefined;
        }
        
        kick() {
            // Unimplemented
        }
        
        ban() {
            // Unimplemented
        }
        
        // Unsafe!
        register() {
            ROOM.users[this.id] = this;
        }
    }
    
    
    /**
    * Handlers
    **/
    
    // Triggered before send
    function on_send(body :string) :string | null {
        switch(body === null) {
            case true: return null;
            default: {
                console.log('SEND', body);

                return body;
            }
        }
    }
    
    // Triggered on request completion
    function on_response(xml_room :any) :void {
        //console.log('RESPONSE', xml_room);
        //console.log(ROOM);
        let xml = new XMLUtil(xml_room);
        
        // Register new entries
        ROOM.set_host( xml.filter_children('host')  );
        
        let new_users = ROOM.get_users( xml.filter_children('users') );
        let new_talks = ROOM.get_talks( xml.filter_children('talks') );
        
        new_talks.forEach( (talk) => talk.register() );
        new_users.forEach( (user) => user.register() );
        
        
        // Send to handlers
        if( ROOM.is_flag('HAS_LOADED') ) {
            if(new_talks.length !== 0)　{
                if(Config.is_autoban)
                    ROOM.autoban(new_talks, new_users);
                
                if(Config.is_notify)
                    new_talks.forEach( (talk) => talk.try_notify() );
                
                if(Config.is_talk_info)
                    new_talks.forEach( (talk) => talk.print_info() );
                
                handle_talks(new_talks);
            }

            if(new_users.length !== 0) {
                handle_users(new_users);
            }
        }
        else {
            ROOM.set_flag('HAS_LOADED');
        }
    }
    
    // Handle new talks
    function handle_talks(talks :Talk[]) :void {
        console.log('TALKS', talks);
        
        console.log( ROOM.own_id() );
        console.log( talks[0].id );
        
        if( talks[0].uid != ROOM.own_id() )
            talks[0].notify();
    }
    
    // Handle new users
    function handle_users(users :User[]) :void {
        console.log('USERS', users);
    }

    function main() :void {
        ROOM = new Room();
        
        ROOM.hook_send(on_send);
        ROOM.hook_response(on_response);
        
        //setTimeout( () => ROOM.send_message('test'), 2000 );
        //ROOM.inject_css();

        console.log('LOAD END');
    }
    
    
    main();
})(jQuery, XMLHttpRequest.prototype, Notification);
