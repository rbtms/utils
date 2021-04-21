// ==UserScript==
// @name         Drrr YT queue
// @namespace    http://tampermonkey.net/
// @version      0.9
// @description  Play YT links on drrr with a queue
// @author       Ms.Roboto
// @match        https://drrr.com/room/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// @license      MIT
// ==/UserScript==

class Queue {
    constructor($) {
        this.$ = $;
        this.CORS_URL = "https://cors-anywhere.herokuapp.com/";
        this.YT_CONVERTER_URL = "https://michaelbelgium.me/ytconverter";
        this.ENABLE_URL = "https://cors-anywhere.herokuapp.com/corsdemo";
        this.CMD_CSS = "textarea.form-control";
        this.SUBMIT_CSS = ".room-submit-btn";

        this.q = Array(100).fill(null);
        this.timeoutID = [];
        this.pos = 0;
        this.elemN = 0;

        this.isRepeat = false;
        this.roomName = '';

        this.hook();
    }

    hook() {
        // Disable default behaviour
        $('input.btn').off();

        // Add new behaviour
        $('input.btn').click( (e) => {
            const name = $('#form-room-music-name')[0].value;
            const url  = $('#form-room-music-url')[0].value;

            if(/youtube/.test(url)) {
                this.add(url, true);
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

            // Append demo server url at the end
            $('#music_pannel').append('<a href='+this.ENABLE_URL+' style="font-size: 10px; color: #AAAAAA; text-decoration: none;"'
                                      + '>Click for CORS server permission (once a day or so)</a>');

            // Add input behaviour
            $('#form-room-music-url').on( 'input', (e) => this.inputCallback() );
            $('#form-room-music-name').on( 'input', () => this.inputCallback() );
        });

        $('.confirm').click( () => $('[name=message]')[0].focus() );
    }

    showLoading() {
        this.roomName = $('.room-title-name')[0].textContent;
        $('.room-title-name')[0].textContent += '  (YT LOADING)';
    }

    hideLoading() {
       $('.room-title-name')[0].textContent = this.roomName;
    }

    inputCallback() {
        const name = $('#form-room-music-name')[0].value;
        const url  = $('#form-room-music-url')[0].value;

        if(/youtube/.test(url)) {
            this.setNameAddon('    ');
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

    setNameAddon(text='Sound name: ') {
        $('div.input-group:nth-child(1) > span:nth-child(1)')[0].textContent = text;
    }

    setURLAddon(text='URL: ') {
        $('div.input-group-sm:nth-child(2) > span:nth-child(1)')[0].textContent = text;
    }

    checkIfPlaying() {
        return $('.progress-music.active').length != 0;
    }

    add(id, playOnReady=false) {
        const url = this.CORS_URL + this.YT_CONVERTER_URL + "/convert.php?youtubelink=" + id;
        this.showLoading();

        $.get(url).then( json => {
            console.log(json);
            if(!json.file) {
                console.log(id + " failure");
                alert('Error: ' + json.message);
            }
            else {
                console.log(id + " added to queue");

                this.q[this.elemN] = {file: json.file, title: json.alt_title||json.title, duration: json.duration};
                this.elemN++;

                if(playOnReady) {
                    this.playLast();
                }
            }

            this.hideLoading();
        })
        //.error( err => { console.log('error', err); this.hideLoading(); } )
        //.fail( err => { console.log('fail', err); this.hideLoading(); } );
    }

    addName(query, playOnReady=false) {
        const url = this.CORS_URL + this.YT_CONVERTER_URL + "/search.php?q=" + query + "&max_results=10";

        console.log("Searching " + query);

        $.get(url).then( json => {
            if(!json.error) {
                console.log("Found");
                console.log(json);
                console.log(json.results[0]);
                this.add("https://www.youtube.com/watch?v=" + json.results[0].id);

                if(playOnReady) {
                    this.playLast();
                }
            }
            else {
              console.log("addName - error", json);
            }
        });
    }

    addMP3(name, url, playOnReady=false) {
        this.q[this.elemN] = {file: url, title: name, duration: 1000};
        this.elemN++;

        if(playOnReady) {
            this.playLast();
        }
    }

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
                yn = confirm('There is a song already playing, do you want to cut it?\n(If you dont cut it, the track will start playing when this one ends.)');
                $('[name=message]')[0].focus();
            }

            if(yn) {
                const elem = this.q[this.pos];
                this.pos++;

                const cmd = "/share " + elem.file + " " + elem.title;

                $(this.CMD_CSS)[0].value = cmd;
                $(this.SUBMIT_CSS).click();

                return elem.duration;
            }
            else {
                this.playWhenDone();
            }
        }
    }

    playWhenDone() {
        Howler._howls[Howler._howls.length - 1]._onend.push({
            fn: () => {
                console.log('This song has ended.');
                setTimeout( () => this.playLast(), 1000 );
            }
        });

       Howler._howls[Howler._howls.length - 1]._onstop.push({
           fn: () => {
            console.log('This song was cut.');
           }
       });
    }

    playLast() {
        this.pos = this.elemN-1;
        this.play();
    }

    run() {
        const duration = this.play();

        if(duration != null) {
          this.timeoutID.push(setTimeout( () => this.run(), duration*1000 + 2000 ));
        }
    }

    stop() {
      this.timeoutID.forEach( id => clearTimeout(id) );
      console.log("Queue stopped.");
    }

    search(query) {
        const url = this.CORS_URL + "https://michaelbelgium.me/ytconverter/search.php?q=" + query + "&max_results=10";
        $.get(url).then( json => console.log(json) );
    }

    list() {
        for(let i = 0; i < this.elemN; i++) {
            const el = this.q[i];
            console.log(`${i === this.pos ? '> ' : ''} ${el.title}\n`);
        }
    }
}

q = new Queue($);
