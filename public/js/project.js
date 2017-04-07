$(function () {
    let userDatasets = null;

    //Initialize Socket Connection
    var socket = io();

    //Initialize Firebase
    var config = {
        apiKey: "AIzaSyCDVUYROx4SJurgy01twBlRM9LZZuhGLpQ",
        authDomain: "umapit-io.firebaseapp.com",
        databaseURL: "https://umapit-io.firebaseio.com",
        storageBucket: "umapit-io.appspot.com",
        messagingSenderId: "349495637518"
    };

    firebase.initializeApp(config);

    // Setup the auth object to get user details for further use
    firebase.auth().onAuthStateChanged(function (firebaseUser) {
        if (firebaseUser) {
            console.log(firebaseUser);
            //Redirect to the maps page

            socket.emit('getListOfUserDatasets', {uid: firebaseUser.uid});
            socket.emit('getListOfUserProjects', {uid: firebaseUser.uid});
        } else {
            console.log("not logged in");
        }
    });

    $('#uploadForm').submit(function () {
        $("#status").empty().text("File is uploading...");
        $(this).ajaxSubmit({
            error: function (xhr) {
                status('Error: ' + xhr.status);
            },
            success: function (response) {
                console.log(response)
                $("#status").empty().text(response);
            }
        });
    });

    // All for the user to be logged out when the logout button is clicked
    $('#logoutUserBtn').on("click", function () {
        firebase.auth().signOut().then(function () {
            // Sign-out successful.
            window.location.replace('/');
        }, function (error) {
            // An error happened.
        });
    });

    // Get a list of the user data sets so that this information can be prefilled within the modal
    socket.on('listOfUserDatasets', (data) => {
        userDatasets = data.dataset;
        console.log(userDatasets);
        for (let dataset of data.dataset) {
            //Setup the options within the modal
            let option = '<option value="' + dataset.id + '">' + dataset.name + '</option>';
            $("#projectModalDataSetSelection").append(option);

            //Setup the cards within the datasetCardArea
            let card = '<div class="card" style="width: 20rem;"><div class="card-block"> <h4 class="card-title">' + dataset.name + '</h4> <p class="card-text">332 Entries</p> </div> </div>';
            $('#datasetCardArea').append(card);
        }
    });


    //Get a list of the users projects
    socket.on('listOfUserProjects', (data) => {
        for (let project of data.projects) {
            let card = '<div class="card project-card" style="width: 20rem;" projectid="' + project.id + '"><div class="card-block"><h4 class="card-title">' + project.title + '</h4> <p class="card-text"></p> </div> </div>';
            $('#mapCardArea').append(card);
        }

        $(".project-card").click(function () {
            console.log("Handler for .click() called.");
            console.log($(this).attr("projectid"));
            setupProjectFromID($(this).attr("projectid"), socket, userDatasets);
        });
    });

    //Make the different map view toggle appropriately
    $('#mapsLink').on('click', function () {
        $('#datasetsLink').removeClass('active');
        $('#mapsLink').addClass('active');

        $('#datasetCardArea').addClass('collapse');
        $('#main-map-container').addClass('hidden');
        $('#mapCardArea').removeClass('collapse');

        clearMap();
    });

    $('#datasetsLink').on('click', function () {
        $('#mapsLink').removeClass('active');
        $('#datasetsLink').addClass('active');

        $('#mapCardArea').addClass('collapse');
        $('#main-map-container').addClass('hidden');
        $('#datasetCardArea').removeClass('collapse');

        clearMap();
    });

    // Display modal to start creating a new project
    $('#createNewMapCard').on('click', () => {
        $('#newProjectModal').modal('show');
    });

    $('#createNewProjectButton').on('click', () => {
        $('#newProjectModal').modal('hide');
        changeToProjectView();
        setupProjectInDatabase(firebase);

        setupMapView(userDatasets);
    });

    // Display modal to start creating a new project
    $('#createNewDatasetCard').on('click', () => {
        $('#newDatasetModal').modal('show');
    });

    $('#datasetNextStepButton').on('click', () => {
        $('#newDatasetModalLabel').text("Upload your filled in template");
        $('#newDatasetModalBody').html('<form id="uploadForm" enctype="multipart/form-data" action="/api/dataset" method="post" target="_blank"><input type="file" name="userDataset"/><input type="submit" value="Upload Image" name="submit"><input type=\'text\' id=\'random\' name=\'random\'><br><span id="status"></span></form>');

    });


});


function setupProjectFromID(id, socket, userDatasets) {
    changeToProjectView();

    let project;
    let geojson;

    let projectDatasets = [];

    $('#main-map-container').removeClass('hidden');

    //Get all the fields setup for the project
    for (let dataset of userDatasets) {
        let option = '<option value="' + dataset.id + '">' + dataset.name + '</option>';
        $('#dataset1Select').append(option);
    }

    for (let dataset of userDatasets) {
        let option = '<option value="' + dataset.id + '">' + dataset.name + '</option>';
        $('#dataset2Select').append(option);
    }

    $('#inlineRadio1').prop("checked", true);

    //Setup the Map
    let map = L.map('map').setView([46.938984, 2.373590], 4);
    let CartoDB_DarkMatter = L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
        subdomains: 'abcd',
        maxZoom: 10,
        maxBoundsViscosity: 1.0
    }).addTo(map);

    //Get the details of the project
    socket.emit('getProjectWithId', id);

    socket.on('setProjectWithId', (data) => {
        project = data;

        $("#projectTitleField").val(project.title);

        // Ask for geojson data
        socket.emit('getGlobalGeoJSON');

        for (i in project.datasetIDs) {
            console.log(project.datasetIDs[i]);
            socket.emit('getDatasetWithID', {datasetid: project.datasetIDs[i]});
        }
    });

    // Draw the global geojson map
    socket.on('globalGeoJSON', (globaljson) => {
        console.log(globaljson);

        geojson = L.geoJson(globaljson, {
            style: {
                fillColor: "#FFFFFF",
                opacity: 0
            }
        }).addTo(map);
    });

    socket.on('setDataset', (dataset) => {
        console.log(dataset);
        projectDatasets.push(dataset);

        if (dataset.datasetid.datasetid === $('#dataset1Select').val()) {
            plotDataset(dataset.data.data);
        }
    });

    $('input[type=radio][name=inlineRadioOptions]').change(function () {
        if (this.value === 'dataset1') {
            let dataset1id = $('#dataset1Select').val();

            if (dataset1id === "-1") {
                clearPlotDataset();
            } else {
                for (let dataset of projectDatasets) {
                    if (dataset1id === dataset.datasetid.datasetid) {
                        plotDataset(dataset.data.data);
                    }
                }
            }
        }
        else if (this.value === 'dataset2') {
            let dataset2id = $('#dataset2Select').val();

            if (dataset2id === "-1") {
                clearPlotDataset();
            } else {
                for (let dataset of projectDatasets) {
                    if (dataset2id === dataset.datasetid.datasetid) {
                        plotDataset(dataset.data.data);
                    }
                }
            }
        }
        else if (this.value === 'correlation') {
            let dataset1id = $('#dataset1Select').val();
            let dataset2id = $('#dataset2Select').val();

            let ds1Values = [];
            let ds2Values = [];

            for (let dataset of projectDatasets) {
                if (dataset1id === dataset.datasetid.datasetid) {
                    console.log(dataset.data.data);

                    for (let value of dataset.data.data){
                        ds1Values.push(value.Value);
                    }
                }
                if (dataset2id === dataset.datasetid.datasetid) {
                    console.log(dataset.data.data);

                    for (let value of dataset.data.data){
                        ds2Values.push(value.Value);
                    }
                }
            }

            if (ds1Values.length > 0 && ds2Values.length > 0){
                console.log(ds1Values, ds2Values);

                socket.emit('computeCovariance', {set1: [89], set2: [23]});
            }

        }
    });

    $('#saveProjectChangesButton').on('click', () => {
        let projectData = {
            title: $('#projectTitleField').val(),
            datasetIDs: [],
            dataset1ID: $('#dataset1Select').val(),
            dataset2ID: $('#dataset2Select').val(),
            id: project.id
        };

        if (projectData.dataset1ID !== "-1") {
            projectData.datasetIDs.push(project.dataset1ID);
        }
        if (projectData.dataset2ID !== "-1") {
            projectData.datasetIDs.push(project.dataset1ID);
        }

        console.log(projectData);

        socket.emit('saveProjectDetailsInDB', projectData);
    });

    function plotDataset(data) {
        geojson.eachLayer(function (layer) {
            let countryCode = layer.feature.properties.iso_a3;

            for (let dataPoint of data) {
                if (dataPoint.isoA3 === countryCode) {
                    layer.setStyle({
                        fillColor: getColor(dataPoint.Value),
                        weight: 2,
                        opacity: 1,
                        color: 'white',
                        dashArray: '3',
                        fillOpacity: 0.7
                    });
                }
            }
        });
    }

    function clearPlotDataset() {
        geojson.eachLayer(function (layer) {
            layer.setStyle({
                fillColor: "#FFFFFF",
                weight: 2,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.0
            });
        });
    }
}


function clearMap() {
    $('#main-map-container').html('<div id="map" class="col-12"></div>');
}

function getColor(d) {
    return d > 70 ? '#800026' :
        d > 60 ? '#BD0026' :
            d > 50 ? '#E31A1C' :
                d > 40 ? '#FC4E2A' :
                    d > 30 ? '#FD8D3C' :
                        d > 20 ? '#FEB24C' :
                            d > 10 ? '#FED976' :
                                '#FFEDA0';
}

function setupMapView(userDatasets) {
    $('#main-map-container').removeClass('hidden');

    let map = L.map('map').setView([46.938984, 2.373590], 4);
    let CartoDB_DarkMatter = L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
        subdomains: 'abcd',
        maxZoom: 19,
        maxBoundsViscosity: 1.0
    }).addTo(map);

    for (dataset in userDatasets) {
        let option = '<option value="' + dataset.id + '">' + dataset.name + '</option>';
        $('#dataset1Select').append(option);
    }
    //TODO: Need to load in the details of the map
}

function setupProjectInDatabase(firebase) {
    let projectTitle = $('#projectTitle').val();
    let datasetID = $('#projectModalDataSetSelection').val();
    let currentUserID = firebase.auth().currentUser.uid;

    console.log(projectTitle, datasetID);

    // A project entry.
    var projectPost = {
        title: projectTitle,
        datasetIDs: [datasetID]
    };

    // Get a key for a new project.
    var newPostKey = firebase.database().ref().child('projects').push().key;

    // Write the new project's data simultaneously
    var updates = {};
    updates['/projects/' + newPostKey] = projectPost;
    updates['/users/' + currentUserID + '/projects/' + newPostKey] = true;

    return firebase.database().ref().update(updates);
}

function changeToProjectView() {
    $('#datasetsLink').removeClass('active');
    $('#mapsLink').removeClass('active');

    $('#datasetCardArea').addClass('collapse');
    $('#mapCardArea').addClass('collapse');
}