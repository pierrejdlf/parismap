var express = require('express'),
    moment = require('moment'),
    models = require('../../models');

app = module.exports = express();

// JSON feed : tweets + users (with/without geoloc ?)
app.get("/events.json", function(req, res) {
	//var wantedFrom = req.param('from');
	var wantedTo = req.param('to') || 3;
	console.log("Fetching events from now to "+wantedTo+" days");
	var from = moment().toDate(); //.subtract('day',10).toDate();
	var to = moment().add('days',wantedTo).toDate();
	// todo: maybe better query to directly get events with at least one occurence within [from,to]
	models.Event.find({
			'occurences.start':	{"$lt":to},
			'occurences.end':	{"$gt":from},
			//'occurences':		{"$size":1}
		},{description:0}).limit(4).lean().exec(function(er, events) {
		if (er !== null) {console.log("no points");}
		else {
			okevents = [];
			console.log("fetched events: "+events.length);
			events.forEach(function(e){ // only keep occurences within datetime interval
				//nb: all events in DB now have good lat/lng
				//if(!(e.lat=== undefined || e.lon === undefined || e.lat==null || e.lon==null)) {
				var goodOks = utils.getGoodEventOccurences(e,[from,to]);
				if(goodOks.length>0) {
					e.occurences = goodOks;
					okevents.push(e);
				}
			});
			console.log("fetched events reduced: "+okevents.length);
			res.json(okevents);
		}
	});
});
