var express = require('express');
var router = express.Router();
var sessionsCtrl = require("../controllers/sessions");
var walmartCtrl = require("../controllers/walmart")

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* Sessions */
router.post(`/newsession`, sessionsCtrl.newSession);
router.patch('/sessions/:sessionID/:commandCode', sessionsCtrl.updateSession);

/* Walmart */
router.get('/search/:itemName', walmartCtrl.searchNoCategroy);

module.exports = router;
