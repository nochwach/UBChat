exports.chatApp = function (io, fs) {

    // Flooding                         
    // Multiple IPs                     OK
    // node-Heartbeat
    // Rechte (Config, Ignore)			
    // Rooms

    // Config
	var confObj = {
		historyLimit 	:	-100,						// History begrenzen auf die neuesten X Einträge (MINUS!)
		heartbeatTimeout:	10000,						// Heartbeat-Timeout in ms (gezwungener Logout!)
		logMessages		:	true,						// Sollen Nachrichten geloggt werden?
		logChatter		:	true,						// Sollen Chatter-Logins-Logouts geloggt werden?
		logViewer		:	true,						// Sollen Viewer-Logins-Logouts geloggt werden?
		logTimeouts		:	true,						// Sollen Timeouts geloggt werden?
		domainProtocol	:	'http://',					// Das verwendete Protokoll (mit :// !)
		domainPort		:	'www.raindrop.eu:8175/',	
		scriptPath		:	'',							// Pfad zum Script (Trailing-Slash!)
		smileyPath		:	'smileys/',					// Pfad zu den Smileys (Trailing-Slash!)
		multipleIPs		:	3,							// Achtung: Zwei Verbindungen pro User bre Reload!
		configpass		:	'1234567890'				// Passwort, um Chat zu konfigurieren
	}
	
    var historyLimit        = -100;                     // History begrenzen auf die neuesten X Einträge (MINUS!)
    var heartbeatTimeout    = 10000;                    // Heartbeat-Timeout in ms (gezwungener Logout!)
    var logMessages         = true;                     // Sollen Nachrichten geloggt werden?
    var logChatter          = true;                     // Sollen Chatter-Logins-Logouts geloggt werden?
    var logViewer           = true;                     // Sollen Viewer-Logins-Logouts geloggt werden?
    var logTimeouts         = true;                     // Sollen Timeouts geloggt werden?
    var domainProtocol      = 'http://';                // Das verwendete Protokoll (mit :// !)
    var domainPort          = 'www.raindrop.eu:8175/';  // IP bzw Domain (und evtl Port) (Trailing-Slash!)
                                                        // IP-C-Uni: 10.141.1.74
							                            // IP-L-Uni: 192.168.222.27
                                                        // IP-C-Hom: 178.24.92.169
    var scriptPath          = 'chat/';                  // Pfad zum Script (Trailing-Slash!)
    var smileyPath          = 'smileys/';               // Pfad zu den Smileys (Trailing-Slash!)
    var multipleIPs         = 3;                        // Anzahl gleichzeitig erlaubter Verbindungen pro IP
                                                        // Achtung: Aktuell zwei Verbindungen pro User notwendig!
    var configpass          = '1234567890';             // Passwort, um Chat zu konfigurieren
    var chatrooms           = {
        1:  'chat'
    };
        
    
    var smileyObj           = {}                        // Smiley-Objekt: Zeichenkombo und Bilddatei angeben
    smileyObj[':JUBEL:']    = { img: 'smilie_happy_011.gif', height: '27' };
    smileyObj[':D']         = { img: 'smilie_happy_309.gif', height: '27' };
    smileyObj[':)']         = { img: 'smilie_happy_053.gif', height: '20' };
    smileyObj[':THANKS:']   = { img: 'smilie_schild_033.gif', height: '49' };
    smileyObj[':BEER:']     = { img: 'smilie_trink_033.gif', height: '40' };
    smileyObj[':BECKS:']    = { img: 'smilie_trink_054.gif', height: '33' };
    smileyObj[':WHAT:']     = { img: 'smilie_denk_04.gif', height: '25' };
    smileyObj[':ROFL:']     = { img: 'smilie_hops_031.gif', height: '18' };
    smileyObj[':WALL:']     = { img: 'wall.gif', height: '20' };
    smileyObj[':ALDE:']     = { img: 'deppenalarm.gif', height: '50' };
    smileyObj[':(']         = { img: 'ranting.gif', height: '24' };
    smileyObj[':P']         = { img: 'smilie_frech_019.gif', height: '40' };
    smileyObj[':MICRO:']    = { img: 'smilie_b_056.gif', height: '70' };
    
    var usernameBadList = {
        1:  'admin', 2:  'Admin', 3:  'root', 4:  'Root', 5:  'mod', 6:  'Mod', 7:  'System', 8:  'system', 9:  'SYSTEM'
    };
    
    var msgBadList = {
        1:  'arsch', 2:  'Arsch', 3:  'a r s c h', 4:  'A r s c h', 5:  'fuck', 6:  'Fuck'
    };
   
    // <-- Ab hier nichts mehr ändern --> // <-- Ab hier nichts mehr ändern --> // <-- Ab hier nichts mehr ändern --> //
    
    // Init
    var history             = [];                   // History bleibt ein Array!!
    var heartbeats          = {};                   // Hier werden die TIMESTAMPS aller VIEWER eingetragen
    var heartbeatRun        = false;                // Sobald der Heartbeatcheck beginnt -> true
    var chatObj             = {};                   // chatObj speichert alle relevanten Informationen
    chatObj.chatter         = {};                   // Hier werden die Sockets aller CHATTER eingetragen
    chatObj.viewer          = {};                   // Hier werden die Sockets aller VIEWER eingetragen
    chatObj.info            = {};                   // Hier werden alle Infos aller User eingetragen
    chatObj.info.startTime  = new Date().getTime();
    var banObj              = [];                   // Liste mit allen gebannten Teilnehmern (IPs)
    
    // Konfiguration von Socket.IO
    io.configure(function (){
        io.set('authorization', function (handshakeData, callback) {
            //console.log(handshakeData);
            //console.log(io.sockets.manager.handshaken);
            IpCounter = 1;
            if (Object.keys(io.sockets.manager.handshaken).length > 0) {
                for (socketId in io.sockets.manager.handshaken) {
                    if (io.sockets.manager.handshaken[socketId].address.address == handshakeData.address.address) {
                        IpCounter = IpCounter + 1;
                    }
                }
            }
            if (Object.keys(banObj).length > 0) {
                cTime = new Date().getTime();
                for (bannedName in banObj) {
                    for (bannedIp in banObj[bannedName]) {
                        if (bannedIp == handshakeData.address.address && banObj[bannedName][bannedIp] > cTime) {
                            callback('Banned User!', false);
                        }
                    }
                }
            }
            if (IpCounter > confObj.multipleIPs) {
                callback('Too much connections. Limited by multipleIPs!', false);
            } else {
                callback(null, true);
            }
        });
        io.set('log level', 2);
    });

    // Farben für Clients inkl Zufallssortierung
        var colors = [ '#fb0f0f', '#c17c7c', '#883535', '#ed9021', '#bc9d77', '#7e501b', '#ece12f', '#c9c691', '#807b23', '#8dea13', '#b3d08d', '#5e8826', '#17f14f', '#95bfa0', '#23803b', '#28f1d2', '#a4d9d1', '#128573', '#1a99f1', '#90b5d0', '#1f567c', '#2342e3', '#616ca0', '#152679', '#6b24ed', '#8f7fac', '#432579', '#d622f1', '#b684bd', '#671a72' ];
    colors.sort(function(a,b) { return Math.random() > 0.5; } );

    // Sobald die Webseite angezeigt wird
    io.sockets.on('connection', function (socket) {
//        console.log(io.sockets);
//        console.log(socket.handshake);
//        socket.handshake.tester = 'blabla';
//        console.log(socket.handshake);
//        console.log(io.sockets.manager.handshaken);
        var userName    = false;            // userName zu Beginn false
        var userColor   = false;            // userColor zu Beginn false
        newConnection(socket);

        socket.on('chatconnect', function() {
            newConnection(socket);
        });
                
        // Wenn eine Nachricht eintrifft
        socket.on('message', function(message) {
            if (userName === false) {                                   // Wenn noch kein Username gesetzt wurde
                userName = verifyUsername(message.data, chatObj);       // userName verifizieren
                userColor = colors.shift();                             // Farbe aus Farbpool auswählen
                var dataObj = { type: 'extra', data: {
                    statusType: 'color',
                    color:      userColor,
                    name:       userName
                }}
                sentToClient2(false, socket, dataObj);
                chatObj.chatter[socket.id] = socket;                    // Socket in CLIENTS eintragen
                xLog('name', { 'id': socket.id, 'who': userName, 'what': userColor });
                var dataObj = { type: 'status', data: {
                    statusType: 'login',
                    name:       userName
                }}
                sentToClient2(true, chatObj.viewer, dataObj);
                sendGauge(chatObj);
                chatObj.info[socket.id] = { 
                    userid: socket.id,                          // Userid in infoObjekt schreiben
                    username: userName,                         // Username in infoObjekt schreiben
                    usercolor: userColor,                       // Usercolor in infoObjekt schreiben
                    userlogontime: new Date().getTime(),
                    userlastmsgtime: {},
                    userip: socket.handshake.address.address,
                    userport: socket.handshake.address.port
                };
                var dataObj = { type: 'extra', data: {
                    statusType:     'blist',
                    blist:          chatObj.info
                }}
                sentToClient2(true, chatObj.chatter, dataObj);
            } else {                                            // Wenn bereits ein Username vergeben wurde
                msgText = verifyMessage(message.data);
                if (configCheck(msgText, socket)) {
                    xLog('message', { 'who': userName, 'what': msgText }); // Log schreiben
                    var msgObj = {
                        time: (new Date()).getTime(),
                        text: msgText,
                        from: userName,
                        color: userColor,
                        to: message.rcpt
                    }
                    var privateCheck = usernameExist(chatObj, message.rcpt);
                    if (privateCheck) {
                        var dataObj = { type: 'message', data: {
                            statusType: 'private',
                            message:    msgObj
                        }}
                        sentToClient2(false, chatObj.chatter[privateCheck], dataObj);
                        var dataObj = { type: 'message', data: {
                            statusType: 'private',
                            message:    msgObj
                        }}
                        sentToClient2(false, chatObj.chatter[socket.id], dataObj);
                    } else {
                        history.push(msgObj);                              // History um aktuelle Nachricht erweitern
                        history = history.slice(confObj.historyLimit);          // History auf die neuesten X Einträge begrenzen
                        var validroom = false;
                        for (room in chatrooms) {
                            if (message.rcpt == chatrooms[room]) {
                                var dataObj = { type: 'message', data: {
                                    statusType: 'message',
                                    message:    msgObj
                                }}
                                sentToClient2(true, chatObj.viewer, dataObj);
                            } else {
                                var privateCheck = usernameExist(chatObj, userName);
                                var dataObj = { type: 'status', data: {
                                    statusType: '404',
                                    name:       message.rcpt
                                }}
                                sentToClient2(false, chatObj.chatter[privateCheck], dataObj);
                            }
                        }
                    }
                }
            }
        });

        // Wenn die Verbindung beendet werden soll
        socket.on('close', function() {
            closeConnection(socket, socket.id, 'logout');
	    });
        
        // Wenn ein heartbeat eintrifft
        socket.on('heartbeat', function() {
            socketid = socket.id;                               // Socket-Id einlesen
            heartbeats[socketid] = new Date().getTime();        // aktuellen TIMESTAMP in heartbeat-Objekt schreiben
            checkHeartbeats(socket);                            // heartbeat-Objekt überprüfen
        });
    });
    
    // Kontrolle, ob Konfiguration geändert werden soll
    function configCheck(msgText, socket) {
        if (msgText.slice(0,1) == '/') {
            msgArr = msgText.split(' ');
            if (msgArr[1] == confObj.configpass) {
                if (msgArr[0] == '/config') {
                
                } else if (msgArr[0] == '/ban' && msgArr.length >= 5) {
                	// /ban *** name time(min) reason
                    var banId = usernameExist(chatObj, msgArr[2]);
                    if (banId) {
                        var banIp = io.sockets.manager.handshaken[banId].address.address;
                        if (typeof banObj[msgArr[2]] == 'undefined') {
                            banObj[msgArr[2]] = [];
                        }
                        banObj[msgArr[2]][banIp] = new Date().getTime() + (msgArr[3] * 1000 * 60); 
                        chatObj.viewer[banId].emit('disconnect');
                        startIndex = msgArr[0].length + msgArr[1].length + msgArr[2].length + msgArr[3].length + 4;
                        var dataObj = { type: 'status', data: {
                            statusType:     'system',
                            text:    msgText.slice(startIndex)
                        }};
                        sentToClient2(true, chatObj.viewer, dataObj);
                    } else {
                    	var dataObj = { type: 'status', data: {
                            statusType:     'system',
                            text:    'User nicht online!'
                        }};
                        sentToClient2(false, socket, dataObj);
                    }
                } else if (msgArr[0] == '/unban' && msgArr.length >= 4) {
                	// /unban *** ip/name xyz
                	switch (msgArr[2]) {
                		case 'ip':
                			IpCode = '';
                			for (bannedName in banObj) {
                                for (bannedIp in banObj[bannedName]) {
                                	if (bannedIp == msgArr[3]) {
                                		delete banObj[bannedName][bannedIp];
                                		IpCode = IpCode + bannedIp + ', ';
                                	}
                                }
                            }
                			IpCode = IpCode.slice(0, -2);
                			var dataObj = { type: 'status', data: {
                                statusType:     'system',
                                text:    'IP(s) ' + IpCode + ' geloescht!'
                            }};
                            sentToClient2(false, socket, dataObj);
                			break;
                		case 'name':
                			NameCode = '';
                			for (bannedName in banObj) {
                				if (bannedName == msgArr[3]) {
                            		delete banObj[bannedName][bannedIp];
                            		NameCode = NameCode + bannedName + ', ';
                            	}
                            }
                			NameCode = NameCode.slice(0, -2);
                			var dataObj = { type: 'status', data: {
                                statusType:     'system',
                                text:    NameCode + ' geloescht!'
                            }};
                            sentToClient2(false, socket, dataObj);
                			break;
                	}
                } else if (msgArr[0] == '/showbans' && msgArr.length == 2) {
                	// /showbans ***
                	var banCode = 'Aktuelle Bans:<br />';
                	for (bannedName in banObj) {
                		banCode = banCode + bannedName + ':<br />';
                        for (bannedIp in banObj[bannedName]) {
                        	var banDate = new Date();
                        	var banTime = banDate.setTime(banObj[bannedName][bannedIp]);
                        	var banTimeFormat = banDate.getDate() + '.' + banDate.getMonth() + '.'
                        		+ ' ' + banDate.getHours() + ':' + banDate.getSeconds();
                            banCode = banCode + '&nbsp;&nbsp;&nbsp;&nbsp;' + bannedIp + ' =&gt; ' 
                            	+ banTimeFormat + ' Uhr, <br />';
                        }
                        banCode = banCode.slice(0, -8) + '<br />';
                    }
                	
                	var dataObj = { type: 'status', data: {
                        statusType:     'system',
                        text:    banCode
                    }};
                    sentToClient2(false, socket, dataObj);
                } else if (msgArr[0] == '/kick'  && msgArr.length >= 4) {
                	// /kick *** name reason
                    var kickId = usernameExist(chatObj, msgArr[2]);
                    if (kickId) {
                        chatObj.viewer[kickId].emit('disconnect');
                        startIndex = msgArr[0].length + msgArr[1].length + msgArr[2].length + 3;
                        var dataObj = { type: 'status', data: {
                            statusType:     'system',
                            text:    msgText.slice(startIndex)
                        }};
                        sentToClient2(true, chatObj.viewer, dataObj);
                    } else {
                    	var dataObj = { type: 'status', data: {
                            statusType:     'system',
                            text:    'User nicht online!'
                        }};
                        sentToClient2(false, socket, dataObj);
                    }
                } else {
                	var dataObj = { type: 'status', data: {
                        statusType:     'system',
                        text:    'Unbekannter Befehl!'
                    }};
                    sentToClient2(false, socket, dataObj);
                }
            } else {
            	var dataObj = { type: 'status', data: {
                    statusType:     'system',
                    text:    'Unbekannter Befehl!'
                }};
                sentToClient2(false, socket, dataObj);
            }
            return false;
        }
        return true;
    }
       
    // Gauge versenden
    function sendGauge(chatObj) {
        var dataObj = { type: 'extra', data: {
            statusType:     'gauge',
            gaugeviewer:    Object.keys(chatObj.viewer).length,
            gaugechatter:   Object.keys(chatObj.chatter).length
        }};
        sentToClient2(true, chatObj.viewer, dataObj);
    }
    
    // Jede Nachricht escapen um Injections zu verhindern (sehr simpel!)
    function htmlEntities(str, spaces) {
        if (spaces) { str = str.split(' ').join(''); }
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\\/g, '/');
    }

    // Nachricht verifizieren
    function verifyMessage(msgText) {
        msgText = msgText.slice(0, 500);                            // max Länge 500 Zeichen
        msgText = htmlEntities(msgText);                            // Sonderzeichen escapen
        msgText = msgCheckBadword(msgText);                         // Badwords ersetzen
        msgText = checkUrl(msgText);                                // URLs erkennen
        msgText = parseSmileys(msgText);                            // Smileys ersetzen
        return msgText;
    }
    
    // userName verifizieren
    function verifyUsername(userName, chatObj) {
        userName = htmlEntities(userName, true);                    // Sonderzeichen escapen
        userName = userName.slice(0, 20);                           // max Länge 20 Zeichen
        userName = usernameCheckBadword(userName);                  // Badwords ersetzen
        while (usernameExist(chatObj, userName)) {            // Doppelte Namen ändern
            var zufall = Math.random().toString().slice(-2);
            userName = userName + zufall;
        }
        return userName;
    }

    // Message Badwords überprüfen
    function msgCheckBadword(msgText) {
        for (word in msgBadList) { msgText = msgText.split(msgBadList[word]).join('*****'); }
        return msgText;
    }
    
    // userName Badwords überprüfen
    function usernameCheckBadword(username) {
        for (word in usernameBadList) {
            username = username.split(usernameBadList[word]).join('depp');
        }
        return username;
    }

    // userName auf bereits vorhandene überprüfen
    function usernameExist(chatObj, checkname) {
        for (id in chatObj.info) {
            if (typeof chatObj.info[id] == 'object' && chatObj.info[id].username == checkname) {
                return id;
            }
        }
        return false;
    }

    // Smileys ersetzen
    function parseSmileys(text) {
        for (smiley in smileyObj) {
            //var re = new RegExp(smiley,"g");
            //text = text.replace(re, '<img src="' + smileyImg + '" height="' + smileyObj[smiley].height + 'px">');
            var smileyImg = confObj.domainProtocol + confObj.domainPort + confObj.scriptPath + confObj.smileyPath + smileyObj[smiley].img;
            text = text.split(smiley).join('<img src="' + smileyImg + '" height="' + smileyObj[smiley].height + 'px">');
        }
        return text;
    }
    
    // Links automatisch erkennen
    function checkUrl(msgText) {
        var urlRegex0 = /(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w\.-]*)*\/?/gi;
        return msgText.replace(urlRegex0, function(url) {
            if (msgText.indexOf('...') != -1) { return url; }   // ... ist keine Url!
            if (RegExp.$1 == undefined) { urlPre = 'http://'; } else { urlPre = '' }
            return '<a href="' + urlPre + url + '" target="_blank">' + url + '</a>';
        });
    }

    // Heartbeats kontrollieren
    function checkHeartbeats(socket) {
        if (!heartbeatRun) {
            heartbeatRun = true;
            setInterval(function() {                                        // Heartbeatcheck nach festem Intervall ausführen
                for (client in heartbeats) {                                // heartbeat-Objekt durchlaufen
                    currentTime = new Date().getTime();                     // aktuellen TIMESTAMP einlesen
                    if (heartbeats[client] !== 'timeout'
                        && heartbeats[client] !== 'logout'
                        && heartbeats[client] < (currentTime - confObj.heartbeatTimeout)
                    ) {
                        // Wenn der im heartbeat-Objekt eingetragene Timestamp älter als der eingestellte Timeout ist,
                        // wird davon ausgegangen, dass der Client nicht mehr im Chat ist -> Zwangslogout
                        closeConnection(socket, client, 'timeout');
                    }
                }    
            }, confObj.heartbeatTimeout);
        }
    }

    // Verbindung herstellen
    function newConnection(socket) {
        chatObj.viewer[socket.id] = socket;                 // Socket in VIEWER eintragen
        setTimeout(function() { sendGauge(chatObj); },2000);// Gauge nach 2sec, da vorher auf Client initialisiert werden muss!!
        xLog('connect', { 'who': socket.id });              // Log schreiben
        var dataObj = { type: 'extra', data: {
            statusType: 'chatconnected',
            clientTime: new Date().getTime(),
            serverTime: chatObj.info.startTime,
        }};
        sentToClient2(false, socket, dataObj);
        
        // Wenn bereits Text geschrieben wurde, diesen an den Client senden (History)
        if (history.length > 0) {
            var dataObj = { type: 'extra', data: {
                statusType: 'history',
                history:    history
            }};
            sentToClient2(false, socket, dataObj);
        }
    }
    
    // Verbindung beenden closeType: logout/timeout
    function closeConnection(socket, socketid, closeType) {
        if (chatObj.info[socketid]) {                                       // Chatter:
            colors.push(chatObj.info[socketid].usercolor);                  // Farbe zurück in Farbpool geben
            delete chatObj.chatter[socketid];                               // Socket-ID aus CLIENTS-Liste löschen
            delete chatObj.viewer[socketid];                                    // Socket-ID aus VIEWER-Liste löschen
            sendGauge(chatObj);
            var dataObj = { type: 'status', data: {
                statusType: closeType,
                name:       chatObj.info[socketid].username
            }}
            sentToClient2(true, chatObj.viewer, dataObj);
            delete chatObj.info[socketid];                                  // Socket-ID aus INFO-Liste löschen
            var dataObj = { type: 'extra', data: {
                statusType:     'blist',
                blist:          chatObj.info
            }}
            sentToClient2(true, chatObj.chatter, dataObj);
            xLog(closeType, { 'who': socketid });                               // Log schreiben
            userName = false;                               // userName wieder zurücksetzen
            userColor = false;                              // userColor wieder zurücksetzen
        } else {                                                            // Viewer:
            delete chatObj.viewer[socketid];                                    // Socket-ID aus VIEWER-Liste löschen
            sendGauge(chatObj);
            xLog('disconnect', { 'who': socketid });       // Log schreiben
        }
        heartbeats[socketid] = closeType;                                   // Socket-ID aus HEARTBEAT-Liste löschen
        return;
    }

    // Log schreiben
    function xLog(status, data, file) {
        switch (status) {
            case 'connect':
                if (confObj.logViewer) {            // Viewer-Login-Log
                    console.log((new Date()) + ' Connection from Id ' + data.who + '.');
                }
                break;
            case 'logout':
                if (confObj.logChatter) {           // Chatter-Logout-Log
                    console.log((new Date()) + " Peer " + data.who + " logged out and disconnected.");
                }
                break;
            case 'disconnect':
                if (confObj.logViewer) {            // Viewer-Logout-Log
                    console.log((new Date()) + " Peer " + data.who + " disconnected.");
                }
                break;
            case 'message':
                if (confObj.logMessages) {          // Message-Log
                    console.log((new Date()) + ' Received Message from ' + data.who + ': ' + data.what);
                }
                break;
            case 'name':
                if (confObj.logChatter) {           // Chatter-Login-Log
                    console.log((new Date()) + ' User ' + data.id + ' is known as: ' + data.who + ' with ' + data.what + ' color.');
                }
                break;
            case 'timeout':
                if (confObj.logTimeouts) {           // Timeout-Log
                    console.log((new Date()) + " Peer " + data.who + " logged out and disconnected (Timeout).");
                }
                break;
        }

    }
    
    // Nachricht an Clients senden
    function sentToClient2(broadcast, targetObj, dataObj) {
        if (broadcast) {
            for (id in targetObj) {
                targetObj[id].emit('server', dataObj);
            }
        } else { targetObj.emit('server', dataObj); }
    }
}
