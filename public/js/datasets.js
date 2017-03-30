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

            socket.emit('getListOfUserDatasets', {uid: firebaseUser.uid});

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

    socket.on('listOfUserDatasets', (data)=>{
        console.log(data);
        console.log(data.datasetIDs);

        for (id in data.datasetIDs){
            //DO something with each id

            var card = '<div class="card" style="width: 20rem;"> <div class="card-block"> <h4 class="card-title">'+data.datasetIDs[id]+'</h4> <p class="card-text">332 Entries</p> </div> </div>';
            $('#cardArea').append(card);
        }
    });

});

