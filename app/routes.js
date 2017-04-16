const express = require('express');
let multer = require('multer');
var upload = multer({ dest: 'uploads' });
const csv=require('csvtojson');



const path = require('path');
let router = express.Router();

router.post('/api/dataset',  upload.any(), function(req, res, next) {
    console.log(req.body, 'Body');
    console.log(req.files, 'files');

    let csvFilePath = req.files[0].path;
    console.log(csvFilePath);
    csv()
        .fromFile(csvFilePath)
        .on('json',(jsonObj)=>{
            console.log(jsonObj);
            // combine csv header row and csv line to a json object
            // jsonObj.a ==> 1 or 4
        })
        .on('done',(error)=>{
            console.log('end')
        })

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
