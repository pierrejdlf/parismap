function Ploufmap(options) {

    plo = {};
    plo.log = function(str) { if(plo.config.dev) console.log(str); };

    var dev = window.location.hostname == "localhost";

    var defaults = {
        dev: dev,
        baseUrl:        dev ? "http://localhost:8080" : "http://beta.parismappartient.fr",
        throttleDelay:  2000,
        defaultCenter:  L.latLng(48.87,2.347)
    };
    plo.config = _.extend(defaults,options);

    plo.map = null;
    plo.swiper = null;
    
    plo.slides = []; // will store successive markers when looking swiper
    plo.previous = null;
    plo.current = null;
    plo.next = null;

    plo.anchor = null; // first clicked marker, to be able to loop around based on distance to anchor

    plo.already = []; // will store list of already fetched plouf ids, (to avoid asking always !)

    plo.w = $("body").width();
    plo.log("width:"+plo.w);

    // extend normal marker to store data for each
    // be careful to put here all what you need !
    plo.Marker = L.Marker.extend({
        options : {
            ploufs: [],
            seen:   "no",
            bounceOnAdd: true,
            bounceOnAddDuration: 300, //||1000
            bounceOnAddHeight: 40
        }
    });
    //////////////////////////////////////////////////////
    plo.init = function() {
      plo.log("Init all.");
      plo.initConfig(function(conf) {
        plo.log(conf);

        plo.initMap();
        plo.throttleFetch();
        plo.swiperToggle(false);
        plo.swiperInit();
        var es = plo.config.esHQ ? plo.initEventSourceHQ() : plo.initEventSource() ;
        plo.fadeOutMask();         
      });
    };

    //////////////////////////////////////////////////////
    plo.initConfig = function(callb) {
      //var menuTemplate = Handlebars.compile($("#menu-template").html());
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
    };

    //////////////////////////////////////////////////////
     plo.swiperInit = function() {
        plo.swiper = new Swiper("#swiper",{
            mode:               'horizontal',
            keyboardControl:    true,
            centeredSlides:     true,
            offsetSlidesBefore:     1,
            offsetSlidesAfter:      1,
            initialSlide: 0,
            onSlideChangeStart: function(swiper,direction) {
                var i = plo.swiper.activeIndex;
                plo.log("now looking at: "+i);
                if(direction=='prev') {
                  //plo.log("panning to:"+plo.slides[i].options.text+plo.slides[i].options.lat);
                  plo.map.panTo(plo.slides[i].options);
                } else {
                  //plo.log("panning to:"+plo.next.options.text+plo.next.options.lat);

                  plo.map.panTo(plo.next.options);
                  if(i==plo.slides.length-1) {
                    plo.log("! need to load next slide");
                    plo.swiperNextLoaded();
                  }
                }
            },
            onSetWrapperTransform:  plo.throttleInterpolater,
            //onResistanceBefore:     plo.swiperInterpolate,
            //onResistanceAfter:      plo.swiperInterpolate,

            // following is swiper progress plugin

            progress: true,
            onProgressChange: function(swiper){
              for (var i = 0; i < swiper.slides.length; i++){
              var slide = swiper.slides[i];
              var progress = slide.progress;
              swiper.setTransform(slide,'translate3d(0px,0,'+(-Math.abs(progress*1500))+'px)');
            }
            },
            onTouchStart:function(swiper){
              for (var i = 0; i < swiper.slides.length; i++){
              swiper.setTransition(swiper.slides[i], 0);
            }
            },
            onSetWrapperTransition: function(swiper) {
              for (var i = 0; i < swiper.slides.length; i++){
              swiper.setTransition(swiper.slides[i], swiper.params.speed);
            }
            }
        });
    };
    // if you want to try to move map interpolated based on swipe
    plo.swiperInterpolate = function(sw,p) {
        var k = -p.x/plo.w;
        //plo.log(k,p);
        var a = plo.current.options;
        var b = plo.next.options;
        var lat = (a.lat*k + b.lat*(1-k));
        var lng = (a.lng*k + b.lng*(1-k));
        var tp = [lat,lng];
        //plo.log(tp)
        //plo.map.panTo(tp);
    };
    plo.swiperToggle = function(show) {
        if(!show) $(".focused").addClass("visited").removeClass("focused");
        $("#swiper").attr("show", show ? "on" : "off");
    };
    plo.swiperIsActive = function() {
        return $("#swiper").attr("show")=='on';
    };
    plo.swiperNextLoaded = function() {
        // update last marker class
        plo.setMarkerStatus(plo.current,"visited");

        plo.current = plo.next ;

        plo.setMarkerStatus(plo.current,"focused");

        plo.next = plo.getNext();
        plo.swiperAppend( plo.next );
    };
    plo.swiperAppend = function(m) {
        var data = m.options;
        var mtype = plo.config.markers[data.ptype];
        var html = plo.config.templates[mtype](data);
        var newSlide = plo.swiper.createSlide(html);
        newSlide.append();
        //plo.log("Swiper appended: "+data.pid);
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
        _.each(plo.markerLayer(plo.current.options)._layers, function(e) {
            var d = plo.anchor._latlng.distanceTo(e._latlng);
            if(md===null || (d<md && e!=plo.anchor && e.options.seen=="no")) {
              md = d;
              next = e;
            }
        });
        next.options.seen = "loaded";
        plo.slides.push(next);
        return next;
    };

    //////////////////////////////////////////////////////
    // will POST down/up vote and swipe to next
    plo.voteAndSwipe = function(vote) {
      data = {
        pid: plo.current.options.pid,
        vote:vote ? 1 : -1
      };
      $.post( plo.config.baseUrl+"/p/vote", data, function(response) {
          //var res = JSON.parse(response);
          plo.log(response);
      });
      plo.swiper.swipeNext();
    };

    plo.setMarkerStatus = function(m,status) {
        if(status=="focused") {
          $(".leaflet-div-icon").removeClass("focused");
          $(m._icon).addClass("focused");
        }
        if(status=="visited") {
          $(m._icon).removeClass("focused");
          $(m._icon).addClass("visited");
        }
    };

    //////////////////////////////////////////////////////
    plo.clickMarker = function(event) {
        plo.log("marker clicked");
        var marker = event.target;
        
        plo.current = marker;
        plo.anchor = marker;
        plo.slides = [marker];
        
        plo.setMarkerStatus(plo.current,"focused");

        // reset: all markers can be seen again
        _.each(plo.markerLayer(plo.current.options)._layers, function(e) {
          e.options.seen = "no";
        });

        plo.current.seen = "loaded";
        plo.next = plo.getNext();
        plo.swiperReloadWith([plo.current,plo.next]);
        //plo.log("current index: "+plo.swiper.activeIndex);
        plo.swiper.swipeTo(0);
        plo.swiperToggle(true);
        plo.map.panTo(plo.current.options);
    };
    plo.clickMap = function(event) {
        plo.log("map clicked");
        plo.swiperToggle(false);
    };

    //////////////////////////////////////////////////////
    plo.throttleFetch = function() {
        plo.throttleFetcher({
            leading:false,
            trailing:false
        });
    };

    //////////////////////////////////////////////////////
    plo.markerLayer = function(plouf) {
      //plo.log("request api layer:"+plouf.papi);
      return plo.layers[plouf.papi];
    };

    //////////////////////////////////////////////////////
    plo.initMap = function() {
        var baseLayer = plo.config.baseLayer;

        // set marker layers hierarchy based on APIs received in config
        var groupedOverlays = {};
        plo.layers = {};
        _.each(plo.config.apis, function(apis,apitype) {
          //plo.log(k,v);
          groupedOverlays[apitype] = {};
          _.each(apis, function(api,key) {
            //var marks = [ L.marker(plo.options.defaultCenter) ];
            //plo.markerLayer = L.layerGroup(marks);
            plo.layers[api] = new L.LayerGroup();
            groupedOverlays[apitype][key] = plo.layers[api];

            //markGroup.on('click', plo.clickMarker);
          });
        });
        //plo.log("api layers:",plo.layers);
        //plo.log("groupedOverlays:",groupedOverlays);

        plo.map = L.map(plo.config.map, {
            keyboard: false,
            center: plo.config.defaultCenter,
            zoom: 14,
            maxZoom: 17,
            minZoom: 13,
            icons: plo.config.icons,
            layers: [baseLayer].concat(_.values(plo.layers))
        });

        // optional control to select visible layers
        //L.control.groupedLayers(baseLayers, groupedOverlays).addTo(plo.map);

        plo.map.on('click', plo.clickMap);
        plo.map.on('move', plo.throttleFetch);
        plo.map.on('moveEnd', plo.throttleFetch);

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
        var markLayer = plo.markerLayer(p);
        var marker = plo.config.markers[p.ptype];
        var i = plo.config.icons[marker](p);

        var ltln = new L.LatLng(p.lat, p.lng);
        var f = _.find(markLayer._layers, function(e){
            return e.options.pid == p.pid;
        });
        if(!f) {
            var newM = new plo.Marker(ltln, _.extend({
                icon: i,
                draggable: false
            },p));
            newM.on('click', plo.clickMarker);
            newM.addTo(markLayer);
        } else {
            //plo.log("already here");
        }
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
        };

        //plo.log(data);
        $.post( plo.config.baseUrl+"/p/get", data, function(response) {
            var data = JSON.parse(response);
            plo.log(Object.keys(data).length+" ploufs received !");
            //plo.log(data);
            _.each(data,function(p) {
                plo.already.push(p._id);
                p.markertype = plo.config.markers[p.ptype];
                try {
                  p.text = $(p.text).text();
                } catch(err) {
                  plo.log("html>text error: "+err);
                }
                plo.addPlouf(p);  
            });
        });
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

