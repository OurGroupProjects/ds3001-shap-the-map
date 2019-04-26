const express = require('express');
const router = express.Router();
const fs = require('fs');

const stateData = require('../data/counts-by-state_v1.json');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/foodRankData', function(req, res, next) {
  res.send(stateData);
});

router.get('/foodLocData', function (req, res, next) {
  loadCsv().then((data) => {
    res.send(data)
  });
});

loadCsv = () => {
  return new Promise((resolve, reject) => {
    fs.readFile('data/fast-food_filtered_v1.csv', (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data.toString())
    })
  })
};

module.exports = router;
