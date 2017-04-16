


module.exports = {
    uploadJSONtoFirebase: function (userID, jsonData) {
        var firebase = require('firebase');
        var firApp = firebase.initializeApp({
            apiKey: "AIzaSyCDVUYROx4SJurgy01twBlRM9LZZuhGLpQ",
            authDomain: "umapit-io.firebaseapp.com",
            databaseURL: "https://umapit-io.firebaseio.com",
            storageBucket: "umapit-io.appspot.com",
            messagingSenderId: "349495637518"
        });
    }
};

