$(function () {
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
            setupProjectFromID($(this).attr("projectid"), socket);
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

        setupMapView();
    });
});

function setupProjectFromID(id, socket) {
    changeToProjectView();

    let project;
    let geojson;

    $('#main-map-container').removeClass('hidden');

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

        // Ask for geojson data
        socket.emit('getGlobalGeoJSON');
    });

    // Draw the global geojson map
    socket.on('globalGeoJSON', (globaljson) => {
        console.log(globaljson);

        geojson = L.geoJson(globaljson).addTo(map);

        socket.emit('getDatasetWithID', {datasetid: project.datasetIDs[0]});
    });

    // Plot the dataset within the project onto the map
    socket.on('plotDataset', (dataset) => {
        console.log(dataset);
        console.log(geojson);

        let data = dataset.data.data;

        geojson.eachLayer(function (layer) {
            let countryCode = layer.feature.properties.iso_a3;

            for (let dataPoint of data){
                if (dataPoint.isoA3 === countryCode){
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
    });
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

function setupMapView() {
    $('#main-map-container').removeClass('hidden');

    let map = L.map('map').setView([46.938984, 2.373590], 4);
    let CartoDB_DarkMatter = L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
        subdomains: 'abcd',
        maxZoom: 19,
        maxBoundsViscosity: 1.0
    }).addTo(map);

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