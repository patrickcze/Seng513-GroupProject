var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var mongo = require('mongodb').MongoClient;

var firebase = require('firebase');
var firApp = firebase.initializeApp({
    apiKey: "AIzaSyCDVUYROx4SJurgy01twBlRM9LZZuhGLpQ",
    authDomain: "umapit-io.firebaseapp.com",
    databaseURL: "https://umapit-io.firebaseio.com",
    storageBucket: "umapit-io.appspot.com",
    messagingSenderId: "349495637518"
});

var router = require('./app/routes');
app.use('/', router);
app.use(express.static(__dirname + '/public'));

http.listen(port, function () {
    console.log('listening on port', port);
});

// listen to 'chat' messages
io.on('connection', function (socket) {
    socket.on('getGlobalGeoJSON', (data) => {
        var globalData = require('./geojsonFiles/global.geojson.json');
        socket.emit('setGlobalGeoJSON', {
            globalData: globalData
        });
    });
});