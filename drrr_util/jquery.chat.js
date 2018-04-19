const _chat = $(function(){
  var postAction, getAction;

  var formElement,
      pformElement,
      textareaElement,
      ptextareaElement,
      userProfElement,
      talksElement,
      ptalksElement,
      membersElement,
      logoutElement,
      buttonElement,
      pbuttonElement,
      menuElement,
      roomNameElement,
      roomLimitElement,
      settingPannelElement,
      userListElement,
      uploadElement,
      pmElement;

  var lastMessage = '',
      lastUpdate = 0,
      lastPmUpdate = 0,
      isSubmitting = false,
      isSubmittingPM = false,
      isLoggedOut = false,
      isLoading = false,
      isShowingSettinPannel = false,
      isMobileMode = $.cookie("m"),
      cookie_noimg = $.cookie("noimg"),
      cookie_noanime = $.cookie("noanime"),
      cookie_nosound = $.cookie("nosound"),
      isAnimeOn = cookie_noanime == null,
      isSoundOn = cookie_nosound == null,
      isShowMember = false,
      isShowUpimg = false,
      isPrivate = false,
      userId,
      userName,
      userIcon,
      counter = 0,
      ispminit = false,
      destId = '',
      enableNotify = false,
      messageLimit = 40,
      ignoreList = [];

  window.onerror = function(message, url, line) {
    return true;
  }

  var useStorage = false;
  if(('localStorage' in window) && window['localStorage'] !== null) {
    useStorage = true;
    try {
      window.localStorage.setItem('test', '1');
    } catch(e) {
      useStorage = false;
    }
    if(useStorage != '1')
      useStorage = false;
  }

  if(useStorage) {
    var txt = localStorage.getItem("ignore");
    if (txt != null)
      var ignoreList = txt.split(",");
  }

  var isMobile = false;
  if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    isMobile = true;
  }
  //var _touch = ('ontouchstart' in document) && isMobile ? 'touchstart' : 'click';
  var _touch = 'click';

  var construct = function() {
    var url = location.href.replace(/#/, '');

    if (url.replace(/\?/, '') != url)
      postAction = url + "&ajax=1";
    else
      postAction = url + "?ajax=1";

    getAction  = duraUrl + '/ajax.php';

    formElement = $("#message");
    pformElement = $("#pmessage");
    textareaElement = $("#message textarea");
    ptextareaElement = $("#pmessage textarea");
    userProfElement = $(".userprof");
    talksElement = $("#talks");
    ptalksElement = $("#pmtalks");
    membersElement = $("#members");
    logoutElement = $("input[name=logout]");
    buttonElement = $(".submit input[name=post]");
    pbuttonElement = $(".submit2 input[name=post]");
    menuElement = $("ul.menu");
    roomNameElement = $("#room_name");
    roomLimitElement = $("#room_limit");
    settingPannelElement = $("#setting_pannel");
    settingPannelElement2 = $("#setting_pannel2");
    userListElement = $("#user_list");
    userListElement2 = $("#user_list2");
    uploadElement = $("#upimg");
    pmElement = $("#pmes");

    userId = trim($("#user_id").text());
    userName = trim($("#user_name").text());
    userIcon = trim($("#user_icon").text());

    messageMaxLength = 140;

    if ( typeof(GlobalMessageMaxLength) != 'undefined' )
      messageMaxLength = GlobalMessageMaxLength;

    appendEvents();
    separateMemberList();
    roundBaloons();
    showControllPanel();

    var timer = setInterval(function() {getMessagesOnce();}, 1700);

    $.each($(".bubble"), addTail);
  }

  var appendEvents = function() {

    formElement.submit(submitMessage);
    textareaElement.keyup(enterToSubmit);

    pformElement.submit(submitPMessage);
    ptextareaElement.keyup(enterToPSubmit);

    $(".mobile").on(_touch, function() {
      if(isMobileMode)
        $.removeCookie("m", {path: "/" });
      else
        $.cookie('m', 'true', { expires: 9999, path: '/' });

      location.href = duraUrl + "/room/";
    });

    $("#imgswt").on(_touch, function() {
      if(cookie_noimg)
        $.removeCookie("noimg", { path: "/" });
      else
        $.cookie('noimg', 'true', { expires: 9999, path: '/' });

      location.href = duraUrl + "/room/";
    });

    logoutElement.on(_touch, logout);
    talksElement.on(_touch, 'dt', addUserNameToTextarea);
    menuElement.find("li.sound").on(_touch, toggleSound);
    menuElement.find("li.member").on(_touch, toggleMember);
    menuElement.find("li.animation").on(_touch, toggleAnimation);
    menuElement.find("li.setting").on(_touch, toggleSettingPannel);
    menuElement.find("li.upimg").on(_touch, toggleUpimg);
    settingPannelElement.find("input[name=save]").on(_touch, changeRoomName);
    settingPannelElement.find("input[name=save2]").on(_touch, changeRoomLimit);
    settingPannelElement.find("input[name=save3]").on(_touch, changeKnock);
    settingPannelElement.find("input[name=handover]").on(_touch, handoverHost);
    settingPannelElement.find("input[name=ban]").on(_touch, banUser);
    settingPannelElement.find("input[name=block]").on(_touch, blockUser);
    settingPannelElement2.find("input[name=pmbtn]").on(_touch, startPrivate);
    settingPannelElement2.find("input[name=igbtn]").on(_touch, updateIgnore);

    menuElement.find("li.private").on(_touch, function() {
      if( isPrivate ) {
        $("#pm_box").show();
        return;
      }
      toggleSettingPannel2();
    });

    $("#change").on(_touch, function() {
      $("#pm_box").hide();
    });

    $("#close").on(function() {
      destId = "";
      $("#pm_box").hide();
      $("#pmtalks .talk").remove();
      isPrivate = false;
    });
  }

  var submitMessage = function() {

    if(isLoggedOut)
      return false;

    var message = textareaElement.val();
    message = message.replace(/[\r\n]+/g, "");
    if ( message.replace(/^[ \n]+$/, '') == '' ) {
      if ( message.replace(/^\n+$/, '') == '' )
        textareaElement.val('');
      return false;
    }

    if(containEmail(message)) {
      alert("メールアドレスの投稿は利用規約で禁止されています。");
      textareaElement.val('');
      return false;
    }

    if ( isSubmitting )
      return false;

    var data = formElement.serialize();
    if(counter == 5) {
      alert("エラーが発生しました");
      logout();
    }

                if ( message.length - 1 > messageMaxLength ) {
                        message = message.substring(0, messageMaxLength)+"...";
                }

    if ( message == lastMessage && message!="/image" ) {
      counter += 1;
      if ( confirm(t("Will you stop sending the same message? If you click 'Cancel' you can send it again.")) ) {
        textareaElement.val('');
        return false;
      }
    } else {
      counter = 0;
    }

    textareaElement.val('');
    isSubmitting = true;
    buttonElement.val(t("Sending..."));
    lastMessage = message;

    writeSelfMessage(message);
    $.post(postAction, data,
      function(result) {
        isSubmitting = false;
        buttonElement.val(t("POST!"));
      }
    );

    return false;
  }

  var submitPMessage = function() {
    if(isLoggedOut) return false;
    var message = ptextareaElement.val();
    message = message.replace(/[\r\n]+/g, "");
    if ( message.replace(/^[ \n]+$/, '') == '' ) {
      if ( message.replace(/^\n+$/, '') == '' ) ptextareaElement.val('');
      return false;
    }

                if(containEmail(message)) {
                  alert("メールアドレスの投稿は利用規約で禁止されています。");
                  ptextareaElement.val('')
                  return false;
                }

    if ( isSubmitting ) return false;
    var data = pformElement.serialize();
    ptextareaElement.val('');
    isSubmitting = true;
    pbuttonElement.val(t("Sending..."));
    if ( message.length - 1 > messageMaxLength ) {
      message = message.substring(0, messageMaxLength)+"...";
    }
    isSubmittingPM = true;
    writeSelfMessage(message);
    isSubmittingPM = false;
    $.post(postAction+'&id='+destId, data,
      function(result) {
        isSubmitting = false;
        pbuttonElement.val(t("POST!"));
      }
    );
    return false;
  }

  var getMessagesOnce = function() {
    if (isLoading || isLoggedOut) return;

    isLoading = true;

    var url = isPrivate ? getAction+'?id=' + destId : getAction;
    $.ajax({
    type : "POST",
    url: url,
    dataType: 'xml',
    timeout: 12000,
    success: function(data, status, xhr) {
      isLoading = false;
      updateProccess(data);
    },
    error: function() {
      isLoading = false;
    }
    });
  }

  var loadMessages = function() {
    $.post(getAction, {}, 
      function(data) {
        loadMessages();
        updateProccess(data);
      }
    , 'xml');
  }

  var updateProccess = function(data) {
    var update = $(data).find('room > update').text() * 1;
    if ( lastUpdate == update || settingPannelElement.is(":visible") || settingPannelElement2.is(":visible")) return;

    lastUpdate = update;
    validateResult(data);
    writeRoomName(data);
    writeMessages(data);

    if(isPrivate) writePMessages(data);
    else checkPMessages(data);

    writeUserList(data);
    markHost(data);
  }

  var writeRoomName = function(data) {
    roomNameElement.text($(data).find('room > name').text()+" ("+$(data).find("users").length+"/"+$(data).find('room > limit').text()+")");
  }

  var writeMessages = function(data) {
    $.each($(data).find("talks"), writeMessage);
  }
  var writePMessages = function(data) {
    $.each($(data).find("pm"), writePMessage);
  }

  var checkPMessages = function(data) {
    $.each($(data).find("pm"), checkPMessage);
    enableNotify = true;
  }

  var checkPMessage = function(data) {
    var uid   = trim($(this).find("uid").text());
    var time  = trim($(this).find("time").text());
    if(time > lastPmUpdate) {
      lastPmUpdate = time;
      if(enableNotify) {
        destId = uid;
        startPrivate();
      }
    }
  }

  var writeMessage = function() {
    var id = $(this).find("id").text();
    if ( $("#"+id).length > 0 ) return;
    var uid   = trim($(this).find("uid").text());

    var isIgnoreMember = false;
    $.each(ignoreList, function(i, value) {
      if(uid == value) {
        isIgnoreMember = true;
        return false;
      }
    });

    if(isIgnoreMember) return;

    var name  = trim($(this).find("name").text());
    var message = trim($(this).find("message").text());
    var icon  = trim($(this).find("icon").text());
    var time  = trim($(this).find("time").text());
    var image = trim($(this).find("image").text());

    name  = escapeHTML(name);
    message = escapeHTML(message);
    if (image != '') {
      var content = '<dl class="talk '+icon+'" id="'+id+'"><dt>'+name+'</dt><dd><div class="bubble"><p style="margin-left:30px;"><a href="'+ image +'" target="_blank">';
      if(!cookie_noimg) content += '<img src="/l.gif" />';
      else content += "[画像を表示する]";

      content += '</a></p></div></dd></dl>';
      talksElement.prepend(content);
      ringSound();

      if(!cookie_noimg) {
        var img = new Image();
        img.src = image;
        $(img).bind("load", function() {
          $("#"+id+" a").html($(img));
          $("#"+id+" img").css({
            "max-width": "200px",
            "max-height": "200px",
            "width": "auto",
            "height": "auto"
          });
        });
      }

    } else if ( uid == 0 || uid == '0' ) {
      var content = '<div class="talk system" id="'+id+'">'+message+'</div>';
      talksElement.prepend(content);
      ringSound();
    } else if (uid != userId){
      var content = '<dl class="talk '+icon+'" id="'+id+'">';
      content += '<dt>'+name+'</dt>';
      content += '<dd><div class="bubble">';
      content += '<p class="body">' + urlize(message) + '</p>';
      content += '</div></dd></dl>';

      talksElement.prepend(content);
      effectBaloon();
    }
    weepMessages();
  }

  var writePMessage = function() {
    var id = $(this).find("id").text();
    if ( $("#"+id).length > 0 ) return;
    var uid   = trim($(this).find("uid").text());
    var name  = trim($(this).find("name").text());
    var message = trim($(this).find("message").text());
    var icon  = trim($(this).find("icon").text());
    var time  = trim($(this).find("time").text());
    var image = trim($(this).find("image").text());
    var dest   = trim($(this).find("dest").text());

    if (uid != destId && dest != destId) return;
    name  = escapeHTML(name);
    message = escapeHTML(message);
    if ( image != '') {
      var content = '<dl class="talk '+icon+'" id="'+id+'">';
      content += '<dt>'+name+'</dt>';
      content += '<dd><div class="bubble">';
      content += '<p style="margin-left:30px;"><a href="'+ image +'" target="_blank">';
      if(imgswt == 'on')
        content += '<img src="' +image+ '" style="max-width: 200px;max-height: 200px;width:auto;height:auto;">';
      else
        content += "[画像を表示する]";
      content += '</a></p></div></dd></dl>';
      ptalksElement.prepend(content);
      ringSound();
    } else if ((uid != userId) || ispminit == true) {
      var content = '<dl class="talk '+icon+'" id="'+id+'">';
      content += '<dt>'+name+'</dt>';
      content += '<dd><div class="bubble">';
      content += '<p class="body">' + urlize(message) + '</p>';
      content += '</div></dd></dl>';
      ptalksElement.prepend(content);
      effectPBaloon();
    }
    weepPMessages();
  }

  var writeUserList = function(data) {
    membersElement.find("li").remove();
    userListElement.find("li").remove();
    userListElement2.find("li").remove();

    var host  = $(data).find("host").text();

    $.each($(data).find("users"), 
      function() {
        var name = $(this).find("name").text();
        var id   = $(this).find("id").text();
        var icon = $(this).find("icon").text();
        var trip = $(this).find("trip").text();
        var hostMark = "";
        icon = "icon_" + icon;
        if ( host == id ) hostMark = " "+t("(host)");

        if(trip != "") trip = '<span style="color:#009900;font-weight:bold">◆' + trip + '</span>';

        membersElement.append('<li>' + name + trip + hostMark + '</li>');

        if(userId != id){
          var ignoreMark ="";
          $.each(ignoreList, function(i, value) {
            if( id == value ) ignoreMark = "<span class='ignore'> "+"(無視)</span>";
          });
          userListElement2.append('<li>'+name+ignoreMark+'</li>');
          userListElement2.find("li:last").css({
            'background':'transparent url("'+duraUrl+'/css/'+icon+'.png") center top no-repeat'
          }).attr('name', id).click(
            function() {
              if ( $(this).hasClass('select') ) {
                $(this).removeClass('select');
                settingPannelElement2.find("input[name=pmbtn], input[name=igbtn]").attr('disabled', 'disabled');
              } else {
                userListElement2.find("li").removeClass('select');
                $(this).addClass('select');
                settingPannelElement2.find("input[name=pmbtn], input[name=igbtn]").removeAttr('disabled');
              }
            }
          );
        }

        if ( host == id ) return;

        userListElement.append('<li>'+name+'</li>');
        userListElement.find("li:last").css({
          'background':'transparent url("'+duraUrl+'/css/'+icon+'.png") center top no-repeat'
        }).attr('name', id).click(
          function() {
            if ( $(this).hasClass('select') ) {
              $(this).removeClass('select');
              settingPannelElement.find("input[name=handover], input[name=ban], input[name=block]").attr('disabled', 'disabled');
            } else {
              userListElement.find("li").removeClass('select');
              $(this).addClass('select');
              settingPannelElement.find("input[name=handover], input[name=ban], input[name=block]").removeAttr('disabled');
            }
          }
        );
      }
    );

    separateMemberList();
  }

  var writeSelfMessage = function(message) {
    var name = escapeHTML(userName);
    var message = escapeHTML(message);

    if (message == '/image'){
      location.reload();
    } else {
      var content = '<dl class="talk '+userIcon+'" id="'+userId+'">';
      content += '<dt>'+name+'</dt>';
      content += '<dd><div class="bubble">';
      content += '<p class="body">' + urlize(message) + '</p>';
      content += '</div></dd></dl>';

      if(!isSubmittingPM) {
        talksElement.prepend(content);
        effectBaloon();
      } else {
        ptalksElement.prepend(content);
        effectPBaloon();
      }

      weepMessages();
    }
  }

  var validateResult = function(data) {
    var error = $(data).find("error").text() * 1;

    if ( error == 0 || isLoggedOut ) {
      return;
    }
    else if ( error == 1 ) {
      isLoggedOut = true;
      alert(t("Session time out."));
    }
    else if ( error == 2 ) {
      isLoggedOut = true;
    }
    else if ( error == 3 ) {
      isLoggedOut = true;
      alert(t("Login error."));
    }

    location.href = duraUrl;
  }

  var effectBaloon = function() {
    var thisBobble = $(".bubble .body").first();
    var thisBobblePrent = thisBobble.parent();
    var oldWidth  = thisBobble.width() + 1 + 'px';
    var oldHeight = thisBobble.height() + 'px';
    var newWidth  = ( 5 + thisBobble.width() ) + 'px';
    var newHeight = ( 5 + thisBobble.height() ) + 'px';

    ringSound();

    if ( !isAnimeOn ) {
      $.each(thisBobblePrent, addTail);
      $.each(thisBobble, roundBaloon);
      return;
    }

    if ( !isIE() ) {
      $.each(thisBobblePrent, addTail);

      thisBobblePrent.css({
        'opacity' : '0',
        'width': '0px',
        'height': '0px'
      });
      thisBobblePrent.animate({
        'opacity' : 1,
        'width': '22px',
        'height': '16px'
      }, 200, "easeInQuart");
    }

    thisBobble.css({
      'border-width' : '0px',
      'font-size' : '0px',
      'text-indent' : '-100000px',
      'opacity' : '0',
      'width': '0px',
      'height': '0px'
    });

    thisBobble.animate({ 
      'fontSize': "16px", 
      'borderWidth': "4px",
      'width': newWidth,
      'height': newHeight,
      'opacity': 1,
      'textIndent': 0
    }, 200, "easeInQuart", 
      function() {
        $.each(thisBobble, roundBaloon);

        if ( isIE() )
        {
          thisBobblePrent.animate({
            'width': thisBobblePrent.width() - 5 + "px"
          }, 100);
        }

        thisBobble.animate({
          'width': oldWidth,
          'height': oldHeight
        }, 100);
      }
    );
  }

  var effectPBaloon = function() {
    var thisBobble = $("#pmtalks .bubble .body").first();
    var thisBobblePrent = thisBobble.parent();
    $.each(thisBobblePrent, addPTail);
  }

  var ringSound = function() {
    if ( !isSoundOn ) {
      return;
    }

    try {
      messageSound.play();
    }
    catch(e) {

    }
  }

  var escapeHTML = function(ch) { 
    ch = ch.replace(/&/g,"&amp;");
    ch = ch.replace(/"/g,"&quot;");
    ch = ch.replace(/'/g,"&#039;");
    ch = ch.replace(/</g,"&lt;");
    ch = ch.replace(/>/g,"&gt;");
    return ch;
  }

  var urlize = function(text) {
    return text.replace(/((http:|https:)\/\/[\x21-\x26\x28-\x7e]+)/gi, "<a href='/jump.php?url=$1' target='_blank'>$1</a>");
  }

  var containEmail = function(text) {
    var re = /(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;
    return re.test(text);
  }

  var enterToSubmit = function(e) {
    var content = textareaElement.val();
    if ( content != content.replace(/[\r\n]+/g, "") )
    {
      formElement.submit();
      return false;
    }
  }

  var enterToPSubmit = function(e) {
    var content = ptextareaElement.val();
    if ( content != content.replace(/[\r\n]+/g, "") ) {
      pformElement.submit();
      return false;
    }
  }

  var logout = function() {
    isLoggedOut = true;
    if(useStorage) {
      localStorage.removeItem("ignore");
    }

    $.post(postAction, {'logout':'logout'},
      function(result) {
        location.href = duraUrl;
      }
    );
  }

  var weepMessages = function() {
    if ( $("#talks .talk").length > messageLimit ) {
      while ( $("#talks .talk").length > messageLimit ) {
        $("#talks .talk").last().remove();
      }
    }
  }
  var weepPMessages = function() {
    if ( $("#pmtalks .talk").length > messageLimit ) {
      while ( $("#pmtalks .talk").length > messageLimit ) {
        $("#pmtalks .talk").last().remove();
      }
    }
  }

  var separateMemberList = function() {
    membersElement.find('li:not(:last)').each(
      function() {
        $(this).append(', ');
      }
    );
  }

  var addUserNameToTextarea = function() {
    var name = $(this).text();
    var text = textareaElement.val();
    textareaElement.focus();

    if ( text.length > 0 ) {
      textareaElement.val(text + ' @' + name);
    } else {
      textareaElement.val(text + '@' + name + ' ');
    }
  }

  var trim = function(text) {
    return text.replace(/^\s+|\s+$/g, '');
  }

  var roundBaloons = function() {
    $("#talks dl.talk dd div.bubble p.body").each(roundBaloon);
  }

  var roundBaloon = function() {
    // IE 7 only... orz
    if ( !isIE() || !window.XMLHttpRequest || document.querySelectorAll)
      return;

    var width = $(this).width();
    var borderWidth = $(this).css('border-width');
    var padding = $(this).css('padding-left');
    var color = $(this).css('border-color');
    width = width + padding.replace(/px/, '') * 2;

    $(this).corner("round 10px cc:"+color)
    .parent().css({
        "background" : color,
        "padding" : borderWidth,
        "width" : width
      }).corner("round 13px");
  }

  var addTail = function() {
    if ( isIE() ) return;
    var height = $(this).find(".body").height() + 30 + 8;
    var top = (Math.round((180 - height) / 2) + 23) * -1;
    var bgimg  = $(this).find(".body").css("background-image");
    var rand = Math.floor(Math.random()*2);
    var tailTop = "0px";
    if ( rand == 1 ) tailTop = "-17px";
    top += 1;
    $(this).find(".body").css({"margin": "0 0 0 15px"});
    $(this).prepend('<div><div></div></div>').css({"margin":"-16px 0 0 0"});
    $(this).children("div").css({
      "position":"relative",
      "float":"left",
      "margin":"0 0 0 0",
      "top": "39px",
      "left": "-3px",
      "width":"22px",
      "height":"16px",
      "background":"transparent "+bgimg+" left "+top+"px repeat-x"
    });
    $(this).children("div").children("div").css({
      "width":"100%",
      "height":"100%",
      "background":"transparent url('"+duraUrl+"/css/tail.png') left "+tailTop+" no-repeat"
    });
  }

  var addPTail = function() {
    if ( isIE() ) return;
    var bgcolor = $(this).find(".body").css("border-color");
    $(this).find(".body").css({"margin": "-18px 0 0 15px"});
    $(this).prepend('<div style="width: 0;height: 0;border-style: solid;border-width: 0 0 16px 22px;border-color: transparent transparent '+bgcolor+' transparent;position: relative; float: left;top:21px;left:-3px;"><div style="width: 0;height: 0;border-style: solid;border-width:0px 0px 7px 10px;border-color: transparent transparent #fff transparent;margin-left:-9px;padding-top:5px;"></div></div>');

  }

  var showControllPanel = function() {
    if ( isIE() ) {
      isSoundOn = isAnimeOn = false;
    }

    menuElement.find("li:hidden:not(.setting, .private)").show();
    menuElement.find("li.sound").addClass( ( isSoundOn ) ? "sound_on" : "sound_off" );
    menuElement.find("li.member").addClass( ( isShowMember ) ? "member_on" : "member_off" );
    menuElement.find("li.animation").addClass( ( isAnimeOn ) ? "animation_on" : "animation_off" );
    menuElement.find("li.upimg").addClass( ( isShowUpimg ) ? "upimg_on" : "upimg_off" );
  }

  var toggleSettingPannel2 = function() {
    if(isMobileMode) {
      var height = ($('div.message_box').css('height') != '1300px') ? '1300px' : '100%';
      $('div.message_box').css('height', height);
    }
    settingPannelElement2.find("input[name=handover], input[name=ban], input[name=black]").attr('disabled', 'disabled');
    buttonElement.slideToggle();
    textareaElement.slideToggle();
    userProfElement.slideToggle();
    settingPannelElement2.slideToggle();
  }

  var toggleSound = function() {

    if ( isSoundOn )
      $.cookie('nosound', 'true', { expires: 9999, path: '/' });
    else
      if(cookie_nosound)
        $.removeCookie("nosound", { path: "/" });

    isSoundOn = !isSoundOn;
    $(this).toggleClass("sound_on sound_off");
  }

  var toggleMember = function() {
    membersElement.slideToggle("slow");
    isShowMember = !isShowMember;
    $(this).toggleClass("member_on member_off");
  }

  var toggleAnimation = function() {

    if ( isAnimeOn )
      $.cookie('noanime', 'true', { expires: 9999, path: '/' });
    else
      if(cookie_noanime) $.removeCookie("noanime", { path: "/" });

    isAnimeOn = !isAnimeOn;
    $(this).toggleClass("animation_on animation_off");
  }

  var toggleUpimg = function() {
    uploadElement.slideToggle("slow");
    isShowUpimg = !isShowUpimg;
    $(this).toggleClass("upimg_on upimg_off");
  }

  var toggleSettingPannel = function() {
    if(isMobileMode) {
      if ($('div.message_box').css('height') != '800px') $('div.message_box').css('height', '800px');
      else $('div.message_box').css('height', '100%');
    }
    settingPannelElement.find("input[name=handover], input[name=ban], input[name=block]").attr('disabled', 'disabled');
    buttonElement.slideToggle();
    textareaElement.slideToggle();
    userProfElement.slideToggle();
    settingPannelElement.slideToggle();
  }

  var markHost = function(data) {
    menuElement.find("li.private").show();
    if ( $(data).find('host').text() == userId) {
      menuElement.find("li.setting").show();
    } else {
      menuElement.find("li.setting").hide();
    }
  }

  var changeRoomName = function() {
    var roomName = settingPannelElement.find("input[name=room_name]").val();

    $.post(postAction, {'room_name': roomName}, 
      function(result) {
        alert(result);
        toggleSettingPannel();
      }
    );
  }
  var changeRoomLimit = function() {
    var roomLimit = settingPannelElement.find("select[name=room_limit]").val();
    $.post(postAction, {'room_limit': roomLimit},
      function(result) {
        alert(result);
        toggleSettingPannel();
      }
    );
  }
        var changeKnock = function() {
                var knock = settingPannelElement.find("input[name=change_knock]:checked").val();
                $.post(postAction, {'change_knock': knock},
                        function(result) {
                                alert(result);
                                toggleSettingPannel();
                        }
                );
        }

  var handoverHost = function() {
    var id = userListElement.find("li.select").attr("name");

    if ( confirm(t("Are you sure to handover host rights?")) ) {
      $.post(postAction, {'new_host': id}, 
        function(result) {
          alert(result);
          toggleSettingPannel();
        }
      );
    }
  }

  var banUser = function() {
    var id = userListElement.find("li.select").attr("name");

    if ( confirm(t("Are you sure to ban this user?")) ) {
      $.post(postAction, {'ban_user': id}, 
        function(result) {
          alert(result);
          toggleSettingPannel();
        }
      );
    }
  }

  var blockUser = function() {
    var id = userListElement.find("li.select").attr("name");

    if ( confirm(t("Are you sure to ban this user?")) )
    {
      $.post(postAction, {'ban_user': id, block: 1},
        function(result) {
          alert(result);
          toggleSettingPannel();
        }
      );
    }
  }

  var startPrivate = function() {
    if(destId == "") {
      destId = userListElement2.find("li.select").attr("name");
      toggleSettingPannel2();
    }

    $("#pm_box").show();
    isPrivate = true;
    ispminit = true;
    isLoading = true;
    $.post(getAction+'?id='+destId, {},
    function(data) {
      isLoading = false;
      $.each($(data).find("pm"), writePMessage);
      ispminit = false;
    }
    , 'xml');
  }

  var updateIgnore = function() {
    var id = userListElement2.find("li.select").attr("name");
    var isSetIgnore = false;
    $.each(ignoreList, function(i, value) {
      if(id == value) {
        isSetIgnore = true;
        if(confirm("無視リストを解除しますか？")) {
          ignoreList.splice(i, 1);

          if( useStorage )
            localStorage.setItem("ignore", ignoreList.toString());

          alert("無視リストを解除しました。");
          userListElement2.find("li.select span.ignore").remove();
          toggleSettingPannel2();
        }
        return false;
      }
    });
    if(!isSetIgnore) {
      if(!confirm("無視リストに加えると表の発言と内緒メッセージの両方が表示されなくなります。よろしいですか？")) return false;
      ignoreList.push(id);

      if( useStorage )
        localStorage.setItem("ignore", ignoreList.toString());

      alert("無視リストに追加しました。");
      userListElement2.find("li.select").append("<span class='ignore'> "+"(無視)</span>");
      toggleSettingPannel2();
    }
  }

  var isIE = function() {
    return /*@cc_on!@*/false;
  }

  construct();
});
