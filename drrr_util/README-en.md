# **DrrrUtil**
<br>
#### <u>**What is this?**</u>
A userscript that expands drrr chat functionalities
<br>
#### <u>**Features as of v.0.3.2:**</u>
- Notification of arbitrary text inside comments (your own name, for example)
- Display of unread messages in the browser tab
- Useful user menu on usericon hover
- Possibility to make bots easily
- Autoban / kick system configurable to respond to certain words, names or IPs

<br>
#### <u>**Configuration:**</u>
For a normal user it should be enough the integrated configuration menu;
however i will explain the meaning of the internal configuration variables for powerusers:

<br>
#### Flags
- is_hover_menu:    Whether to display the user menu on hover
- is_autoban:       Autoban
- is_notify:        Notifications
- is_talk_info:     Log new talks to the developer console
- is_update_unread: Display unread messages when drrr chat is on the background
- is_modify_send:   Whether to allow the modification of outcoming messages
- theme:            Default theme

<br>
#### Trigger words
Separated by half-width conmas
- notify_triggers: Those are the words which are going to be looked on new messages
- autoban:
  - msg:  Blocked words
  - name: Blocked names
  - ip:   Blocked IPs

<br>
#### <u>**About bots**</u>
- Function called on new messages: handle_talks
- Function called on new users: handle_users
- Function called on outcoming messages: on_send

For other functionalities read the Talk and User classes, it should be pretty clear.
The typescript code on github should be clearer.


#### <u>**Screenshots**</u>

Translated configuration menu: https://i.imgsafe.org/b8/b8d4d31d1f.png

<br>
#### <u>**Author**</u>
nishinishi9999 AKA 豆乳 (nishinishi9999 at gmail dot com)
<br><br>