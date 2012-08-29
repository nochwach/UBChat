$(function(){
    // Config
    var siteTitle           = 'UBChat';
    var heartbeatIntervall  = 5000;
    var systemMsgColor      = 'black';
    var connectionLostMsg   = 'Ohoh, Verbindung verloren. Sorry!';
    var chatConnectedMsg    = 'Du bist momentan als Zuschauer angemeldet. Um dich zu unterhalten, musst du'
                            + ' einen Benutzername eingeben. Absenden mit Enter.';
    var disconnectedMsg     = 'Disconnected';
    var systemUser          = 'SYSTEM';

    // Init
    var myColor             = false;
    var myName              = false;
    var chatconnected       = false;
    var cTimeInt            = false;
    var sTimeInt            = false;
    var titleInt            = false;
    displayTime();
    document.title          = siteTitle;
    
    // JS-Scripts inititalisieren
    var gauges              = [];
    $.getScript("js/d3.v2.min.js", function() {                 // Init D3-Framework
        $.getScript("js/gauge.js", function() {                 // Init Gauge
            createGauge("gaugeviewer", "Viewer");               // Erstellung beider Rundinstrumente
	        createGauge("gaugechatter", "Chatter");								
        });
    });
    
    // Socket.IO-Verbindung aufbauen
    var socket = io.connect();
    
    // Fehlerhafte/Zurpckgewiesene Verbindung in Konsole loggen
    socket.on('error', function (reason){
      console.error('Unable to connect Socket.IO', reason);
      closeConnection();
    });
    
    // Signal, dass Verbindung verloren ist
    socket.on('disconnect', function () {
        $('#status').text(connectionLostMsg);
        closeConnection();
    });

    // Eintreffende Nachrichten vom Server
    socket.on('server', function(dataObj) {
        switch (dataObj.type) {
            case 'extra':
                switch (dataObj.data.statusType) {
                    case 'heartbeat':
                        break;
                    case 'chatconnected':
                        heartbeat();                                            // Heartbeat starten
                        $('#input').removeAttr('disabled');                     // Input-Feld aktivieren
                        $('#status').text(chatConnectedMsg);                    // Aufforderung zur Namenseingabe
                        $('#offline').show();                                   // "Disconnet"-Button einblenden
                        $('#connect').hide();                                   // "Connect"-Button ausblenden
                        $('#stats').show();                                     // Stats einblenden
                        $('#input').focus();
                        serverTime(dataObj.data.clientTime, dataObj.data.serverTime);
                        chatconnected = true;
                        scrollDown();
                        break;
                    case 'gauge':
                        gauges['gaugeviewer'].redraw(dataObj.data.gaugeviewer);
                        gauges['gaugechatter'].redraw(dataObj.data.gaugechatter);
                        break;
                    case 'blist':
                        displayBlist(dataObj.data.blist);
                        break;
                    case 'history':
                        addHistory(dataObj.data.history);
                        break;
                    case 'color':
                        myColor = dataObj.data.color;
                        myName = dataObj.data.name;
                        $('#status').text('Du bist nun als ' + myName + ' angemeldet. Viel Spass beim chatten.');
                        $('#input').removeAttr('disabled').focus();
                        $('#smileys').show();
                        break;
                }
            case 'status':
                switch (dataObj.data.statusType) {
                    case 'login':
                        var msg = dataObj.data.name + ' has joined the chatroom.';
                        addMessage(systemUser, msg, systemMsgColor, new Date());
                        break;
                    case 'logout':
                        var msg = dataObj.data.name + ' has left the chatroom.';
                        addMessage(systemUser, msg, systemMsgColor, new Date());
                        break;
                    case 'timeout':
                        var msg = dataObj.data.name + " logged out and disconnected (Timeout)."
                        addMessage(systemUser, dataObj.data.name, systemMsgColor, new Date());
                        break;
                    case '404':
                        $('#input').removeAttr('disabled');
                        var msg = dataObj.data.name + ' is offline. Message could not be delivered!';
                        addMessage(systemUser, msg, systemMsgColor, new Date(), true);
                        break;
                    case 'system':
                        $('#input').removeAttr('disabled');
                        addMessage(systemUser, dataObj.data.text, systemMsgColor, new Date(), true);
                        break;
                }
            case 'message':
                switch (dataObj.data.statusType) {
                    case 'message':
                        $('#input').removeAttr('disabled');                     // Input-Feld wieder aktivieren
                        addMessage(dataObj.data.message.from, dataObj.data.message.text,
                                   dataObj.data.message.color, new Date(dataObj.data.message.time));
                        break;
                    case 'private':
                        $('#input').removeAttr('disabled');                     // Input-Feld wieder aktivieren
                        addPrivate(dataObj.data.message.to, dataObj.data.message.from, dataObj.data.message.text, 
                                   dataObj.data.message.color, new Date(dataObj.data.message.time));
                        break;
                }
        }
        scrollDown();
    });
    
    // Erkennung ob Fenster Fokus hat
    $(window).focus(function() {
        windowHasFocus = true;
        checkFocus();
    });
    
    // Erkennung wenn Fenster gewechselt/verlassen wird
    $(window).blur(function() {
        windowHasFocus = false;
    });
    
    // ENTER in Input-Feld
    $('#input').keydown(function(e) {
        if (e.keyCode === 13) {                                 // ENTER-Key erkennen
            if (!$(this).val()) { return; }                     // Bei leerem Input-Feld nichts tun
            if ($(this).val().length > 500) { return; }
            socket.emit('message', 
                { rcpt: $('.ui-tabs-selected').text()
                , data: $(this).val().slice(0, 500) });         // Inhalt als "message" absenden
            if (myName === false) { myName = $(this).val(); }   // Name setzen
            $(this).val('');                                    // Input-Feld wieder leeren
            $('#input').attr('disabled', 'disabled');           // Input-Feld deaktivieren, bis Server bereit
        }
    });
    
    // Tabs - Input-Feld Focus, bei Tabswechsel
    $("#chattabs").tabs({
        select: function(event, ui) { $('#input').focus(); }
    });
    
    // Tabs - Hotkey zum Wechseln der Tabs (Taste DRÜCKEN)
    var hotkey = { 17: 0, 37: 0, 39: 0}
    $('body').keydown(function(e) {
        if (e.keyCode == 17 || e.keyCode == 37 || e.keyCode == 39) {
            hotkey[e.keyCode] = 1;
        }
        var tabdir = null;
        if (hotkey[17] == 1 && hotkey[37] == 1) {
            tabdir = 'prev';
        } else if (hotkey[17] == 1 && hotkey[39] == 1) {
            tabdir = 'next';
        }
        if (tabdir != null) {
            var tabcount = $('#chattabs').tabs('length');
            var tabselected = $('#chattabs').tabs('option', 'selected');
            if (tabdir == 'next' && tabselected <= tabcount - 1) {
                $('#chattabs').tabs('select',tabselected + 1)
            } else if (tabselected != 0) {
                $('#chattabs').tabs('select',tabselected - 1)
            }
        }
    });
    
    // Tabs - Hotkey zum Wechseln der Tabs (Taste LOSLASSEN)
    $('body').keyup(function(e) {
        if (e.keyCode == 17 || e.keyCode == 37 || e.keyCode == 39) {
            hotkey[e.keyCode] = 0;
        }
    });
    
    // Tabs - schließen bei Doppelklick
    $('#chattabs').bind('dblclick', function(e) {
        var tabs = $('#chattabs').tabs();
        var selected = tabs.tabs('option', 'selected');
        if (selected != 0) {
            $('#chattabs').tabs('remove', selected);
        }
    });
    
    // Tabs - Entfernen der Hinweisklasse f. ung. Nachrichten bei Wechsel auf Tab
    $('#chattabs').bind('tabsshow', function(event,ui) {
        if ($(ui.tab).children().hasClass('unread')) {
            $(ui.tab).children().removeClass('unread')
        }
        if ($(ui.tab).hasClass('unread')) {
            $(ui.tab).removeClass('unread')
        }
        scrollDown();
    });
    
        // Klick auf "disonnect"
    $('#offline').click(function() {
        closeConnection();
    });
    
    // Klick auf "connect"
    $('#connect').click(function() {
        socket.socket.connect();
        socket.emit('chatconnect');
    });
    
    // Smiley-Container bei Klick öffnen/schliessen
    $('#smileysheader').click(function() {
        if ($('#smileyscontent').is(':hidden')) {
            if ($('#statscontent').is(':visible')) {
                $('#statscontent').slideToggle('slow');
            }
            if ($('#rulescontent').is(':visible')) {
                $('#rulescontent').slideToggle('slow');
            }
        }
        $('#smileyscontent').slideToggle('slow');
    });
    
    // Smiley bei Klick einfügen
    $('#smileys img').click(function() {
        $('#input').val($('#input').val() + $(this).attr('id')).focus();
    });
    
    // Stats-Container bei Klick öffnen/schliessen
    $('#statsheader').click(function() {
        if ($('#statscontent').is(':hidden')) {
            if ($('#smileyscontent').is(':visible')) {
                $('#smileyscontent').slideToggle('slow');
            }
            if ($('#rulescontent').is(':visible')) {
                $('#rulescontent').slideToggle('slow');
            }
        }
        $('#statscontent').slideToggle('slow');
    });
    
    // Rules-Container bei Klick öffnen/schliessen
    $('#rulesheader').click(function() {
        if ($('#rulescontent').is(':hidden')) {
            if ($('#statscontent').is(':visible')) {
                $('#statscontent').slideToggle('slow');
            }
            if ($('#smileyscontent').is(':visible')) {
                $('#smileyscontent').slideToggle('slow');
            }
        }
        $('#rulescontent').slideToggle('slow');
    });
    
    // Rechte Maustaste deaktivieren
    document.oncontextmenu = function() { return false; };
    
    // Start der Titel-Animation
    function checkFocus() {
        if (!windowHasFocus) {
            if (titleInt) {
                clearInterval(titleInt);
                titleInt = false;
                document.title = siteTitle;
            }
            var titleAni = { 1: '*', 2: '*', 3: '*', 4: '*' }
            var i = 1;
            titleInt = setInterval(function() {
                if (i == 1) { titleAni[4] = '*'; }
                else { titleAni[i-1] = '*'; }
                if (i == 5) { i = 1; }
                titleAni[i] = '+';
                var curtitle = '';
                for (crs in titleAni) {
                    curtitle = curtitle + titleAni[crs];
                }
                document.title = ' - ' + curtitle + ' - ' + siteTitle;
                i++;
            }, 1000);
        } else {
            if (titleInt) {
                clearInterval(titleInt);
                titleInt = false;
                document.title = siteTitle;
            }
        }
    }
    
    // Scroll down
    function scrollDown() {
        $('.chatwindow').each(function() {
            var contentBox = $(this);                                   // Chatfenster-Selektor
            var contentBoxHeight = contentBox[0].scrollHeight;          // aktuelle Höhe des Chatfensters einlesen
            contentBox.scrollTop(contentBoxHeight);                     // bis ganz nach unten scrollen
        });
    }
    
    // Heartbeat
    function heartbeat() {
        setInterval(function() {                                        // Heartbeat nach festem Intervall ausführen
            socket.emit('heartbeat');                                   // "heartbeat" an den Server senden
        },heartbeatIntervall);
    }
    
    // LineHeight anpassen, wenn Smiley geschickt wird.
    function checkLineHeight(msgText) {
        var lineHeight = 0;
        var imgArr = msgText.split('<img');
        if (imgArr.length >= 2) {
            for (img in imgArr) {
                var heighttag = imgArr[img].split('height="');
                if (imgArr.length >= 2) {
                    for (height in heighttag) {
                        var heightnumber = heighttag[height].split('"');
                        for (clearnumber in heightnumber) {
                            if (heightnumber[clearnumber].slice(-2) == 'px') {
                                if (lineHeight < heightnumber[clearnumber].slice(0, -2)) {
                                    lineHeight = heightnumber[clearnumber].slice(0, -2);
                                }
                            }
                        }
                    }
                }
            }
        }
        return lineHeight;
    }
    
    // Nachricht in Chatfenster schreiben
    function addMessage(author, message, color, dt, allWindows) {                   // Nachricht immer ANHÄNGEN
        var prelineHeight = checkLineHeight(message);
        if (prelineHeight > 0) { 
            lineHeight = 'line-height: ' + prelineHeight + 'px;';
        } else {
            lineHeight = 'line-height: 1em;';
        }
        if (allWindows) {                               // Nachricht in ALLE Chatfenster schreiben
            jQuery.each($('.chatwindow'), function() {
                
                $(this).append('<p style="' + lineHeight + '"><span style="color:' + color + '">' + author + '</span> @ ' +
                    + (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'
                    + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes())
                    + ': ' + message + '</p>'
                );
            });
        } else {                                        // Nachricht nur ins aktuelle Chatfenster schreiben
            $('#chatwindow').append('<p style="' + lineHeight + '"><span style="color:' + color + '">' + author + '</span> @ ' +
                + (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'
                + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes())
                + ': ' + message + '</p>'
            );
        }
        if (author != systemUser) {                     // Klasse für "ungelesene Nachrichten" setzen
            jQuery.each($('#chattabs li'), function() {
                if (!$(this).hasClass('ui-state-active') && $(this).children().attr('href') == '#chat') {
                    $(this).children().addClass('unread');
                }
            });
            checkFocus();
        }
        scrollDown();
    }
    
    // Privatnachricht in Chatfenster schreiben
    function addPrivate(rcpt, author, message, color, dt) {                   // Nachricht immer ANHÄNGEN
        var prelineHeight = checkLineHeight(message);
        if (prelineHeight > 0) { 
            lineHeight = 'line-height: ' + prelineHeight + 5 + 'px;';
        } else {
            lineHeight = 'line-height: 1em;';
        }
        if (author == myName) {
            if (!$('#' + rcpt + 'prvt').length) {
                $('#chattabs').tabs("add", '#' + rcpt + 'prvt' , rcpt);
                $('#' + rcpt + 'prvt').css('padding', '0px');
                $('#' + rcpt + 'prvt').html('<div id="" class="chatwindow"></div>');
            }
            $('#' + rcpt + 'prvt .chatwindow').append('<p style="' + lineHeight + '"><span style="color:' + color + '">' + author + '</span> @ ' +
                 + (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'
                 + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes())
                 + ': ' + message + '</p>');
            jQuery.each($('#chattabs li'), function() {
                if (!$(this).hasClass('ui-state-active') && $(this).children().attr('href') == '#' + rcpt + 'prvt') {
                    $(this).children().children().addClass('unread');
                }
            });
            checkFocus();
        } else {
            if (!$('#' + author + 'prvt').length) {
                $('#chattabs').tabs("add", '#' + author + 'prvt' , author);
                $('#' + author + 'prvt').css('padding', '0px');
                $('#' + author + 'prvt').html('<div id="" class="chatwindow"></div>');
            }
            $('#' + author + 'prvt .chatwindow').append('<p style="' + lineHeight + '"><span style="color:' + color + '">' + author + '</span> @ ' +
                 + (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'
                 + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes())
                 + ': ' + message + '</p>');
            jQuery.each($('#chattabs li'), function() {
                if (!$(this).hasClass('ui-state-active') && $(this).children().attr('href') == '#' + author + 'prvt') {
                    $(this).children().children().addClass('unread');
                }
            });
            checkFocus();
        }
    }
    
    // Buddyliste einblenden
    function displayBlist(blist) {
        var htmlcontent = '<ul>';
        for (buddy in blist) {
            if (typeof blist[buddy] == 'object') {
                htmlcontent = htmlcontent + '<li id="' + blist[buddy].username + '" style="color:' + blist[buddy].usercolor + ';" class="buddy">' + blist[buddy].username + '</li>';
            }
        }
        htmlcontent = htmlcontent + '</ul>';
        $('#blist').html(htmlcontent);                                // aktuelle Buddyliste ERSETZT die alte
        $(".buddy").on({
            mouseenter: function() { $(this).addClass('buddyhover'); },
            mouseleave: function() { $(this).removeClass('buddyhover'); },
            mousedown: function(e){
                if ($(this).hasClass('buddy') & $(this).attr('id') != myName) {
                    $('#input').focus();
                    if (!$('#' + $(this).attr('id') + 'prvt').length) {
                        var nextindex = $('#chattabs').tabs('length') + 1;
                        $('#chattabs').tabs("add", '#' + $(this).attr('id') + 'prvt' , $(this).attr('id'), nextindex);
                        $('#' + $(this).attr('id') + 'prvt').css('padding', '0px');
                        $('#' + $(this).attr('id') + 'prvt').html('<div id="" class="chatwindow"></div>');
                    }
                    var selected = $('#chattabs a[href="#' + $(this).attr('id') + 'prvt"]').parent().index();
                    $('#chattabs').tabs('select', selected);
                }
                return false; 
            } 
        });
    }


    // History in Chatfenster schreiben
    function addHistory(data) {
        var htmlcontent = '';
        for (var i=0; i < data.length; i++) {
            var dt = new Date(data[i].time);
            htmlcontent = htmlcontent + '<p><span style="color:' + data[i].color + '">' + data[i].from + '</span> @ ' +
                 + (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'
                 + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes())
                 + ': ' + data[i].text + '</p>';
        }
        $('#chatwindow').html(htmlcontent);                                // History ERSETZT alle anderen Inhalte
    }

    // Verbindung beenden
    function closeConnection() {
        socket.emit('close');                                           // "close" an Server senden
        $('#input').attr('disabled', 'disabled');                       // Input-Feld deaktivieren
        $('#status').text(disconnectedMsg);                             // Status-Text anpassen
        $('#offline').hide();                                           // "Disconnect"-Button ausblenden
        $('#connect').show();                                           // "Connect"-Button einblenden
        $('#smileys').hide();                                           // Smileys ausblenden
        $('#stats').hide();                                           // Stats ausblenden
        $('#blist').html('');                                           // Buddyliste leeren
        gauges['gaugechatter'].redraw(0);                               // Rundinstrumente auf null setzen
        gauges['gaugeviewer'].redraw(0);
        myColor = false;                                                // eigene Farbe zurücksetzen
        myName = false;                                                 // eigenen Namen zurücksetzen
        chatconnected = false;                                          // Chatconnected-Flag zurückseten
        socket.disconnect();
    }
    
    // Rundinstrument erstellen
    function createGauge(name, label) {
		var config = {
			size: 100,
			label: label,
			max: 30,
			majorTicks: 7,
			minorTicks: 5
		}
		
		config.redZones = [];
		config.redZones.push({ from: 28, to: 30 });

		config.yellowZones = [];
		config.yellowZones.push({ from: 23, to: 28 });
		
		gauges[name] = new Gauge(name, config);
		gauges[name].render();
	}
	
	// Uhrzeit einblenden
	function displayTime() {
	    setInterval(function() {                                       
            var time = new Date();
            var hours = (time.getHours().toString().length == 1) ? 0 + time.getHours().toString() : time.getHours();
            var mins = (time.getMinutes().toString().length == 1) ? 0 + time.getMinutes().toString() : time.getMinutes();
            var secs = (time.getSeconds().toString().length == 1) ? 0 + time.getSeconds().toString() : time.getSeconds();
            var timeformat = hours + ':' + mins + ':' + secs + ' Uhr';
             $('#time').html(timeformat);
        },1000);
	    
	}
	
	// Zeiten berechnen für Statistik
	function serverTime(ctime, stime) {
	    if (cTimeInt) { clearInterval(cTimeInt); }
	    cTimeInt = setInterval(function() {
	        var curTime = new Date().getTime();
            timeDiff = curTime - ctime - (1000*60*60);
            var time = new Date();
            time.setTime(timeDiff);
            var hours = (time.getHours().toString().length == 1) ? 0 + time.getHours().toString() : time.getHours();
            var mins = (time.getMinutes().toString().length == 1) ? 0 + time.getMinutes().toString() : time.getMinutes();
            var secs = (time.getSeconds().toString().length == 1) ? 0 + time.getSeconds().toString() : time.getSeconds();
            var timeformat = 'Onlinezeit: ' + hours + ':' + mins + ':' + secs;
            $('#statsctime').html(timeformat);
        },1000);
        if (sTimeInt) { clearInterval(sTimeInt); }
        sTimeInt = setInterval(function() {
	        var curTime = new Date().getTime();
            timeDiff = curTime - stime - (1000*60*60);
            var time = new Date();
            time.setTime(timeDiff);
            var hours = (time.getHours().toString().length == 1) ? 0 + time.getHours().toString() : time.getHours();
            var mins = (time.getMinutes().toString().length == 1) ? 0 + time.getMinutes().toString() : time.getMinutes();
            var secs = (time.getSeconds().toString().length == 1) ? 0 + time.getSeconds().toString() : time.getSeconds();
            var timeformat = 'Server up: ' + hours + ':' + mins + ':' + secs;
            $('#statsstime').html(timeformat);
        },1000);
	}
});
