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

            socket.emit('getListOfUserDatasets',{uid:firebaseUser.uid});
            socket.emit('getListOfUserProjects',{uid:firebaseUser.uid});
        } else {
            console.log("not logged in");
        }
    });

    // All for the user to be logged out when the logout button is clicked
    $('#logoutUserBtn').on("click", function () {
        firebase.auth().signOut().then(function() {
            // Sign-out successful.
            window.location.replace('/');
        }, function(error) {
            // An error happened.
        });
    });

    // Get a list of the user data sets so that this information can be prefilled within the modal
    socket.on('listOfUserDatasets', (data) => {
        for (let dataset of data.dataset) {
            //Setup the options within the modal
            let option = '<option value="'+dataset.id+'">'+dataset.name+'</option>';
            $("#projectModalDataSetSelection").append(option);

            //Setup the cards within the datasetCardArea
            let card = '<div class="card" style="width: 20rem;"><div class="card-block"> <h4 class="card-title">'+dataset.name+'</h4> <p class="card-text">332 Entries</p> </div> </div>';
            $('#datasetCardArea').append(card);
        }
    });



    //Get a list of the users projects
    socket.on('listOfUserProjects', (data) => {
        for (let project of data.projects) {
            let card = '<div class="card project-card" style="width: 20rem;" projectid="'+project.id+'"><div class="card-block"><h4 class="card-title">'+project.title+'</h4> <p class="card-text"></p> </div> </div>';
            $('#mapCardArea').append(card);
        }

        $(".project-card").click(function() {
            console.log( "Handler for .click() called." );
            console.log($(this).attr("projectid"));
            setupProjectFromID($(this).attr("projectid"));
        });
    });

    //Make the different map view toggle appropriately
    $('#mapsLink').on('click', function () {
        $('#datasetsLink').removeClass('active');
        $('#mapsLink').addClass('active');

        $('#datasetCardArea').addClass('collapse');
        $('#main-map-container').addClass('hidden');
        $('#mapCardArea').removeClass('collapse');
    });

    $('#datasetsLink').on('click', function () {
        $('#mapsLink').removeClass('active');
        $('#datasetsLink').addClass('active');

        $('#mapCardArea').addClass('collapse');
        $('#main-map-container').addClass('hidden');
        $('#datasetCardArea').removeClass('collapse');
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

function setupProjectFromID(id) {
    changeToProjectView();

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