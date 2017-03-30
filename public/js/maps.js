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

    firebase.auth().onAuthStateChanged(function (firebaseUser) {
        if (firebaseUser) {
            console.log(firebaseUser);
            //Redirect to the maps page


        } else {
            console.log("not logged in");
        }
    });

    $('#logoutUserBtn').on("click", function () {
        firebase.auth().signOut().then(function() {
            // Sign-out successful.
            window.location.replace('/');
        }, function(error) {
            // An error happened.
        });
    });

});