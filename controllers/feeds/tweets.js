var express = require('express'),
    params = require('../../myparams.js'),
    models = require('../../models'),
    utils = require('../../utils')

app = module.exports = express();
// JSON feed : tweets + users (with/without geoloc ?)
app.get("/tweets.json", function(req, res) {
	var fromMobile = req.param('m')!=null;
	var o = {};
	o.map = function () {
		emit(this.geo.coordinates,{tweetlist:[{
			tid:		this.id_str,
			created_at:	this.created_at,
			uid:		this.user.id_str,
			text:		this.text,
			twtype:		this.twtype,
		}]});
	};		
	o.reduce = function (k, vals) {
		var arr = [];
		if(vals.length==1) {
			arr.push({
				tid:		vals[0].tweetlist[0].tid,
				created_at:	vals[0].tweetlist[0].created_at,
				uid:		vals[0].tweetlist[0].uid,
				text:		vals[0].tweetlist[0].text,
				twtype:		vals[0].tweetlist[0].twtype,
			});
		} else {
			for(j=0;j<vals.length;j++) {
				arr.push({
					tid:		vals[j].tweetlist[0].tid,
					created_at:	vals[j].tweetlist[0].created_at,
					uid:		vals[j].tweetlist[0].uid,
					text:		vals[j].tweetlist[0].text,
					twtype:		vals[j].tweetlist[0].twtype
				});
			}
			// most recent first in array !
			arr.sort(function(a,b){ return b.created_at.toString().replace(/\D+/g,'')-a.created_at.toString().replace(/\D+/g,''); });
			// or put only last one
			arr = [arr[0]];
		}
		return {tweetlist:arr};	
	};
	o.out = { inline:1 };
	o.query = {
		'geo.geotype':'Point', // only real geo
	};
	params.showSession=='' ? console.log("getting all sessions") : o.query['session']=params.showSession ;
	o.verbose = true;
	
	// fetch tweets grouped by geo.coord
	models.Tweet.mapReduce(o, function (err,twes,stats) {
		if (err !== null) { console.log("ERROR fetching tweets "+err); }
		else {
			console.log('DATA.JSON Tweets took %d ms', stats.processtime);
			
			// FILTER only Tweets geolocs in params.rectParisBig & in current SESSION
			console.log(twes.length+" geo tweets in total");
			twes = twes.filter(function(e){return utils.isInMyRect(e._id,params.rectParisBig) ;});
			console.log(twes.length+" geo tweets within bounds");
			// FILTER only Users from those tweets !
			var twUserIdsStrs = [];
			twes.map(function(e){ e.value.tweetlist.forEach(function(u){ twUserIdsStrs.push(u.uid); }); });
			models.User.find({'id_str':{$in:twUserIdsStrs}},{
				//"_id": 1,
				"id_str": 1,
				"name": 1,
				"screen_name": 1,
				//"p_tweet": 1,
			}).exec(function(err, ffusers) {
				if (err !== null) { console.log("ERROR fetching users "+err); }
				else {
					res.json({
						users:	ffusers,
						tweets:	twes,
					});	
				}
			});	
		}
	});
});
