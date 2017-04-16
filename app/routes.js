const express = require('express');
let multer = require('multer');
var upload = multer({dest: 'uploads'});
const csv = require('csvtojson');
var datasetParser = require('./datasetParser');
var fs = require("fs");

const path = require('path');
let router = express.Router();

router.post('/api/dataset', upload.any(), function (req, res, next) {
    console.log(req.body, 'Body');
    console.log(req.files, 'files');

    if (req.body.userid) {
        let userid = req.body.userid;
        let csvFilePath = req.files[0].path;

        let csvData = [];

        csv().fromFile(csvFilePath).on('json', (jsonObj) => {
            console.log("Something");
            csvData.push(jsonObj);
            // datasetParser.uploadJSONtoFirebase(userid, jsonObj);
        }).on('done', (error) => {
            console.log('end');
            console.log(csvData, csvData.length);
            datasetParser.uploadJSONtoFirebase(userid, csvData);

        });
    }
    res.end();
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
