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

    //Login the user if they hit enter on the password field
    $('#passField').keypress(function (e) {
        if (e.which == 13) {
            loginUser();
        }
    });

    // Show the sign in modal when the button is clicked in the top left corner
    $('#signinBtn').on('click', function () {
        $('#signInModal').modal('show');
    });

    // Show the reset password modal when the correct button is clicked
    $('#resetPasswordBtn').on('click', function () {
        let email = $('#emailField').val();
        if (email.length > 0){
            $('#emailResetField').val(email);
        }

        $('#signInModal').modal('hide');
        $('#resetPasswordModal').modal('show');
    });

    // Reset the password when the button is clicked and display possible errors
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

    // Show the create account modal
    $('#createAccountBtn').on('click', function () {
        $('#signInModal').modal('hide');
        $('#createAccountModal').modal('show');
    });

    // Show the create account submit button
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

        
        // TODO: These values should be the max and min in the selected dataset. (hard coded for now)
        var dataMinVal = 0
        var dataMaxVal = 120
        
        // TODO: These values should be two selected colors from the side bar. (hard coded for now)
        var selectedColor1 = "#FFAAEE"
        var selectedColor2 = "#0022AA"

        
        function getColor(d) {
            return approximateColor1ToColor2ByPercent(selectedColor1, selectedColor2, d/dataMaxVal);
        }

        // from http://stackoverflow.com/questions/28016890/how-to-make-a-color-similar-to-another-color-by-percentage-in-javascript
        function approximateColor1ToColor2ByPercent(color1, color2, percent) {
          var red1 = parseInt(color1[1] + color1[2], 16);
          var green1 = parseInt(color1[3] + color1[4], 16);
          var blue1 = parseInt(color1[5] + color1[6], 16);

          var red2 = parseInt(color2[1] + color2[2], 16);
          var green2 = parseInt(color2[3] + color2[4], 16);
          var blue2 = parseInt(color2[5] + color2[6], 16);

          var red = Math.round(mix(red1, red2, percent));
          var green = Math.round(mix(green1, green2, percent));
          var blue = Math.round(mix(blue1, blue2, percent));

          return generateHex(red, green, blue);
        }
        
        // from http://stackoverflow.com/questions/28016890/how-to-make-a-color-similar-to-another-color-by-percentage-in-javascript
        function generateHex(r, g, b) {
          r = r.toString(16);
          g = g.toString(16);
          b = b.toString(16);

          // to address problem mentioned by Alexis Wilke:
          while (r.length < 2) { r = "0" + r; }
          while (g.length < 2) { g = "0" + g; }
          while (b.length < 2) { b = "0" + b; }

          return "#" + r + g + b;
        }
        
        // from http://stackoverflow.com/questions/28016890/how-to-make-a-color-similar-to-another-color-by-percentage-in-javascript
        function mix(start, end, percent) {
            return start + ((percent) * (end - start));
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