var params = require('./myparams.js'),
	models = require("./models.js"),
	request = require('request'),
	moment = require("moment");

var areOkVars = function(arr) {
	var res = true;
	arr.forEach(function(e) {
		res = res && !(e===undefined || e==null || e==0);
	})
	return res;
};

//////////////////////////////////////////////// Store event in DB
var storeEvent = function(event) {
	// create or update event
	models.Event.findOneAndUpdate({ idactivites:event.idactivites },{}, function(err,found) {
		if (err) { console.log("error find-updating event"); }
		else {
			if(!found) {
				if(!areOkVars([event.lat,event.lon])) {
					//console.log("not storing non geoloc event "+event.idactivites+" (lat/lng: "+event.lat+" | "+event.lon+")");
				} else {
					// first make better date occurences
					if(event.occurences===undefined) {
						event.occurences=[];
					} else {
						var nOccs = [];
						event.occurences.forEach(function(e){
							if(areOkVars([e.jour,e.hour_start,e.hour_end])) {
								// warning with "2012-11-20T24:00:00.000Z" Date cast failure (moment(..).toDate() fix it)
								nOccs.push({
									start:	moment(e.jour.split('T')[0]+"T"+e.hour_start+".000Z").toDate(),
									end:	moment(e.jour.split('T')[0]+"T"+e.hour_end+".000Z").toDate(),
								});
							}
						});
						event.occurences = nOccs;
					}
					event.evtype = "quefaire";
					event.contact = "quefaire@paris.fr";
					event.link = "http://quefaire.paris.fr/fiche/"+event.idactivites;
					//event.created is when created_byParisStaff
					event.modified = Date();
					
					// todo: fetch more details of this event using API /get_activity
					
					var newevent = new models.Event(event);
					newevent.save( function (err, savedevent) { // on save, update user with last tweet
						if (err) { console.log("pb saving: "+err); }
						else { 
							//console.log("QueFaireAPI NEW event saved = "+savedevent.nom);
						}
					});
				}
			} else {
				//console.log("QueFaireAPI EXISTING event = "+event.nom);
				// todo: update event properties (in case of same id but updated data ?) ?
			}
		}
	});
};

//////////////////////////////////////////////// Recursively fetch events
var fetchFrom = function(createdFrom,from) {
	var opts = {
		uri: params.quefaireUrl,
		qs:	{
			created:	createdFrom.getTime()/1000, // timestamp
			token:		params.quefaireToken,
			offset:		from,
			limit:		100,	
		}
	};
	request(opts, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var obj = JSON.parse(body);
			if(obj.status=='error') {
				console.log("QueFaireAPI Error: "+obj.message);
				console.log(" ... at "+JSON.stringify(opts));
			} else {
				obj.data.forEach(function(elem){
					storeEvent(elem);
				});
				console.log("- ... QueFaireAPI ... - got from = "+from);
				if(obj.data.length>0) setTimeout(function(){fetchFrom(createdFrom,from+100);}, params.quefaireDelay) ;
				else { console.log("- QueFaireAPI DONE -"); }
			}
		} else {
			console.log("QueFaireAPI Error !");
			console.log("QueFaireAPI Error ! "+error);
			console.log(" ... at "+JSON.stringify(opts));
		}
	});	
};
	
var quefaire = {
	updateEvents : function() {
		console.log("Updating Events from QueFaireAPI");
		// getting last created event from quefaire
		models.Event.findOne({evtype:'quefaire'}).sort({created:-1}).exec(function(err, doc) {
			var createdFrom = moment("01/01/2000").toDate();
			if(!doc) {
				console.log("no quefaire events in DB. fetching from past: années 2000 années du futur");
			} else {
				createdFrom = doc.created;
				console.log("last quefaire created event date: "+createdFrom);
			}
			console.log("Fetching events from timestamp = "+createdFrom.getTime()/1000);
			fetchFrom(createdFrom,0);
		});
	},
	clearEvents : function() {
		console.log("Clearing all Events from QueFaireAPI");
		models.Event.find({'evtype':'quefaire'}).exec(function(er, events) {
			if (er !== null) {console.log("pb fetching events");}
			else {
				console.log("Removing que faire events: "+events.length);
				events.map(function(d){
					d.remove();
				});
			}
		});
	}
};

module.exports = quefaire;