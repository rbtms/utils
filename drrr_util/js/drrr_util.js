"use strict";
// ==UserScript==
// @name         DrrrUtil.js
// @namespace    https://github.com/nishinishi9999/utils/tree/master/drrr_util
// @version      0.1.6
// @description  Multiple utilities for Drrr Chat
// @author       nishinishi9999
// @match        http://drrrkari.com/room/
// @license      GPL-3.0
// @grant        none
// ==/UserScript==
// @require      https://cdnjs.cloudflare.com/ajax/libs/pouchdb/6.4.3/pouchdb.min.js
/**
* TODO
*
* - User update is not updated each request5
* - Put a limit to notifications
* - Limit notifications to appear on the bottom right part of the screen?
* - Remove spaces on notifications
* - Get each character image
* - Disable the function that copies the name to the comment field on click
* - Shorten user menu name
*
**/
var DrrrUtil;
(function (DrrrUtil) {
    'use strict';
    //console.log(pouchdb);
    /**
    * Global variables
    **/
    let ROOM;
    const CONFIG = {
        is_hover_menu: true,
        is_autoban: true,
        is_notify: true,
        is_talk_info: false,
        is_update_unread: true,
        theme: 'default',
        notify_triggers: ['notifyme'],
        autoban: {
            kick: {
                id: ['1'],
                name: ['getkicked'],
                msg: ['kickme']
            },
            ban: {
                id: ['1'],
                name: ['getbanned'],
                msg: ['banme']
            }
        }
    };
    /**
    * Constants
    **/
    const CSS_URL = Object.freeze({
        tooltip: 'https://cdn.rawgit.com/nishinishi9999/utils/7c0c1437/drrr_util/css/tooltip.css',
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
            this.unread = 0;
            this.flags = { HAS_LOADED: false };
        }
        // Hook outcoming requests
        hook_send(callback) {
            const _send = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.send = function (body) {
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
        // Getters / Setters
        set_host(id) {
            this.host = id;
        }
        get_host() {
            return this.host;
        }
        has_talk(id) {
            return this.talks[id] !== undefined;
        }
        register_talk(talk) {
            this.talks[talk.id] = talk;
        }
        talk(id) {
            return this.talks[id];
        }
        has_user(id) {
            return this.users[id] !== undefined;
        }
        register_user(user) {
            this.users[user.id] = user;
        }
        unregister_user(user) {
            delete this.users[user.id]; ////
        }
        user(id) {
            return this.users[id];
        }
        user_with_name(name) {
            const users = this.users;
            const user_id = Object.keys(this.users).find((id) => name === users[id].name);
            switch (user_id === undefined) {
                case true: return undefined;
                default: return users[user_id];
            }
        }
        increment_unread() {
            this.unread++;
            this.update_title(this.unread);
        }
        reset_unread() {
            this.unread = 0;
            this.update_title(this.unread);
        }
        is_flag(flag) {
            return this.flags[flag];
        }
        set_flag(flag) {
            this.flags[flag] = true;
        }
        is_tab_hidden() {
            return (document.hidden || document['webkitHidden'] || document['msHidden']);
        }
        update_title(n) {
            const room = this.room_name();
            switch (n === 0) {
                case true: {
                    document.title = room;
                    break;
                }
                default: {
                    document.title = `${room} (${n})`;
                }
            }
        }
        // Own name as displayed inside the room
        own_name() {
            return $('.profname').text();
        }
        // Own id
        own_id() {
            const name = this.own_name();
            const users = this.users;
            const index = Object.keys(this.users).find((id) => users[id].name === name);
            switch (index !== undefined) {
                case true: return users[index].id;
                default: throw Error('User not found.');
            }
        }
        room_name() {
            return $('#room_name').text().split(' ')[0];
        }
        user_n() {
            const n_str = $('#room_name').text().split(' ')[1];
            return n_str.substr(1, n_str.length - 2).split('/')
                .map((n) => parseInt(n));
        }
        // Send an ajax post request
        post(json) {
            const url = 'http://drrrkari.com/room/?ajax=1';
            const attr = Object.assign({ valid: 1 }, json);
            $.post(url, attr);
            /*
                .done  ( (data) => console.log('Message success:', data) )
                .fail  ( (err)  => console.error('Couldn\'t send message:', err) )
                .always( ()     => console.log('Message sent:', msg) );
            */
        }
        // Send a message
        send_message(msg) {
            const _msg = msg.split(' ').join('+');
            this.post({ message: _msg });
        }
        // Inject a link element with the given url
        inject_css(url) {
            const style = $(document.createElement('LINK'))
                .attr('rel', 'stylesheet')
                .attr('type', 'text/css')
                .attr('href', url);
            $('head').append(style);
        }
        // Load a css in the CSS_URL constant
        set_css(theme) {
            this.inject_css(CSS_URL[theme]);
        }
        // Set comment field
        set_cmt_field(str) {
            // Unimplemented
            str; ////
        }
        // Convert epoch timestamps to locale time
        epoch_to_time(time) {
            const s = 1000;
            return (new Date(time * s))
                .toLocaleTimeString();
        }
        // Send a notification (untested on chrome)
        send_notification(title, options) {
            const permission = Notification['permission'];
            switch (permission) {
                case 'granted': {
                    new Notification(title, options);
                    break;
                }
                case 'default': {
                    Notification.requestPermission((_permission) => {
                        if (_permission === 'granted') {
                            new Notification(title, options);
                        }
                    });
                    break;
                }
                default: throw Error(`Can't send notification: ${permission}`);
            }
        }
        append_config() {
            const { is_notify, is_autoban } = CONFIG;
            const hr = $($('#setting_pannel').children()[9]);
            const hr_el = document.createElement('HR');
            const autoban_el = $(document.createElement('DIV')).append($(document.createElement('LABEL')).attr('for', 'is_autoban').text('自動キック'), $(document.createElement('INPUT')).attr('type', 'checkbox').attr('id', 'is_autoban')
                .css('margin-left', '10px')
                .attr('checked', is_autoban)
                .on('click', (e) => {
                const target = e.target;
                console.log(target.checked);
            }), $(document.createElement('BUTTON')).text('設定')
                .css('margin-left', '10px')
                .css('margin-down', '5px')
                .width(40)
                .on('click', (e) => {
                console.log(e);
            }));
            const notify_el = $(document.createElement('DIV')).append($(document.createElement('LABEL')).attr('for', 'is_notify').text('通知'), $(document.createElement('INPUT')).attr('type', 'checkbox').attr('id', 'is_notify')
                .attr('checked', is_notify)
                .css('margin-left', '10px')
                .on('click', (e) => {
                const target = e.target;
                console.log(target.checked);
            }), $(document.createElement('BUTTON')).text('設定')
                .css('margin-left', '10px')
                .width(40));
            //const theme_el = document.createElement('DIV');
            hr.after(autoban_el, notify_el, hr_el, '<br>');
        }
        // Automatically kick or ban a user given the keywords on CONFIG.autoban
        autoban(talks, users) {
            const kick_list = CONFIG.autoban.kick;
            const ban_list = CONFIG.autoban.ban;
            for (const talk of talks) {
                // By message
                if (talk.msg_matches(kick_list.msg)) {
                    this.users[talk.uid].kick();
                    return true;
                }
                else if (talk.msg_matches(ban_list.msg)) {
                    this.users[talk.uid].ban();
                    return true;
                }
            }
            for (const user of users) {
                // By uid
                if (user.id_matches(kick_list.id)) {
                    user.kick();
                    return true;
                }
                else if (user.id_matches(ban_list.id)) {
                    user.ban();
                    return true;
                }
                else if (user.name_matches(kick_list.name)) {
                    user.kick();
                    return true;
                }
                else if (user.name_matches(ban_list.name)) {
                    user.ban();
                    return true;
                }
            }
            return false;
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
        get_host() {
            return this.child_text('host');
        }
        // Format and get new talks
        new_talks() {
            const talks = this.filter_children('talks');
            const new_talks = [];
            for (let i = 0; i < talks.length; i++) {
                const talk = new Talk(talks[i]);
                if (!talk.is_registered()) {
                    new_talks.push(talk);
                }
            }
            return new_talks;
        }
        // Format and get new users
        new_users() {
            const users = this.filter_children('users');
            const new_users = [];
            for (let i = 0; i < users.length; i++) {
                const user = new User(users[i]);
                if (!user.is_registered()) {
                    new_users.push(user);
                }
            }
            return new_users;
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
            //this.el      = $('#' + _xml.child_text('id'));
            this.icon_el = $($('#' + _xml.child_text('id')).children()[0]);
        }
        // Check if the message contains user's name
        has_own_name() {
            return !!this.message.match(ROOM.own_name());
        }
        // Check if the talk has been posted by the user
        is_me() {
            return this.uid === ROOM.own_id();
        }
        // Check if the talk has been registered in the room
        is_registered() {
            return ROOM.has_talk(this.id);
        }
        // Register the talk in the room
        register() {
            ROOM.register_talk(this);
        }
        // Check if the talk's message contains a trigger of CONFIG.notify_triggers
        has_trigger() {
            const msg = this.message;
            return CONFIG.notify_triggers.some((trigger) => {
                const regex = new RegExp(trigger, 'i');
                return regex.test(msg);
            });
        }
        // Match the message against a list of words
        msg_matches(list) {
            const msg = this.message;
            return list.some((str) => {
                const regex = new RegExp(str, 'i');
                return regex.test(msg);
            });
        }
        // Search for a match for notify()
        try_notify() {
            if (!this.is_me() && this.has_trigger()) {
                this.notify();
            }
        }
        // Notify the talk
        notify() {
            const icon_url = 'http://drrrkari.com/css/icon_girl.png'; // Fixed ATM
            const title = this.name;
            const options = {
                icon: icon_url,
                body: this.message
            };
            ROOM.send_notification(title, options);
        }
        // Log talk's info
        print_info() {
            console.log();
            console.log(this.message);
            console.log('ID', this.id);
            console.log('UID', this.uid);
            console.log('TIME', ROOM.epoch_to_time(this.time));
            console.log();
        }
        // append_hover_menu() helper
        tooltip_header(text) {
            return $(document.createElement('DIV'))
                .addClass('talk_tooltip_header')
                .append($(document.createElement('SPAN'))
                .addClass('talk_tooltip_text')
                .text(text));
        }
        // append_hover_menu() helper
        tooltip_btn(text) {
            return $(document.createElement('BUTTON'))
                .addClass('talk_tooltip_btn')
                .text(text);
        }
        // Append user menu to the talk icon
        append_hover_menu() {
            const tooltip = $(document.createElement('DIV'))
                .addClass('talk_tooltip')
                .append(this.tooltip_header('ユーザーメニュ'), $(document.createElement('DIV'))
                .addClass('talk_tooltip_btn_div')
                .append(this.tooltip_btn('投稿時間: ' + ROOM.epoch_to_time(this.time)), this.tooltip_btn('UID: ' + this.uid.substr(0, 10)), this.tooltip_btn('内緒モード').on('click', () => {
                // Click on the target user
                $(`#user_list2 > li[name=${this.uid}]`).click();
                // Open private window
                $('[name=pmbtn]').click();
            }), this.tooltip_btn('無視').on('click', () => {
                const user = ROOM.user(this.uid);
                if (user) {
                    user.ignore();
                }
            }), this.tooltip_btn('キック').on('click', () => {
                const user = ROOM.user(this.uid);
                if (user) {
                    user.kick();
                }
            }), this.tooltip_btn('バン').on('click', () => {
                const user = ROOM.user(this.uid);
                if (user) {
                    user.ban();
                }
            })));
            this.icon_el.append(tooltip);
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
        // Check if it's registered in the room
        is_registered() {
            return ROOM.has_user(this.id);
        }
        // Register the user in the room
        register() {
            ROOM.register_user(this);
        }
        id_matches(list) {
            const own_id = this.id;
            return list.some((id) => id === own_id);
        }
        // Match user's name against a list of words
        name_matches(list) {
            const name = this.name;
            return list.some((str) => {
                const regex = new RegExp(str, 'i');
                return regex.test(name);
            });
        }
        // Hide the talks from that user
        ignore() {
            alert('Unimplemented!');
        }
        // Kick the user from the room (owner mode)
        kick() {
            ROOM.post({ ban_user: this.id });
        }
        // Ban the user from the room (owner mode)
        ban() {
            ROOM.post({ ban_user: this.id, block: 1 });
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
        ROOM.set_host(xml.get_host());
        const users = xml.new_users();
        const talks = xml.new_talks();
        users.forEach((user) => user.register());
        talks.forEach((talk) => talk.register());
        // Send to handlers
        if (ROOM.is_flag('HAS_LOADED')) {
            if (CONFIG.is_autoban) {
                //console.log('AUTOBAN', users);
                ROOM.autoban(talks, users);
            }
            if (users.length !== 0) {
                users.forEach((user) => handle_users(user));
            }
            if (talks.length !== 0) {
                talks.forEach((talk) => {
                    if (CONFIG.is_notify) {
                        talk.try_notify();
                    }
                    if (talk.uid === '0') {
                        handle_system_msg(talk.message);
                    }
                    else {
                        if (CONFIG.is_hover_menu) {
                            talk.append_hover_menu();
                        }
                        if (CONFIG.is_talk_info) {
                            talk.print_info();
                        }
                        if (CONFIG.is_update_unread && ROOM.is_tab_hidden()) {
                            ROOM.increment_unread();
                        }
                        else if (CONFIG.is_update_unread) {
                            ROOM.reset_unread();
                        }
                        handle_talks(talk);
                    }
                });
            }
        }
        else {
            // Initialization
            talks.forEach((talk) => {
                if (CONFIG.is_hover_menu) {
                    talk.append_hover_menu();
                }
            });
            ROOM.set_flag('HAS_LOADED');
        }
    }
    // Handle system messages
    function handle_system_msg(msg) {
        const [name, event] = msg.substr(3).split('さん');
        console.log('SYSTEM', name, event);
        switch (event) {
            case 'が入室しました': break;
            case 'が退室しました':
            case 'の接続が切れました': {
                const user = ROOM.user_with_name(name);
                if (user) {
                    ROOM.unregister_user(user);
                }
                break;
            }
            default: throw Error(`Unknown event: ${name} ${event}`);
        }
    }
    // Handle new talks
    function handle_talks(talk) {
        console.log('TALK', talk);
    }
    // Handle new users
    function handle_users(user) {
        console.log('USER', user);
        //user.kick();
    }
    function main() {
        ROOM = new Room();
        // Hooks
        ROOM.hook_send(on_send);
        ROOM.hook_response(on_response);
        // CSS
        if (CONFIG.theme !== 'default') {
            ROOM.set_css(CONFIG.theme);
        }
        ROOM.set_css('tooltip');
        // Configuration
        ROOM.append_config();
        // Unread update
        ROOM.update_title(0);
        document.onfocus = () => { document.title = ROOM.room_name(); };
        //setTimeout( () => ROOM.send_message('test'), 2000 );
        console.log('LOAD END');
    }
    main();
})(DrrrUtil || (DrrrUtil = {}));
