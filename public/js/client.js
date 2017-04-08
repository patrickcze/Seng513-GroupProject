$(function () {
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

    //Login the user when they click login
    $("#loginUserBtn").on('click', function () {
        loginUser();
    });

    $('#passField').keypress(function (e) {
        if (e.which == 13) {
            loginUser();
        }
    });

    $('#signinBtn').on('click', function () {
        $('#signInModal').modal('show');
    });

    //Register the user when they click register
    $("#registerUserBtn").on('click', function () {
        const txtemail = $("#emailField").val();
        const txtpassword = $("#passField").val();
        const auth = firebase.auth();

        //Create the user
        const promise = auth.createUserWithEmailAndPassword(txtemail,txtpassword);

        //When the user is created add their details to the database
        promise.then(function (user) {
            firebase.database().ref('users/'+user.uid).set({
                uid: user.uid,
                email: user.email
            });
        }).catch(e => console.log(e.message));
    });

    $('#resetPasswordBtn').on('click', function () {
        $('#signInModal').modal('hide');
        $('#resetPasswordModal').modal('show');
    });

    $('#resetPasswordSubmitBtn').on('click', function () {
        let auth = firebase.auth();
        let emailAddress = $('#emailResetField').val();

        auth.sendPasswordResetEmail(emailAddress).then(function() {
            // Email sent.
            let selector = $('#emailResetField');
            selector.parent().addClass('has-success');
            selector.addClass('form-control-success');
            selector.parent().append('<div class="form-control-feedback">Success! We just sent you and email to reset your password!</div>');
        }, function(error) {
            // An error happened.
            if (error.code === "auth/user-not-found"){
                $('#emailResetField').parent().addClass('has-warning');
                $('#emailResetField').addClass('form-control-warning');
                $('#emailResetField').parent().append('<div class="form-control-feedback">Looks like we don\'t have an account for that email</div>');
            } else if (error.code === "auth/invalid-email"){
                $('#emailResetField').parent().addClass('has-danger');
                $('#emailResetField').addClass('form-control-danger');
                $('#emailResetField').parent().append('<div class="form-control-feedback">Something seems to be wrong with your email, maybe take a second to double check?</div>');
            }
        });
    });

    $('#createAccountBtn').on('click', function () {
        $('#signInModal').modal('hide');
        $('#createAccountModal').modal('show');
    });

    $('#createAccountSubmitBtn').on('click', function () {
        const txtemail = $("#emailNewAccountField").val();
        const txtpassword1 = $("#passwordlNewAccountField1").val();
        const txtpassword2 = $("#passwordlNewAccountField2").val();
        const auth = firebase.auth();

        let containsUpperCase = false;
        let containsLowerCase = false;

        if (txtpassword1 === txtpassword2 && txtpassword1.length >= 8){
            for (char of txtpassword1) {
                console.log(char);

                if (char === char.toUpperCase()){
                    containsUpperCase = true;
                } else if (char === char.toLowerCase()){
                    containsLowerCase = true;
                }

                if (containsUpperCase && containsLowerCase){
                    break;
                }
            }

            if (containsUpperCase && containsUpperCase) {
                console.log("Password passes tests", txtpassword1);
                //Create the user
                const promise = auth.createUserWithEmailAndPassword(txtemail,txtpassword1);

                //When the user is created add their details to the database
                promise.then(function (user) {
                    firebase.database().ref('users/'+user.uid).set({
                        uid: user.uid,
                        email: user.email
                    });
                }).catch(e => console.log(e.message));
            }
        }
    });

    //Monitor authentication state change
    firebase.auth().onAuthStateChanged(function (firebaseUser) {
        if (firebaseUser) {
            console.log(firebaseUser);
            //Redirect to the maps page
            setTimeout(()=>{
                window.location.replace('/project');
            }, 1000);
            //
        } else {
            console.log("not logged in");
        }
    });



    //Get the population density geojson as an example for the home page
    socket.emit('getGlobalGeoJSON', '');
    socket.on('setGlobalGeoJSON', function (data) {
        console.log(data);
        setupBasicFrontPageMap(data.globalData);
    });

    function loginUser() {
        const txtemail = $("#emailField").val();
        const txtpassword = $("#passField").val();
        const auth = firebase.auth();

        const promise = auth.signInWithEmailAndPassword(txtemail,txtpassword);
        promise.catch(e => console.log(e.message));
    }

    function setupBasicFrontPageMap(data) {
        var globalData = data;

        var map = L.map('map').setView([46.938984, 2.373590], 3);
        var geojson;

        var CartoDB_DarkMatter = L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
            subdomains: 'abcd',
            maxZoom: 19,
            maxBoundsViscosity: 1.0
        }).addTo(map);

        function getColor(d) {
            return d > 100000000 ? '#800026' :
                d > 50000000 ? '#BD0026' :
                d > 20000000 ? '#E31A1C' :
                d > 10000000 ? '#FC4E2A' :
                d > 5000000 ? '#FD8D3C' :
                d > 2000000 ? '#FEB24C' :
                d > 100000 ? '#FED976' :
                '#FFEDA0';
        }

        function style(feature) {
            return {
                fillColor: getColor(feature.properties.pop_est),
                weight: 1,
                opacity: 1,
                color: 'white',
                fillOpacity: 0.7
            };
        }

        function highlightFeature(e) {
            var layer = e.target;

            layer.setStyle({
                weight: 5,
                color: '#666',
                dashArray: '',
                fillOpacity: 0.7
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

        function onEachFeature(feature, layer) {
            layer.on({
                mouseover: highlightFeature,
                mouseout: resetHighlight,
                click: zoomToFeature
            });
        }

        geojson = L.geoJson(globalData, {
            style: style,
            onEachFeature: onEachFeature
        }).addTo(map);

        var info = L.control();

        info.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
            this.update();
            return this._div;
        };

        // method that we will use to update the control based on feature properties passed
        info.update = function (props) {
            this._div.innerHTML = '<h4>Population</h4>' + (props ?
                '<b>' + props.name + '</b><br />' + props.pop_est + ' people' : 'Hover over a country');
        };

        var legend = L.control({
            position: 'bottomright'
        });

        legend.onAdd = function (map) {

            var div = L.DomUtil.create('div', 'info legend'),
                grades = [0, 100000, 2000000, 5000000, 10000000, 20000000, 50000000, 100000000],
                labels = [];

            // loop through our density intervals and generate a label with a colored square for each interval
            for (var i = 0; i < grades.length; i++) {
                div.innerHTML +=
                    '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
                    grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
            }

            return div;
        };

        legend.addTo(map);

        info.addTo(map);
    }
});