module.exports = {
    uploadJSONtoFirebase: function (userID, jsonData) {
        //setup connecyion to fireabse
        var firebase = require('firebase');

        //Get a new static firebase reference key
        let newDatasetKey = firebase.database().ref('datasets').push().key;

        let datasetDetails = {
            name: "Something",
            userID: userID
        };

        //Upload the users data to firebase
        var updates = {};
        updates['/datasets/' + newDatasetKey + '/data'] = jsonData;
        updates['/datasets-metadata/'+newDatasetKey] = datasetDetails;
        updates['/users/' + userID + '/datasets/' + newDatasetKey] = true;

        return firebase.database().ref().update(updates);
    }
};

