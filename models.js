var mongoose = require('mongoose');

//////////////////////////////////////////////////////////// Tweet Users
var userSchema = new mongoose.Schema({
	p_tweet: mongoose.Schema.Types.ObjectId, 	// sytore last tweet ! ref for Mongoose populate ?
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
	twtype: String, 		// parismap, other
	session: String			// in case you want to save/restore groups of listened tweets
});

//////////////////////////////////////////////////////////// Events from Quefaire API
var eventSchema = new mongoose.Schema({
	// type is either "quefaire", "added"
	evtype:			String,
	created:		Date,
	modified:		Date,
	
	// following is same as in QueFaireAPI
	idactivites:	Number,
	nom:			String,
	description:	String,
	lieu:			String,
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



//////////////////////////////////////////////////////////// Sample Tweet from Twitter Stream API
/*
{
    "created_at": "Fri Apr 12 11:53:52 +0000 2013",
    "id": 32267895uytr35695uyt58500,
    "id_str": "322678uyrt95356uty9558528",
    "text": "super text du tweet @rien",
    "source": "<a href=\"http://twitter.com/download/android\" rel=\"nofollow\">Twitter for Android</a>",
    "truncated": false,
    "in_reply_to_status_id": null,
    "in_reply_to_status_id_str": null,
    "in_reply_to_user_id": 162532516,
    "in_reply_to_user_id_str": "162532516",
    "in_reply_to_screen_name": "alegggqqafini",
    "user": {
        "id": 62551239246136,
        "id_str": "62243246",
        "name": "Hadsghfhgf Lttrre",
        "screen_name": "hadrhgflacoste",
        "location": "Paris, France",
        "url": "http://www.ahgfdgfhgfdllection.wordpress.com",
        "description": "Fahgdfs anhgfdn blogger - instagfhsien_hgfdste pinterest: @hahjkfoste",
        "protected": false,
        "followers_count": 232,
        "friends_count": 1105,
        "listed_count": 0,
        "created_at": "Sat Jul 07 09:11:52 +0000 2012",
        "favourites_count": 268,
        "utc_offset": 7200,
        "time_zone": "Athens",
        "geo_enabled": true,
        "verified": false,
        "statuses_count": 3298,
        "lang": "fr",
        "contributors_enabled": false,
        "is_translator": false,
        "profile_background_color": "C0DEED",
        "profile_background_image_url": "http://a0.twimg.com/profile_background_images/59jhfgjoyl.jpeg",
        "profile_background_image_url_https": "https://si0.twimg.com/profile_background_jhgdjhdgfjmooyl.jpeg",
        "profile_background_tile": true,
        "profile_image_url": "http://a0.twimg.com/profile_images/33jhdgjdhgmal.jpeg",
        "profile_image_url_https": "https://si0.twimg.com/profile_imagehgjdjhgdormal.jpeg",
        "profile_banner_url": "https://si0.twimg.com/profilejhd86913",
        "profile_link_color": "0084B4",
        "profile_sidebar_border_color": "C0DEED",
        "profile_sidebar_fill_color": "DDEEF6",
        "profile_text_color": "333333",
        "profile_use_background_image": true,
        "default_profile": false,
        "default_profile_image": false,
        "following": null,
        "follow_request_sent": null,
        "notifications": null
    },
    "geo": {
        "type": "Point",
        "coordinates": [
            48.862321634,
            2.278532644
        ]
    },
    "coordinates": {
        "type": "Point",
        "coordinates": [
            2.2785644,
            48.8621634
        ]
    },
    "place": {
        "id": "7238f9hgj9af6",
        "url": "http://api.twitter.com/1/geo/id/7238f9hgfdf6.json",
        "place_type": "city",
        "name": "Paris",
        "full_name": "Paris, Paris",
        "country_code": "FR",
        "country": "France",
        "polylines": [],
        "bounding_box": {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        2.224101,
                        48.815541
                    ],
                    [
                        2.224101,
                        48.902146
                    ],
                    [
                        2.46991,
                        48.902146
                    ],
                    [
                        2.46991,
                        48.815541
                    ]
                ]
            ]
        },
        "attributes": {}
    },
    "contributors": null,
    "retweet_count": 0,
    "favorite_count": 0,
    "entities": {
        "hashtags": [],
        "urls": [],
        "user_mentions": [
            {
                "screen_name": "alexkjhfni",
                "name": "Alejfdfini",
                "id": 162532516,
                "id_str": "162jdh516",
                "indices": [
                    0,
                    15
                ]
            }
        ]
    },
    "favorited": false,
    "retweeted": false,
    "filter_level": "medium",
    "lang": "en"
}
*/