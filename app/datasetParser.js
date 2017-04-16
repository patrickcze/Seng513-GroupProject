module.exports = {
    uploadJSONtoFirebase: function (userID, jsonData) {
        //setup connecyion to fireabse
        var firebase = require('firebase');

        let newDatasetKey = firebase.database().ref('datasets').push().key;

        let datasetDetails = {
            name: "Something",
            userID: userID
        };

        var updates = {};
        updates['/datasets/' + newDatasetKey + '/data'] = jsonData;
        updates['/datasets-metadata/'+newDatasetKey] = datasetDetails;
        updates['/users/' + userID + '/datasets/' + newDatasetKey] = true;

        return firebase.database().ref().update(updates);
    }
};

