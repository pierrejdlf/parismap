var express = require('express'),
    moment = require('moment'),
    params = require("../myparams.js"),
    models = require('../models');

app = module.exports = express();

// events display
app.get('/quoi', function(req, res) {
	var sortby = req.param('sortby')||'date';
	var lat = req.param('lat')||0;
	var lng = req.param('lng')||0;
	
	var from = 	moment().toDate(),
		to = 	moment().add('days',3).toDate();
	// todo: maybe better query to directly get events with at least one occurence within [from,to]
	models.Event.find({
			'occurences.start':	{"$lt":to},
			'occurences.end':	{"$gt":from},
		}).limit(20).lean().exec(function(er, events) {
		if (er !== null) {console.log("pb fetching events");}
		else {
			okevents = [];
			console.log("fetched events: "+events.length);
			events.forEach(function(e){ // only keep occurences within datetime interval
				var goodOks = utils.getGoodEventOccurences(e,[from,to]);
				// an element for each date occurence
				if(goodOks.length>0) {
					goodOks.forEach(function(go){
						okevents.push({
							nom:	e.nom,
							description: e.description,
							lieu:	e.lieu,
							adresse:	e.adresse+" "+e.zipcode+" "+e.city,
							start:	go.start,
							end:	go.end,
							dist:	(sortby=='distance') ? utils.distanceBetweenPoints([e.lat,e.lon,parseFloat(lat),parseFloat(lng)]) : 0,
							link:	e.link,
							lat:	e.lat,
							lon:	e.lon,
						});
					});
				}
			});
			console.log("fetched events splitted: "+okevents.length);		
			
			if(sortby=='distance')
				okevents.sort(function(a,b){return a.dist-b.dist;});
			if(sortby=='date')
				okevents.sort(function(a,b){return a.start-b.start;});

			res.locals = { events:okevents };
			res.locals['sortby_'+sortby]='active';
			return res.render('list_quoi');
		}
	});
});
