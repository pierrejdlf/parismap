var express = require('express'),
    moment = require('moment'),
    params = require("../myparams.js"),
    models = require('../models');

var app = module.exports = express();

// MAIN PAGE with map
// home page rendered in index.html
app.get('/', function(req, res) {
	// kill older than 2 days
	//var to = moment().subtract('days',2).toDate();
	// kill older than 2 hours
	var to = moment().subtract('hours',1).toDate();
	var from = new Date(2001, 1, 1);
	models.Tweet.find({
		'created_at':	{"$gt":from,"$lt":to},
		'session':		params.showSession,
		'twtype':		'other',
	}).exec(function(er, goodtweets) {
		if (er !== null) {console.log("pb fetching tweets");}
		else {
			console.log("Removing old tweets: "+goodtweets.length);
			goodtweets.map(function(d){
				console.log("removing: "+d.twtype+" | "+d.session+" | "+d.created_at);
				d.remove();
			});
		}
	});
	
	//var whereGeo 	= req.param('p');
	var forceMobile = req.param('m');
	var forceNgJson = req.param('ng');
	res.locals = {
		shapeMask:			params.parisPolygon,
		eventSourceChannel:	params.eventSourceChannel,
		forceMobile:		forceMobile!=null,
		forceNgJson:		forceNgJson!=null,
	};
	return res.render('index');
});