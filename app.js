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
	//models = require("./models.js"),
	twitterWorker = require("./twitter.js"),
	quefaire = require("./quefaire.js");

// setup publisher client
publisherClient = require("./publisher.js");

if (publisherClient) {
  publisherClient.listen(app);
}

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

app.use(require('./controllers/index'));
app.use(require('./controllers/event'));
app.use(require('./controllers/qui'));
app.use(require('./controllers/quoi'));
app.use(require('./controllers/feeds'));
app.use(require('./controllers/admin'));

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
//twitterWorker();

/////////////////////////////////////////////////////////////////////
// Create the http server on the specified port
http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
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