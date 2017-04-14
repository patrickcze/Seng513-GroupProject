var express = require('express');
var cov = require('compute-covariance');
var Correlation = require('node-correlation');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;


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
            let projects = [];

            ref.ref('users/' + uid + '/projects').once('value').then(function (snapshot) {
                let x = snapshot.val();
                for (let item in x) {
                    projectIDs.push(item);
                }
            }).then(function () {
                for (let projectID of projectIDs) {
                    ref.ref('projects/' + projectID).once('value').then((snapshot) => {
                        let result = snapshot.val();
                        result['id'] = snapshot.key;

                        projects.push(result);

                        if (projects.length === projectIDs.length) {
                            socket.emit('listOfUserProjects', {projects: projects});
                        }
                    })
                }
                socket.emit('listOfUserProjects', {projects: projects});
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

                    ref.ref('datasets-metadata/' + datasetID).once('value').then(function (snapshot) {
                        let result = snapshot.val();
                        result["id"] = snapshot.key;

                        datasetDetials.push(result);

                        if (datasetDetials.length === datasetIDs.length) {
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

            ref.ref('datasets/' + data.datasetid).once('value').then(function (snapshot) {
                if (data.viewOnly){
                    socket.emit('setDatasetViewOnly', {datasetid: data, data: snapshot.val()});
                } else {
                    socket.emit('setDataset', {datasetid: data, data: snapshot.val()});
                }
            });
        }
    });

    socket.on('getProjectWithId', (id) => {
        if (id) {
            let ref = firebase.database();

            console.log(id);

            ref.ref('projects/' + id).once('value').then(function (snapshot) {
                let project = snapshot.val();

                if (project){
                    project["id"] = id;
                }

                socket.emit('setProjectWithId', project);
            }, function (error) {
                // An error happened.
                console.log("ERROR");
            });
        }
    });

    socket.on('saveProjectDetailsInDB', (project) => {
        if (project) {
            let ref = firebase.database();

            ref.ref('projects').once('value').then(function (snapshot) {
                if (snapshot.hasChild(project.id)) {
                    let updates = {};

                    let projectPath = '/projects/' + project.id;

                    updates[projectPath + '/title'] = project.title;
                    updates[projectPath + '/datasetIDs'] = project.datasetIDs;
                    updates[projectPath + '/dataset1ID'] = project.dataset1ID;
                    updates[projectPath + '/dataset2ID'] = project.dataset2ID;
                    updates[projectPath + '/isPublic'] = project.isPublic;
                    updates[projectPath + '/visibleDataset'] = project.visibleDataset;
                    updates[projectPath + '/projectScreenshotURL'] = project.projectScreenshotURL;

                    firebase.database().ref().update(updates);
                }
            });
        }
    });

    socket.on('computeDatasetRatio', (data) => {
        let ref = firebase.database();
        let ds1 = null;
        let ds2 = null;

        ref.ref('datasets/'+data.dataset1id).once('value').then(function (snapshot1) {
            ds1 = snapshot1.val().data;

            if (ds1 && ds2){
                let dsCombined = computeRatioSet(ds1,ds2);

                socket.emit('plotCorrelation', dsCombined);
            }
        });

        ref.ref('datasets/'+data.dataset2id).once('value').then(function (snapshot2) {
            ds2 = snapshot2.val().data;

            if (ds1 && ds2){
                let dsCombined = computeRatioSet(ds1,ds2);

                socket.emit('plotCorrelation', dsCombined);
            }
        });
    });
});


function computeRatioSet(ds1, ds2) {
    let dsCombined = [];

    let ds1Sum = 0.0;
    let ds2Sum = 0.0;

    for (i in ds1){
        ds1Sum += ds1[i].value;
    }
    for (i in ds2){
        ds2Sum += ds2[i].value;
    }

    for (i in ds1){
        let newVal = Object.assign({}, ds1[i]);
        newVal.value = ((ds1[i].value/ds1Sum).toPrecision(4)-(ds2[i].value/ds2Sum).toPrecision(4)).toPrecision(4);

        dsCombined.push(newVal);
    }

    return dsCombined;
}
