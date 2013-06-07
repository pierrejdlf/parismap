var express = require('express');

var app = module.exports = express();

app.use(require('./tweets'));
app.use(require('./events'));