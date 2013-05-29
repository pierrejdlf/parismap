var publisherClient = null;

var params = require('./myparams.js');
	
var publisherClient = require('eshq-js')({
		key:	params.ESHQ_KEY,
		secret: params.ESHQ_SECRET
	});

module.exports = publisherClient;

console.log("ESHQ publisher client made");





/*
var redis = require('redis');
var params = require('./myparams.js');

if(params.where=="local") {
	publisherClient = redis.createClient();
}
else if(params.where=="jitsu") {
	publisherClient = redis.createClient(6379, 'nodejitsudb9770346188.redis.irstack.com');
	publisherClient.auth('nodejitsudb9770346188.redis.irstack.com:f327cfe980c971946e80b8e975fbebb4', function (err) {
		if (err) { throw err; }
	});
}
else if(params.where=="heroku") {
	if (process.env.REDISTOGO_URL) {
		var rtg = require("url").parse(process.env.REDISTOGO_URL);
		publisherClient = redis.createClient(rtg.port, rtg.hostname);
		publisherClient.auth(rtg.auth.split(":")[1], function (err) {
			if (err) { throw err; }
		}); 
	} else {
		console.log("ERROR: no process.env.REDISTOGO_URL");
	}
}

module.exports = publisherClient;
*/


