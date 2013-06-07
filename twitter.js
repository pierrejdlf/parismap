var models = require("./models.js"),
	d3 = require("d3"),
	moment = require("moment"),
	OAuth = require('oauth').OAuth,
	params = require("./myparams.js"),
	utils = require("./utils.js"),
	publisherClient = require("./publisher.js"),
	paletteGenerator = require("./chroma.palette-gen.js");

moment.lang('fr', {
	relativeTime : {
		future : "dans %s",
		past : "il y a %s",
		s : "qq sec",
		m : "1e min",
		mm : "%dmin",
		h : "1h",
		hh : "%dh",
		d : "1 jour",
		dd : "%djours",
		M : "1 mois",
		MM : "%dmois",
		y : "1 an",
		yy : "%dans"
	}
});

/////////////////////////////////////////////////////////////////////

var parisPolygon = d3.geom.polygon(params.parisPolygon);
var parisSqMeters = params.parisSqMeters;
var areaFactor = parisSqMeters/parisPolygon.area();
console.log("Area multiplier (lat/lon > m2) = "+areaFactor);
var tweetSessionCount = 1;

/////////////////////////////////////////////////////////////////////
// the simple independent tweet robot sender, declared once
var twitterer = new OAuth(
	"https://api.twitter.com/oauth/request_token",
	"https://api.twitter.com/oauth/access_token",
	params.consumer_key,
	params.consumer_secret,
	"1.0",
	null,
	"HMAC-SHA1"
);

/////////////////////////////////////////////////////////////////////
var sendESHQevent = function(tweet,user) {
	// send new data to active-connexions browsers, using same format than grouped data.json
	var newData = {
		'tweet': {
			"_id": [
				tweet.geo.coordinates[0],
				tweet.geo.coordinates[1]
			],
			"value": {
				"tweetlist":[{
					"tid":			tweet.tid,
					"created_at":	tweet.created_at,
					"uid":			tweet.user.id_str,
					"text":			tweet.text
				}]
			}},
		'user': user
	};
	publisherClient.send({
		channel: 	params.eventSourceChannel,		// Required
		data: 		newData,						// Required
		"name": 	"newtweetmessage", 		// name of event to be received (cf js)
		//"id": 	"event-id", // optional
	},function(res){
		console.log("ESHQ event new-tweet sent ("+params.eventSourceChannel+")");
	})
	
	// we used to rather use redis ..
	//publisherClient.publish( 'nouveautouit', JSON.stringify(newData) );
};

/////////////////////////////////////////////////////////////////////
// QUI : double mention message
var formatReplyQui = function(tweet,info,linkToGeoNewTweet) {
	var message = params.tweetReplyTextQui[tweetSessionCount % params.tweetReplyTextQui.length];
	var tor = ['$1','$word1','$2','$dist2','$time2','$word2','$rank','$link'];
	var sub = [	'@'+tweet.user.screen_name,
				tweet.word,
				'@'+info.neighbors[0].user.screen_name,
				utils.formatMeter(info.neighbors[0].dist),
				moment(info.neighbors[0].created_at).fromNow(),
				info.neighbors[0].word,
				//utils.formatSquare(info.square), info.rank,
				linkToGeoNewTweet];
	tor.forEach(function(e,i){ message = message.replace(e,sub[i]); });	
	return message;	
}

// QUOI : format one event
var formatReplyQuoi = function(tweet,event,linkToGeoNewTweet) {
	var message = params.tweetReplyTextQuoi[tweetSessionCount % params.tweetReplyTextQuoi.length];
	var tor = ['$1','$nom','$lieu','$dist','$start','$end','$link'];
	var sub = [	'@'+tweet.user.screen_name,
				event.nom,
				event.lieu,
				utils.formatMeter(event.dist),
				moment(event.start).format("HH:mm"),
				moment(event.end).format("HH:mm"),
				linkToGeoNewTweet];
	tor.forEach(function(e,i){ message = message.replace(e,sub[i]); });	
	return message;	
}

var sendTweet = function(tweet,message) {
	if(params.showReplyTweet) console.log("-- ReplyBuiltMessage ("+message.length+"): "+message);
	if(params.sendReplyTweet) {
		var body = { status:message, in_reply_to_status_id:tweet.id_str};
		//console.log("-- ReplyingTweet: "+params.sendReplyTweet+"\n"+JSON.stringify(body,null,4));
		twitterer.post("http://api.twitter.com/1/statuses/update.json",
		params.access_token_key, params.access_token_secret, body, "application/json",
		function (error, data, response2) {
			if(error){
				console.log('-- ReplyingTweet: ERROR\n'+JSON.stringify(error,null,4)+'\n');
			} else {
				console.log('-- ReplyingTweet: success');
			}
		});
	}
}
/////////////////////////////////////////////////////////////////////
var replyTweet = function(tweet,user,info) {
	var iswithgps = (tweet.geo.geotype=='Point');
	var isNewUser = (user.map_count==1);
	var message = null;
	var gotReply = false;
	/*// we could reply all using diff mention symbols ? ... 
	var sourceParismap = (tweet.twtype=="parismap" || tweet.twtype=="parisquoi"),
		targetParismap = false;
	var symbSource = sourceParismap ? '@' : '⦿' ;*/
	var linkToGeoNewTweet = "www.parismappartient.fr";
	if (iswithgps) linkToGeoNewTweet = "http://carte.parismappartient.fr/?p="+tweet.geo.coordinates.join(",");
	
	if(!iswithgps && isNewUser) {
		gotReply = true;
		// bienvenue ... mais vous avez pas GEO !
		message = params.FirstReplyTextNoGeo.replace('$1','@'+tweet.user.screen_name);
	}
	
	isNewUser=false; //dev
	if(iswithgps) {
		if(isNewUser) {
			// bienvenue à parismap !
			message = params.FirstReplyText.replace('$1','@'+tweet.user.screen_name);
			sendTweet(tweet,message);
		} else {
			if(tweet.twtype=="parismap") { // REPLY WITH TWITTERS AROUND
				if(info.neighbors.length>0) {
					message = formatReplyQui(tweet,info,linkToGeoNewTweet);
					sendTweet(tweet,message);
				} else { console.log("not enough neighbors !"); }
			}
			if(tweet.twtype=="parisquoi") { // REPLY WITH EVENTS AROUND
				for(var k=0;k<params.nReplyQuoi;k++) {
					if(info.events.length>k) {
						message = formatReplyQuoi(tweet,info.events[k],linkToGeoNewTweet);
						sendTweet(tweet,message);
					} else { console.log("! not enough events to send k="+k); }
				}
			}
		}
	}
};

/////////////////////////////////////////////////////////////////////
// store tweet and update its user
var storeTweet = function(tweet,theuser,isNewUser) {
	tweet['p_user'] = theuser._id;
	var newtweet = new models.Tweet(tweet);
	newtweet.save( function (err, savedtweet) { // on save, update user with last tweet
		if (err) console.log("pb saving tweet");
		else {
			theuser.p_tweet = savedtweet._id;
			theuser.tid = savedtweet.id_str;
			theuser.save( function(err,saveduser){
				if(err) console.log("problem saving user");
				else {
					if(tweet.twtype=="parismap") getQuiThenReply(savedtweet,saveduser);
					if(tweet.twtype=="parisquoi") getQuoiThenReply(savedtweet,saveduser);
				}
			});
		}
	});
}


/////////////////////////////////////////////////////////////////////
// get nearest users and reply
var getQuiThenReply = function(savedtweet,saveduser) {
	var quer = {
		'geo.geotype': 		'Point',
		'user.screen_name':	{$nin:[savedtweet.user.screen_name]},
	};
	console.log(" ... getting all QUI ...");
	models.Tweet.find(quer,{
		'user.screen_name':1,
		'user.id_str':1,
		'p_user':1,
		'geo.coordinates':1,
		'created_at':1,
		'text':1,
		'word':1,
		'twtype':1,
	}).sort({'created_at':-1}).lean().exec(function(err, ftweets) {
		if (err !== null) { console.log("pb getting QUI tweets"); }
		else {
			console.log(" ... fetched neighbors tweets: "+ftweets.length);
			if(savedtweet.geo.geotype=='Point') {
				var info = {};
				//////////////////////////// sort all neighbors based on distance
				var neighbArray = ftweets.map(function(e){
					e['dist'] = utils.distanceBetweenPoints(savedtweet.geo.coordinates.concat(e.geo.coordinates));
					return e;
				});
				info['neighbors'] = neighbArray.sort(function(a,b) {return (a.dist>b.dist) ? 1 : ((b.dist>a.dist) ? -1 : 0 ); });
				
				//console.log('user info computed:\n'+JSON.stringify(info));
				// not recomputing colors anymore cause we changed our mind
				//recomputeColors();
				
				//////////////////////////// reply tweet
				if(params.showReplyTweet || params.sendReplyTweet) replyTweet(savedtweet,saveduser,info);
				//sendESHQevent(savedtweet,saveduser);
			} else {
				console.log("(new tweet non incGeo)");
			}

		}
	});
};

/////////////////////////////////////////////////////////////////////
// get nearest events and reply
var getQuoiThenReply = function(savedtweet,saveduser) {
	var from = moment().toDate();
	var to = moment().add('hours',24).toDate();
	// todo: maybe better query to directly get events with at least one occurence within [from,to]
	console.log(" ... getting all QUOI ...");
	models.Event.find({
		'occurences.start':	{"$lt":to},
		'occurences.end':	{"$gt":from},
	},{description:0}).lean().exec(function(er, events) {
		if (er !== null) { console.log("pb getting QUOI events"); }
		else {
			console.log(" ... fetched neighbors events: "+events.length);
			if(savedtweet.geo.geotype=='Point') {
				var info = {};
				var keptOccs=[];
				//////////////////////////// sort all neighbors based on distance + update good occurence
				events.forEach(function(e){
					// find the good occurence within occs
					var goodOccs = utils.getGoodEventOccurences(e,[from,to]);
					if(goodOccs.length>0) {
						e['dist'] = utils.distanceBetweenPoints(savedtweet.geo.coordinates.concat([e.lat,e.lon]));
						e['start'] = goodOccs[0].start;
						e['end'] = goodOccs[0].end;
						keptOccs.push(e);
					}
				});
				// mmmmh.. todo: sort based on clever algorithm (time/distance/duration/etc...)
				info['events'] = keptOccs.sort(function(a,b) {return (a.dist>b.dist) ? 1 : ((b.dist>a.dist) ? -1 : 0 ); });
				
				//////////////////////////// reply tweet
				if(params.showReplyTweet || params.sendReplyTweet) replyTweet(savedtweet,saveduser,info);
				//sendESHQevent(savedtweet,saveduser);
			} else {
				console.log("(new tweet non incGeo)");
			}
		}
	});
};


/*
/////////////////////////////////////////////////////////////////////
// recompute color palette for users
var recomputeColors = function() {
	var quer = {'geo.geotype':'Point'};
	params.showSession=='' ? console.log("getting all sessions-users for colors") : quer['session']=params.showSession;
	models.Tweet.find(quer,{'_id':1}).exec(function(er, goodtweets) {
		if (er !== null) {console.log("no goodtweets");}
		else {
			models.User.find({p_tweet:{$in:goodtweets}},{'_id':1}).sort({'map_square':-1}).exec(function(err, udocs) {
				if (err !== null) { }
				else {
					var nColors = Math.min(udocs.length,50);
					if(nColors>0) {
						console.log("recompute colors for session-users: "+nColors);
						var colors = paletteGenerator.generate(
							nColors, // Colors
							function(color){ // This function filters valid colors
								var hcl = color.hcl();
								return hcl[0]>=0 && hcl[0]<=360
								&& hcl[1]>=0 && hcl[1]<=0.6
								&& hcl[2]>=1.19 && hcl[2]<=1.5;
							},
							false, // Using Force Vector instead of k-Means
							7 // Steps (quality)
						);
						// Sort colors by differenciation first
						//userColors = paletteGenerator.diffSort(colors);
						var userColors = paletteGenerator.diffSort(colors).map(function(c){return c.hex();});
						udocs = udocs.map(function(u,i){ u.color = userColors[i%nColors]; return u;} );
						//console.log(udocs);
						
						// update colors in db
						udocs.forEach(function(u){
							models.User.findOneAndUpdate({ _id:u._id},{color:u.color},function(err, doc) {
								if (err) {
									console.log('error updating color for user._id: '+k);
									console.log('error was: '+err);
								} else {}
							});
						});
						console.log("recompute colors done");
					} else {
						console.log("not recomputing colors (0 session-users)");
					}
				}
			});
		}
	});
};
*/

/////////////////////////////////////////////////////////////////////
// process received tweet
var processAndStoreTweet = function(tweet) {
	var whoto = tweet.user.screen_name;
	var whotoid = tweet.id_str;
	
	// create or update user
	models.User.findOneAndUpdate({ id_str:tweet.user.id_str }, {}, function(err,founduser) {
		if (err) { console.log("error find-updating user"); }
		else {
			if(!founduser) {
				console.log(" ... NEW USER = "+tweet.user.screen_name);
				var newuser = new models.User(tweet.user);
				newuser.session = tweet.session;
				newuser.map_count = 1;
				newuser.map_square = 0;
				newuser.save( function (err, theuser) {
					if (err) console.log("pb saving user");
					else { storeTweet(tweet,theuser,true); }
				});
			} else {
				console.log(" ... EXISTING USER = "+founduser.screen_name);
				founduser.session = tweet.session;
				founduser.name = tweet.user.name;
				founduser.map_count = founduser.map_count + 1;
				founduser.map_square = 0;
				founduser.save( function (err, theuser) {
					if (err) console.log("pb saving user");
					else { storeTweet(tweet,theuser,false); }
				});
			}
		}
	});
};
		
/////////////////////////////////////////////////////////////////////
// twitter listener
var worker = function() {
	var twitter = require("ntwitter");
	var t = new twitter({
		consumer_key: params.consumer_key,
		consumer_secret: params.consumer_secret,
		access_token_key: params.access_token_key,
		access_token_secret: params.access_token_secret
	});
	t.stream(
		//NB:[sic] using location in twitter API will match -track- OR -fallswithinlocation-
		'statuses/filter',{
			//'language':en,
			//'follow':["userId","userId","userId"],
			'track':params.trackQuoi.concat(params.trackQui),
			'locations':params.rectParisBig.join(','),
		},
		function(stream) {
			stream.on("data", function(tweet) {
				//console.log(".");
				if(params.listenTwitter) {
					var hasGeo = tweet.geo!=null;
					var isInc = false;
					if(hasGeo) isInc = utils.isPointInPoly(params.parisPolygon,tweet.geo.coordinates);
					
					// all geo tweets are showed
					var shdlogtweet 	= isInc || (!hasGeo && (params.nonGeoLog||params.nonGeoStore)) || (!isInc && (params.nonIncLog||params.nonIncStore) );

					// all geo incl tweets are stored
					var shdstoretweet 	= isInc || (!hasGeo && params.nonGeoStore) || (!isInc && params.nonIncStore);
					
					if(shdlogtweet) {
						console.log("\n\n==================================== TWEET RECEIVED "+(tweetSessionCount++));
						console.log(tweet.created_at);
						console.log("@"+tweet.user.screen_name);
						console.log(tweet.text);
						console.log("------------------------------------");
						//console.log(JSON.stringify(tweet,null,4));
						
						// update user.geo based on type
						if(hasGeo) {
							tweet.geo.geotype = tweet.geo.type; // AAAAAAARHG: found out that 'type' is FORBIDDEN within mangoose/mangodb
						} else {
							tweet.geo = {
								geotype: 'RndPt',
								coordinates: (params.nonGeoPos==null) ? utils.getRandomPosInRect(params.rectParisSmall) : params.nonGeoPos ,
							};
						}
						if(hasGeo && !isInc) tweet.geo.geotype = 'OutPt';
						
						var coord = tweet.geo.coordinates;
						tweet.word = utils.getLongestWord(tweet.text);

						// update type & hashtags
						//console.log(JSON.stringify(tweet.entities.hashtags));
						tweet.hashtags = tweet.entities.hashtags.map(function(e){return e.text.toLowerCase();});
						var ttype =  "other";
						tweet.hashtags.forEach(function(h){
							if(params.trackQui.indexOf("#"+h)!=-1) ttype = "parismap";
							if(params.trackQuoi.indexOf("#"+h)!=-1) ttype = "parisquoi";
						});
						tweet.twtype = ttype;
						tweet.session = params.storeSession;
						
						console.log(" ... GEO="+hasGeo+" INCLUDED="+isInc+" ("+tweet.geo.geotype+":"+coord[0]+","+coord[1]+") STORE="+shdstoretweet);
						console.log(" ... TYPE="+tweet.twtype+" LONGEST="+tweet.word+ " #="+tweet.hashtags);
						
						// manage & update media photo (keeping only one)
						tweet['photo'] = {};
						if(tweet.entities.hasOwnProperty('media')) {
							tweet.entities.media.forEach(function(d,i){
								if(d.type=='photo') {
									tweet['photo'] = d;
									//console.log(" ... GOT PHOTO: "+JSON.stringify(tweet['photo']));
								}
							})
						}
		
						if(tweet.user.screen_name!=params.twittername) {
							if(shdstoretweet) {
								processAndStoreTweet(tweet);
							}
						} else {
							console.log("Tweet from admin/API-account ignored: "+params.twittername);
						}
					}
				}
			});
			stream.on('error', function(error, code) {
				console.log("! TWITTER STREAM ERROR ! " + error + ": " + code);
			});
			stream.on('end', function (response) { // Handle a disconnection
				console.log("! TWITTER STREAM DISCONNECTED !");
				//console.log(response);
			});
		}
	);
};

module.exports = worker;



/*
/////////////////////////////////////////////////////////////////////
// if needed at some point: calculation of voronoi squares + ranking (temporarly deprecated)
var recomputeAreas = function(savedtweet,saveduser) {
	var quer = { 'geo.geotype': 'Point' };
	params.showSession=='' ? console.log("getting all sessions-tweets for areas") : quer['session']=params.showSession;
	// fetch all tweets
	models.Tweet.find(quer,{
			'user.screen_name':1,
			'user.id_str':1,
			'p_user':1,
			'geo.coordinates':1,
			'created_at':1,
			'text':1,
			'word':1,
			'twtype':1,
		}).sort({'created_at':-1}).lean().exec(function(err, tdocs) {
		if (err !== null) { var tw = null; }
		else {
			if(savedtweet.geo.geotype=='Point') {
				console.log("recompute areas for session-tweets: "+tdocs.length);
				var cur_userid_tw = savedtweet.user.id_str;
				
				var userDic = {};
				var info = {};
				
				//////////////////////////// make list of squares
				var mydataTweetsPos = tdocs.map(function(d){ return {
					geo:			[d.geo.coordinates[0],d.geo.coordinates[1]],
					userid_mg:		d.p_user,
					userid_tw:		d.user.id_str,
					screen_name:	d.user.screen_name,
					created_at:		d.created_at,
					text:			d.text,
					word:			d.word,
					twtype:			d.twtype,
				};});
				
				//////////////////////////// keep only last one if same geoloc
				var uniquePos = {}
				mydataTweetsPosUnik = []
				mydataTweetsPos.forEach(function(d){
					var uK = d.geo[0]+"|"+d.geo[1];
					if(uniquePos.hasOwnProperty(uK)) {}
					else {
						uniquePos[uK] = d;
						mydataTweetsPosUnik.push(d);
					}
				});
				console.log("reducing tweets (same geolocs): "+mydataTweetsPos.length+" > "+mydataTweetsPosUnik.length);
				
				
				//////////////////////////// make voronoi to get surfaces
				var tvorlist = d3.geom.voronoi( mydataTweetsPosUnik.map(function(e){ return e.geo; }) )
					.map(function(cell){ return parisPolygon.clip(cell); });
				tvorlist.forEach(function(d,i){
					var userid_mg	= mydataTweetsPosUnik[i].userid_mg;
					var userid_tw 	= mydataTweetsPosUnik[i].userid_tw;
					var plus = 0;
					if(d.length>0) {
						plus = d3.geom.polygon(d).area();
						if(isNaN(plus)) {
							plus = 0;
							console.log("VERY WEIRD ERROR : area is NaN for user._idtw: "+userid_tw);
						}
					}
					else {
						plus = 0;
						console.log("WEIRD 0 for user._idtw: "+userid_tw);
					}
					if(userid_tw in userDic) userDic[userid_tw] = {
						sq:			userDic[userid_tw].sq+plus,
						userid_mg:	userid_mg,
						rank:		-1
					};
					else userDic[userid_tw] = {
						sq:			plus,
						userid_mg:	userid_mg,
						rank:		-1
					};
				});
				info['square'] = 0;
				if(userDic.hasOwnProperty(cur_userid_tw))
					info['square'] = (userDic[cur_userid_tw].sq * areaFactor).toFixed(0);
				
				
				//////////////////////////// update squares for all users
				//console.log("updating areas:"+JSON.stringify(userDic));
				var userArray = [];
				Object.keys(userDic).forEach(function(k){
					userArray.push({
						userid_tw:	k,
						square:		userDic[k].sq
					});
				});
				
				//////////////////////////// sort all users based on squares, get each ranking and store in DB
				userArray = userArray.sort(function(a,b) {return a.square<b.square;} );
				userArray.forEach(function(e,i){
					userDic[e.userid_tw].rank = i+1;
				});
				info['rank'] = -1;
				if(userDic.hasOwnProperty(cur_userid_tw))
					info['rank'] = userDic[cur_userid_tw].rank;
				// todo: store in DB
				
				//////////////////////////// sort all neighbors based on distance
				var distArray = mydataTweetsPosUnik.map(function(d){ return {
					screen_name:	d.screen_name,
					dist:			utils.distanceBetweenPoints(savedtweet.geo.coordinates.concat(d.geo)),
					created_at:		d.created_at,
					text:			d.text,
					word:			d.word,
					twtype:			d.twtype,
				}; });
				distArray = distArray.sort(function(a,b) {return (a.dist>b.dist) ? 1 : ((b.dist>a.dist) ? -1 : 0 ); });
				//console.log("DISTANCES sorted\n"+JSON.stringify(distArray,null,4));
				info['neighbors'] = null;
				if(distArray.length>2) {
					var myk = saveduser.screen_name;
					var neigh = {};
					neigh[myk] = 0;
					var idx = 0;
					while(Object.keys(neigh).length<3 && idx<distArray.length) {
						var cur = distArray[idx];
						if(!neigh.hasOwnProperty(cur.screen_name))
							neigh[cur.screen_name]= {
								dist:		cur.dist,
								created_at:	cur.created_at,
								text:		cur.text,
								word:		cur.word,
								twtype:		cur.twtype,
								} ;
						idx+=1;
					}
					delete neigh[myk];
					var nh = [];
					Object.keys(neigh).map(function(e){nh.push({
						screen_name:	e,
						dist:			neigh[e].dist,
						created_at:		neigh[e].created_at,
						text:			neigh[e].text,
						word:			neigh[e].word,
						twtype:			neigh[e].twtype,
					}) });
					info['neighbors'] = nh.sort(function(a,b){ return parseFloat(a.dist)>parseFloat(b.dist); });
				}
				
				////////////////////////// update square value for this user
				Object.keys(userDic).forEach(function(k){
					var userid_mg 	= userDic[k].userid_mg;
					var surface 	= userDic[k].sq * areaFactor;
					var rank 		= userDic[k].rank;
					models.User.findOneAndUpdate({ _id:userid_mg},{map_rank:rank,map_square:surface.toFixed(0)},function(err, doc) {
						if (err) {
							console.log('error updating area/rank for user._id: '+k);
							console.log('error was: '+err);
						}
						else {}
					});
				});
				
				//console.log('user info computed:\n'+JSON.stringify(info));
				// not recomputing colors anymore cause we changed our mind
				//recomputeColors();
			} else {
				// warning ! todo: return empty but complete object to avoid bug when info is used when sending tweet)
				console.log("not recomputing areas (new tweet non incGeo)");
				info = {square:0,rank:-1,neighbors:null};
			}
			// reply tweet
			if(params.showReplyTweet || params.sendReplyTweet) replyTweet(savedtweet,saveduser,info,isNewUser);
			//sendESHQevent(savedtweet,saveduser);
		}
	});
};
*/