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

io.on('connection', function (socket) {
    socket.on('getGlobalGeoJSON', (data) => {
        var globalData = require('./geojsonFiles/global.geojson.json');
        socket.emit('setGlobalGeoJSON', {
            globalData: globalData
        });
    });

    //Gets a list of the datasets that the user has associated with them
    socket.on('getListOfUserProjects', (data) => {
        let uid = data.uid;

        if (uid) {
            let ref = firebase.database();
            let projectIDs = [];
            let projects= [];

            ref.ref('users/' + uid + '/projects').once('value').then(function (snapshot) {
                let x = snapshot.val();
                for (let item in x) {
                    projectIDs.push(item);
                }
            }).then(function () {
                for (let projectID of projectIDs){
                    ref.ref('projects/'+projectID).once('value').then((snapshot) => {
                        let result = snapshot.val();
                        result['id'] = snapshot.key;

                        projects.push(result);

                        if (projects.length === projectIDs.length){
                            socket.emit('listOfUserProjects', {projects: projects});
                        }
                    })
                }
            });
        }
    });

    //Gets a list of the datasets that the user has associated with them
    socket.on('getListOfUserDatasets', (data) => {
        let uid = data.uid;

        if (uid) {
            let ref = firebase.database();
            let datasetIDs = [];
            let datasetDetials = [];

            ref.ref('users/' + uid + '/datasets').once('value').then(function (snapshot) {
                let x = snapshot.val();
                for (let item in x) {
                    datasetIDs.push(item);
                }
            }).then(function () {
                for (i in datasetIDs) {
                    let datasetID = datasetIDs[i];

                    ref.ref('datasets-metadata/'+datasetID).once('value').then(function (snapshot) {
                        let result = snapshot.val();
                        result["id"] = snapshot.key;

                        datasetDetials.push(result);

                        if (datasetDetials.length === datasetIDs.length){
                            socket.emit('listOfUserDatasets', {dataset: datasetDetials});
                        }
                    });
                }
            });
        }
    });

    socket.on('getGlobalGeoJSON', () => {
        var globaljson = require('./geojsonFiles/global.geojson.json');

        socket.emit('globalGeoJSON', globaljson);
    });

    socket.on('getDatasetWithID', (data) => {
        if (data) {
            let ref = firebase.database();

            console.log(data);
            ref.ref('datasets/' + data.datasetid).once('value').then(function (snapshot) {
                console.log(snapshot.val());

                socket.emit('plotDataset', {datasetid: data, data: snapshot.val()});
            })
        }
    });

    socket.on('getProjectWithId', (id) => {
        if (id) {
            let ref = firebase.database();

            console.log(id);

            ref.ref('projects/' + id).once('value').then(function (snapshot) {
                let project = snapshot.val();
                project["id"] = id;

                socket.emit('setProjectWithId', project);
            });
        }
    });
});