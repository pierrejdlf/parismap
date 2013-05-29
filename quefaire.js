var params = require('./myparams.js'),
	models = require("./models.js"),
	request = require('request');

var areVars = function(arr) {
	var res = true;
	arr.forEach(function(e) {
		res = res && !(e===undefined || e==null);
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
				// todo: if undefined, set lat/lon to 0,0
				
				// first make better date occurences
				if(event.occurences===undefined) {
					event.occurences=[];
				} else {
					var nOccs = [];
					event.occurences.forEach(function(e){
						if(areVars([e.jour,e.hour_start,e.hour_end]))
							nOccs.push({
								start:	e.jour.split('T')[0]+"T"+e.hour_start+".000Z",
								end:	e.jour.split('T')[0]+"T"+e.hour_end+".000Z",
							});
					});
					event.occurences = nOccs;
				}
				event.evtype = "quefaire";
				event.created = Date();
				event.modified = Date();
				var newevent = new models.Event(event);
				newevent.save( function (err, savedevent) { // on save, update user with last tweet
					if (err) { console.log("pb saving: "+err); }
					else { console.log("QueFaireAPI NEW event saved = "+savedevent.nom); }
					// todo: fetch more details of this event using API...
				});
			} else {
				console.log("QueFaireAPI EXISTING event = "+event.nom);
				// todo: update event properties (in case of same id but updated data) ?
			}
		}
	});
};

//////////////////////////////////////////////// Recursively fetch events
var fetchFrom = function(from) {
	var opts = {
		uri: params.quefaireUrl,
		qs:	{
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
			} else {
				obj.data.forEach(function(elem){
					storeEvent(elem);
				});
				console.log("- ... QueFaireAPI ... - stored from="+from);
				if(from<=5000) fetchFrom(from+99);
				else { console.log("- QueFaireAPI DONE -"); }
			}
		} else {
			console.log("QueFaireAPI Error !");
			console.log("QueFaireAPI Error ! "+error);
			console.log(response);
		}
	});	
};
	
var quefaire = {
	updateEvents : function() {
		console.log("Updating Events from QueFaireAPI");
		fetchFrom(0);
	}
};

module.exports = quefaire;