var dev = process.env.PMDEV || false;
console.log(dev ? "DEV-DEV-DEV-DEV-DEV-DEV-DEV" : "PROD-PROD-PROD-PROD-PROD-PROD-PROD");

var params = {

	//////////////////////////////////////////////////////////////////////////////////////////
 	adminKey:		process.env.PMAK, // lowcost secure admin
 			
	ESHQ_KEY:		process.env.ESHQ_KEY,
	ESHQ_SECRET:	process.env.ESHQ_SECRET,
	ESHQ_URL:		process.env.ESHQ_URL,
	
	/////////////// eventsourceHQ channel
	eventSourceChannel:	dev ? "devMessagChan" : "prodMessagChan",

	/////////////// node + mongodb
	port:			process.env.PORT ,
	mongdb:			process.env.MONGOHQ_URL || process.env.MONGOLAB_URI || 'mongodb://localhost/devdevdev',
	
	/////////////// sessions are used to store/show groups of tweets
	showSession:	dev ? 'paris16mai' : 'ville', // !! WARNING !! '' means all and may cause bugs
	storeSession:	dev ? 'paris16mai' : 'ville',
	
	//////////////////////////////////////////////////////////////////////////////////////////
	listenTwitter:	true, 	// if you need to only show saved map (will mute twitter stream)
	recomputeAreas:	true, 	// NEEDED TO RECOMPUTE COLORS, AND TO REPLY TWEETS !
	showReplyTweet: dev ? true : true,
	sendReplyTweet:	dev ? false : true,
	
	///////////////	$1 arriving ( $s=square  $r=rank ) near $2/$3 ( $d2=dist $t2=time $w2=maxword ) $l=http://carte/p=32,43
	FirstReplyText: 		'$1 bienvenue à #parismap ! parismappartient.fr',
	FirstReplyTextNoGeo:	'$1 bienvenue à #parismap ! (géoloc non activée)',
	
	/////////////// will rotate sequentially between following list of templates		,
	tweetReplyText:			['$1 «$w1» à $d2 de $2 «$w2» ($t2) www.parismappartient.fr'],
/*
					[	'$1 à $d2 de $2 ($t2)',
						'$1 «$w1» à $d2 de $2 «$w2» ($t2) $l',
						'$1 a investi le quartier $2 ($d2 $t2)',
						'$1 ($re avec $s) tweete vers $2 ($d2 $t2)',
						'$1 est à $d2 de $2 ($t2)',
						'$1 ($re avec $s) est près de $2 ($d2 $t2)',
						'$1 et $2 à $d2 ($t2)',
						'$1 flâne dans le quartier $2 ($d2 $t2)',
						'$1 ($re avec $s). à $d2, $t2: $2',
						'$1 à coté de $2 ($d2 $t2)',
						"$1 n'est pas loin de $2 ($d2 $t2)",
						'$1 en promenade dans le coin $2 ($d2 $t2)',
					],
*/
	
	/////////////// geo/non-geo filter
	nonGeoLog:		false,	// true to log 		also non-geo tweets
	nonGeoStore:	false,	// true to store 	also non-geo tweets (will have RANDOM GEOLOC ! - see above)
					
	/////////////// null if you want random within [rectParisSmall]
	//nonGeoPos:		null,
	nonGeoPos:		[48.9,2.5],
	//nonGeoPos:		[48.828283,2.433021],	(au hasard, @bois de boulogne)

	/////////////// not/included in boundaries
	nonIncLog:		false,
	nonIncStore:	false,
	
	
	//////////////////////////////////////////////////////////////////////////////////////////
	/////////////// API QUEFAIRE.PARIS.FR
	quefaireUrl:	'https://api.paris.fr:3000/data/1.0/QueFaire/get_activities/',
 	quefaireToken:	process.env.PMQFT,
 	
	/////////////// API WITTER STREAM, see https://dev.twitter.com/docs/streaming-apis/parameters
	twittername:			dev ? 'parlaparci' : 'parismap', // his tweets will be ignored !
	consumer_key: 			process.env.PMCK,
	consumer_secret: 		process.env.PMCS,
	access_token_key: 		process.env.PMAT,
	access_token_secret: 	process.env.PMATS,
	
	track:	dev ? ["#paris"] : ["#parismap"],
	//["ton","a","il","on","se","au","y","c","moi","je","tu","sa","son","ton","ta","ne","pas","la","le","de","des","du","un","et","si","pour","rien","sur","avec","sans","ds","dans","à","ce","ces","est","eu","vu","va","#parismap"],
	
	//////////////////////////////////////////////////////////////////////////////////////////
	// following big bounding box is used within twitter query
	// following small bounding box is used to simulate random points (included in)
	
	/////////////// ONLY PARIS
	//rectParisBig:	[48.8145178,2.248419843,48.90334427,2.417923419],
	//rectParisSmall:	[48.83173,2.292709,48.879167,2.395706],
	//parisSqMeters:	91427402.83911657,
	//parisPolygon: 	[[48.83419548,2.413464948],[48.85033074,2.417923419],[48.87367875,2.415478115],[48.90210227,2.392779594],[48.90334427,2.320691251],[48.88427269,2.281273171],[48.84087239,2.248419843],[48.83452727,2.256083081],[48.8158365,2.335076699],[48.8145178,2.36226302],[48.8282736,2.401443596]],	
	
	
	/////////////// WHOLE ILE-DE-FRANCE
	rectParisBig:	[48.056054,1.461182,49.335862,3.641968],
	rectParisSmall:	[48.987427,2.06543,49.023461,3.059692],
	parisSqMeters:	14679353480.09045,
	parisPolygon: 	[[48.61791813,3.572957953],[48.85618892,3.508235299],[49.12239773,3.161118783],[49.24195102,2.093441879],[49.25413604,1.69649542],[49.05706873,1.409758358],[48.659274,1.582294231],[48.28108529,1.956014471],[48.11285239,2.444832491],[48.10563874,2.664153506],[48.11956951,2.825897828],[48.15829264,2.950372307],[48.38476815,3.422591908]],
 	
};

module.exports = params;





/*
	// SOUVENIRS
	
	//track:			["mpt","manif","#lmpt","#mariagepourtous","#manifpourtous","#onlr","#onlacherien","#retraitloitaubira", "#21avril","#noussommeslepeuple","#nonmariagehomo","#bastille","#legalitecestpourmardi"],
	//track:		["manif","#manif","bastille","#bastille","5mai","#5mai","#6eRepublique","#Hollande","#6eRep","#pg", "#FrançaisEnRévolte","#FrançaisEnRevolte","#revolutioncitoyenne","#dubalai","#reseauFDG","#pcf","#mélanchon","#Gouvernement","#journéedubalai","#journeedubalai","#CoupDeBalai","#CampingPourTous","#RetraitLoiTaubira","#onlr","#onlacherien","#lmpt","#ManifPourTous"],
	//track:			["#paris","paris"],
	track:			["#parismap"],
	//track:			[" "],
	// sur mongod://manifpourtous0 pour recup manif pour tous (et autres sessions)
	// paris2mai	nusers: 875, ntweets: 1194 ++
	// paris3mai	nusers: 80, ntweets: 91
	// manif5mai	beaucoup beaucoup , surtout des non gelolcs
	// paris6mai	petit test après sorts en tt genre
	// paris12mai	quasi rien
	// sur mongod://supervide pour tests
	// paris16mai
	// sur mongod://devdevdev pour clean
*/

