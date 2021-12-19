var express = require('express');
var router = express.Router();

router.get('/en', function(req, res){

  return res.render('rules-en');
});

router.get('/fr', function(req, res){

  return res.render('rules-fr');
});

module.exports = router;
