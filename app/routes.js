const express = require('express');
let multer = require('multer');
var upload = multer({dest: 'uploads'});
const csv = require('csvtojson');
var datasetParser = require('./datasetParser');

const path = require('path');
let router = express.Router();

router.post('/api/dataset', upload.any(), function (req, res, next) {
    console.log(req.body, 'Body');
    console.log(req.files, 'files');

    if (req.body.userid) {
        let userid = req.body.userid;
        let csvFilePath = req.files[0].path;

        csv().fromFile(csvFilePath).on('json', (jsonObj) => {
            datasetParser.uploadJSONtoFirebase(userid, jsonObj);
        }).on('done', (error) => {
            console.log('end')
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
