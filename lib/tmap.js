var l = null;
////////////////////////////////////////////////////////////////////////////
var voronoimap = function(divid,shapeMask) {
	var f = {}, bounds, feature;

	var mydataTweets = null;
	var mydataUsers = null;
	var stats = [];
	var minPointSize = 7,
		maxPointSize = 7;
	var minPointSizeFrom = 3,
		maxPointSizeFrom = 3;
	var minPointTime = 20000,
		maxPointTime = 200;
	var tweetDateScaleMin = null,
		tweetDateScaleMax = null,
		tweetDateScaleTime = null,
		tweetDateScaleColor = null,
		tweetDateScaleOp = null;
	var defTweetColor = "#6492c6",		// twitter blue
		defNgTweetColor = "black",
		overTweetColor = "#C56055",
		pmapTweetColor = "#DCD042",		// parismap yellow
		defEventColor = "#C46B70";		// event red
	var pmapTweetSize = 5;
	
	var showVoronoi = true;
	
	var overdiv = d3.select('#'+divid).append("div").attr('id','overmap');
	f.parent = overdiv.node();
	var svgmap = overdiv.append('svg').attr("id","svgmap").attr("class","leaflet-zoom-hide");
	g = svgmap.append("g");
	var gcontour = g.append("g").attr("id","gcontour");
	var gvoronoi = g.append("g").attr("id","gvoronoi");
	var gbubbles = g.append("g").attr("id","gbubbles");
	
	var mapmask = overdiv.append("svg").attr("id","svgmapmask")
		.attr("width",window.innerWidth)
		.attr("height",window.innerHeight)
		.append("path").attr("d","");
		
	///////////////////////////////////////////////////////////////////////////////////// FIXED PARIS PATH
	// tests
	//var parisGeo = [[48.804602,2.213745],[48.804602,2.438278],[48.920469,2.438278],[48.920469,2.213745]];
	// simplified convex paris
	var parisGeo = shapeMask;
	//console.log(parisGeo);
	var parisPolygon = null;
	var parisPixel = null;
		
	////////////////////////////////////////////////////////////////////////////////////
	// Use mapbox for the geographic projection
	f.projectraw = function(array) {
		var point = f.map.latLngToContainerPoint( new L.LatLng(array[0],array[1]) ); // Mapbox 1.0
		return [point.x, point.y];
	};
	f.projectdot = function(d) {
		// here, workaround to add some small decimal values to avoid same pixel position (voronoi bug)
		var pixpt = f.projectraw([d.x,d.y]);
		pixpt[0] += d.x/50.0;
		pixpt[1] += d.y/10.0;
		return pixpt;
	};
	
	/////////////////////////////////////////////////////////////////////////////////////	
	f.on = function(){};	
    f.initialize = function (latlng) {
    	console.log(" ... f.initialize");
    };
    f.onAdd = function (map) {
    	console.log(" ... f.onAdd");
    	f.map.on('move',  f.draw ,this);
        f.draw();
    },
    
	/////////////////////////////////////////////////////////////////////////////////////
	// Reposition the SVG to cover the features.
	f.draw = function() {
		//hide all tooltips when panning/zooming
		$('.mytooltip').remove();
		
		var bounds = f.map.getBounds();
		var	bl = bounds.getSouthWest(),
			tr = bounds.getNorthEast();
		var bottomLeft = f.projectraw([bl.lat,bl.lng]),
			topRight = f.projectraw([tr.lat,tr.lng]);
		d3.select("#svgmap")
			.attr({"width":topRight[0]-bottomLeft[0], "height":bottomLeft[1]-topRight[1]})
			.style({"margin-left":bottomLeft[0]+"px","margin-top":topRight[1]+"px"});
		d3.select("#svgmap g")
			.attr("transform", "translate(" + -bottomLeft[0] + "," + -topRight[1] + ")");

		///////// POINTS: tweets + events
		d3.selectAll(".tweets")
			.attr("cx",function(d,i){return f.projectdot(d)[0];})
			.attr("cy",function(d,i){return f.projectdot(d)[1];});
		d3.selectAll(".events")
			.attr("cx",function(d,i){return f.projectdot(d)[0];})
			.attr("cy",function(d,i){return f.projectdot(d)[1];});			
			
		parisPixel = parisGeo.map(function(e){return [f.projectraw(e)[0],f.projectraw(e)[1]]; });
		parisPolygon = d3.geom.polygon(parisPixel);
		
		///////// PARIS CONTOUR
		d3.selectAll(".contour")
			.data([parisPixel])
			.attr("points",function(d) { return d.map( function(d){return [d[0],d[1]].join(",");} ).join(" "); });
		
		///////// PARIS MASK
		d3.select("#svgmapmask")
			.attr("width", topRight[0] - bottomLeft[0])
			.attr("height", bottomLeft[1] - topRight[1]);
		d3.select("#svgmapmask path").attr("d",f.getSvgMaskPath() );						
		
		if(showVoronoi) {
			var dataPositions = mydataTweets.map(function(d){ return [f.projectdot(d)[0],f.projectdot(d)[1]];});
			var ndata = d3.geom.voronoi(dataPositions).map(function(cell) { return parisPolygon.clip(cell); });
			///////// PATHS
			d3.selectAll(".voropaths")
				.data(ndata)
				.attr("d",function(d){ return "M"+d.join("L")+"Z"; });
		}	
	};
	/////////////////////////////////////////////////////////////////////////////////////
	// get mask path based on zoom
	f.getSvgMaskPath = function() {
		var mx = window.innerWidth;
		var my = window.innerHeight;
		var myy = my;
		var mxx = mx;
		var res = "M"+mxx+" "+myy;
		for(var i=0;i<parisPixel.length;i++) {
			var x = parisPixel[i][0];
			var y = parisPixel[i][1];
			res += " L"+x+" "+y;
		}
		res += " L"+parisPixel[0][0]+" "+parisPixel[0][1];
		res += " L"+mxx+" -0 L"+mxx+" "+myy+" L-0 "+myy+" L-0 -0 L"+mxx+" -0 L"+mxx+" "+myy+" Z";
		return res;
	};	
	
	/////////////////////////////////////////////////////////////////////////////////////
	// tweet tooltip content
	f.tweetTooltipContent = function(d,mode) {
		var u = d.user;
		//#'+u.map_rank+'/'+mydataUsers.length+' |  
		return '<div><div class="toolt_head"><a href="https://twitter.com/'+u.screen_name+'" target="_blank">'+u.name+"</a> | "+formatDateFromNow(d.created_at)+'</div><div class="toolt_body">'+formatTweet(d.text)+'</div></div>';
	};
	/////////////////////////////////////////////////////////////////////////////////////
	// tweet tooltip content
	f.eventTooltipContent = function(d,mode) {
		return '<div><div class="toolt_head">'+formatDate(d.occurences[0].start,"HH:mm")+" à "+formatDate(d.occurences[0].end,"HH:mm")+" ("+formatDateFromNow(d.occurences[0].start)+')</div><div class="toolt_body">'+d.name+'</div><div class="toolt_footer">'+d.place+"<br>"+d.adress+'</div></div>';
	};
	
	/////////////////////////////////////////////////////////////////////////////////////
	// test if user exists
	f.getOrAddUser = function(user) {
		var founduser = null;
		for(var i=0;i<mydataUsers.length;i++) {
			if(mydataUsers[i].id_str === user.id_str) {
				console.log("EXISTING USER in mydataUsers:"+user.id_str+" "+user.screen_name);
				return mydataUsers[i];
			}
		}
		if(founduser==null) {
			console.log("NEW USER added in mydataUsers"+user.id_str+" "+user.screen_name);
			mydataTweets.push(user);
			f.updateScales();
			return user;
		}
	};

	/////////////////////////////////////////////////////////////////////////////////////
	// add new element
	f.addTweet = function(streamedData) {
		var nuser = f.getOrAddUser(streamedData.user);;
		var ntweet = streamedData.tweet;
		
		mydataTweets.push(f.doto(ntweet));
		console.log(ntweet);
		
		console.log("TWEET:"+f.doto(ntweet).text);
		gbubbles.selectAll(".tweets")
			.data(mydataTweets)
			.enter().append("svg:circle")
				.call(f.attrTweets)
				.attr({"fill":"red","r":30})
				.transition().duration(700)
					.attr({"fill":"black","r":minPointSize});
		
		var dataPositions = mydataTweets.map(function(d){ return [f.projectdot(d)[0],fprojectdot(d)[1]];});
		var ndata = d3.geom.voronoi(dataPositions).map(function(cell) { return parisPolygon.clip(cell); });
		gvoronoi.selectAll(".voropaths")
			.data(ndata).enter().append("svg:path")
				.call(f.attrVoronoi);
				
		f.draw();
	};
	
	/////////////////////////////////////////////////////////////////////////////////////
	// update user color scale
	f.updateScales = function() {
		tweetDateScaleOp = d3.scale.linear()
			.domain([stats['mindate'],stats['maxdate']])
			.range([0.6,1]);
			
		tweetDateScaleMin = d3.scale.linear()
			.domain([stats['mindate'],stats['maxdate']])
			.range([minPointSizeFrom,minPointSize]);
		tweetDateScaleMax = d3.scale.linear()
			.domain([stats['mindate'],stats['maxdate']])
			.range([maxPointSizeFrom,maxPointSize]);
			
		tweetDateScaleTime = d3.scale.linear()
			.domain([stats['mindate'],stats['maxdate']])
			.range([minPointTime,maxPointTime]);
		tweetDateScaleColor = d3.scale.pow().exponent(10)
			.domain([stats['maxdate'],stats['mindate']])
			.range([defTweetColor,"black"]);
			//.interpolate(d3.interpolateHsl);
		//userColorScale = d3.scale.ordinal()
			//.domain(mydataUsers.map(function(d,i){return d.id_str;}))
			//.range(userColors);
			//.range([d3.hsl(50,0.9,0.7),d3.hsl(230,0.9,0.7)])//.range(["steelblue", "brown"])
			//.interpolate(d3.interpolateHsl);
	};
	
	////////////////////////////////////////////////////////////////////////////////////
	// VIBRATE tweets
	f.vibrTweets = function(sel,d,i) {
		var dat = moment(d.created_at);
		var tim = 600;//tweetDateScaleTime(dat);
		sel
			.transition().duration(tim)
			.attr("r",tweetDateScaleMax(dat))//.attr("fill",twitblue)//function(d,i){return tweetDateScaleColor(moment(d.created_at));})
			.transition().duration(tim)
			.attr("r",tweetDateScaleMin(dat))//.attr("fill","black");
			//.call(function(){});
		setTimeout(function(){f.vibrTweets(sel,d)},2*tim);
	};

	////////////////////////////////////////////////////////////////////////////////////
	// ATTR to tweets
	f.attrTweets = function(selection) {
		return selection
			//.style("pointer-events","none")
			.attr("class",function(d,i){ return "svg tweets user_"+d.user.id_str+" "+d.twtype; } )
			.attr("id",function(d,i){return "c_"+d.tid;})
			.attr("rel","tooltip")
			.attr("tooltipclass","tweet")
			.attr("title",function(d,i){return f.tweetTooltipContent(d);})
			.attr("opacity",function(d,i){return tweetDateScaleOp(moment(d.created_at));})
			.attr("fill",function(d,i){return d.twtype=='other' ? defTweetColor : pmapTweetColor;}) // color = vibrTweet
			.attr("cx",function(d,i){return f.projectdot(d)[0];})
			.attr("cy",function(d,i){return f.projectdot(d)[1];})
			.attr("r",function(d,i){return d.twtype=='other' ? minPointSizeFrom : pmapTweetSize;})
			//.attr("r",function(d,i){return tweetDateScaleMin(moment(d.created_at));})
			.on("mouseout",function(d,i){
				f.rollUserOut( d.user.id_str,d.tid );
			})
			.on("mouseover",function(d,i){
				f.rollUserOver( d.user.id_str,d.tid );
			});
	};
		
	////////////////////////////////////////////////////////////////////////////////////
	// ATTR to events
	f.attrEvents = function(selection) {
		return selection
			//.style("pointer-events","none")
			.attr("class",function(d,i){ return "svg events"; } )
			.attr("id",function(d,i){return "c_"+d.id;})
			.attr("rel","tooltip")
			.attr("tooltipclass","event")
			.attr("title",function(d,i){return f.eventTooltipContent(d);})
			.attr("fill",function(d,i){return defEventColor;}) // color = vibrTweet
			.attr("cx",function(d,i){return f.projectdot(d)[0];})
			.attr("cy",function(d,i){return f.projectdot(d)[1];})
			.attr("r",function(d,i){return pmapTweetSize;})
	};
	
	////////////////////////////////////////////////////////////////////////////////////
	// ATTR to voropaths
	f.attrVoronoi = function(selection) {
		selection
			.attr("class",function(d,i){ return "voropaths user_"+mydataTweets[i].user.id_str+" "+mydataTweets[i].twtype; } )
			.attr("id",function(d,i){return "v_"+mydataTweets[i].tid;})
			.attr("uid",function(d,i){return mydataTweets[i].user.id_str;})
			.attr("tid",function(d,i){return mydataTweets[i].tid;})
			.attr("fill","black") //mydataTweets[i].user.color
			.attr("fill-opacity",function(d,i){return mydataTweets[i].twtype=='other' ? 0.6 : 0.5; })
			.attr("stroke","none")
			.on("click",function(d,i){
				f.rollUserClick( mydataTweets[i].user.id_str,mydataTweets[i].tid, false );
			})
			.on("mouseout",function(d,i){
				f.rollUserOut( mydataTweets[i].user.id_str,mydataTweets[i].tid );
			})
			.on("mouseover",function(d,i){
				f.rollUserOver( mydataTweets[i].user.id_str,mydataTweets[i].tid );
			});
		return selection;
	};

	////////////////////////////////////////////////////////////////////////////////////
	// CLICKS ON MAP/MASK
/*
	d3.select("#svgmap").on("click",function(){
		//console.log("click body");
		var vp = d3.select(".voropaths[looking~=up]");
		var uid = vp.attr("uid");
		var tid = vp.attr("tid");
		f.rollUserClick(uid,tid,true);
		$("#c_"+tid).click();
	});
*/
	
	////////////////////////////////////////////////////////////////////////////////////
	// Roll User (voronoi && userlist
	f.rollUserClick = function(uid,tid,scroll) {
		$(".mytooltip").remove();
		if(tid==null) $('.user_'+uid).click();
		else $('#c_'+tid).click();
		//if(scroll) $('#panel').animate({scrollTop: $('#l_'+uid).offset().top-$('#l_'+uid).height()+$('#panel').scrollTop() }, 600);
	};
	f.rollUserOver = function(uid,tid) {
		$(".mytooltip").remove();
		
		//d3.selectAll("circle.user_"+uid).attr("fill",overTweetColor);
		//d3.selectAll(".voropaths.user_"+uid).attr("fill-opacity",0);
		d3.selectAll(".voropaths.user_"+uid).attr("stroke","white");
		d3.selectAll(".voropaths.user_"+uid).attr("stroke-width","2px");
		d3.selectAll(".voropaths.user_"+uid).attr("stroke-opacity",0.7);
	};
	f.rollUserOut = function(uid,tid) {
		if(tid==null) $('.user_'+uid).mouseout();
		else $('#c_'+tid).mouseout();
		
		//d3.selectAll(".tweets").attr("fill",function(d,i){return d.twtype=='other'? defTweetColor : pmapTweetColor;});
		//d3.selectAll(".voropaths.user_"+uid).attr("fill-opacity",0.6);
		d3.selectAll(".voropaths.user_"+uid).attr("stroke","none");
	};

	////////////////////////////////////////////////////////////////////////////////////
	// PANEL top users list
	f.makeUserList = function() {
		var topUsers = mydataUsers;//.slice(0,10);
		var userRow = d3.select("#panel").append("table").append("tbody").selectAll("panelist")
			.data(topUsers)
			//.sort(function(a,b){ return a<b; })
			//.filter(function(d,i){ return i<20; })
			.enter().append("tr")
				.attr("id",function(d,i){ return "l_"+d.id_str; })
				.attr("color",function(d,i){ return d.color; });

		userRow.on("click",function(d,i){
			// pan to the lat/lng (mmmmh. need to look more into transition (overlay not moving)
/*
			var tw = d3.select(".tweets#c_"+d.tid);
			if(!tw.empty()) {
				t = tw.data()[0];
				f.map.panTo([t.x,t.y]);
			}
*/
			f.rollUserClick(d.id_str,null,false);
		});		
		userRow.on("mouseover",function(d,i){
			f.rollUserOver(d.id_str,d.tid);
		});
		userRow.on("mouseout",function(d,i){
			f.rollUserOut(d.id_str,d.tid);
		});
		
		userRow.append("td").attr("class","rank").append("div").text(function(d,i){ return d.map_rank; });
		var cont = userRow.append("td").attr("class","content");
		cont.append("div")
			.attr("class","square")
			.text(function(d,i){ return formatSquare(d.map_square); });
		var nam = cont.append("div");
		nam.append("a")
			.attr("class","name")
			.attr("target","_blank")
			.attr("href",function(d,i){ return "https://twitter.com/"+d.screen_name; })
			.text(function(d,i){ return d.name; });
		nam.append("div")
			.attr("class","date")
			.attr("href",function(d,i){ return "https://twitter.com/"+d.screen_name; })
			.text(function(d,i){
				var tw = d3.select(".tweets#c_"+d.tid);
				if(tw.empty()) return "no date";
				else return formatDateFromNow(tw.data()[0].created_at);
			});
		cont.append("div")
			.attr("class","text")
			.html(function(d,i){
				//get last tweet (= user.tid)
				var tt = "<i>no tweet id: "+d.tid+"</i>";
				var tw = d3.select(".tweets#c_"+d.tid);
				if(!tw.empty()) tt=formatTweet(tw.data()[0].text);
				else {
					tw = d3.select(".ngtweets#ngc_"+d.tid);
					if(!tw.empty()) tt=formatTweet(tw.data()[0].text);
				}
				return tt;
			});
		userRow.append("td")
			.attr("class","color")
			.style("background",function(d,i) { return d.color; })
			.text(function(d,i){ return d.map_count; });
/*
		userRow.append("td")
			.attr("class","square")
			.text(function(d,i){ return formatSquare(d.map_square); });
*/
		//userRow.append("td").text(function(d,i){ return d.text; });
	};	

	////////////////////////////////////////////////////////////////////////////////////
	// access to data from json (structured in the mongodb query)
	f.doto = function(d) {
		// return first tweet of list for this zone
		var tt = d.value.tweetlist[0];
		var uu = f.getUser(tt.uid);
		return {
			x:				d._id[0],
			y:				d._id[1],
			tid:			tt.tid,
			created_at:		tt.created_at,
			text:			tt.text,
			user:			uu,
			twtype:			tt.twtype,
		};
	};

	f.evdoto = function(d) {
		return {
			x:				d.lat,
			y:				d.lon,
			id:				d.idactivites,
			occurences:		d.occurences,
			name:			d.nom,
			place:			d.lieu,
			adress:			d.adresse+" "+d.zipcode+" "+d.city,
		};
	};	

	////////////////////////////////////////////////////////////////////////////////////
	// get tweet's user from data
	f.getUser = function(uid) {
		var res = mydataUsers[0];
		for(var i=0; i<mydataUsers.length; i++) { if(mydataUsers[i].id_str==uid) res=mydataUsers[i]; }
		return res;
	};
		
	////////////////////////////////////////////////////////////////////////////////////
	// init
	f.data = function(alldata,m,eventSourceChannel) {
		f.map = m;
		// NB !
		// tweets are here ZONES - each zone containing tweets of same position
		
		mydataEvents	= alldata.events.map(function(d){return f.evdoto(d);});
		mydataUsers		= alldata.users;
		mydataTweets	= alldata.tweets.map(function(d){return f.doto(d);});
		//mydataOutTweets = alldata.nongeotweets;
		
		stats['nevents'] = mydataEvents.length;
		stats['nusers'] = mydataUsers.length;
		stats['ntweets'] = mydataTweets.length;
		//stats['ngtweets'] = mydataOutTweets.length;
		stats['mindate'] = Math.min.apply(Math,mydataTweets.map(function(d){ return moment(d.created_at) ; }));
		stats['maxdate'] = Math.max.apply(Math,mydataTweets.map(function(d){ return moment(d.created_at) ; }));
		stats['minlat'] = Math.min.apply(Math,mydataTweets.map(function(d){ return d.x ; }));
		stats['minlng'] = Math.min.apply(Math,mydataTweets.map(function(d){ return d.y ; }));
		stats['maxlat'] = Math.max.apply(Math,mydataTweets.map(function(d){ return d.x ; }));
		stats['maxlng'] = Math.max.apply(Math,mydataTweets.map(function(d){ return d.y ; }));
		// ? stats['maxlng'] = Math.max(mydataTweets.map(function(d){ return d.y ; });
		
		//stats['geolocs'] = mydataTweets.map(function(d){ return [f.doto(d).x,f.doto(d).y] ; });
		//stats['geopixs'] = mydataTweets.map(function(d){ return [f.projectdot(d)[0],f.projectdot(d)[1]];});
		//stats['ngmindate'] = Math.min.apply(Math,mydataOutTweets.map(function(d){ return moment(d.created_at) ; }));
		//stats['ngmaxdate'] = Math.max.apply(Math,mydataOutTweets.map(function(d){ return moment(d.created_at) ; }));
		//stats['mindate'] = Math.min.apply(Math,mydataTweets.concat(mydataOutTweets).map(function(d){ return moment(d.created_at) ; }));
		//stats['maxdate'] = Math.max.apply(Math,mydataTweets.concat(mydataOutTweets).map(function(d){ return moment(d.created_at) ; }));
		
		console.log(stats);

		f.updateScales();
		
		var nongeoTweetX = d3.scale.linear()
			.domain([stats['ngmindate'],stats['ngmaxdate']])
			.range([360,window.innerWidth]);
			
		//console.log(" ... sample first user:");
		//console.log(mydataUsers[0]);
		//console.log(" ... sample first tweet:");
		//console.log(mydataTweets[0]);

		parisPixel = parisGeo.map(function(e){return [f.projectraw(e)[0],f.projectraw(e)[1]]; });	
		
		/////////////////////////////////////////// PARIS MASK
		d3.select("#svgmapmask path").attr("d",f.getSvgMaskPath());	
		
		/////////////////////////////////////////// PARIS BOUNDARIES
		gcontour.selectAll("polygon")
			.data([parisPixel])
			.enter().append("polygon")
				.attr("class","contour")
				.attr("points",function(d) { 
					return d.map( function(d){return [d[0],d[1]].join(",");} ).join(" ");
				});
	
		
		console.log(" ... init will make tweets");
		/////////////////////////////////////////// TWEET POINTS
		gbubbles.selectAll('tweets')
			.data(mydataTweets)
			.enter().append("svg:circle")
				.call(f.attrTweets);
				//.each(function(d,i){f.vibrTweets(d3.select(this),d,i);});
		
		console.log(" ... init will make events");
		/////////////////////////////////////////// EVENTS POINTS
		gbubbles.selectAll('events')
			.data(mydataEvents)
			.enter().append("svg:circle")
				.call(f.attrEvents);
						
		
		console.log(" ... init will make voronoi");	
		/////////////////////////////////////////// VORONOI
		// friendly array for d3 voronoi
		parisPolygon = d3.geom.polygon(parisPixel);
		//mydataTweets.forEach(function(e){ console.log(e.geo.coordinates[0]+","+e.geo.coordinates[0])});
		var dataPositions = mydataTweets.map(function(d,i){ return [f.projectdot(d)[0],f.projectdot(d)[1]];});
		//dataPositions.forEach(function(e){ console.log(e[0]+","+e[1])});
		var vdata = d3.geom.voronoi(dataPositions).map(function(cell){ return parisPolygon.clip(cell); });
		gvoronoi.selectAll("path")
			.data(vdata)
			.enter().append("svg:path")
				.call(f.attrVoronoi);
		
		// we don't make userlist
		//console.log(" ... init will make userlist");
		//f.makeUserList();
		makeTooltips('click');

		d3.select("#toggleVoronoi input").attr('checked','checked');
		d3.select("#toggleVoronoi input").on("click", function(){
			showVoronoi = !showVoronoi;
			d3.selectAll(".voropaths").style("opacity",showVoronoi ? 1 : 0);
			f.draw();
		});
		

/*
		/////////////////////////////////////////// EVENT STREAM CONNECTION
		// normal event source	
		//var source = new EventSource("/"+streamAddress);
		
		// using heroku event source ESHQ
		var source = new ESHQ(eventSourceChannel);//,{auth_url: "/"+streamAddress});
		
		source.onopen = function(e) {
			console.log(" ... ESHQ connexion ok");
			// callback called when the connection is made
		};
		source.onmessage = function(e) {
			// callback called when a new message has been received
			console.log("Message type: %s, message data: %s", e.type, e.data);
		};
		source.onerror = function(e) {
			// callback called on errror
			console.log(" ... ESHQ connexion error");
			console.log(e);
		};

		source.addEventListener('newtweetmessage', function(e) {
			console.log("------- NEW TWEET RECEIVED");
			var newdata = eval("("+e.data+")");
			//f.addTweet(newdata);
		});
*/
		
		return f;
	};
	return f;
}

////////////////////////////////////////////////////////////////////////////
var init_map = function(divid,eventSourceChannel,shapeMask,jsonUrl,pos,zoom) {
	var m = L.mapbox.map(divid,null,{
		attributionControl:false,
		zoomControl:true,
		zoomAnimation:false,
		//minZoom:2,
		//maxZoom:25,
		//maxBounds:new L.LatLngBounds(new L.LatLng(48.498408,1.711121),new L.LatLng(49.156562,2.883911))
	}).setView(pos,zoom);
	m.zoomControl.setPosition('bottomright');
	var mLayer = L.mapbox.tileLayer('minut.map-ajvfk52h',{ format: 'jpg70' }); //funky = minut.map-ybst8py7 , satelite = minut.map-az5xzh7g , streets = minut.map-ajvfk52h
	mLayer.addTo(m);
	console.log(" ... waiting for json: "+jsonUrl);
	d3.json(jsonUrl, function(data) {
		console.log(" ... got first json");
		d3.json("/events.json?to=24", function(evts) {
			data['events'] = evts;
			l = voronoimap(divid,shapeMask).data(data,m,eventSourceChannel);
			m.addLayer(l);
		});
	});
};


////////////////////////////////////////////////////////////////////////////
var goToMyPosition = function() {
	// fetching my current position (from browser)			
	navigator.geolocation.getCurrentPosition(
		function(position) {
			// Once we've got a position, zoom and center the map
			// on it, add ad a single feature
			console.log(" ... current location found !");
			console.log(position.coords);
			l.map.panTo([position.coords.latitude,position.coords.longitude]);
			l.map.setView([position.coords.latitude,position.coords.longitude],14,false);
		},
		function(err) {
			// If the user chooses not to allow their location
			console.log(" ... you refused to show your location !");
		}
	);
}
////////////////////////////////////////////////////////////////////////////

