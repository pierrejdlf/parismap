var express = require('express'),
    moment = require('moment'),
    request = require('request'),
    params = require('../myparams.js'),
    models = require('../models');

var app = module.exports = express();

// ADD EVENT PAGE
// add event manually
app.get('/nouveau', function(req, res) {
	return res.render('addevent');
});


app.post('/addevent', function(req, res) {
	var formEvent = req.body.event;
	//console.log(JSON.stringify(formEvent));
	
	// todo: secure tests to avoid spam ? + if not already added (people trying to add/add/add/add ..) ?
	var event = {};
	event.evtype = "manual";
	event.created = Date();
	event.modified = Date();
	
	event.idactivites =	0;
	event.nom =			formEvent.name;
	event.description =	"-";
	event.lieu =		formEvent.place;
	event.adresse =		formEvent.address;
	event.contact =		formEvent.contact;
	event.link = 		formEvent.link;
	//event.zipcode =		formEvent.zipcode;
	//event.city =		formEvent.city;
	event.occurences = [{
		start: 	moment(formEvent.start,"DD MMM YYYY - HH:mm").toDate(),
		end:	moment(formEvent.end,"DD MMM YYYY - HH:mm").toDate(),
	}];
	console.log(event.occurences);
	
	// now fetch lat/lon using GeocodingAPI
	var formattedAddress = event.adresse;//+", "+event.zipcode+" "+event.city;
	console.log("GeocodingAPI q = "+formattedAddress);
	var opts = {
		uri: "http://nominatim.openstreetmap.org/search",
		qs:	{
			q:		formattedAddress,
			format:	"json",
		}
	};
	request(opts, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var obj = JSON.parse(body);
			console.log(JSON.stringify(obj,null,4))
			if(obj.status=='error') {
				console.log("GeocodingAPI Error: "+obj.message);
			} else {
				if(obj.length==0) {
					console.log("GeocodingAPI: sorry, no results");
					event.lat = 0;
					event.lon = 0;
				} else {
					console.log("GeocodingAPI: result found !");
					event.lat = parseFloat(obj[0].lat);
					event.lon = parseFloat(obj[0].lon);
				}
				console.log("ADDING EVENT ...");
				console.log(JSON.stringify(event,null,4))
				var newevent = new models.Event(event);
				newevent.save( function (err, savedevent) {
					if (err) { console.log("pb saving: "+err); }
					else { console.log("manual NEW event saved = "+savedevent.nom); }
				});
			}
		} else {
			console.log("GeocodingAPI Error !");
			console.log("GeocodingAPI Error ! "+error);
			console.log(response);
		}
	});
	
	var json = {
		'status':'ok'
	};
	res.json(json);
});