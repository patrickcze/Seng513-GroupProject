var map = null;

$(function () {
    // Allow popovers in bootstrap
    $('[data-toggle="popover"]').popover();

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

            $('#loading').fadeIn('slow');

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
    // Upload image from http://www.flaticon.com/free-icon/upload-to-cloud_109713#term=upload&page=1&position=13
    socket.on('listOfUserDatasets', (data) => {
        userDatasets = data.dataset;
        console.log(userDatasets);
        for (let dataset of data.dataset) {
            //Setup the options within the modal
            let option = '<option value="' + dataset.id + '">' + dataset.name + '</option>';
            $("#projectModalDataSetSelection").append(option);
            //Setup the cards within the datasetCardArea
            let card = '<div class="card dataset-card" style="width: 20rem; height: 15rem;"><div class="card-block"><div class="dropdown"><button class="btn moreoptions dropdown-toggle" type="button" id="moreMenu" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"></button><ul class="dropdown-menu dropdown-menu-right" aria-labelledby="moreMenu"><li><a href="#" class="standardMenuOption">Rename</a></li><li><a href="#" class="deleteMenuOption">Delete</a></li></ul></div></p></div><h6 class="datacard-title">' + dataset.name + '</h6></div>';
            $('#datasetCardArea').append(card);
        }
    })


    //Get a list of the users projects
    socket.on('listOfUserProjects', (data) => {
        for (let project of data.projects) {
            let screenShotURL = "northamerica.png";
            if (project.projectScreenshotURL) {
                screenShotURL = project.projectScreenshotURL;
            }

            let card = '<div class="card project-card" style="width: 20rem; height: 15rem;" projectid="' + project.id + '"> <img class="card-img-top" src="' + screenShotURL + '" alt="Card image" style="height:12rem; width:19.9rem; position:absolute;"><div class="card-block"><div class="dropdown"><button class="btn moreoptions dropdown-toggle" type="button" id="moreMenu" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"></button><ul class="dropdown-menu dropdown-menu-right" aria-labelledby="moreMenu"><li><a href="#" class="standardMenuOption">Rename</a></li><li><a href="#" class="deleteMenuOption">Delete</a></li></ul></div></p></div><h6 class="card-title">' + project.title + '</h6></div>';
            $('#mapCardArea').append(card);
        }

        // from http://stackoverflow.com/questions/12115833/adding-a-slide-effect-to-bootstrap-dropdown
        $('.dropdown').on('show.bs.dropdown', function () {
            $(this).find('.dropdown-menu').first().stop(true, true).slideDown();
        });

        // Add slideUp animation to Bootstrap dropdown when collapsing.
        $('.dropdown').on('hide.bs.dropdown', function () {
            $(this).find('.dropdown-menu').first().stop(true, true).slideUp();
        });

        $('#loading').hide();

        $(".project-card").click(function () {
            console.log("Handler for .click() called.");
            console.log($(this).attr("projectid"));
            
            // Check if the more dropdown is open
            var moreMenuOpen = $(this).find("#moreMenu").attr('aria-expanded') === "true";
            console.log(moreMenuOpen);

            // Check if the more button is being hovered
            var moreMenuHover = $(this).find("#moreMenu:hover").length >= 1;
            console.log(moreMenuHover);

            // Make sure user is not trying to select the more options button instead of opening a project
            if(!moreMenuOpen && !moreMenuHover){
                setupProjectFromID($(this).attr("projectid"), socket, userDatasets);
            }
            
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
            $('#loading').hide();
        });
    });
    
    $('#projectTitle').keyup(function() {
        updateCreateProjectButton();
    });
    
    
    $('#projectModalDataSetSelection').change(function(){
        updateCreateProjectButton();
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


function updateCreateProjectButton(){

        var empty = false;
        $('#projectTitle').each(function() {
            if ($(this).val() == '') {
                empty = true;
            }
        });
        
        if (empty || $('#projectModalDataSetSelection').val() == 'select') {
            $('#createNewProjectButton').attr('disabled', 'disabled');
        } else {
            $('#createNewProjectButton').removeAttr('disabled');
        }

}

//Setup the project when a user shares their project url with others
function setupViewOnlyProject(id, socket) {
    changeToProjectView();

    $('#sidebar').addClass('collapse');

    let project = null;
    let geojson = null;
    let datasetToDisplay = null;

    let projectDatasets = [];

    $('#logoutUserBtn').addClass('collapse');
    $('#mapsLink').addClass('hidden');
    $('#datasetsLink').addClass('hidden');
    $('#map').attr("class", "col-12");

    //Get the details of the project
    socket.emit('getProjectWithId', id);

    //Deal with incoming project data
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

        
        map.zoomControl.setPosition('bottomright');

        
        L.tileLayer('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
        }).addTo(map);

        // Ask for geojson data
        socket.emit('getGlobalGeoJSON');

        //Display correlation or the color the user selected
        if (datasetToDisplay === "correlation") {
            plotCorrelation();
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
            plotDataset(datasetToDisplay);
        }
    });

    //Do something when a color is selected for a given dataset
    $('.circlebutton').on('click', () => {
        console.log("click");
    });

    function plotCorrelation() {
        let dataset1id = project.dataset1ID;
        let dataset2id = project.dataset2ID;

        socket.emit('computeDatasetRatio', {dataset1id: dataset1id, dataset2id: dataset2id});
        socket.on('plotCorrelation', (data) => {
            colorDataset(data, project.ds1Color, project.ds2Color);
            $('#loading').hide();
        });
    }

    //Plot the data using the correct color
    function plotDataset(datasetid) {
        if (project.visibleDataset === "dataset1") {
            color = project.ds1Color;
        } else {
            color = project.ds2Color;
        }

        if (datasetid === "-1") {
            clearPlotDataset();
        } else {
            for (let dataset of projectDatasets) {
                if (datasetid === dataset.datasetid.datasetid) {
                    colorDataset(dataset, "#242426", color);
                    $('#loading').hide();
                }
            }
        }
    }

    //Perform map coloring based on dataset values
    function colorDataset(datasetToPlot, startColor, endColor) {
        //plot the new color gradient
        let numberOfItems = 10;
        let rainbow = new Rainbow();
        rainbow.setNumberRange(1, numberOfItems);
        rainbow.setSpectrum(startColor, endColor);

        let colors = [];
        let cutPoints = [];

        for (let i = 1; i <= numberOfItems; i++) {
            colors.push('#' + rainbow.colourAt(i));
        }

        //Get the correct dataset to color
        let dataset = datasetToPlot.data.data;
        let minVal = datasetToPlot.data.minVal;
        let maxVal = datasetToPlot.data.maxVal;
        let dif = (maxVal - minVal) / (numberOfItems - 1);

        //Determine cut points within the data
        for (var i = 1; i < numberOfItems; i++) {
            let val = minVal + (i * dif);
            cutPoints.push(val);
        }

        //Go through each item and color it appropriately
        geojson.eachLayer(function (layer) {
            let countryCode = layer.feature.properties.iso_a3;

            for (dataPoint of dataset) {
                if (dataPoint.isoA3 === countryCode) {
                    let color = "#FFFFFF";
                    let num = dataPoint.value;

                    for (let i = 0; i < cutPoints.length; i++) {
                        let plusOne = i + 1;

                        if (num > cutPoints[cutPoints.length - 1]) {
                            color = colors[colors.length - 1];
                        } else if (num <= cutPoints[0]) {
                            color = colors[0];
                        } else if (num > cutPoints[i] && num <= cutPoints[plusOne]) {
                            color = colors[plusOne];
                        }
                    }

                    layer.setStyle({
                        fillColor: color,
                        weight: 0,
                        opacity: 1,
                        color: '#242426',
                        dashArray: '0',
                        fillOpacity: 0.66
                    });
                }
            }
        });
    }
}

// Setup the project from a id in editing mode
function setupProjectFromID(id, socket, userDatasets) {
    changeToProjectView();

    $('#loading').fadeIn('slow');

    let project = null;
    let geojson = null;
    let ds1Color = null;
    let ds2Color = null;

    let ds1present = false;
    let ds2present = false;

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
    map = L.map('map', {
        center: [46.938984, 2.373590],
        zoom: 4,
        preferCanvas: true
    });

        
    map.zoomControl.setPosition('bottomright');
    
    
    L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
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

        if (project.ds1Color) {
            ds1Color = project.ds1Color;
            $('#dataset1SelectButton').css("background-color", ds1Color);
        }

        if (project.ds2Color) {
            ds2Color = project.ds2Color;
            $('#dataset2SelectButton').css("background-color", ds2Color);
        }

        if (project.visibleDataset) {
            switch (project.visibleDataset) {
                case "dataset1":
                    $("#inlineRadio1").prop("checked", true);
                    break;
                case "dataset2":
                    $("#inlineRadio2").prop("checked", true);
                    break;
                case "correlation":
                    $("#inlineRadio3").prop("checked", true);
                default:
                    console.log();
            }
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

        function highlightFeature(e) {
            var layer = e.target;

            layer.setStyle({
                weight: 0,
                dashArray: '0',
                fillOpacity: 0.66
            });

            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                layer.bringToFront();
            }
            info.update(layer.feature.properties);
        }

        function resetHighlight(e) {
            geojson.resetStyle(e.target);
            
            
            info.update();
        }

        function zoomToFeature(e) {
            map.fitBounds(e.target.getBounds());
        }

        
        geojson = L.geoJson(globaljson, {
            style: {
                fillColor: "#FFFFFF",
                opacity: 0
            },
            onEachFeature: function (feature, layer) {
                layer.on('mouseover', function () {
                    this.setStyle({
                        fillColor: "#FFFFFF",
                    });
                    
                    info.update(layer.feature.properties);

                });
                
                layer.on('mouseout', function () {
                           
                    var datasetid = ""
                    
                    switch (project.visibleDataset) {
                        case "dataset1":
                            datasetid = project.dataset1ID;
                            break;
                        case "dataset2":
                            datasetid = project.dataset2ID;
                            break;
                        case "correlation":
                            datasetid = "correlation";
                            break;
                    }    
                    
                    if ($("#inlineRadio1").prop("checked")){
                        plotDataset('#dataset1Select');
                    } else if ($("#inlineRadio2").prop("checked")){
                        plotDataset('#dataset2Select');
                    } else if ($("#inlineRadio3").prop("checked")){
                        plotCorrelation()
                    }
                });
            }   
        }).addTo(map);
        
        
        
        var info = L.control();

        info.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
            this.update();
            return this._div;
        };
        
                
        // method that we will use to update the control based on feature properties passed
        info.update = function (props) {
            
            
            if (props != null){
                console.log(props.iso_a3);
            
                let countryCode = props.iso_a3; 

                var datasetid = ""

                // get the dataset id
                switch (project.visibleDataset) {
                    case "dataset1":
                        datasetid = project.dataset1ID;
                        break;
                    case "dataset2":
                        datasetid = project.dataset2ID;
                        break;
                    case "correlation":
                        datasetid = "correlation";
                        break;
                }    

                console.log(datasetid);

                var dataval = ''
                
                // get the value of the hovered country in that dataset
                for (let dataset of projectDatasets) {
                    if (datasetid === dataset.datasetid.datasetid) {
                        for (let dataPoint of dataset.data.data) {
                            
                            console.log(dataPoint);
                            
                            if (dataPoint.isoA3 === countryCode) {
                                dataval = dataPoint.value;
                                break;
                            }   
                        }
                    }
                    break;
                }

                // Update the info box accordingly
                this._div.innerHTML = "<div style='text-align:right; color:rgba(255,255,255,0.5); font-size:30px; line-height: 125%;'>" + (props ? '<b>' + props.name + '</b><br />' + dataval : 'Hover over a country');
                }
        };
/*
        var legend = L.control({
            position: 'bottomright'
        });

        legend.onAdd = function (map) {

            var div = L.DomUtil.create('div', 'info legend'),
                grades = [0, 100000, 2000000, 5000000, 10000000, 20000000, 50000000, 100000000],
                labels = [];

            return div;
            
        };
        legend.addTo(map);
*/

        info.addTo(map);
        
    });

    // Deal with incoming dataset data
    socket.on('setDataset', (dataset) => {
        console.log(dataset);
        projectDatasets.push(dataset);

        if (dataset.datasetid.datasetid === project.dataset1ID) {
            $('#dataset1Select').val(project.dataset1ID);

            if ($('#inlineRadio1').prop("checked")) {
                plotDataset('#dataset1Select');
            }
        }
        if (dataset.datasetid.datasetid === project.dataset2ID) {
            $('#dataset2Select').val(project.dataset2ID);
            if ($('#inlineRadio2').prop("checked")) {
                plotDataset('#dataset2Select');
            }
        }

        if ($('#inlineRadio3').prop("checked")) {
            for (dataset of projectDatasets) {
                console.log(dataset);
                if (dataset.datasetid.datasetid === $("#dataset1Select").val()) {
                    ds1present = true;
                } else if (dataset.datasetid.datasetid === $("#dataset2Select").val()) {
                    ds2present = true;
                }
            }

            if (ds1present && ds2present) {
                plotCorrelation();
            }
        }

        $('#loading').hide();
    });

    // plot data when changing the selected radio button
    $('input[type=radio][name=inlineRadioOptions]').change(function () {
        if (this.value === 'dataset1') {
            plotDataset('#dataset1Select');
        }
        else if (this.value === 'dataset2') {
            plotDataset('#dataset2Select');
        }
        else if (this.value === 'correlation') {
            plotCorrelation();
        }
    });

    $('#dataset1Select').on('change', function() {
        if ($("#inlineRadio1").prop("checked")){
            plotDataset('#dataset1Select');
        } else if ($("#inlineRadio3").prop("checked")){
            plotCorrelation()
        }
    });

    $('#dataset2Select').on('change', function() {
        if ($("#inlineRadio2").prop("checked")){
            plotDataset('#dataset2Select');
        } else if ($("#inlineRadio3").prop("checked")){
            plotCorrelation()
        }
    });

    //plot dataset correlation
    function plotCorrelation() {
        let dataset1id = $('#dataset1Select').val();
        let dataset2id = $('#dataset2Select').val();

        socket.emit('computeDatasetRatio', {dataset1id: dataset1id, dataset2id: dataset2id});
        socket.on('plotCorrelation', (data) => {
            colorDataset(data, ds1Color, ds2Color);
        });
    }

    function plotDataset(datasetSelector) {
        let datasetid = $(datasetSelector).val();
        if (datasetSelector === "#dataset1Select") {
            color = ds1Color;
        } else {
            color = ds2Color;
        }

        if (color === null) {
            
            // Provide default colors if none selected
            if (datasetSelector === "#dataset1Select") {
                ds1Color = '#00A3FF'
                color = ds1Color;
                $('#dataset1SelectButton').css("background-color", ds1Color);
                
            } else {
                ds2Color = '#FF2E00'
                color = ds2Color;
                $('#dataset2SelectButton').css("background-color", ds2Color);
            }
        }

        if (datasetid === "-1") {
            clearPlotDataset();
        } else {
            for (let dataset of projectDatasets) {
                if (datasetid === dataset.datasetid.datasetid) {
                    colorDataset(dataset, "#242426", color);
                }
            }
        }
    }

    $('#saveProjectChangesButton').on('click', () => {
        $("#loadingTitle").text('Now sending data via carrier pigeon...');

        $('#loading').fadeIn('slow');

        let projectData = {
            title: $('#projectTitleField').val(),
            datasetIDs: [],
            dataset1ID: $('#dataset1Select').val(),
            dataset2ID: $('#dataset2Select').val(),
            id: project.id,
            isPublic: $('#publicCheckbox').prop('checked'),
            visibleDataset: $('input[type=radio][name=inlineRadioOptions]:checked').val(),
            ds1Color: ds1Color,
            ds2Color: ds2Color
        };

        if (projectData.dataset1ID !== "-1") {
            projectData.datasetIDs.push(project.dataset1ID);
        }
        if (projectData.dataset2ID !== "-1") {
            projectData.datasetIDs.push(project.dataset2ID);
        }

        let storageRef = firebase.storage().ref().child("/projectScreenShots/" + projectData.id);

        //Get image data url
        let c = document.querySelectorAll('.leaflet-overlay-pane .leaflet-zoom-animated')[0];
        let img_dataurl = c.toDataURL("image/png");

        storageRef.putString(img_dataurl, 'data_url').then(function (snapshot) {
            console.log('Uploaded a data_url string!');

            projectData.projectScreenshotURL = snapshot.downloadURL;
            console.log(projectData);

            socket.emit('saveProjectDetailsInDB', projectData);
            $('#loading').hide();
            $("#loadingTitle").text('Now fetching data via carrier pigeon...');
        });
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

    // When Data Set 1's color is being set
    $('#dataset1SelectButton').on('click', function () {

        if (document.getElementById('colorpicker2Popover')) {
            $('#dataset2SelectButton').trigger('click');
        } else {

        }
        console.log("color 1 is being changed!");
    });

    // When Data Set 2's color is being set
    $('#dataset2SelectButton').on('click', function () {

        if (document.getElementById('colorpicker1Popover')) {
            $('#dataset1SelectButton').trigger('click');
        } else {
            //
        }
        console.log("color 2 is being changed!");
    });

    // When a color is being changed
    $(document).on('click', '#color1, #color2, #color3, #color4, #color5, #color6, #color7, #color8, #color9', function (event) {
        $('#color1, #color2, #color3, #color4, #color5, #color6, #color7, #color8, #color9').css("border-color", "#141414");

        let color = $(this).css("background-color");
        $(this).css("border-color", "white");
        console.log(color);

        $('#dataset1SelectButton').popover('hide');
        $('#dataset2SelectButton').popover('hide');

        // Do this if we're changing the first color, else second color
        if (document.getElementById('colorpicker1Popover')) {
            $('#dataset1SelectButton').css("background-color", color);
            ds1Color = color;
            if ($('#inlineRadio1').prop("checked")) {
                plotDataset('#dataset1Select');
            }
        } else {
            $('#dataset2SelectButton').css("background-color", color);
            ds2Color = color;
            if ($('#inlineRadio2').prop("checked")) {
                plotDataset('#dataset2Select');
            }
        }
    });

    function colorDataset(datasetToPlot, startColor, endColor) {
        //plot the new color gradient
        let numberOfItems = 10;
        let rainbow = new Rainbow();
        rainbow.setNumberRange(1, numberOfItems);

        if (startColor && endColor) {

            rainbow.setSpectrum(startColor, endColor);

            let colors = [];
            let cutPoints = [];

            for (let i = 1; i <= numberOfItems; i++) {
                colors.push('#' + rainbow.colourAt(i));
            }

            //Get the correct dataset to color
            let dataset = datasetToPlot.data.data;
            let minVal = datasetToPlot.data.minVal;
            let maxVal = datasetToPlot.data.maxVal;
            let dif = (maxVal - minVal) / (numberOfItems - 1);

            //Determine cut points within the data
            for (var i = 1; i < numberOfItems; i++) {
                let val = minVal + (i * dif);
                cutPoints.push(val);
            }

            //Go through each item and color it appropriately
            geojson.eachLayer(function (layer) {
                let countryCode = layer.feature.properties.iso_a3;

                for (dataPoint of dataset) {
                    if (dataPoint.isoA3 === countryCode) {
                        let color = "#FFFFFF";
                        let num = dataPoint.value;

                        for (let i = 0; i < cutPoints.length; i++) {
                            let plusOne = i + 1;

                            if (num > cutPoints[cutPoints.length - 1]) {
                                color = colors[colors.length - 1];
                            } else if (num <= cutPoints[0]) {
                                color = colors[0];
                            } else if (num > cutPoints[i] && num <= cutPoints[plusOne]) {
                                color = colors[plusOne];
                            }
                        }

                        layer.setStyle({
                            fillColor: color,
                            weight: 0,
                            opacity: 1,
                            color: '#242426',
                            dashArray: '0',
                            fillOpacity: 0.66
                        });
                    }
                }
            });
        } else {
            $('#loading').hide();
        }
    }

    function clearPlotDataset() {
        geojson.eachLayer(function (layer) {
            layer.setStyle({
                fillColor: "#FFFFFF",
                weight: 0,
                opacity: 1,
                color: 'white',
                dashArray: '0',
                fillOpacity: 0.66
            });
        });
    }
}


function clearMap() {
    $('#main-map-container').html("<div id='sidebar' class='col-lg-2 col-md-3 hidden-sm'><form id='projectOptionsForm'><div class='form-group'><input id='projectTitleField' type='text' class='col-12' /></div><div class='form-check'><label class='form-check-label'><input class='form-check-input' type='radio' name='inlineRadioOptions' id='inlineRadio1' value='dataset1'> Dataset 1</label></div><div class='form-check'><label class='form-check-label'><input class='form-check-input' type='radio' name='inlineRadioOptions' id='inlineRadio2' value='dataset2'> Dataset 2</label></div><div class='form-check'><label class='form-check-label'><input class='form-check-input' type='radio' name='inlineRadioOptions' id='inlineRadio3' value='correlation'> Correlation</label></div><hr><div class='form-group'><label for='dataset1Select'>Dataset 1</label'<button type='button' id= 'dataset1SelectButton' class='btn btn-secondary pull-right circlebutton' data-container='body' data-toggle='popover' data-placement='right' data-content='<div id ='colorpicker1Popover'><button type='button' id='color1' class='circlebutton'></button><button type='button' id='color2' class='circlebutton'></button><button type='button' id='color3' class='circlebutton'></button></div><div><button type='button' id='color4' class='circlebutton'></button><button type='button' id='color5' class='circlebutton'></button><button type='button' id='color6' class='circlebutton'></button></div><div><button type='button' id='color7' class='circlebutton'></button><button type='button' id='color8' class='circlebutton'></button><button type='button' id='color9' class='circlebutton'></button></div>'data-html='true'></button><select class='form-control' id='dataset1Select'></select></div><div class='form-group'><label for='dataset2Select'>Dataset 2</label><button type='button' id='dataset2SelectButton' class='btn btn-secondary pull-right circlebutton' style='align-items: flex' data-container='body' data-toggle='popover' data-placement='right' data-content='<div id ='colorpicker2Popover'><button type='button' id='color1' class='circlebutton'></button><button type='button' id='color2' class='circlebutton'></button><button type='button' id='color3' class='circlebutton'></button></div><div><button type='button' id='color4' class='circlebutton'></button><button type='button' id='color5' class='circlebutton'></button><button type='button' id='color6' class='circlebutton'></button></div><div><button type='button' id='color7' class='circlebutton'></button><button type='button' id='color8' class='circlebutton'></button><button type='button' id='color9' class='circlebutton'></button></div>' data-html='true'></button><select class='form-control' id='dataset2Select'><option value='-1'>None</option></select></div><hr><div class='form-group'><button type='button' id='saveProjectChangesButton' class='btn btn-success col-12'>Save Changes</button></div><div class='form-group'><button type='button' id='shareProjectButton' class='btn btn-info col-12'>Share Project</button></div></form></div><div id='map' class='col-12 col-lg-12'></div>");}

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

// Awesome fix to get hex instead of RGB back from css background color
// http://stackoverflow.com/questions/6177454/can-i-force-jquery-cssbackgroundcolor-returns-on-hexadecimal-format
$.cssHooks.backgroundColor = {
    get: function (elem) {
        if (elem.currentStyle)
            var bg = elem.currentStyle["backgroundColor"];
        else if (window.getComputedStyle)
            var bg = document.defaultView.getComputedStyle(elem,
                null).getPropertyValue("background-color");
        if (bg.search("rgb") == -1)
            return bg;
        else {
            bg = bg.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
            function hex(x) {
                return ("0" + parseInt(x).toString(16)).slice(-2);
            }

            return "#" + hex(bg[1]) + hex(bg[2]) + hex(bg[3]);
        }
    }
}