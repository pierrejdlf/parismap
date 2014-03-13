function Ploufmap(options) {

    plo = {};
    plo.log = function(str) { if(plo.config.dev) console.log(str); };

    var defaults = {
        useServer: true,
        dev: false,
        baseUrl:        "http://beta.parismappartient.fr",
        throttleDelay:  2000,
        clusterize:     false,
        bounce:         true,
        locateButton:   true,
        isMobile:   $(document).width()<900
    };
    plo.config = _.extend(defaults,options);
    plo.config.bounce = !plo.config.clusterize;

    plo.map = null;
    plo.swiper = null;
    
    plo.slides = []; // will store successive markers when looking swiper
    plo.previous = null;
    plo.current = null;
    plo.next = null;

    plo.anchor = null; // first clicked marker, to be able to loop around based on distance to anchor

    plo.already = []; // will store list of already fetched plouf ids, (to avoid asking always !)

    plo.w = $("body").width();
    //plo.log("width:"+plo.w);

    // extend marker objects to store data for each
    // be careful to put here all what you need !
    plo.Marker = L.Marker.extend({
        options : { // really need to peuplate options {} ? don't think so
            //ploufs: [],
            bounceOnAdd:            plo.config.bounce,
            bounceOnAddDuration:    900, //||1000
            bounceOnAddHeight:      40
        }
    });
    // also prepare the MarkerCLuster marker to receive options !
    // L.MarkerCluster = L.MarkerCluster.extend({
    //     ploufdata: {} // just need to declare it
    // });

    //////////////////////////////////////////////////////
    plo.init = function() {
      plo.log("Init all.");
      plo.initConfig(function(conf) {
        plo.log(conf);

        plo.initMap();
        plo.throttleFetch();

        plo.fetchGeoJson();

        plo.swiperToggle(false);
        plo.swiperInit();
        var es = plo.config.esHQ ? plo.initEventSourceHQ() : plo.initEventSource() ;
        plo.fadeOutMask();         
      });
    };

    //////////////////////////////////////////////////////
    plo.initConfig = function(callb) {
      //var menuTemplate = Handlebars.compile($("#menu-template").html());

        if(plo.config.useServer) {
            $.get( plo.config.baseUrl+"/config", function(response) {
                // rather extend ?
                plo.config.apis = response.apis;
                plo.config.esHQ = response.esHQ;
                plo.config.esChannel = response.esChannel;
                callb(plo.config);
                // $("#menu").html( menuTemplate({categories:response}) );
                // plo.nav = responsiveNav("#menu", { // Selector
                //   animate: true, // Boolean: Use CSS3 transitions, true or false
                //   transition: 250, // Integer: Speed of the transition, in milliseconds
                //   label: "Menu", // String: Label for the navigation toggle
                //   insert: "after", // String: Insert the toggle before or after the navigation
                //   customToggle: "", // Selector: Specify the ID of a custom toggle
                //   openPos: "relative", // String: Position of the opened nav, relative or static
                //   //navClass: "nav-collapse", // String: Default CSS class. If changed, you need to edit the CSS too!
                //   jsClass: "js", // String: 'JS enabled' class which is added to <html> element
                //   init: function(){}, // Function: Init callback
                //   open: function(){}, // Function: Open callback
                //   close: function(){} // Function: Close callback
                //});
          });
        } else {
            callb(plo.config);
        }
    };

    //////////////////////////////////////////////////////
     plo.swiperInit = function() {
        plo.swiper = new Swiper("#swiper",{
            mode: 'horizontal',
            slidesPerView: plo.config.isMobile ? 1 : 1.85,
            freeMode: false,
            //slidesPerView: 'auto',
            keyboardControl:    true,
            centeredSlides:     true,
            //offsetSlidesBefore:     1,
            //offsetSlidesAfter:      1,
            //initialSlide: 0,

            watchActiveIndex: true,

            onSlideChangeStart: function(swiper,direction) {
                var i = plo.swiper.activeIndex;
                //plo.log("(start "+direction+") now looking at: "+i);
                if(direction=='prev') {
                    plo.swiperLookAt(plo.slides[i]);
                } else {
                    plo.swiperLookAt(plo.next);
                }
            },
            onSlideChangeEnd : function(swiper) {
                var i = plo.swiper.activeIndex;
                //plo.log("(end) now looking at: "+i);
                if(i==plo.slides.length-1) {
                    //plo.log("! need to load next slide");
                    plo.swiperNextPass();
                }
            },
            //onSetWrapperTransform:  plo.throttleInterpolater,
            //onResistanceBefore:     plo.swiperInterpolate,
            //onResistanceAfter:      plo.swiperInterpolate,
        });
    };
    // if you want to try to move map interpolated based on swipe-x
    plo.swiperInterpolate = function(sw,p) {
        var k = -p.x/plo.w;
        //plo.log(k,p);
        var a = plo.current.ploufdata;
        var b = plo.next.ploufdata;
        var lat = (a.lat*k + b.lat*(1-k));
        var lng = (a.lng*k + b.lng*(1-k));
        var tp = [lat,lng];
        //plo.log(tp)
        //plo.map.panTo(tp);
    };
    plo.swiperToggle = function(show) {
        if(!show) $(".focused").removeClass("visited").removeClass("focused");
        if(show)
            $(".container").addClass("paneled");
        else
            $(".container").removeClass("paneled");
        plo.map.invalidateSize(true);
    };
    plo.swiperIsActive = function() {
        return $("#swiper").attr("show")=='on';
    };
    plo.swiperLookAt = function(p) {
        plo.log("------ panning to:"+p.ploufdata.text+p.ploufdata.lat);
        plo.map.panTo(p.ploufdata);
        plo.setMarkerStatus(p,"focused");
        console.log(p);
    }
    plo.swiperNextPass = function() {
        // update last marker class
        //plo.setMarkerStatus(plo.current,"visited");

        plo.current = plo.next ;

        var isCluster = plo.current.hasOwnProperty('parentMarker');
        // if(isCluster) plo.log("PASS: yourra, a cluster");
        // else plo.log("PASS: just a marker");

        plo.setMarkerStatus(plo.current,"focused");

        plo.next = plo.getNext();
        plo.swiperAppend( plo.next );
    };
    plo.swiperAppend = function(m) {
        var html = plo.getHtml(m.ploufdata);
        //var newSlide = plo.swiper.createSlide(html);
        //newSlide.append();
        plo.swiper.appendSlide( html );
        //plo.swiper.calcSlides(true);
        //plo.log("swiper appended slide: "+data.title);
    };
    plo.swiperReloadWith = function(list) {
        plo.log("reload swiper");
        plo.swiper.reInit();
        plo.swiper.removeAllSlides();
        // let's load 2 at start
        _.each(list, function(m) {
            plo.swiperAppend(m);
        });
    };

    //////////////////////////////////////////////////////
    // return next marker wich was unseen
    plo.getNext = function() {
        var md = null;
        var next = null;
        
        var neighbors = null;

        //console.log(plo.getMarkerLayer(plo.current.ploufdata));

        if(plo.config.clusterize) {
            //neighbors = plo.getMarkerLayer(plo.current.ploufdata)._map._layers;
            var neighbors_tmp = plo.getMarkerLayer(plo.current.ploufdata)._featureGroup._layers;
            neighbors = [];
            _.each(neighbors_tmp, function(e) {
                var iscluster = !e.hasOwnProperty("ploufdata");
                if(iscluster) {
                    // for each children marker, store the parent, to be able to style it on swipes
                    var children = e.getAllChildMarkers();
                    children = _.map(children, function(c) {
                        c.ploufdata.parentMarker = e;
                        return c;
                    });
                    neighbors = neighbors.concat(children);
                } else 
                    neighbors.push(e);
                // now we have an array with all the neighbors markers
                // (keeping memory of the parentMarker(s) if there is) !
            });
        } else
            neighbors = plo.getMarkerLayer(plo.current.ploufdata)._layers;

        //plo.tt = neighbors_tmp;
        //console.log(neighbors.length);

        _.each(neighbors, function(e) {
            var d = plo.anchor._latlng.distanceTo(e._latlng);
            var iscluster = !e.hasOwnProperty("ploufdata");
            if(!iscluster && ( (d<md || md===null) && e!=plo.anchor && e.ploufdata.seen=="no") ) {
                md = d;
                next = e;
            }
        });

        plo.anchor = next;
        next.ploufdata.seen = "loaded";
        plo.slides.push(next);

        if(next==null) plo.log("!! null next !!");
        return next;
    };

    //////////////////////////////////////////////////////
    // will POST down/up vote and swipe to next
    plo.voteAndSwipe = function(vote) {
      data = {
        pid: plo.current.ploufdata.pid,
        vote:vote ? 1 : -1
      };
      $.post( plo.config.baseUrl+"/p/vote", data, function(response) {
          //var res = JSON.parse(response);
          plo.log(response);
      });
      plo.swiper.swipeNext();
    };

    plo.setMarkerStatus = function(m,status) {
        // we may be being setting a cluster !
        if(m.ploufdata.hasOwnProperty('parentMarker')) {
            m = m.ploufdata.parentMarker;
        }

        if(status=="focused") {
            $(".leaflet-div-icon").removeClass("focused");
            $(m._icon).addClass("focused");
        }
        if(status=="visited") {
            $(m._icon).removeClass("focused");
            $(m._icon).addClass("visited");
        }
        if(status=="reset") {
            $(".leaflet-div-icon").removeClass("focused").removeClass("visited");   
        }
    };

    //////////////////////////////////////////////////////
    plo.clickMarker = function(event,type) {

        plo.log(type+" clicked");

        //console.log('cluster ' + a.layer.getAllChildMarkers().length);

        //console.log(event);

        var marker = event.target;

        plo.current = marker;
        plo.anchor = marker;
        plo.slides = [marker];
        
        plo.setMarkerStatus(plo.current,"focused");

        // reset: all markers can be seen again
        _.each(plo.getMarkerLayer(plo.current.ploufdata)._layers, function(e) {
          e.ploufdata.seen = "no";
        });

        plo.current.seen = "loaded";
        plo.next = plo.getNext();

        console.log("got current and next");

        plo.swiperReloadWith([plo.current,plo.next]);
        //plo.log("current index: "+plo.swiper.activeIndex);
        plo.swiper.swipeTo(0);
        plo.swiperToggle(true);
        plo.map.panTo(plo.current.ploufdata);
    };
    plo.clickMap = function(event) {
        plo.log("map clicked");
        plo.swiperToggle(false);
        plo.setMarkerStatus(null,"reset");
    };

    //////////////////////////////////////////////////////
    plo.throttleFetch = function() {
        plo.throttleFetcher({
            leading:false,
            trailing:false
        });
    };

    //////////////////////////////////////////////////////
    plo.getAllMarkers = function() {
        if(plo.config.clusterize)
            return plo.getMarkerLayer(plo.current.options)._topClusterLevel.getAllChildMarkers();
        else
            return plo.getMarkerLayer(plo.current.options)._layers;
    };

    //////////////////////////////////////////////////////
    //////////////////////////////////////////////////////
    plo.getMarkerLayer = function(p) {
      return plo.layers[p.markertype];
    };
    plo.getMarkerMapType = function(p) {
        if(p.geojson) {
            // then the geojson url is the key ! (see index.html)
            return plo.config.markers[p.geojson];
        } else {
            // then the plouf ptype (from our server) is the key !
            return plo.config.markers[p.ptype];
        }
    };
    plo.getIcon = function(p) {
        var mtype = plo.getMarkerMapType(p);
        return plo.config.icons[mtype];
    };
    plo.getHtml = function(p) {
        var mtype = plo.getMarkerMapType(p);
        return plo.config.templates[mtype](p);
    }
    //////////////////////////////////////////////////////
    //////////////////////////////////////////////////////

    //////////////////////////////////////////////////////
    plo.initMap = function() {
        var baseLayer = plo.config.baseLayer;    

        // NB: following can help you build different marker/base layers

        // set marker layers hierarchy based on APIs received in config
        //var groupedOverlays = {};
        plo.layers = {};
        _.each(plo.config.markers, function(markertype,plouftype) {
            var markerLayer = null;
            if(plo.config.clusterize) {
                markerLayer = new L.MarkerClusterGroup({
                    //spiderfyOnMaxZoom: false,
                    //showCoverageOnHover: false,
                    //zoomToBoundsOnClick: false,

                    //animateAddingMarkers:true, // default true

                    // If set, at this zoom level and below markers will not be clustered.
                    //disableClusteringAtZoom: 10, 
                    
                    // Default 80px. Decreasing will make more smaller clusters. You can also use a function
                    maxClusterRadius: 25, 
                    
                    //polygonOptions: Options to pass when creating the L.Polygon(points, options) to show the bounds of a cluster

                    // If set to true, overrides the icon for all added markers to make them appear as a 1 size cluster
                    singleMarkerMode: true,

                    // Increase from 1 to increase the distance away from the center that spiderfied markers are placed.
                    // Use if you are using big marker icons (Default:1)
                    spiderfyDistanceMultiplier: 5,

                    // here we can define which marker will be visible as the cluster head !
                    iconCreateFunction: function(cluster) {
                        var children = cluster.getAllChildMarkers();

                        var p = children[0].ploufdata; // data of choosen one

                        // return icon
                        return plo.getIcon(p)(p,children.length);;
                        //return new L.DivIcon({ html: '<b>' + "oui"+cluster.getChildCount() + '</b>' });
                    }
                });
            } else {
                markerLayer = new L.LayerGroup();
            }
            
            // if clusterization, we need to set click events here
            if(plo.config.clusterize) {
                // click events
                markerLayer.on('click', function (a) {
                    //console.log("CLICK!");
                    //console.log(a);
                    //plo.clickMarker(a,"marker");
                });
                markerLayer.on('clusterclick', function (a) {
                    //console.log("CLICK!");
                    //console.log(a);
                    //plo.clickMarker(a,"cluster");
                });
            }

            plo.layers[markertype] = markerLayer;

          //groupedOverlays[apitype] = {};
          //_.each(apis, function(api,key) {
            //var marks = [ L.marker(plo.ploufdata.initCenter) ];
            //plo.getMarkerLayer = L.layerGroup(marks);
            //plo.layers[api] = new L.LayerGroup();
            //groupedOverlays[apitype][key] = plo.layers[api];
            //markGroup.on('click', plo.clickMarker);
          //});
        });
        //console.log(plo.layers);
        //plo.log("groupedOverlays:",groupedOverlays);

        console.log("We have layers:");
        console.log(plo.layers);

        plo.map = L.map(plo.config.map, _.defaults(plo.config.leaflet, {
            attributionControl: false,
            keyboard: false,
            icons: plo.config.icons,
            center:  L.latLng(48.87,2.347),
            zoom: 13,
            minZoom: 2,
            maxZoom: 18,
            layers: [baseLayer].concat(_.values(plo.layers))
        }));

        // optional control to select visible layers
        //L.control.groupedLayers(baseLayers, groupedOverlays).addTo(plo.map);

        L.control.attribution({position:'topright'}).addTo(plo.map);

        plo.map.on('click', plo.clickMap);
        plo.map.on('move', function(e) {
            //plo.log("! moved");
            plo.throttleFetch();
        });
        plo.map.on("zoomstart", function(e) {
            plo.log("! zoomedStart");
            plo.swiperToggle(false);
        });
        plo.map.on('moveEnd', function(e) {
            plo.log("! movedEnd");
            plo.throttleFetch();
            plo.swiperToggle(false);
        });

        if(plo.config.locateButton) {
            var lc = L.control.locate({
                position: 'topleft',  // set the location of the control
                drawCircle: true,  // controls whether a circle is drawn that shows the uncertainty about the location
                //follow: false,  // follow the location if `watch` and `setView` are set to true in locateOptions
                //stopFollowingOnDrag: false, // stop following when the map is dragged if `follow` is set to true (deprecated, see below)
                circleStyle: {
                    color: '#136AEC',
                    fillColor: '#136AEC',
                    fillOpacity: 0.15,
                    weight: 2,
                    opacity: 0.5
                },  // change the style of the circle around the user's location
                markerStyle:  {
                    color: '#136AEC',
                    fillColor: '#2A93EE',
                    fillOpacity: 0.7,
                    weight: 2,
                    opacity: 0.9,
                    radius: 5
                },
                //followCircleStyle: {},  // set difference for the style of the circle around the user's location while following
                //followMarkerStyle: {},
                //circlePadding: [0, 0], // padding around accuracy circle, value is passed to setBounds
                metric: true,  // use metric or imperial units
                onLocationError: function(err) {
                  alert(err.message);
                },  // define an error callback function
                onLocationFound: function() {
                  plo.fadeOutMask();
                },
                onLocationOutsideMapBounds:  function(context) { // called when outside map boundaries
                  alert(context.options.strings.outsideMapBoundsMsg);
                },
                setView: true, // automatically sets the map view to the user's location
                strings: {
                    title: "Show me where I am",  // title of the locat control
                    popup: "You are within {distance} {unit} from this point",  // text to appear if user clicks on circle
                    outsideMapBoundsMsg: "You seem located outside the boundaries of the map" // default message for onLocationOutsideMapBounds
                },
                locateOptions: {}  // define location options e.g enableHighAccuracy: true
            }).addTo(plo.map);
            // start browser geoloc
            //lc.locate();
        }
    };

    plo.fadeOutMask = function() {
      var mask = $("#locateMask");
      mask.addClass("invisible");
      mask.on("transitionend", function () {
        mask.addClass("hidden");
      }, true);
    };
    
    //////////////////////////////////////////////////////
    plo.addPlouf = function(p) {
        var markLayer = plo.getMarkerLayer(p);
        var i = plo.getIcon(p)(p);
        var ltln = new L.LatLng(p.lat, p.lng);
        
        // ! no need to check if already here, cause we now fetch with a "ya-here-blacklisted-ids"
        //var f = _.find(markLayer._layers, function(e){ return e.ploufdata.pid == p.pid; });
        var f = false;

        if(!f) {
            var newM = new plo.Marker(ltln,{
                icon: i,
                draggable: false
            });

            newM.ploufdata = _.extend(p,{
                seen: 'no'
            });
            
            // we used to set listener here, but better to plug it on layer creation
            // todo: verify it works with new added markers ?
            newM.on('click', function(a) {
                plo.clickMarker(a,"marker");
            });
            newM.addTo(markLayer);

        } else {
            //plo.log("marker was already here");
        }
    };

    //////////////////////////////////////////////////////
    // will check at start if there is geojson markers to load, and fetch them once !
    plo.fetchGeoJson = function() {
        _.each(plo.config.markers, function(m,k) {
            // if starts by "http://", then try to load geojson feed
            if(/^http/.test(k)) {
                console.log("Adding geojson feed: "+k);
                $.get(k, function(response) {
                    _.each(response.features, function(d) {
                        var p = {
                            lat:        d.geometry.coordinates[1],
                            lng:        d.geometry.coordinates[0],
                            title:      d.properties.title,
                            description:d.properties.description,
                            ptype:      m, // icon type
                            markertype: m, // icon type
                            geojson:    k, // url of the feed
                        };
                        plo.addPlouf(p);  
                    });
                });
            }
        });
    };

    //////////////////////////////////////////////////////
    plo.fetchPloufs = function() {
        var bounds = plo.map.getBounds();
        var center = plo.map.getCenter();

        var data = {
            without: plo.already,
            ptypes: _.keys(plo.config.markers),
            zoom: plo.map.getZoom(),
            center: [center.lat,center.lng],
            bounds: [[bounds._southWest.lat,bounds._southWest.lng] , [bounds._northEast.lat,bounds._northEast.lng]]
            //zoomAttribute: true,
            //screen: [$(document).width(),$(document).height()]
        };

        //plo.log(data);
        $.post( plo.config.baseUrl+"/p/get", data, function(response) {
            var data = JSON.parse(response);
            //plo.log(Object.keys(data).length+" ploufs received !");
            //plo.log(data);
            _.each(data,function(p) {
                plo.already.push(p._id);
                p.markertype = plo.config.markers[p.ptype];
                try {
                    //p.text = plo.truncate($('<div>'+p.text+'</div>').text(),90);
                    p.text = $('<div>'+p.text+'</div>').text();
                } catch(err) {
                    p.text = "[error texting html]";
                    plo.log("!! html>text error: "+err);
                    plo.log(p);
                }
                plo.addPlouf(p);  
            });
        });
    };

    //////////////////////////////////////////////////////
    plo.truncate = function(str,count) {
        if(str.length<count) return str;
        else if(str.length<3) return "[-]";
        else return str.slice(0,count) + "..";
    };

    //////////////////////////////////////////////////////
    plo.initEventSource = function() {
        var source = new EventSource(plo.config.baseUrl+'/riviere-de-ploufs');
        source.onopen = function() {
            plo.log("Event Source connected");
        };
        source.onerror = function(err) {
            plo.log("Event Source error ! ",err);
        };

        //source.addEventListener('connections', updateConnections, false);
        //source.addEventListener('requests', updateRequests, false);
        //source.addEventListener('uptime', updateUptime, false);

        source.onmessage = function(event) {
            //try {
                var newPlouf = JSON.parse(event.data);
                //plo.log("es-plouf", newPlouf);
                plo.addPlouf(newPlouf);
            // } catch(er) {
            //     plo.log("event source message error: "+er);
            // }
        };
    };
    
    //////////////////////////////////////////////////////
    // special if heroku server
    plo.initEventSourceHQ = function() {
      var source = new ESHQ(plo.config.esChannel,{auth_url: plo.config.baseUrl+'/riviere-de-ploufs-hq'});
      
      source.onopen = function(e) {
        plo.log(" ... ESHQ connexion ok");
        // callback called when the connection is made
      };
      source.onmessage = function(e) {
        // callback called when a new message has been received
        plo.log("Message type: %s, message data: %s", e.type, e.data);
      };
      source.onerror = function(e) {
        // callback called on errror
        plo.log(" ... ESHQ connexion error");
        plo.log(e);
      };

      source.addEventListener('newploufpublication', function(e) {
        var newdata = e;
        //var newdata = eval("("+e.data+")");
        plo.log("ES:",newdata);
        plo.addPlouf(newdata);
      });
    };
    
    //////////////////////////////////////////////////////
    plo.sendForm = function() {
        plo.log("Got form fields");
        var form = $("#form");
        form.submit(function() {
            // submit
            var newPlouf = {
                geo:        f.myGeoPosition,
                title:      f.messform.title,
                message:    f.messform.message
            };
            plo.log(newPlouf);
            $.post( plo.config.baseUrl+"/p/new", newPlouf,function(response) {
                plo.log("form response ok");
            });
        });
    };

    plo.throttleFetcher = _.throttle(plo.fetchPloufs, plo.config.throttleDelay);
    plo.throttleInterpolater = _.throttle(plo.swiperInterpolate, 200);

    document.onkeydown = function(e) {
      if(plo.swiperIsActive()) {
        if (e.keyCode == '38') { // up arrow
          plo.voteAndSwipe(false);   
        }
        else if (e.keyCode == '40') { // down arrow
          plo.voteAndSwipe(true);   
        }
      }
    };

    plo.init();
    return plo;
}

