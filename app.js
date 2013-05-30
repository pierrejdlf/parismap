/////////////////////////////////////////////////////////////////////
var params = require("./myparams.js");
console.log("\n\n==================================== Event Channel : "+params.eventSourceChannel);
console.log("consumerKey : "+params.consumer_key);
//console.log(JSON.stringify(params,null,4));

/////////////////////////////////////////////////////////////////////
// We need to 'require' the following modules
var express = require("express"),
	http = require("http"),
	https = require('https'),
	path = require("path"),
	app = express(),
	mongoose = require('mongoose'),
	//redis	 = require('redis'),
	utils = require("./utils.js"),
	moment = require("moment"),
	models = require("./models.js"),
	publisherClient = require("./publisher.js").listen(app),
	twitterWorker = require("./twitter.js"),
	quefaire = require("./quefaire.js"),
	request = require('request');

moment.lang('fr');
	
/////////////////////////////////////////////////////////////////////
// This is our basic configuration
app.configure(function () {
	// Define our static file directory, it will be 'public'
	app.use(express.static(path.join(__dirname, 'public')));

	// all environments
	app.set('port', params.port);
	app.set('views', __dirname + '/views');
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use('/css',express.static(path.join(__dirname, 'css')));
	app.use('/img',express.static(path.join(__dirname, 'img')));
	app.use('/lib',express.static(path.join(__dirname, 'lib')));
	
	// templating engine: hogan
	app.engine('html', require('hogan-express'));
	app.enable('view cache');
	app.set('view engine', 'html');
});

/////////////////////////////////////////////////////////////////////
// MongoDB connexion
mongoose.connect(params.mongdb);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'Mongoose connection ERROR:'));
db.once('open', function callback () {
	console.log("Mongoose connected: "+params.mongdb);
});

/////////////////////////////////////////////////////////////////////
// Twitter Stream API worker
twitterWorker();

/////////////////////////////////////////////////////////////////////
// Create the http server on the specified port
http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});








///////////////////////////////////////////////////////////////////// MAIN PAGE with map
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
		if (er !== null) {console.log("no goodtweets");}
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




///////////////////////////////////////////////////////////////////// ADD EVENT PAGE
// home page rendered in index.html
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



///////////////////////////////////////////////////////////////////// Public list of tweets / events
// simple list display (initially for mobile)
app.get('/qui', function(req, res) {
	var quer = {'geo.geotype':'Point'};
	params.showSession=='' ? console.log("getting all sessions-users for qui") : quer['session']=params.showSession;
	var sortby = req.param('sortby')||'date';
	var lat = req.param('lat')||0;
	var lng = req.param('lng')||0;
	//console.log(sortby);
	// get list of geo+session tweets
	models.Tweet.find(quer,{'_id':1}).exec(function(er, goodtweets) {
		if (er !== null) {console.log("no goodtweets");}
		else {
			// get associated users
			models.User.find({p_tweet:{$in:goodtweets}}).sort({'map_square':-1}).exec(function(err, udocs) {
				if (err !== null) { console.log("no user results");}
				else {
					// populate users with last tweet
					models.Tweet.populate(udocs, { path:'p_tweet' }, function (err, enrichedusers) {
						if (err !== null) { console.log("no enriched users"); }
						else {
							var idx = 1;
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
							return res.render('users');
						}
					})
				}
			});
		}
	});
});





///////////////////////////////////////////////////////////////////// ADMIN POST action
// update/delete tweet using POST ajax request
app.post('/update', function(req, res) {
	var password = 	req.body.pass;
	var action = 	req.body.action;
	var what = 		req.body.what;
	var id = 		req.body.id;
	console.log("POST ACTION");
	console.log(JSON.stringify(req.body,null,4));
	if(password==params.adminKey && action=='delete') {
		if(what=='tweet')
			models.Tweet.findOne({id_str:id},function(err,t){
				if(t!=null) {
					console.log("Removing tweet: "+t.text);
					t.remove();
				} else {
					console.log("No tweet found");
				}
			});
		if(what=='event')
			models.Event.findOne({_id:id},function(err,t){
				if(t!=null) {
					console.log("Removing event: "+t.nom);
					t.remove();
				} else {
					console.log("No event found");
				}
			});
		res.json({'status':'done'});
	} else {
		res.json({'status':'not admin'});
	}
});
///////////////////////////////////////////////////////////////////// ADMIN PAGE
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
	// update events from API(s)
	var wantedupdate = 	req.param('update');

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
	var wantedlimit = 	req.param('limit') || 0;
	
	if(password==params.adminKey) {
		// update quefaire events from paris.fr
		if(wantedupdate) quefaire.updateEvents();
		
		if(wantedmanage=='tweets') { ///////////////////////////////// TWEETS
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
		} else { /////////////////////////////////////////////////// EVENTS
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



///////////////////////////////////////////////////////////////////// JSON feed : tweets + users (with/without geoloc ?)
app.get("/events.json", function(req, res) {
	//var wantedFrom = req.param('from');
	var wantedTo = req.param('to') || 24;
	console.log("Fetching events from now to "+wantedTo+" hours");
	var from = moment().toDate(); //.subtract('day',10).toDate();
	var to = moment().add('hours',wantedTo).toDate();
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
			events.forEach(function(e){
				if(!(e.lat=== undefined || e.lon === undefined || e.lat==null || e.lon==null)) {
					var occs = e.occurences;
					e.occurences = [];
					//console.log("nOccs="+occs.length);
					goodOks = [];
					occs.forEach(function(e){					
						var s = e.start,
							e = e.end;
						if(e>from && s<to) {
							goodOks.push({
								start: 	s,
								end:	e
							})
						}
					});
					if(goodOks.length>0) {
						e.occurences = goodOks;
						okevents.push(e);
					}
				}
			});
			console.log("fetched events reduced: "+okevents.length);
			res.json(okevents);
		}
	});
});


///////////////////////////////////////////////////////////////////// JSON feed : tweets + users (with/without geoloc ?)
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





/*
///////////////////////////////////////////////// WITHOUT NONGEO
if(fromMobile) {
	res.json({
		users:			enrichedusers,
		tweets:			twes,
		nongeotweets:	[],
	});						
///////////////////////////////////////////////// WITH GEO
} else {
	// now that we have sorted tweets, let's fetch all other nonPoint tweets (from session)
	var ngq = {'geo.geotype': {$nin:['Point']}};
	params.showSession=='' ? console.log("getting all sessions ngt") : ngq['session']=params.showSession ;
	models.Tweet.find(ngq,{
		'_id':1,
		'text':1,
		'id_str':1,
		'created_at':1,
		'user.name':1,
		'user.screen_name':1,
		'user.screen_name':1,
		'user.id_str':1,
	}).exec(function(err, nongeotweets) {
		if (err !== null) { console.log("ERROR fetching nongeo tweets "+err); }
		else {
			// output
			res.json({
				users:			enrichedusers,
				tweets:			twes,
				nongeotweets: 	nongeotweets
			});
		}
	});
}						
*/