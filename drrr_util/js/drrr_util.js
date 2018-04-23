"use strict";
// ==UserScript==
// @name         DrrrUtil.js
// @namespace    https://github.com/nishinishi9999/utils/tree/master/drrr_util
// @version      0.3.10
// @description  Multiple utilities for Drrr Chat
// @author       nishinishi9999 AKA tounyuu
// @homepageURL  https://github.com/nishinishi9999/utils/blob/master/drrr_util
// @supportURL   https://openuserjs.org/scripts/nishinishi9999/DrrrUtil.js/issues
// @icon         http://drrrkari.com/css/icon_girl.png
// @match        http://drrrkari.com/room/
// @require      https://codepen.io/anon/pen/OZPwPy.js
// @license      GPL-3.0
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        window.focus
// ==/UserScript==
/**
* TODO
*
* - User update is not updated each request
* - Set number of visible messages
* - on_send doesn't change the bubble element text
* - Think about some way of evading automatic disconnection
* - Hide admin-related buttons from user menu when you are not admin
* - Save a list of ips and their respective id?
* - Configure theme select events
*
**/
var DrrrUtil;
(function (DrrrUtil) {
    'use strict';
    /**
    * Global variables
    **/
    let ROOM;
    let CONFIG;
    /**
    * Constants
    **/
    const CSS_URL = Object.freeze({
        tooltip: 'https://cdn.rawgit.com/nishinishi9999/utils/2bc98a0c/drrr_util/css/tooltip.css',
        greyscale: 'https://cdn.rawgit.com/nishinishi9999/utils/0a863f1b/drrr_util/css/greyscale.css'
    });
    /**
    * Classes
    **/
    class Config {
        constructor() {
            if (this.get_value('is_hover_menu') === undefined) {
                this.save_default();
            }
            this.is_hover_menu = this.get_value('is_hover_menu');
            this.is_autoban = this.get_value('is_autoban');
            this.is_notify = this.get_value('is_notify');
            this.is_talk_info = this.get_value('is_talk_info');
            this.is_update_unread = this.get_value('is_update_unread');
            this.is_modify_send = this.get_value('is_modify_send');
            this.is_avoid_disconnection = this.get_value('is_avoid_disconnection');
            this.theme = this.get_value('theme');
            this.notify_triggers = this.get_value('notify_triggers');
            this.autoban = this.get_value('autoban');
        }
        get_value(key) {
            const value = GM_getValue(key);
            switch (value === undefined) {
                case true: throw Error('Proprety isn\'t stored: ' + key);
                default: return value;
            }
        }
        set_value(key, value) {
            GM_setValue(key, value);
        }
        set_data(json) {
            Object.keys(json).forEach((key) => {
                switch (this[key] === undefined) {
                    case true: throw Error('Non-existent property: ' + key);
                    default: this[key] = json[key];
                }
            });
        }
        save_default() {
            this.set_value('is_hover_menu', true);
            this.set_value('is_autoban', true);
            this.set_value('is_notify', true);
            this.set_value('is_talk_info', true);
            this.set_value('is_update_unread', true);
            this.set_value('is_modify_send', false);
            this.set_value('is_avoid_disconnection', false);
            this.set_value('theme', 'default');
            this.set_value('notify_triggers', ['notifyme', '半角コンマで分別', 'こういう風に']);
            this.set_value('autoban', {
                kick: {
                    msg: ['kickme', 'dontkickme', 'pleasedont'],
                    name: ['getkicked'],
                    ip: ['abcdefgh']
                },
                ban: {
                    msg: ['banme'],
                    name: ['getbanned'],
                    ip: ['hgfedcba']
                }
            });
        }
        save() {
            this.set_value('is_hover_menu', this.is_hover_menu);
            this.set_value('is_autoban', this.is_autoban);
            this.set_value('is_notify', this.is_notify);
            this.set_value('is_talk_info', this.is_talk_info);
            this.set_value('is_update_unread', this.is_update_unread);
            this.set_value('is_modify_send', this.is_modify_send);
            this.set_value('is_avoid_disconnection', this.is_avoid_disconnection);
            this.set_value('theme', this.theme);
            this.set_value('notify_triggers', this.notify_triggers);
            this.set_value('autoban', this.autoban);
        }
    }
    class Room {
        constructor() {
            this.host = '';
            this.talks = {};
            this.users = {};
            this.unread = 0;
            this.flags = { HAS_LOADED: false };
            this._chat = _Chat();
            this.msg_field = $('[name=message]');
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
            return document.hidden;
            //return (document.hidden || !!document.webkitHidden || document.msHidden);
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
        im_host() {
            return this.own_id() === this.host;
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
            this._chat.writeSelfMessage(_msg); // Draw message
        }
        send_pm(msg, id) {
            const _msg = msg.split(' ').join('+');
            this.post({ id: id, message: _msg });
        }
        change_user_limit(n) {
            this.post({ room_limit: n });
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
        // Get message field
        get_msg_field() {
            return this.msg_field.val();
        }
        // Set message field
        add_msg_field(str) {
            this.msg_field.val(this.get_msg_field() + str);
        }
        focus_msg_field() {
            const textarea = $('#message textarea')[0];
            const pos = 1000; // Arbitrary number
            textarea.focus();
            textarea.selectionStart = pos;
            textarea.selectionEnd = pos;
        }
        // Convert epoch timestamps to locale time
        epoch_to_time(time) {
            const s = 1000;
            return (new Date(time * s))
                .toLocaleTimeString();
        }
        // Send a notification (untested on chrome)
        send_notification(options) {
            GM_notification(options);
        }
        // Send a private message to oneself every m minutes to stay alive
        avoid_disconnection(m) {
            const ms = 1000;
            const s = 60;
            const time = m * s * ms;
            setInterval(() => ROOM.send_pm('test', ROOM.own_id()), time);
        }
        config_textarea(label, id, data) {
            return $(document.createElement('DIV')).append($(document.createElement('LABEL')).attr('for', id).text(label), $(document.createElement('INPUT')).attr('id', id).val(data.join(',')).css({
                'width': '400px',
                'height': '20px',
                'padding-left': '5px',
                'margin-left': '20px'
            }));
        }
        parse_textarea(line) {
            return line.split(/\s*,\s*/);
        }
        toggle_config_menu() {
            $('.submit input[name=post]').slideToggle(); // Post button
            $('#message textarea').slideToggle(); // Message field
            $('.userprof').slideToggle(); // User picture/name
            $('#config_menu').slideToggle(); // Configuration div
        }
        append_config() {
            const { is_notify, is_autoban } = CONFIG;
            const icon_url = 'https://i.imgsafe.org/9f/9f4ad930a2.png';
            const hr_el = $(document.createElement('HR'))
                .css({
                'margin-top': '10px',
                'margin-bottom': '10px'
            });
            const config_div = $(document.createElement('DIV'))
                .attr('id', 'config_menu')
                .addClass('pannel hide')
                .append('<br>');
            const notify_div = $(document.createElement('DIV'))
                .attr('id', 'notify_trigger_div')
                .addClass('pannel hide')
                .css({
                'margin-left': '50px',
                'margin-top': '8px',
                'margin-bottom': '5px'
            })
                .append(this.config_textarea('通知トリガー', 'notify_triggers', CONFIG.notify_triggers));
            const autoban_div = $(document.createElement('DIV'))
                .attr('id', 'autoban_div')
                .addClass('pannel hide')
                .css({
                'margin-left': '50px',
                'margin-top': '8px',
                'margin-bottom': '5px'
            })
                .append($(document.createElement('SPAN')).text('キック'), this.config_textarea('名前', 'kick_name', CONFIG.autoban.kick.name), this.config_textarea('単語', 'kick_msg', CONFIG.autoban.kick.msg), this.config_textarea('ＩＰ', 'kick_ip', CONFIG.autoban.kick.ip), $(document.createElement('SPAN')).text('BAN'), this.config_textarea('名前', 'ban_name', CONFIG.autoban.ban.name), this.config_textarea('単語', 'ban_msg', CONFIG.autoban.ban.msg), this.config_textarea('ＩＰ', 'ban_ip', CONFIG.autoban.ban.ip));
            const autoban_el = $(document.createElement('DIV')).append($(document.createElement('LABEL')).attr('for', 'is_autoban').text('自動キック'), $(document.createElement('INPUT')).css('margin-left', '10px')
                .attr({
                type: 'checkbox',
                id: 'is_autoban',
                checked: is_autoban
            }), $(document.createElement('BUTTON')).text('設定')
                .css({
                'margin-left': '10px',
                'margin-down': '5px',
                'width': '40px'
            })
                .on('click', () => autoban_div.slideToggle()));
            const notify_el = $(document.createElement('DIV')).append($(document.createElement('LABEL')).attr('for', 'is_notify').text('通知'), $(document.createElement('INPUT')).css('margin-left', '10px')
                .attr({
                type: 'checkbox',
                id: 'is_notify',
                checked: is_notify
            }), $(document.createElement('BUTTON')).text('設定')
                .css({
                'margin-left': '10px',
                'width': '40px'
            })
                .on('click', () => notify_div.slideToggle()));
            const theme_el = $(document.createElement('DIV')).append($(document.createElement('LABEL')).attr('for', 'theme_select').text('テーマ'), $(document.createElement('SELECT')).attr('id', 'theme_select').css('margin-left', '10px').append($(document.createElement('OPTION')).text('デフォルト').val('default'), $(document.createElement('OPTION')).text('白黒').val('greyscale').on('click', () => ROOM.set_css('greyscale')))).css('padding-top', '5px');
            const button_div = $(document.createElement('DIV')).append(
            // Save configuration
            $(document.createElement('BUTTON'))
                .text('保存')
                .css('width', '60px')
                .on('click', () => {
                CONFIG.set_data({
                    is_autoban: $('#is_autoban').prop('checked'),
                    is_notify: $('#is_notify').prop('checked'),
                    notify_triggers: this.parse_textarea($('#notify_triggers').val()),
                    autoban: {
                        kick: {
                            name: this.parse_textarea($('#kick_name').val()),
                            msg: this.parse_textarea($('#kick_msg').val()),
                            ip: this.parse_textarea($('#kick_ip').val())
                        },
                        ban: {
                            name: this.parse_textarea($('#ban_name').val()),
                            msg: this.parse_textarea($('#ban_msg').val()),
                            ip: this.parse_textarea($('#ban_ip').val())
                        }
                    }
                });
                CONFIG.save();
                this.toggle_config_menu();
            }), 
            // Restore default configuration
            $(document.createElement('BUTTON'))
                .text('元設定に戻す')
                .css({
                'width': '110px',
                'margin-left': '10px'
            })
                .on('click', () => {
                CONFIG.save_default();
                this.toggle_config_menu();
                location.reload();
            }));
            const icon = $(document.createElement('LI')).append($(document.createElement('IMG')).attr('src', icon_url)).on('click', this.toggle_config_menu);
            config_div.append(autoban_el, autoban_div, notify_el, notify_div, theme_el, hr_el, button_div, '<br>');
            $('.message_box_inner').append(config_div);
            $('.menu li:eq(3)').after(icon);
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
            const icon = _xml.child_text('icon')
                || 'girl';
            const uid = _xml.child_text('uid');
            let encip = _xml.child_text('encip');
            if (encip === '') {
                const _user = ROOM.user(uid);
                if (_user) {
                    encip = _user.encip;
                }
            }
            this.id = _xml.child_text('id');
            this.type = _xml.child_text('type');
            this.uid = uid;
            this.encip = encip;
            this.name = _xml.child_text('name');
            this.message = _xml.child_text('message');
            this.icon = icon;
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
        // Match the encip against a list of words
        encip_matches(list) {
            const encip = this.encip;
            switch (encip === '') {
                case true: return false;
                default: return list.some((_encip) => _encip === encip);
            }
        }
        // Search for a match for notify()
        try_notify() {
            if (!this.is_me() && this.has_trigger()) {
                this.notify();
            }
        }
        // Notify the talk
        notify() {
            const icon = this.icon;
            const title = this.name;
            const msg = this.message;
            const icon_url = `http://drrrkari.com/css/icon_${icon}.png`;
            const options = {
                title: title,
                image: icon_url,
                highlight: true,
                text: msg,
                timeout: 5000,
                onclick: window.focus
            };
            ROOM.send_notification(options);
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
                .addClass('noselect')
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
            const name = this.name;
            const time = this.time;
            const uid = this.uid;
            const encip = this.encip;
            const prop_len = 10;
            const tooltip = $(document.createElement('DIV'))
                .addClass('talk_tooltip')
                .append(this.tooltip_header('ユーザーメニュ'), $(document.createElement('DIV'))
                .addClass('talk_tooltip_btn_div')
                .append(this.tooltip_btn('投稿時間: ' + ROOM.epoch_to_time(time)), this.tooltip_btn('IP: ' + (encip.substr(0, prop_len) || 'null')).on('click', (e) => {
                // copy ip to message box
                ROOM.add_msg_field(this.encip || 'null');
                ROOM.focus_msg_field();
                e.preventDefault();
                e.stopPropagation();
            }), this.tooltip_btn('内緒モード').on('click', (e) => {
                // Click on the target user
                $(`#user_list2 > li[name=${this.uid}]`).trigger('click');
                // Open private window
                $('[name=pmbtn]').trigger('click');
                e.preventDefault();
                e.stopPropagation();
            }), this.tooltip_btn('無視').on('click', (e) => {
                const user = ROOM.user(uid);
                if (user) {
                    user.ignore();
                }
                e.preventDefault();
                e.stopPropagation();
            }), this.tooltip_btn('キック').on('click', (e) => {
                const user = ROOM.user(uid);
                if (user) {
                    user.kick();
                }
                e.preventDefault();
                e.stopPropagation();
            }), this.tooltip_btn('バン').on('click', (e) => {
                const user = ROOM.user(uid);
                if (user) {
                    user.ban();
                }
                e.preventDefault();
                e.stopPropagation();
            })));
            this.icon_el.on('click', () => {
                ROOM.add_msg_field(ROOM.get_msg_field() === ''
                    ? `@${name} `
                    : ` @${name}`);
                ROOM.focus_msg_field();
            });
            this.icon_el.append(tooltip);
        }
        try_autoban() {
            if (ROOM.im_host()) {
                const kick_list = CONFIG.autoban.kick;
                const ban_list = CONFIG.autoban.ban;
                // By ip
                if (this.encip_matches(kick_list.ip)) {
                    const user = ROOM.user(this.uid);
                    if (user) {
                        user.kick();
                    }
                }
                else if (this.encip_matches(ban_list.ip)) {
                    const user = ROOM.user(this.uid);
                    if (user) {
                        user.ban();
                    }
                }
                else if (this.msg_matches(kick_list.msg)) {
                    const user = ROOM.user(this.uid);
                    if (user) {
                        user.kick();
                    }
                }
                else if (this.msg_matches(ban_list.msg)) {
                    const user = ROOM.user(this.uid);
                    if (user) {
                        user.ban();
                    }
                }
                else {
                    return false;
                }
                return true;
            }
            else {
                return false;
            }
        }
    }
    class User {
        constructor(xml) {
            const _xml = new XMLUtil(xml);
            this.name = _xml.child_text('name');
            this.id = _xml.child_text('id');
            this.icon = _xml.child_text('icon');
            this.encip = _xml.child_text('encip');
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
        // Match user's name against a list of words
        name_matches(list) {
            const name = this.name;
            return list.some((str) => {
                const regex = new RegExp(str, 'i');
                return regex.test(name);
            });
        }
        // Match the encip against a list of words
        encip_matches(list) {
            const encip = this.encip;
            switch (encip === '') {
                case true: return false;
                default: return list.some((_encip) => _encip === encip);
            }
        }
        // Hide the talks from that user
        ignore() {
            alert('未実装！');
        }
        // Kick the user from the room (owner mode)
        kick() {
            ROOM.post({ ban_user: this.id });
        }
        // Ban the user from the room (owner mode)
        ban() {
            ROOM.post({ ban_user: this.id, block: 1 });
        }
        // Automatically kick or ban a user given the keywords on CONFIG.autoban
        try_autoban() {
            if (ROOM.im_host()) {
                const kick_list = CONFIG.autoban.kick;
                const ban_list = CONFIG.autoban.ban;
                // By ip
                if (this.encip_matches(kick_list.ip)) {
                    this.kick();
                }
                else if (this.encip_matches(ban_list.ip)) {
                    this.ban();
                }
                else if (this.name_matches(kick_list.name)) {
                    this.kick();
                }
                else if (this.name_matches(ban_list.name)) {
                    this.ban();
                }
                else {
                    return false;
                }
                return true;
            }
            else {
                return false;
            }
        }
    }
    /**
    * Functions
    **/
    function parse_send(body) {
        return body.split('&').map((pairs) => pairs.split('='));
    }
    function join_send(parts) {
        return parts.map((pair) => pair.join('=')).join('&');
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
                switch (CONFIG.is_modify_send) {
                    case true: {
                        const parts = parse_send(body);
                        const msg_pair = parts.find((arr) => arr[0] === 'message');
                        switch (msg_pair === undefined) {
                            case true: return body;
                            default: {
                                // Modify msg
                                let msg = decodeURI(msg_pair[1]).trim();
                                msg = 'abcd';
                                msg_pair[1] = encodeURI(msg + '\r\n');
                                return join_send(parts);
                            }
                        }
                    }
                    default: return body;
                }
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
        users.forEach((user) => user.register());
        const talks = xml.new_talks();
        talks.forEach((talk) => talk.register());
        // Send to handlers
        if (ROOM.is_flag('HAS_LOADED')) {
            if (users.length !== 0) {
                users.forEach((user) => {
                    if (CONFIG.is_autoban) {
                        user.try_autoban();
                    }
                    handle_users(user);
                });
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
                        if (CONFIG.is_autoban) {
                            talk.try_autoban();
                        }
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
            console.log('INITIALIZATION', talks, users);
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
        const hyphen_end = 3;
        const [name, event] = msg.substr(hyphen_end).split('さん');
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
        CONFIG = new Config();
        ROOM = new Room();
        // Hooks
        ROOM.hook_send(on_send);
        ROOM.hook_response(on_response);
        // Avoid disconnection
        if (CONFIG.is_avoid_disconnection) {
            const s = 10;
            ROOM.avoid_disconnection(s);
        }
        // CSS
        if (CONFIG.theme !== 'default') {
            ROOM.set_css(CONFIG.theme);
        }
        ROOM.set_css('tooltip');
        // Configuration
        ROOM.append_config();
        // Unread update
        ROOM.update_title(0);
        document.onfocus = ROOM.reset_unread;
        console.log('LOAD END');
    }
    main();
})(DrrrUtil || (DrrrUtil = {}));
