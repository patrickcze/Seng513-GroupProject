const express = require('express');
let multer = require('multer');
var upload = multer({dest: 'uploads'});
const csv = require('csvtojson');
var datasetParser = require('./datasetParser');
var fs = require('fs');

const path = require('path');
let router = express.Router();

router.post('/api/dataset', upload.any(), function (req, res, next) {
    //Check if we have a userid associated with the file
    if (req.body.userid) {
        let userid = req.body.userid;
        let dsName = req.body.datasetname;
        let csvFilePath = req.files[0].path;
        let csvData = [];

        //Convert csv into json object
        csv({checkType:true}).fromFile(csvFilePath).on('json', (jsonObj) => {
            csvData.push(jsonObj);
        }).on('done', (error) => {
            //Once we have all the csv data as json upload to firabse
            datasetParser.uploadJSONtoFirebase(userid,dsName,csvData);

            //Delete the uploaded file after the data is in firebase
            fs.unlink(csvFilePath, function(err) {
                if (err) {
                    return console.error(err);
                }
                res.sendStatus(200, "SUCCESS");
            });
        });
    } else {
        res.end('Missing user id');
    }
});

router.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

router.get('/project', function (req, res) {
    res.sendFile(path.join(__dirname, '../public/project.html'));
});

router.get('/downloadGlobalTemplate', function (req, res) {
    res.download(path.join(__dirname, '../templates/GlobalCountiresTemplate.csv'));
});

router.get('/downloadUSCANTemplate', function (req, res) {
    res.download(path.join(__dirname, '../templates/UnitedStatesCanadaTemplate.csv'));
});

router.get('/downloadUSATemplate', function (req, res) {
    res.download(path.join(__dirname, '../templates/UnitedStatesTemplate.csv'));
});

router.get('/downloadCANTemplate', function (req, res) {
    res.download(path.join(__dirname, '../templates/CanadaTemplate.csv'));
});

module.exports = router;
