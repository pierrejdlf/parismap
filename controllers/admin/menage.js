var express = require('express'),
    moment = require('moment'),
    params = require('../../myparams.js'),
    models = require('../../models');

app = module.exports = express();

// ADMIN PAGE
// users and tweets readable html table
app.get('/menage', function(req, res) {
/*
	// Temporary edit old TWEETS
	models.Tweet.find({'session':{$nin:['ville']}}).exec(function(er, goodtweets) {
		if (er !== null) {console.log("no goodtweets");}
		else {
			console.log("updating tweets: "+goodtweets.length);
			goodtweets.map(function(d){
				if(d.session!='ville') {
					console.log("remove: "+d.twtype+" | "+d.session+" | "+d.text+" | "+d.word);
				}
			});
		}
	});
*/
	var quer = {};
	
	// cheap secure
	var password = 		req.param('pass') || '';
	// update/clear events from API(s)
	var wantedupdate = 		req.param('update'),
		wantedclearevents = req.param('clearevents');

	var wantedsession = req.param('session');
	wantedsession==null ? console.log("MANAGE getting all sessions for manage") : quer['session']=wantedsession;
	
	// MANAGE tweets OR events
	var wantedmanage = 	req.param('m') || 'tweets';
	// events
	var wantedevtype = 	req.param('evtype');
	wantedevtype==null ? console.log("MANAGE getting all events") : quer['evtype']=wantedevtype;
	// tweets
	var wantedgeo = 	req.param('geotype');
	wantedgeo==null ? console.log("MANAGE getting all geo+nongeo for manage") : quer['geo.geotype']=wantedgeo;
	
	var wantedfrom = 	req.param('offset') || 0;
	var wantedlimit = 	req.param('limit') || 20; // if you want all you need to put 0 explicitly
	
	if(password==params.adminKey) {
		// update quefaire events from paris.fr
		if(wantedupdate) quefaire.updateEvents();
		if(wantedclearevents) quefaire.clearEvents();
		
        // TWEETS
        ///////////////////////////////
		if(wantedmanage=='tweets') { 
			models.Tweet.find(quer).skip(wantedfrom).limit(wantedlimit).sort({'created_at':-1}).exec(function(err, tdocs) {
				if (err !== null) { console.log("Error fetching tweets"); var tw = null; }
				else {
					var tw = tdocs;
					tw.forEach(function(el){ el.text = el.text.replace(/'/g,"‘").replace(/[\n\r]/g," "); });
					models.User.find({p_tweet:{$in:tdocs}}).sort({'map_count':-1}).exec(function(err, udocs) {
						if (err !== null) { console.log(err); }
						else {
							idx=1;
							udocs.forEach(function(el){ el['idx']=idx++; });
							console.log("MANAGE fetched tweets: "+tw.length);
							console.log("MANAGE fetched users: "+udocs.length);
							res.locals = {
								tweets:		tw,
								users:		udocs,
								password:	params.adminKey,
							}
							return res.render('manage');
						}
					});
				}
			});
		} else { 
          // EVENTS
          ///////////////////////////////
			models.Event.find(quer).skip(wantedfrom).limit(wantedlimit).lean().sort({created:-1}).exec(function(err, evts) {
				if (err !== null) { console.log("Error fetching events"); }
				else {
					console.log("MANAGE fetched events: "+evts.length);
					var idx=0;
					evts.forEach(function(el){
						el.idx = idx++;
						el.occurences = el.occurences.length;
					});
					res.locals = {
						events:		evts,
						password:	params.adminKey,
					};
					return res.render('manage');
				}
			});
		}
	} else {
		console.log("BAD ADMIN PASS");
		res.json({'status':'err'});
	}
});
