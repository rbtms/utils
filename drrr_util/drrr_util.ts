// ==UserScript==
// @name         DrrrUtil.js
// @namespace    DrrrUtil
// @version      0.1.5
// @description  Multiple utilities for Drrr Chat
// @author       nishinishi9999
// @match        http://drrrkari.com/room/
// @license      GPL-3.0
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/1.7.1/jquery.js
// @grant        none
// ==/UserScript==


/**
* TODO
*
* - User update is not updated each request
* - Remove users when they leave or overwrite ROOM.users on each request
* - Put a limit to notifications
* - Notifications appearing on the top right of the screen sometimes?
* - Remove spaces on notifications
*
**/

/*
interface NotificationOptions {
    icon :string;
    body :string;
}
*/



(function(XHR_proto, console, Notification) {
    'use strict';
    
    /**
    * Global variables
    **/
    let ROOM :Room;
    
    /**
    * Constants
    **/
    const CONFIG = Object.freeze({
        is_hover_data : true,
        is_autoban    : true,
        is_notify     : false,
        is_talk_info  : true,
        theme         : 'default',
        
        notify_triggers: [''],
        
        autoban: {
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
        }
    });
    
    const THEME_URL :{ [propName :string] :string } = Object.freeze({
        greyscale: 'https://cdn.rawgit.com/nishinishi9999/utils/0a863f1b/drrr_util/css/greyscale.css'
    });
    
    
    /**
    * Classes
    **/
    class Room {
        public host  :string;
        public talks :{ [propName :string] :Talk };
        public users :{ [propName :string] :User };

        public themes :any;
        
        private flags :{
            [propName :string] :boolean;
        };
        
        
        constructor() {
            this.host  = '';
            this.talks = {};
            this.users = {};
            
            this.flags = { HAS_LOADED: false };
            this.themes = {
                'default'  : '',
                'greyscale': ''
            };
        }
        
        // Hook outcoming requests
        public hook_send(callback :(body :any) => any) :void {
            const _send = XHR_proto.send;
    
            XHR_proto.send = function(body :any) {
                const _body = callback(body);
    
                _send.call(this, _body);
            };
        }

        // Hook completed requests
        public hook_response(callback :(xhr_room :any) => void) :void {
            $.ajaxSetup({
                'complete': (xhr :any) => //(xhr, status)
                    callback( xhr.responseXML.children[0] ) // <Room>
            });
        }

        public own_name() :string {
            return $('.profname').text();
        }
        
        public own_id() :string {
            const name  = this.own_name();
            const index = Object.keys(this.users).find( (id) =>
                this.users[id].name === name
            );
            
            switch(index !== undefined) {
                case true : return this.users[index].id;
                default   : throw Error('User not found.');
            }
        }

        // Set new host (just locally)
        public set_host(_host :any) :void {
            const _xml = new XMLUtil(_host[0]);
            
            this.host = _xml.text();
        }

        // Format and get new users
        public get_users(users :any) :User[] {
            const new_users = [];
            
            for(let i = 0; i < users.length; i++) {
                const user = new User(users[i]);
                
                if( !user.is_registered() )
                    new_users.push(user);
            }
            
            return new_users;
        }
        
        // Format and get new talks
        public get_talks(talks :any) :Talk[] {
            const new_talks = [];

            for(let i = 0; i < talks.length; i++) {
                const talk = new Talk(talks[i]);
                
                if( !talk.is_registered() )
                    new_talks.push(talk);
            }

            return new_talks;
        }
        
        public is_flag(flag :string) :boolean {
            return this.flags[flag];
        }
        
        public set_flag(flag :string) :void {
            this.flags[flag] = true;
        }
        
        public send_message(msg :string) :void {
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
        public inject_css(url :string) :void {
            const style = $( document.createElement('LINK') )
                .attr('rel', 'stylesheet')
                .attr('type', 'text/css')
                .attr('href', url);
            
            $('head').append(style);
        }
        
        public set_theme(theme :string) :void {
            this.inject_css( THEME_URL[theme] );
        }

        // Convert epoch timestamps to locale time
        public epoch_to_time(time :number) :string {
            const s = 1000;
            
            return (new Date( time*s ))
                .toLocaleTimeString();
        }

        // Send a notification (untested on chrome)
        public send_notification(title :string, options :any) :void {
            switch(Notification.permission) {
                case 'granted': {
                    new Notification(title, options);
                    
                    break;
                }
                case 'default': {
                    Notification.requestPermission( (permission) => {
                        if (permission === 'granted')
                            new Notification(title, options);
                    });
                    
                    break;
                }
                default: throw Error(`Can't send notification: ${Notification.permission}`);
            }
        }
    
        public autoban(talks :Talk[], users :User[]) :void {
            const kick_list = CONFIG.autoban.kick;
            const ban_list  = CONFIG.autoban.ban;
            
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
        private xml :any;
        
        constructor(xml :any) {
            this.xml = xml;
        }
        
        // Get the text content of a XML node
        public text() :string {
            return this.xml.textContent;
        }

        // Get the text content of a XML's child node
        public child_text(t_nodeName :string) :string {
            for(let i = 0; i < this.xml.children.length; i++) {
                if(this.xml.children[i].nodeName === t_nodeName) {
                    const _xml = new XMLUtil(this.xml.children[i]);
                    
                    return _xml.text();
                }
            }

            return '';
        }
    
        // Filter XML children by nodeName
        public filter_children(t_nodeName :string) :any[] {
            const filtered = [];
        
            for(let i = 0; i < this.xml.children.length; i++) {
                if(this.xml.children[i].nodeName === t_nodeName) {
                    filtered.push(this.xml.children[i]);
                }
            }
    
            return filtered;
        }
    }
    
    class Talk {
        public id      :string;
        public type    :string;
        public uid     :string;
        public encip   :string;
        public name    :string;
        public message :string;
        public icon    :string;
        public time    :number;
        private el     :any;
        
        constructor(xml :any) {
            const _xml = new XMLUtil(xml);
            
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
        
        public has_trigger() :boolean {
            return CONFIG.notify_triggers.includes( this.message );
        }
        
        // IO
        public has_own_name() :boolean {
            return !!this.message.match( ROOM.own_name() );
        }
        
        // IO
        public is_mine() :boolean {
            return this.name === ROOM.own_name();
        }
        
        // IO
        public is_registered() :boolean {
            return ROOM.talks[this.id] !== undefined;
        }

        // IO
        // Search for a match for notify()
        public try_notify() :void {
           if( this.has_trigger() )
               this.notify();
        }
        
        // IO
        public notify() :void {
            const icon_url = 'http://drrrkari.com/css/icon_girl.png'; // Fixed ATM
            const title    = this.name;
            
            const options = {
                icon: icon_url,
                body: this.message
            };
            
            ROOM.send_notification(title, options);
        }

        // IO
        public print_info() :void {
            console.log();
            console.log(this.message);
            console.log('ID',   this.id);
            console.log('UID',  this.uid);
            console.log('TIME', ROOM.epoch_to_time(this.time));
            console.log();
        }
        
        // IO
        public append_hover_data() :void {
            const icon_el = $(this.el.children()[0]);
            
            /*
            Unimplemented
            
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
        public register() :void {
            ROOM.talks[this.id] = this;
        }
    }
    
    class User {
        public name   :string;
        public id     :string;
        public icon   :string;
        public trip   :string;
        public update :number;
        
        constructor(xml :any) {
            const _xml = new XMLUtil(xml);
            
            this.name   = _xml.child_text('name');
            this.id     = _xml.child_text('id');
            this.icon   = _xml.child_text('icon');
            this.trip   = _xml.child_text('trip');
            this.update = parseFloat( _xml.child_text('update') );
        }
        
        public is_registered() :boolean {
            return ROOM.users[ this.id ] !== undefined;
        }
        
        public ignore() {
            // Unimplemented
        }
        
        public kick() {
            // Unimplemented
        }
        
        public ban() {
            // Unimplemented
        }
        
        // Unsafe!
        public register() {
            ROOM.users[this.id] = this;
        }
    }
    
    
    /**
    * Handlers
    **/
    
    // Triggered before send
    function on_send(body :string | null) :string | null {
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
        const xml = new XMLUtil(xml_room);
        
        // Register new entries
        ROOM.set_host( xml.filter_children('host')  );
        
        const new_users = ROOM.get_users( xml.filter_children('users') );
        const new_talks = ROOM.get_talks( xml.filter_children('talks') );
        
        new_talks.forEach( (talk) => talk.register() );
        new_users.forEach( (user) => user.register() );
        
        
        // Send to handlers
        if( ROOM.is_flag('HAS_LOADED') ) {
            if(new_talks.length !== 0)　{
                if(CONFIG.is_autoban)
                    ROOM.autoban(new_talks, new_users);
                
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
        
        if(CONFIG.is_talk_info)
            talks.forEach( (talk) => talk.print_info() );
        
        if( CONFIG.is_notify && talks[0].uid !== ROOM.own_id() )
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
        
        if(CONFIG.theme !== 'default')
            ROOM.set_theme(CONFIG.theme);

        console.log('LOAD END');
    }
    
    
    main();
})(XMLHttpRequest.prototype, console, Notification);
