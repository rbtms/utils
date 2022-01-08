// ==UserScript==
// @name         Drrr YT queue
// @namespace    http://tampermonkey.net/
// @version      1.4.2
// @description  Play YT links on drrr.com with a queue
// @author       rbtms
// @match        https://drrr.com/room/*
// @homepageURL  https://openuserjs.org/scripts/nishinishi9999/Drrr_YT_queue
// @supportURL   https://openuserjs.org/scripts/nishinishi9999/Drrr_YT_queue/issues
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// @license      MIT
// ==/UserScript==

const $ = window.$;

class Queue {
    constructor() {
        this.API_TOKEN = "YOUR_API_TOKEN_HERE";
        this.API_CONVERT_URL = "https://youtube.michaelbelgium.me/api/converter/convert";
        this.API_SEARCH_URL = "https://youtube.michaelbelgium.me/api/converter/search";

        this.CMD_CSS = "textarea.form-control";
        this.SUBMIT_CSS = ".room-submit-btn";

        this.q = Array(200).fill(null);
        this.timeoutID = [];
        this.pos = 0;
        this.elemN = 0;

        this.isRepeat = false;
        this.roomName = '';

        this.hook();
    }

    // Hook DOM events
    hook() {
        // Disable default behaviour
        $('input.btn').off();

        // Add new behaviour
        $('input.btn').click( (e) => {
            const name = $('#form-room-music-name')[0].value;
            const url = $('#form-room-music-url')[0].value;

            if(/youtube|youtu\.be/.test(url)) {
                this.add(url, name||'default', true);
            }
            else if(url != '') {
                this.addMP3(name, url, true);
            }
            else if(name != '') {
               this.addName(name, true);
            }

            // Close the music div
            $('.icon-music').click();
            // Focus on the comment box
            $('[name=message]')[0].focus();
        });

        // Add input behaviour
        $('#form-room-music-url') .on( 'input', () => this.inputCallback() );
        $('#form-room-music-name').on( 'input', () => this.inputCallback() );

        // Focus on the comment box after clicking a button on a modal window
        $('.confirm').click( () => $('[name=message]')[0].focus() );
    }

    // Show youtube video loading text
    showLoading() {
        this.roomName = $('.room-title-name')[0].textContent;
        $('.room-title-name')[0].textContent += '  (YT LOADING)';
    }

    // Hide youtube video loading text
    hideLoading() {
       $('.room-title-name')[0].textContent = this.roomName;
    }

    // Callback for url and track name boxes input
    inputCallback() {
        const name = $('#form-room-music-name')[0].value;
        const url = $('#form-room-music-url')[0].value;

        if(/youtube|youtu\.be/.test(url)) {
            if(name) {
                this.setNameAddon();
            }
            else {
                this.setNameAddon('    ');
            }

            this.setURLAddon('YT LINK: ');
        }
        else if(name != '' && url == '') {
            this.setNameAddon('YT SEARCH: ');
            this.setURLAddon('     ');
        }
        else {
            this.setNameAddon();
            this.setURLAddon();
        }
    }

    // Set the text of the left part of the track name input
    setNameAddon(text='Sound name: ') {
        $('div.input-group:nth-child(1) > span:nth-child(1)')[0].textContent = text;
    }

    // Set the text of the left part of the track url input
    setURLAddon(text='URL: ') {
        $('div.input-group-sm:nth-child(2) > span:nth-child(1)')[0].textContent = text;
    }

    // Check if a track is currently playing
    checkIfPlaying() {
        return $('.progress-music.active').length != 0;
    }

    // Add a youtube url to the queue
    add(id, name='default', playOnReady=false) {
        // Change youtu.be urls into youtube.com urls
        if(/youtu\.be/.test(id)) {
            const parts = id.split('/');
            id = 'https://www.youtube.com/watch?v=' + parts[parts.length-1];
        }

        // Check if the youtube id is already on the queue
        for(let i = 0; i < this.elemN; i++) {
            if(this.q[i].yt_id == id) {
                console.log('Playing url from queue.\n');
                this.pos = i;
                this.play();
                return;
            }
        }

        // Else get the id
        const url = this.API_CONVERT_URL + "?api_token=" + this.API_TOKEN + "&url=" + id;
        this.showLoading();

        $.post(url).then( json => {
            console.log(json);
            if(!json.file) {
                console.log(id + " failure");
                alert('Error: ' + json.message);
            }
            else {
                console.log(id + " added to queue");

                this.q[this.elemN] = {file: json.file, title: name == 'default' ? (json.alt_title||json.title) : name, duration: json.duration, yt_id: id};
                this.elemN++;

                if(playOnReady) {
                    this.playLast();
                }
            }

            this.hideLoading();
        })
        .fail( err => {
            console.log('fail', err);
            this.hideLoading();

            alert('Error: Couldnt load video.\n Maybe the video is over 5 mins, otherwise try again.');
        });
    }

    // Search a youtube track by name
    addName(query, playOnReady=false) {
        const url = this.API_SEARCH_URL + "?api_token=" + this.API_TOKEN + "&q=" + query + "&max_results=10";

        console.log("Searching " + query);

        $.get(url).then( json => {
            if(!json.error) {
                console.log("Results:");
                console.log(json.results);

                if(json.results.length == 0) {
                  alert('YT Search: No results.');
                }
                else {
                    console.log('Adding', json.results[0], 'to the queue');

                    this.add("https://www.youtube.com/watch?v=" + json.results[0].id, 'default', true);
                }
            }
            else {
              console.log("addName - error", json);
              alert('YT Search error');
            }
        });
    }

    // Add a track by mp3 file
    addMP3(name, url, playOnReady=false) {
        this.q[this.elemN] = {file: url, title: name, duration: 1000};
        this.elemN++;

        if(playOnReady) {
            this.playLast();
        }
    }

    // Play the current track in the queue
    play() {
        if(this.q[this.pos] == null) {
            if(this.isRepeat && this.elemN > 0) {
                this.pos = 0;
                return this.play();
            }
            else {
                return null;
            }
        }
        else {
            let yn = true;

            if( this.checkIfPlaying() ) {
                yn = confirm('There is a song playing already, do you want to wait until it ends?\n(Otherwise it will be cut.)');
                yn = !yn;
                $('[name=message]')[0].focus();
            }

            if(yn) {
                const elem = this.q[this.pos];
                this.pos++;

                $.ajax({
                    type: 'POST',
                    url: 'https://drrr.com/room/?ajax=1',
                    data: 'message=%2Fshare+'+elem.file+' '+elem.title+'&url=&to='
                })

                //const cmd = "/share " + elem.file + " " + elem.title;

                //$(this.CMD_CSS)[0].value = cmd;
                //$(this.SUBMIT_CSS).click();

                return elem.duration;
            }
            else {
                this.playWhenDone();
            }
        }
    }

    // Play the last track on the queue when the current one is over
    playWhenDone() {
        window.Howler._howls[window.Howler._howls.length - 1]._onend.push({
            fn: () => {
                console.log('This song has ended.');
                setTimeout( () => this.playLast(), 1000 );
            }
        });

       window.Howler._howls[window.Howler._howls.length - 1]._onstop.push({
           fn: () => {
            console.log('This song was cut.');
           }
       });
    }

    // Play the last track on the queue
    playLast() {
        this.pos = this.elemN-1;
        this.play();
    }

    // Run one track after another
    run() {
        const duration = this.play();

        if(duration != null) {
          this.timeoutID.push(setTimeout( () => this.run(), duration*1000 + 2000 ));
        }
    }

    // Stop run()
    stop() {
      this.timeoutID.forEach( id => clearTimeout(id) );
      console.log("Queue stopped.");
    }

    // Query youtube
    search(query) {
        const url = this.API_SEARCH_URL + "?api_token=" + this.API_TOKEN + "&q=" + query + "&max_results=10";
        $.get(url).then( json => console.log(json) );
    }

    // Show the items in the queue
    list() {
        for(let i = 0; i < this.elemN; i++) {
            const el = this.q[i];
            console.log(`${i === this.pos ? '> ' : ''} ${el.title}\n`);
        }
    }
}

window.q = new Queue();

// Change music window's buttons
window.q.inputCallback();
