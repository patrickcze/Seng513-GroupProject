var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var mongo = require('mongodb').MongoClient;

/*MongoDB connnecyion info on mLab
mongodb://<dbuser>:<dbpassword>@ds133340.mlab.com:33340/umapit
dbuser:main
dbpassword:seng513
*/

mongo.connect('mongodb://main:seng513@ds133340.mlab.com:33340/umapit', (err, db) => {

});

http.listen(port, function () {
    console.log('listening on port', port);
});

app.use(express.static(__dirname + '/public'));

// listen to 'chat' messages
io.on('connection', function (socket) {

    socket.on('getGlobalGeoJSON', (data) => {
        var globalData = require('./geojsonFiles/global.geojson.json');
        socket.emit('setGlobalGeoJSON', {
            globalData: globalData
        });
    });
});