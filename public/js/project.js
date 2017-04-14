$(function () {

    
    // Allow popovers in bootstrap
    $('[data-toggle="popover"]').popover()

    
    let userDatasets = null;

    var urlParams;
    (window.onpopstate = function () {
        var match,
            pl = /\+/g,  // Regex for replacing addition symbol with a space
            search = /([^&=]+)=?([^&]*)/g,
            decode = function (s) {
                return decodeURIComponent(s.replace(pl, " "));
            },
            query = window.location.search.substring(1);

        urlParams = {};
        while (match = search.exec(query))
            urlParams[decode(match[1])] = decode(match[2]);
    })();

    console.log(urlParams);

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
        if (urlParams.projectid) {
            setupViewOnlyProject(urlParams.projectid, socket);
        } else if (firebaseUser) {
            console.log(firebaseUser);
            //Redirect to the maps page

            socket.emit('getListOfUserDatasets', {uid: firebaseUser.uid});
            socket.emit('getListOfUserProjects', {uid: firebaseUser.uid});
        } else {
            window.location.replace('/');
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
            let card = '<div class="card project-card" style="width: 20rem; height: 15rem;"> <div class="card-block"><div class="dropdown"><button class="btn moreoptions dropdown-toggle" type="button" id="moreMenu" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true"></button><ul class="dropdown-menu dropdown-menu-right" aria-labelledby="moreMenu"><li><a href="#" class="standardMenuOption">Rename</a></li><li><a href="#" class="deleteMenuOption">Delete</a></li></ul></div></p></div><h6 class="card-title">' + dataset.name + '</h6></div>';
            $('#datasetCardArea').append(card);
        }
    });


    //Get a list of the users projects
    socket.on('listOfUserProjects', (data) => {
        for (let project of data.projects) {
            
            let card = '<div class="card project-card" style="width: 20rem; height: 15rem;" projectid="' + project.id + '"> <img class="card-img-top" src="northamerica.png" alt="Card image" style="height:12rem; width:19.9rem; position:absolute;"><div class="card-block"><div class="dropdown"><button class="btn moreoptions dropdown-toggle" type="button" id="moreMenu" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true"></button><ul class="dropdown-menu dropdown-menu-right" aria-labelledby="moreMenu"><li><a href="#" class="standardMenuOption">Rename</a></li><li><a href="#" class="deleteMenuOption">Delete</a></li></ul></div></p></div><h6 class="card-title">' + project.title + '</h6></div>';
            $('#mapCardArea').append(card);
        }
        
        // from http://stackoverflow.com/questions/12115833/adding-a-slide-effect-to-bootstrap-dropdown
        $('.dropdown').on('show.bs.dropdown', function() {
            $(this).find('.dropdown-menu').first().stop(true, true).slideDown();
        });

        // Add slideUp animation to Bootstrap dropdown when collapsing.
        $('.dropdown').on('hide.bs.dropdown', function() {
            $(this).find('.dropdown-menu').first().stop(true, true).slideUp();
        });
        
        

        $(".project-card img").click(function () {
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
        let promiseandkey = setupProjectInDatabase(firebase);

        promiseandkey[0].then(() => {
            setupProjectFromID(promiseandkey[1], socket, userDatasets);
        });
    });

    // Display modal to start creating a new project
    $('#createNewDatasetCard').on('click', () => {
        $('#newDatasetModal').modal('show');
    });

    // Display modal to start creating a new project
    $('#shareProjectButton').on('click', () => {
        $('#shareProjectModal').modal('show');
    });

    $('#datasetNextStepButton').on('click', () => {
        $('#newDatasetModalLabel').text("Upload your filled in template data");
        $('#newDatasetModalBody').html('<form id="uploadForm" enctype="multipart/form-data" action="/api/dataset" method="post" target="_blank"><input type="file" name="userDataset"/><input type="submit" value="Upload Dataset" name="submit"><input type=\'text\' id=\'random\' name=\'random\'><br><span id="status"></span></form>');
    });
});

function setupViewOnlyProject(id, socket) {
    changeToProjectView();

    $('#sidebar').addClass('collapse');

    let project = null;
    let geojson = null;
    let map = null;
    let datasetToDisplay = null;

    let projectDatasets = [];

    $('#logoutUserBtn').addClass('collapse');
    $('#mapsLink').addClass('hidden');
    $('#datasetsLink').addClass('hidden');
    $('#map').attr("class", "col-12");

    //Get the details of the project
    socket.emit('getProjectWithId', id);

    socket.on('setProjectWithId', (data) => {
        project = data;

        if (!project || !project.isPublic) {
            window.location.replace('/');
        }

        switch (project.visibleDataset) {
            case "dataset1":
                datasetToDisplay = project.dataset1ID;
                break;
            case "dataset2":
                datasetToDisplay = project.dataset2ID;
                break;
            case "correlation":
                datasetToDisplay = "correlation";
                break;
        }

        console.log(datasetToDisplay);

        console.log('PROJECT:', data);

        $("#projectTitleField").val(project.title);
        $('#main-map-container').removeClass('hidden');

        //Setup the Map
        map = L.map('map', {
            center: [46.938984, 2.373590],
            zoom: 4,
            preferCanvas: true
        });

        let OpenStreetMap_BlackAndWhite = L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        // Ask for geojson data
        socket.emit('getGlobalGeoJSON');

        if (datasetToDisplay === "correlation") {
            socket.emit('computeDatasetRatio', {dataset1id: project.dataset1ID, dataset2id: project.dataset2ID});
            socket.on('plotCorrelation', (data) => {
                console.log(data);
                plotDataset(data, geojson);
            });
        } else {
            for (i in project.datasetIDs) {
                console.log(project.datasetIDs[i]);
                socket.emit('getDatasetWithID', {datasetid: project.datasetIDs[i], viewOnly: true});
            }
        }
    });

    // Draw the global geojson map
    socket.on('globalGeoJSON', (globaljson) => {
        console.log(globaljson);

        geojson = L.geoJson(globaljson, {
            style: {
                fillColor: "#FFFFFF",
                opacity: 0.0
            }
        }).addTo(map);
    });

    socket.on('setDatasetViewOnly', (dataset) => {
        console.log(dataset);
        projectDatasets.push(dataset);

        if (dataset.datasetid.datasetid === datasetToDisplay) {
            plotDataset(dataset.data.data, geojson);
        }
    });

    function plotDataset(data, geojson) {
        console.log(data);
        geojson.eachLayer(function (layer) {
            let countryCode = layer.feature.properties.iso_a3;

            for (let dataPoint of data) {
                if (dataPoint.isoA3 === countryCode) {
                    layer.setStyle({
                        fillColor: getColor(dataPoint.value),
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
}

function setupProjectFromID(id, socket, userDatasets) {
    changeToProjectView();

    console.log("setup project");

    let project = null;
    let geojson = null;

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
    let map = L.map('map', {
        center: [46.938984, 2.373590],
        zoom: 4,
        preferCanvas: true
    });

    let OpenStreetMap_BlackAndWhite = L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    //Get the details of the project
    socket.emit('getProjectWithId', id);

    socket.on('setProjectWithId', (data) => {
        project = data;
        console.log('PROJECT:', data);

        $("#projectTitleField").val(project.title);

        if (project.isPublic) {
            $('#publicCheckbox').prop('checked', true);
            $('#publicURL').val('http://127.0.0.1:3000/project?projectid=' + project.id);
        }

        // Ask for geojson data
        socket.emit('getGlobalGeoJSON');

        for (i in project.datasetIDs) {
            console.log(project.datasetIDs[i]);
            socket.emit('getDatasetWithID', {datasetid: project.datasetIDs[i], viewOnly: false});
        }
    });

    // Change the textbox
    $('#publicCheckbox').change(function () {
        if ($('#publicCheckbox').prop('checked')) {
            $('#publicURL').val('http://127.0.0.1:3000/project?projectid=' + project.id);
        } else {
            $('#publicURL').val('');
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

        if (dataset.datasetid.datasetid === project.dataset1ID) {
            $('#dataset1Select').val(project.dataset1ID);
        }
        if (dataset.datasetid.datasetid === project.dataset2ID) {
            $('#dataset2Select').val(project.dataset2ID);
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

            socket.emit('computeDatasetRatio', {dataset1id: dataset1id, dataset2id: dataset2id});
            socket.on('plotCorrelation', (data) => {
                console.log(data);
                plotDataset(data);
            });
        }
    });

    $('#saveProjectChangesButton').on('click', () => {
        let projectData = {
            title: $('#projectTitleField').val(),
            datasetIDs: [],
            dataset1ID: $('#dataset1Select').val(),
            dataset2ID: $('#dataset2Select').val(),
            id: project.id,
            isPublic: $('#publicCheckbox').prop('checked'),
            visibleDataset: $('input[type=radio][name=inlineRadioOptions]:checked').val()
        };

        if (projectData.dataset1ID !== "-1") {
            projectData.datasetIDs.push(project.dataset1ID);
        }
        if (projectData.dataset2ID !== "-1") {
            projectData.datasetIDs.push(project.dataset2ID);
        }

        console.log(projectData);

        socket.emit('saveProjectDetailsInDB', projectData);
    });

    $('#downloadMapAsPNG').on('click', () => {
        // This code allows for the map to saved as a png
        var c = document.querySelectorAll('.leaflet-overlay-pane .leaflet-zoom-animated')[0];

        var img_dataurl = c.toDataURL("image/png");

        var svg_img = document.createElementNS(
            "http://www.w3.org/2000/svg", "image");

        svg_img.setAttributeNS(
            "http://www.w3.org/1999/xlink", "xlink:href", img_dataurl);

        window.open(img_dataurl);
    });

    $('#downloadMapAsJPG').on('click', () => {
        // This code allows for the map to saved as a png
        var c = document.querySelectorAll('.leaflet-overlay-pane .leaflet-zoom-animated')[0];

        var img_dataurl = c.toDataURL("image/jpeg");

        var svg_img = document.createElementNS(
            "http://www.w3.org/2000/svg", "image");

        svg_img.setAttributeNS(
            "http://www.w3.org/1999/xlink", "xlink:href", img_dataurl);

        window.open(img_dataurl);
    });

    $('#downloadMapAsSVG').on('click', () => {
        //TODO: Need to get support for SVG some how
    });

    function plotDataset(data) {
        geojson.eachLayer(function (layer) {
            let countryCode = layer.feature.properties.iso_a3;

            for (let dataPoint of data) {
                if (dataPoint.isoA3 === countryCode) {
                    layer.setStyle({
                        fillColor: getColor(dataPoint.value),
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
    $('#main-map-container').html('<div id="sidebar" class="col-3 col-lg-2"> <form id="projectOptionsForm"> <label>Show</label> <br><div class="form-check form-check-inline"> <label class="form-check-label"> <input class="form-check-input" type="radio" name="inlineRadioOptions" id="inlineRadio1" value="dataset1"> Dataset 1 </label> </div><div class="form-check form-check-inline"> <label class="form-check-label"> <input class="form-check-input" type="radio" name="inlineRadioOptions" id="inlineRadio2" value="dataset2"> Dataset 2 </label> </div><div class="form-check form-check-inline" hidden> <label class="form-check-label"> <input class="form-check-input" type="radio" name="inlineRadioOptions" id="inlineRadio3" value="correlation"> Correlation </label> </div><hr> <div class="form-group"> <label for="projectTitleField">Project Title</label> <input type="text" class="form-control" id="projectTitleField" placeholder="Project Title"> </div><hr/> <div class="form-group"> <label for="dataset1Select">Dataset 1</label> <select class="form-control" id="dataset1Select"> </select> </div><div class="form-group"> <label for="dataset2Select">Dataset 2</label> <select class="form-control" id="dataset2Select"> <option value="-1">None</option> </select> </div><hr> <div class="form-group"> <button type="button" id="saveProjectChangesButton" class="btn btn-success col-12">Save Changes</button> </div><div class="form-group"> <button type="button" id="shareProjectButton" class="btn btn-info col-12">Share Project</button> </div></form> </div><div id="map" class="col-9 col-lg-10"></div>');
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

function setupProjectInDatabase(firebase) {
    let projectTitle = $('#projectTitle').val();
    let datasetID = $('#projectModalDataSetSelection').val();
    let currentUserID = firebase.auth().currentUser.uid;

    console.log(projectTitle, datasetID);

    // A project entry.
    var projectPost = {
        title: projectTitle,
        datasetIDs: [datasetID],
        dataset1ID: datasetID,
        dataset2ID: "-1",
        isPublic: false,
        visibleDataset: "dataset1"
    };

    // Get a key for a new project.
    var newPostKey = firebase.database().ref().child('projects').push().key;

    // Write the new project's data simultaneously
    var updates = {};
    updates['/projects/' + newPostKey] = projectPost;
    updates['/users/' + currentUserID + '/projects/' + newPostKey] = true;


    return [firebase.database().ref().update(updates), newPostKey];
}


function changeToProjectView() {
    $('#datasetsLink').removeClass('active');
    $('#mapsLink').removeClass('active');

    $('#datasetCardArea').addClass('collapse');
    $('#mapCardArea').addClass('collapse');
}