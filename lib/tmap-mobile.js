var l = null;
////////////////////////////////////////////////////////////////////////////
function supportsSvg() {
	return document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1")
}
var voronoimap = function(divid,shapeMask) {
	var f = {}, bounds, feature;
	
	f.svgOk = supportsSvg();
	console.log(" ... SVG support: "+f.svgOk);
	
	var mydataTweets = null;
	var mydataUsers = null;
	var stats = [];
	var minPointSize = 5;
	var clicPointSize = 17;
	
	var minPointTime = 10000,
		maxPointTime = 70;

	var defTweetColor = "#6492c6";//"#26BBF8"; // twitter blue
		defNgTweetColor = "black";
		overTweetColor = "#C56055";
		pmapTweetColor = "#DCD042";
		
	var showVoronoi = false;
	
	var overdiv = d3.select('#'+divid).append("div").attr('id','overmap');
	f.parent = overdiv.node();
	var svgmap = overdiv.append('svg').attr("id","svgmap").attr("class","leaflet-zoom-hide");
	g = svgmap.append("g");
	var gcontour = g.append("g").attr("id","gcontour");
	var gvoronoi = g.append("g").attr("id","gvoronoi");
	var gbubbles = g.append("g").attr("id","gbubbles");
	if(!f.svgOk) gbubbles = d3.select('#'+divid).append("div").attr('id','nsvgdiv');
	
	f.tweetDateScaleColor = null;
	f.tweetDateScaleOp = null;
	
	///////////////////////////////////////////////////////////////////////////////////// FIXED PARIS PATH
	// simplified convex paris
	var parisGeo = shapeMask;
	var parisPolygon = null;
	var parisPixel = null;
		
	/////////////////////////////////////////////////////////////////////////////////////			
	// Use mapbox for the geographic projection
	f.projectraw = function(array) {
		var point = f.map.latLngToContainerPoint( new L.LatLng(array[0],array[1]) ); // Mapbox 1.0
		return [point.x, point.y];
	};
	f.projectdot = function(d) {
		// here, workaround to add some small decimal values to avoid same pixel position (voronoi bug)
		var pixpt = f.projectraw([d.x,d.y]);
		pixpt[0] += d.x/100.0;
		pixpt[1] += d.y/100.0;
		return pixpt;
	};
	
	/////////////////////////////////////////////////////////////////////////////////////	
	f.on = function(){};	
    f.initialize = function (latlng) {
    	console.log(" ... f.initialize");
    };
    f.onAdd = function (map) {
    	console.log(" ... f.onAdd");
        f.map.on('movestart', f.movestart ,this);
        f.map.on('moveend', f.draw ,this);
        f.draw();
    },
    
	/////////////////////////////////////////////////////////////////////////////////////
	// Reposition the SVG to cover the features.
	f.movestart = function() {
		$(".mytooltip").remove();
		d3.select("#svgmap g").style("opacity",0);
		d3.select("#nsvgdiv").style("opacity",0);
		//$('.tweets').tooltip('hide');
	};
	f.draw = function() {
		d3.select("#svgmap g").style("opacity",1);
		d3.select("#nsvgdiv").style("opacity",1);

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
		
		///////// POINTS
		if(f.svgOk) {
			d3.selectAll(".tweets")
				.attr("cx",function(d,i){return f.projectdot(d)[0];})
				.attr("cy",function(d,i){return f.projectdot(d)[1];});
			d3.selectAll(".clictweets")
				.attr("cx",function(d,i){return f.projectdot(d)[0];})
				.attr("cy",function(d,i){return f.projectdot(d)[1];});
		} else {
			d3.selectAll(".tweets")
				.style("left",function(d,i){return f.projectdot(d)[0]-5+"px";})
				.style("top",function(d,i){return f.projectdot(d)[1]-5+"px";});
			d3.selectAll(".clictweets")
				.style("left",function(d,i){return f.projectdot(d)[0]-14+"px";})
				.style("top",function(d,i){return f.projectdot(d)[1]-14+"px";});
		}
					
		///////// PATHS
		if(showVoronoi && f.svgOk) {
			parisPixel = parisGeo.map(function(e){return [f.projectraw(e)[0],f.projectraw(e)[1]]; });
			parisPolygon = d3.geom.polygon(parisPixel);
			var dataPositions = mydataTweets.map(function(d){ return [f.projectdot(d)[0],f.projectdot(d)[1]];});
			var ndata = d3.geom.voronoi(dataPositions).map(function(cell) { return parisPolygon.clip(cell); });
			d3.selectAll(".voropaths")
				.data(ndata)
				.attr("d",function(d){ return "M"+d.join("L")+"Z"; });
		}	
	};
			
	/////////////////////////////////////////////////////////////////////////////////////
	// tweet tooltip content
	f.tooltipContent = function(d,mode) {
		var u = d.user;
		//#'+u.map_rank+'/'+mydataUsers.length+' |  
		return '<div><div class="toolt_head"><a href="https://twitter.com/'+u.screen_name+'" target="_blank">'+u.name+"</a> | "+formatDateFromNow(d.created_at)+'</div><div class="toolt_body">'+formatTweet(d.text)+'</div></div>';
	};

	////////////////////////////////////////////////////////////////////////////////////
	// ATTR to tweets
	f.attrTweetContainer = function(selection) {
		if(f.svgOk)
			selection
			.attr("class","svg clictweets")
			.attr("cx",function(d,i){return f.projectdot(d)[0];})
			.attr("cy",function(d,i){return f.projectdot(d)[1];})
			.attr("r",clicPointSize);
		else
			selection
			.attr("class","nosvg clictweets")
			.style("left",function(d,i){return f.projectdot(d)[0]-14+"px";})
			.style("top",function(d,i){return f.projectdot(d)[1]-14+"px";});
		
		return selection
			.attr("id",function(d,i){return "contic_"+d.tid;})
			.on("click",function(d,i){
				$('#c_'+d.tid).click();
				d3.event.stopPropagation();
			})

	};
		
	////////////////////////////////////////////////////////////////////////////////////
	// ATTR to tweets
	f.attrTweets = function(selection) {
		if(f.svgOk)
			selection
			.attr("class",function(d,i){ return "svg tweets user_"+d.user.id_str+" "+d.twtype; } )
			//.attr("fill",function(d,i){return f.tweetDateScaleColor(moment(d.created_at));})
			.attr("fill",function(d,i){return d.twtype=='other' ? defTweetColor : pmapTweetColor;})
			.attr("fill-opacity",function(d,i){return f.tweetDateScaleOp(moment(d.created_at));})
			.attr("cx",function(d,i){return f.projectdot(d)[0];})
			.attr("cy",function(d,i){return f.projectdot(d)[1];})
			.attr("r",minPointSize);
		else
			selection
			.attr("class",function(d,i){ return "nosvg tweets user_"+d.user.id_str+" "+d.twtype; } )
			//.style("background",function(d,i){return "#26BBF8"}) //f.tweetDateScaleColor(moment(d.created_at));})
			.style("background",function(d,i){return d.twtype=='other' ? defTweetColor : pmapTweetColor;})
			.style("opacity",function(d,i){return f.tweetDateScaleOp(moment(d.created_at));})
			.style("left",function(d,i){return f.projectdot(d)[0]-5+"px";})
			.style("top",function(d,i){return f.projectdot(d)[1]-5+"px";});
		
		return selection
			.attr("id",function(d,i){return "c_"+d.tid;})
			.attr("rel","tooltip")
			.attr("title",function(d,i){return f.tooltipContent(d);});
	};
	
	d3.select("#svgmap").on("click",function(){
		$(".mytooltip").remove();
	});
	
	////////////////////////////////////////////////////////////////////////////////////
	// ATTR to voropaths
	f.attrVoronoi = function(selection) {
		selection
			.attr("class",function(d,i){ return "voropaths user_"+mydataTweets[i].user.id_str; } )
			.attr("id",function(d,i){return "v_"+mydataTweets[i].tid;})
			//.attr("fill",function(d,i){return mydataTweets[i].user.color; })
			.attr("fill","black")
			.attr("fill-opacity",function(d,i){return mydataTweets[i].twtype=='other' ? 0.6 : 0.4; })
		return selection;
	};
	
	////////////////////////////////////////////////////////////////////////////////////
	// access to grouped data from json (structured in the mongodb query)
	f.doto = function(d) {
		// return first tweet of list for this zone
		var tt = d.value.tweetlist[0];
		var uu = f.getUser(tt.uid);
		return {
			x:				d._id[0],
			y:				d._id[1],
			tid:			tt.tid,
			created_at:		new Date(tt.created_at),
			text:			tt.text,
			user:			uu,
			twtype:			tt.twtype,
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
		// NB ! tweets are here ZONES - each zone containing tweets of same position
		
		mydataUsers		= alldata.users;
		mydataTweets	= alldata.tweets.map(function(d){return f.doto(d);});

		var stats = {};
		stats['mindate'] = Math.min.apply(Math,mydataTweets.map(function(d){ return moment(d.created_at) ; }));
		stats['maxdate'] = Math.max.apply(Math,mydataTweets.map(function(d){ return moment(d.created_at) ; }));
		
		f.tweetDateScaleOp = d3.scale.linear()
			.domain([stats['mindate'],stats['maxdate']])
			.range([0.3,1]);
		f.tweetDateScaleColor = d3.scale.linear()
			.domain([stats['mindate'],stats['maxdate']])
			.range(["#9D9D9D","#26BBF8"]);
			//.interpolate(d3.interpolateHsl);
			
		/////////////////////////////////////////// TWEET POINTS
		gbubbles.selectAll('clictweets')
			.data(mydataTweets)
			.enter().append(f.svgOk ? "svg:circle" : "div" )
				.call(f.attrTweetContainer);
		gbubbles.selectAll('tweets')
			.data(mydataTweets)
			.enter().append(f.svgOk ? "svg:circle" : "div" )
				.call(f.attrTweets);
				
		console.log(" ... init tweets made");
		
		/////////////////////////////////////////// VORONOI
		if(f.svgOk) {
			parisPixel = parisGeo.map(function(e){return [f.projectraw(e)[0],f.projectraw(e)[1]]; });
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
			console.log(" ... init voronoi made");	
		} else
			d3.select("#toggleVoronoi").remove();

		makeTooltips('click');
		
		d3.select("#toggleVoronoi input").on("click", function(){
			showVoronoi = !showVoronoi;
			d3.selectAll(".voropaths").style("opacity",showVoronoi ? 1 : 0);
			f.draw();
		});
		
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
		//minZoom:8,
		//maxZoom:20,
		//maxBounds:new L.LatLngBounds(new L.LatLng(48.498408,1.711121),new L.LatLng(49.156562,2.883911))
	}).setView(pos,zoom);
	m.touchZoom.disable();
	m.zoomControl.setPosition('bottomright');
	var mLayer = L.mapbox.tileLayer('minut.map-ajvfk52h',{ format: 'jpg70' });
	mLayer.addTo(m);
	//m.on('ready',function(){
		d3.json(jsonUrl, function(data) {
			console.log(" ... got json");
			l = voronoimap(divid,shapeMask).data(data,m,eventSourceChannel);
			m.addLayer(l);
		});
	//});
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
			l.map.setView([position.coords.latitude,position.coords.longitude],13,false);
		},
		function(err) {
			// If the user chooses not to allow their location
			console.log(" ... you refused to show your location !");
		}
	);
}
////////////////////////////////////////////////////////////////////////////

