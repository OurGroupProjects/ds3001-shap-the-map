var express = require('express');
var router = express.Router();
const stateData = require('../data/counts-by-state_v1.json');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/data', function(req, res, next) {
  console.log(stateData);
  res.send(stateData);
});


module.exports = router;
