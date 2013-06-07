var express = require('express'),
    moment = require('moment'),
    params = require('../myparams.js'),
    models = require('../models'),
    utils = require('../utils');

var app = module.exports = express();

// Public list of tweets / events
// tweeters display
app.get('/qui', function(req, res) {
	var quer = {'geo.geotype':'Point'};
	params.showSession=='' ? console.log("getting all sessions-users for qui") : quer['session']=params.showSession;
	var sortby = req.param('sortby')||'date';
	var lat = req.param('lat')||0;
	var lng = req.param('lng')||0;
	//console.log(sortby);
	// get list of geo+session tweets
	models.Tweet.find(quer,{'_id':1}).exec(function(er, goodtweets) {
		if (er !== null) {console.log("pb fetching tweets");}
		else {
			// get associated users
			models.User.find({p_tweet:{$in:goodtweets}}).sort({'map_square':-1}).exec(function(err, udocs) {
				if (err !== null) { console.log("pb fetching users");}
				else {
					// populate users with last tweet
					models.Tweet.populate(udocs, { path:'p_tweet' }, function (err, enrichedusers) {
						if (err !== null) { console.log("pb fetching user-tweets"); }
						else {
							var idx = 0;
							enrichedusers.forEach(function(el){
								el['idx']=idx++;
								// we'll use handlebar to print {{{}}} using js
								el.p_tweet.text = el.p_tweet.text.replace(/'/g,"‘").replace(/[\n\r]/g," ").replace(/\\/g,"\ ");
								el.date = el.p_tweet.created_at;
								el.value = utils.formatSquare(el.map_square);
								if(sortby=='distance') {
									var coord = el.p_tweet.geo.coordinates;
									var arr = [coord[0],coord[1],parseFloat(lat),parseFloat(lng)];
									//console.log(arr);
									el.dist = utils.distanceBetweenPoints(arr);
									el.value = utils.formatMeter(el.dist);
								}
							});
							if(sortby=='distance')
								enrichedusers.sort(function(a,b){return a.dist-b.dist;});
							if(sortby=='date')
								enrichedusers.sort(function(a,b){return b.date-a.date;});
								
							res.locals = {
								users:enrichedusers,
							};
							res.locals['sortby_'+sortby]='active';
							return res.render('list_qui');
						}
					})
				}
			});
		}
	});
});