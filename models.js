var mongoose = require('mongoose');

//////////////////////////////////////////////////////////// Tweet Users
var userSchema = new mongoose.Schema({
	p_tweet: mongoose.Schema.Types.ObjectId, 	// store last tweet ! ref for Mongoose populate ?
	id_str: String,		// twitter id
	tid: String,		// twitter id of the tweet
	
	name: String,
	screen_name: String,
	//time_zone: String,
	//lang: String,

	statuses_count: Number,
	
	map_count: Number,
	map_square: Number,
	map_rank: Number,
	
	//hasgeo: Boolean,
	color: String,
	
	ustype: String,
	session: String
});

//////////////////////////////////////////////////////////// Tweets
var tweetSchema = new mongoose.Schema({
	p_user: mongoose.Schema.Types.ObjectId, // ref for Mongoose populate ?
	id_str: String,		// twitter id 
	
	text: String,
	created_at: Date,
	user: {
		id_str: String,   // twitter id 
		screen_name: String,
		name: String,
	},
	geo: {
		geotype: String, // AAAAAAARHG ! found out that 'type' is FORBIDDEN within mangoose/mangodb
		coordinates: [Number],
	},
	place: {
		url: String,
		name: String,
		full_name: String,
	},
	photo: {
		media_url: String,
		sizes: {
			small: {},
		},
	},
	
	hashtags: [String],
	word: String,			// longest word
	twtype: String, 		// parisquoi(#parisquoi) | parismap(#parismap/#parisqui) | other(any tweet)
	session: String			// in case you want to save/restore groups of listened tweets
});

//////////////////////////////////////////////////////////// Events from Quefaire API
var eventSchema = new mongoose.Schema({
	evtype:			String,	// "quefaire"(from API) | "manual"(from Form)
	modified:		Date,	// last modification OR fetched_date for 'quefaire' events
	contact:		String,
	link:			String,
	
	// following is same as in QueFaireAPI events
	idactivites:	Number,
	created:		Date,	// = created_byParisStaff
	nom:			String,	// ideally short >> tweet (aka. «concert Karambeyes»)
	description:	String,
	lieu:			String,	// ideally short >> tweet (aka. «Bar de l'impossible»)
	adresse:		String,
	zipcode:		String,
	city:			String,
	lat:			Number,
	lon:			Number,
	occurences:		[{
		start:	Date,
		end:	Date,
	}],
});

var Tweet = mongoose.model('Tweet', tweetSchema);
var User = mongoose.model('User', userSchema);
var Event = mongoose.model('Event', eventSchema);

module.exports.User = User;
module.exports.Tweet = Tweet;
module.exports.Event = Event;