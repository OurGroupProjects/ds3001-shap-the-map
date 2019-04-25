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
  parseCsv().then((data) => {
    res.send(data)
  });
});

parseCsv = () => {
  return new Promise((resolve, reject) => {
    fs.readFile('data/kaggle_fast-food.csv', (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data.toString())

    })
  })
};

module.exports = router;
