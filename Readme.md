UBChat
=============

A small chat based on node.js!

Installation
-------

* npm install socket.io
* if required, move content of node-directory to a non-web-reachable place
* open node/start.js
* set the "pathTohttpdocsFromHere" var
* set the "process.title"
* open node/chat.js
* set the confObj to your requirements
* start node with "start.js" as parameter


### Modifications
------------

Go to js/chat.js and change whatever you want to change ;)


### Known bugs/improvements
------------

* Buddycolors should be created randomly
* Buddycolors should be "visible" (grey on grey?)
* not sended private messages (recipient is offline) are visible in chathistory after reconnect of message-author
* possibility to register an account with passwort (requires database!)
* more (dynamic) chatrooms
* away-status
* recognition of link-parameter (eg. google.de?parameter=value)
* more and uniform smileys
* unknown Error after ~30 hours:
    buffer.js:242
    this.parent = new SlowBuffer(this.length);
                  ^
    RangeError: Maximum call stack size exceeded
* log to file
* log to database
* ~~flooding protection~~        ->          30.08.2012 23:53
* use node-heartbeat instead of own created heartbeat
* user-rights (config, ignore)
* use a comma seperated "usernameBadList" and "msgBadList" instead of object


### Commands
------------

replace **** with adminpassword 
* /kick **** Nickname reason
* /ban **** Nickname TimeInMinutes reason
* /unban **** Nickname
* /showbans ****
* /config **** showconfig         <- not yet working
* /config **** set key value      <- not yet working

