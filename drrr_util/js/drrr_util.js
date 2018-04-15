"use strict";
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
(function (XHR_proto, console, Notification) {
    'use strict';
    /**
    * Global variables
    **/
    let ROOM;
    /**
    * Constants
    **/
    const CONFIG = Object.freeze({
        is_hover_data: true,
        is_autoban: true,
        is_notify: false,
        is_talk_info: true,
        theme: 'default',
        notify_triggers: [''],
        autoban: {
            kick: {
                id: ['1'],
                names: ['getkicked'],
                msg: ['kickme']
            },
            ban: {
                id: ['1'],
                names: ['getbanned'],
                msg: ['banme']
            }
        }
    });
    const THEME_URL = Object.freeze({
        greyscale: 'https://cdn.rawgit.com/nishinishi9999/utils/0a863f1b/drrr_util/css/greyscale.css'
    });
    /**
    * Classes
    **/
    class Room {
        constructor() {
            this.host = '';
            this.talks = {};
            this.users = {};
            this.flags = { HAS_LOADED: false };
            this.themes = {
                'default': '',
                'greyscale': ''
            };
        }
        // Hook outcoming requests
        hook_send(callback) {
            const _send = XHR_proto.send;
            XHR_proto.send = function (body) {
                const _body = callback(body);
                _send.call(this, _body);
            };
        }
        // Hook completed requests
        hook_response(callback) {
            $.ajaxSetup({
                'complete': (xhr) => //(xhr, status)
                 callback(xhr.responseXML.children[0]) // <Room>
            });
        }
        own_name() {
            return $('.profname').text();
        }
        own_id() {
            const name = this.own_name();
            const index = Object.keys(this.users).find((id) => this.users[id].name === name);
            switch (index !== undefined) {
                case true: return this.users[index].id;
                default: throw Error('User not found.');
            }
        }
        // Set new host (just locally)
        set_host(_host) {
            const _xml = new XMLUtil(_host[0]);
            this.host = _xml.text();
        }
        // Format and get new users
        get_users(users) {
            const new_users = [];
            for (let i = 0; i < users.length; i++) {
                const user = new User(users[i]);
                if (!user.is_registered())
                    new_users.push(user);
            }
            return new_users;
        }
        // Format and get new talks
        get_talks(talks) {
            const new_talks = [];
            for (let i = 0; i < talks.length; i++) {
                const talk = new Talk(talks[i]);
                if (!talk.is_registered())
                    new_talks.push(talk);
            }
            return new_talks;
        }
        is_flag(flag) {
            return this.flags[flag];
        }
        set_flag(flag) {
            this.flags[flag] = true;
        }
        send_message(msg) {
            const url = 'http://drrrkari.com/room/?ajax=1';
            const _msg = msg.split(' ').join('+');
            $.post(url, { valid: 1, message: _msg });
            /*
                .done  ( (data) => console.log('Message success:', data) )
                .fail  ( (err)  => console.error('Couldn\'t send message:', err) )
                .always( ()     => console.log('Message sent:', msg) );
            */
        }
        // Inject a CSS JSON into the page
        inject_css(url) {
            const style = $(document.createElement('LINK'))
                .attr('rel', 'stylesheet')
                .attr('type', 'text/css')
                .attr('href', url);
            $('head').append(style);
        }
        set_theme(theme) {
            this.inject_css(THEME_URL[theme]);
        }
        // Convert epoch timestamps to locale time
        epoch_to_time(time) {
            const s = 1000;
            return (new Date(time * s))
                .toLocaleTimeString();
        }
        // Send a notification (untested on chrome)
        send_notification(title, options) {
            switch (Notification.permission) {
                case 'granted': {
                    new Notification(title, options);
                    break;
                }
                case 'default': {
                    Notification.requestPermission((permission) => {
                        if (permission === 'granted')
                            new Notification(title, options);
                    });
                    break;
                }
                default: throw Error(`Can't send notification: ${Notification.permission}`);
            }
        }
        autoban(talks, users) {
            const kick_list = CONFIG.autoban.kick;
            const ban_list = CONFIG.autoban.ban;
            talks.forEach((talk) => {
                // By message
                if (kick_list.msg.includes(talk.message))
                    ROOM.users[talk.uid].kick();
                else if (ban_list.msg.includes(talk.message))
                    ROOM.users[talk.uid].ban();
            });
            users.forEach((user) => {
                // By uid
                if (kick_list.id.includes(user.id))
                    user.kick();
                else if (ban_list.id.includes(user.id))
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
        constructor(xml) {
            this.xml = xml;
        }
        // Get the text content of a XML node
        text() {
            return this.xml.textContent;
        }
        // Get the text content of a XML's child node
        child_text(t_nodeName) {
            for (let i = 0; i < this.xml.children.length; i++) {
                if (this.xml.children[i].nodeName === t_nodeName) {
                    const _xml = new XMLUtil(this.xml.children[i]);
                    return _xml.text();
                }
            }
            return '';
        }
        // Filter XML children by nodeName
        filter_children(t_nodeName) {
            const filtered = [];
            for (let i = 0; i < this.xml.children.length; i++) {
                if (this.xml.children[i].nodeName === t_nodeName) {
                    filtered.push(this.xml.children[i]);
                }
            }
            return filtered;
        }
    }
    class Talk {
        constructor(xml) {
            const _xml = new XMLUtil(xml);
            this.id = _xml.child_text('id');
            this.type = _xml.child_text('type');
            this.uid = _xml.child_text('uid');
            this.encip = _xml.child_text('encip');
            this.name = _xml.child_text('name');
            this.message = _xml.child_text('message');
            this.icon = _xml.child_text('icon');
            this.time = parseInt(_xml.child_text('time'));
            this.el = $('#' + _xml.child_text('id'));
        }
        has_trigger() {
            return CONFIG.notify_triggers.includes(this.message);
        }
        // IO
        has_own_name() {
            return !!this.message.match(ROOM.own_name());
        }
        // IO
        is_mine() {
            return this.name === ROOM.own_name();
        }
        // IO
        is_registered() {
            return ROOM.talks[this.id] !== undefined;
        }
        // IO
        // Search for a match for notify()
        try_notify() {
            if (this.has_trigger())
                this.notify();
        }
        // IO
        notify() {
            const icon_url = 'http://drrrkari.com/css/icon_girl.png'; // Fixed ATM
            const title = this.name;
            const options = {
                icon: icon_url,
                body: this.message
            };
            ROOM.send_notification(title, options);
        }
        // IO
        print_info() {
            console.log();
            console.log(this.message);
            console.log('ID', this.id);
            console.log('UID', this.uid);
            console.log('TIME', ROOM.epoch_to_time(this.time));
            console.log();
        }
        // IO
        append_hover_data() {
            const icon_el = $(this.el.children()[0]);
            /*
            Unimplemented
            
            let tooltip = $( document.createElement('DIV') )
                .addClass('talk-tooltip')
                .text(this.uid);
            */
            icon_el.on('click', () => {
                console.log(this.message);
                console.log('ID', this.id);
                console.log('UID', this.uid);
                console.log('TIME', ROOM.epoch_to_time(this.time));
                console.log();
            });
        }
        // IO
        register() {
            ROOM.talks[this.id] = this;
        }
    }
    class User {
        constructor(xml) {
            const _xml = new XMLUtil(xml);
            this.name = _xml.child_text('name');
            this.id = _xml.child_text('id');
            this.icon = _xml.child_text('icon');
            this.trip = _xml.child_text('trip');
            this.update = parseFloat(_xml.child_text('update'));
        }
        is_registered() {
            return ROOM.users[this.id] !== undefined;
        }
        ignore() {
            // Unimplemented
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
    function on_send(body) {
        switch (body === null) {
            case true: return null;
            default: {
                console.log('SEND', body);
                return body;
            }
        }
    }
    // Triggered on request completion
    function on_response(xml_room) {
        //console.log('RESPONSE', xml_room);
        //console.log(ROOM);
        const xml = new XMLUtil(xml_room);
        // Register new entries
        ROOM.set_host(xml.filter_children('host'));
        const new_users = ROOM.get_users(xml.filter_children('users'));
        const new_talks = ROOM.get_talks(xml.filter_children('talks'));
        new_talks.forEach((talk) => talk.register());
        new_users.forEach((user) => user.register());
        // Send to handlers
        if (ROOM.is_flag('HAS_LOADED')) {
            if (new_talks.length !== 0) {
                if (CONFIG.is_autoban)
                    ROOM.autoban(new_talks, new_users);
                handle_talks(new_talks);
            }
            if (new_users.length !== 0) {
                handle_users(new_users);
            }
        }
        else {
            ROOM.set_flag('HAS_LOADED');
        }
    }
    // Handle new talks
    function handle_talks(talks) {
        console.log('TALKS', talks);
        console.log(ROOM.own_id());
        console.log(talks[0].id);
        if (CONFIG.is_talk_info)
            talks.forEach((talk) => talk.print_info());
        if (CONFIG.is_notify && talks[0].uid !== ROOM.own_id())
            talks[0].notify();
    }
    // Handle new users
    function handle_users(users) {
        console.log('USERS', users);
    }
    function main() {
        ROOM = new Room();
        ROOM.hook_send(on_send);
        ROOM.hook_response(on_response);
        //setTimeout( () => ROOM.send_message('test'), 2000 );
        if (CONFIG.theme !== 'default')
            ROOM.set_theme(CONFIG.theme);
        console.log('LOAD END');
    }
    main();
})(XMLHttpRequest.prototype, console, Notification);
