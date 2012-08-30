// Startconfig
var pathTohttpdocsFromHere = '/../';
process.title = 'UBChat';


// Strict-Mode
"use strict";

// all required modules
var app = require('http').createServer(handler).listen(8175)
    , url = require('url')
    , path = require('path')
    , io = require('socket.io').listen(app)
    , fs = require('fs')
    

// create a small webserver to deliver all files
function handler (req, res) {
    if (req.method !== 'GET') {
        res.writeHead(400);
        return res.end('400');
    }
    
    var httpdocsPath = __dirname + pathTohttpdocsFromHere;
    var urlObj = url.parse(req.url);
    var filePath = httpdocsPath + urlObj.pathname;
    if (filePath == httpdocsPath || filePath == httpdocsPath + '/') { filePath = httpdocsPath + '/index.html'; }
    
    var ext = path.extname(filePath);
    var contentType = 'text/html';
    switch (ext) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.gif':
            contentType = 'image/gif';
            break;
    }
    
    var stream = fs.createReadStream(filePath);
    stream.on('error', function() {
        res.writeHead(404);
        return res.end('404');
    });
    stream.once('fd', function() { res.writeHead(200); });
    res.setHeader("Content-Type", contentType);
    stream.pipe(res);
}

// include our ChatApp
var chat = require('./chat.js');
chat.chatApp(io, fs);