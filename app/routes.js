var express = require('express');
var path = require('path');

var router =  express.Router();


router.get('/', function (req, res) {
    res.sendFile(path.join(__dirname,'../public/index.html'));
});

router.get('/maps', function (req, res) {
    res.sendFile(path.join(__dirname, '../public/maps.html'));
});

router.get('/datasets', function (req, res) {
    res.sendFile(path.join(__dirname, 'maps.html'));
});

module.exports = router;