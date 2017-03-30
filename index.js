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

//
io.on('connection', function (socket) {
    socket.on('getGlobalGeoJSON', (data) => {
        var globalData = require('./geojsonFiles/global.geojson.json');
        socket.emit('setGlobalGeoJSON', {
            globalData: globalData
        });
    });

    //Gets a list of the datasets that the user has associated with them
    socket.on('getListOfUserDatasets', (data) => {
        console.log("get user datasets");

        let uid = data.uid;

        if (uid) {
            let ref = firebase.database();
            let datasetIDs = [];
            let datasetDetials = [];

            ref.ref('users/' + uid + '/datasets').once('value').then(function (snapshot) {
                let x = snapshot.val();
                for (item in x) {
                    console.log(item);
                    datasetIDs.push(item);
                }
            }).then(function () {
                for (i in datasetIDs) {
                    var datasetID = datasetIDs[i];

                    console.log(datasetID);

                    ref.ref('datasets-metadata/'+datasetID).once('value').then(function (snapshot) {
                        var result = snapshot.val();
                        result["id"] = snapshot.key;

                        console.log(result);

                        datasetDetials.push(result);

                        if (datasetDetials.length === datasetIDs.length){
                            socket.emit('listOfUserDatasets', {dataset: datasetDetials});
                        }
                    });
                }



                // console.log(datasetIDs);
                // socket.emit('listOfUserDatasets', {datasetIDs: datasetIDs});
            });
        }
    });


});