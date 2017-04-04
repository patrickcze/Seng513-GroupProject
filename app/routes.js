const express = require('express');
let multer  =   require('multer');
const path = require('path');

let router =  express.Router();

let storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, './uploads');
    },
    filename: function (req, file, callback) {
        callback(null, file.fieldname + '-' + Date.now() + '.csv');
    }
});

let upload = multer({storage: storage}).array('userDataset',1);

router.post('/api/dataset',function(req,res){
    upload(req,res,function(err) {
        if(err) {
            return res.end("Error uploading file.");
        }
        res.end("File is uploaded");
    });
});

router.get('/', function (req, res) {
    res.sendFile(path.join(__dirname,'../public/index.html'));
});

router.get('/project', function (req, res) {
    res.sendFile(path.join(__dirname, '../public/project.html'));
});

router.get('/downloadGlobalTemplate', function (req, res) {
    res.download(path.join(__dirname, '../templates/GlobalCountiresTemplate.csv'));
});

module.exports = router;