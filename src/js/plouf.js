
"use strict";

var defaults = {
    mapid: "map", // default map div id (carefull with css !)
    eventSource: false,
    useServer: true,
    dev: false,
    serverUrl: "http://beta.parismappartient.fr",
    throttleDelay:  1500,
    throttleCentererDelay:  100,
    clusterize:     true,
    zoomToBoundsOnClick: true,
    maxClusterRadius: 25,
    bounce:         true,
    focusOnMove: false, // to throttle focus on nearest from center on move
    leaflet: {
        locateButton:   true,
        fullscreenControl: true,
        center:  L.latLng(48.87,2.347),
        zoom: 13,
        minZoom: 2,
        maxZoom: 18,
    },
    isMobile:   $(document).width()<900,
    log: true,
};

var Ploufmap = function (options) {
  this.config = _.defaults(options,defaults);
  this.config.bounce = !plo.config.clusterize;
}

Ploufmap.prototype = {;

    log: function(str) {
      if(this.config.log) {
        console.log(str);
      }
    };

    map: null,

    current: null,

    already = [], // will store list of already fetched plouf ids, (to avoid asking always !)

    // extend marker objects to store data for each (be careful to put here all what you need !)
    Marker: L.Marker.extend({
        options : { // really need to peuplate options {} ? don't think so
            //ploufs: [],
            bounceOnAdd:            plo.config.bounce,
            bounceOnAddDuration:    900, //||1000
            bounceOnAddHeight:      40
        }
    }),

    //////////////////////////////////////////////////////
    init: function() {
        this.initConfig(function(conf) {

            this.log(this.config);

            this.initMap();
            this.throttleFetch();
            this.fetchGeoJson();

            if(this.config.eventSource)
                var es = this.config.esHQ ? this.initEventSourceHQ() : this.initEventSource() ;
        });

        document.addEventListener('keydown', _.bind(this.keyHandler, this));
    },

    keyHandler: function(e) {
        if(43==23) {
            if (e.keyCode == '38') { // up arrow
                this.voteAndSwipe(false);
            }
            else if (e.keyCode == '40') { // down arrow
                this.voteAndSwipe(true);
            }
        }
    },

    //////////////////////////////////////////////////////
    initConfig: function(callb) {

        callb();

        // just in case we would like to call server at start
        // if(plo.config.useServer) {
        //     $.get( plo.config.serverUrl+"/config", function(response) {
        //         // rather extend ?
        //         plo.config.apis = response.apis;
        //         plo.config.esHQ = response.esHQ;
        //         plo.config.esChannel = response.esChannel;
        //         callb(plo.config);
        //     });
        // } else {
        //     callb(plo.config);
        // }
    },

    //////////////////////////////////////////////////////
    getAllMarkers: function() {
        var layer = this.current ? this.getMarkerLayer(this.current.ploufdata) : this.getMarkerLayer();
        if(this.config.clusterize)
            return layer._topClusterLevel.getAllChildMarkers();
        else
            return layer._layers;
    },

    getMarkerLayer: function(p) {
        if(p)
            return this.layers[p.markertype];
        else
            return this.layers[_.keys(this.layers)[0]];
    },

    getMarkerMapType: function(p) {
        if(p.geojson) {
            // then the geojson url is the key ! (see index.html)
            return this.config.markers[p.geojson];
        } else {
            // then the plouf ptype (from our server) is the key !
            return this.config.markers[p.ptype];
        }
    },

    getIcon: function(p) {
        var mtype = this.getMarkerMapType(p);
        return this.config.icons[mtype];
    };

    //////////////////////////////////////////////////////
    // update focused marker
    updateFocused: function() {
        // ... only do it if nothing opened ?
        console.log("focusing.");
        this.current = this.getClosestMarker( this.map.getCenter() );
        this.setMarkerStatus(plo.current,"focused");
    },

    // get nearest marker in any layer
    getClosestMarker: function(latlng) {
        var md = null,
            closest = null,
            neighbors = null;

        if(this.config.clusterize) {
            //neighbors = plo.getMarkerLayer(plo.current.ploufdata)._map._layers;
            var neighbors_tmp = this.getMarkerLayer()._featureGroup._layers;
            neighbors = [];
            _.each(neighbors_tmp, function(e) {
                var iscluster = !e.hasOwnProperty("ploufdata");
                if(iscluster) {
                    // for each children marker, store the parent (icon & data), to be able to style it on swipes
                    var children = e.getAllChildMarkers();
                    children = _.map(children, function(c) {
                        //c.ploufdata.parentMarker = e;
                        c._icon = e._icon;
                        return c;
                    });
                    neighbors = neighbors.concat(children);
                } else
                    neighbors.push(e);
                // now we have an array with all the neighbors markers
                // (keeping memory of the parentMarker(s) if there is) !
            });
        } else
            neighbors = this.getMarkerLayer(this.current.ploufdata)._layers;

        _.each(neighbors, function(m) {
            var d = latlng.distanceTo(m._latlng);
            var iscluster = !m.hasOwnProperty("ploufdata");
            if(!iscluster && (d<md || md===null)) {
                md = d;
                closest = m;
            }
        });
        //plo.log("closest:",closest);
        return closest;
    },

    //////////////////////////////////////////////////////
    showCurrent: function() {
        this.setMarkerStatus(this.current,"focused");

        // if there is a .template within marker, then move box at center of screen
        var e = $(this.current._icon);
        var temp = e.find(".template");

        if(temp) {
            var t = this.getTransform(e);
            var tmap = this.getTransform($(".leaflet-map-pane"));
            if(t) {
                var pad = 0;
                var x = -t[0]-tmap[0]+pad,
                    y = -t[1]-tmap[1]+pad,
                    W = $(window).width(),
                    H = $(window).height();
                e.css("z-index",9992);
                this.setTransform(e.find(".template"), "translate3d("+x+"px, "+y+"px, 0px)")
                    .css({
                        "width": W-2*pad,
                        "height": H-2*pad,
                        "z-index": 9998,
                    });
            }
        } else {
            this.log("no template.");
        }

        this.setMarkerStatus(plo.current,"opened");
        this.log("current showed.");
    },

    //////////////////////////////////////////////////////
    setTransform: function(obj,val) {
        obj.css({
            "-webkit-transform": val,
            "-moz-transform": val,
            "-ms-transform": val,
            "-o-transform": val,
            "transform": val,
        });
        return obj;
    },

    //////////////////////////////////////////////////////
    getTransform: function(obj) {
        var matrix = obj.css("-webkit-transform") ||
            obj.css("-moz-transform")    ||
            obj.css("-ms-transform")     ||
            obj.css("-o-transform")      ||
            obj.css("transform");
        if(matrix) {
            var values = matrix.match(/translate3d\(([-\d]*)px[, ]*([-\d]*)px/);
            values.shift();
            return values;
        } else
            return null;
    },

    //////////////////////////////////////////////////////
    setMarkerStatus: function(m,status) {
        // we may be being setting a cluster !
        //console.log(m);
        if(m) {
            $(".parismap-icon").each(function(k,e) {
                $(e).removeClass(status);
                var zi = $(e).hasClass("front") ? 600 : 400;
                $(e).css({"z-index":zi});
            });
            $(m._icon)
                .addClass(status)
                .css("z-index", 800);
        } else
            this.log("ERROR: no marker to set status.");
    },

    //////////////////////////////////////////////////////
    clickMarker: function(event,type) {
        this.log(type+" clicked (centering.)");
        //plo.log('cluster ' + a.layer.getAllChildMarkers().length);
        //plo.log(event);

        var marker = event.target;
        this.map.setView(marker._latlng);

        this.current = marker;

        //plo.updateFocused();
        //plo.map.panTo(plo.current.ploufdata);
    },

    clickMap: function(event) {
        this.log("map clicked");
    },




    //////////////////////////////////////////////////////
    initMap: function() {
        var baseLayer = plo.config.baseLayer;

        // NB: following can help you build different marker/base layers

        // set marker layers hierarchy based on APIs received in config
        //var groupedOverlays = {};
        this.layers = {};
        _.each(this.config.markers, function(markertype,plouftype) {
            var markerLayer = null;
            if(this.config.clusterize) {
                markerLayer = new L.MarkerClusterGroup({
                    //spiderfyOnMaxZoom: false,
                    //showCoverageOnHover: false,
                    zoomToBoundsOnClick: plo.config.zoomToBoundsOnClick,

                    //animateAddingMarkers:true, // default true

                    // If set, at this zoom level and below markers will not be clustered.
                    //disableClusteringAtZoom: 10,

                    // Default 80px. Decreasing will make more smaller clusters. You can also use a function
                    maxClusterRadius: plo.config.maxClusterRadius,

                    //polygonOptions: Options to pass when creating the L.Polygon(points, options) to show the bounds of a cluster

                    // If set to true, overrides the icon for all added markers to make them appear as a 1 size cluster
                    singleMarkerMode: true,

                    // Increase from 1 to increase the distance away from the center that spiderfied markers are placed.
                    // Use if you are using big marker icons (Default:1)
                    spiderfyDistanceMultiplier: 2,

                    // here we can define which marker will be visible as the cluster head !
                    iconCreateFunction: function(cluster) {
                        var children = cluster.getAllChildMarkers();

                        var p = children[0].ploufdata; // data of choosen one (let's say first one)

                        // return icon
                        return this.getIcon(p)(p, children.length, children);
                        //return new L.DivIcon({ html: '<b>' + "oui"+cluster.getChildCount() + '</b>' });
                    }
                });
            } else {
                markerLayer = new L.LayerGroup();
            }

            // if clusterization, we need to set click events here
            if(this.config.clusterize) {
                // click events
                markerLayer.on('click', function (a) {
                    this.log("CLICK!");
                    //plo.log(a);
                    //plo.clickMarker(a,"marker");
                });
                markerLayer.on('clusterclick', function (a) {
                    this.log("CLUSTERCLICK!");
                    //plo.log(a);
                    //plo.clickMarker(a,"cluster");
                });
            }

            this.layers[markertype] = markerLayer;

          //groupedOverlays[apitype] = {};
          //_.each(apis, function(api,key) {
            //var marks = [ L.marker(plo.ploufdata.initCenter) ];
            //plo.getMarkerLayer = L.layerGroup(marks);
            //plo.layers[api] = new L.LayerGroup();
            //groupedOverlays[apitype][key] = plo.layers[api];
            //markGroup.on('click', plo.clickMarker);
          //});
        });
        //plo.log(plo.layers);
        //plo.log("groupedOverlays:",groupedOverlays);

        this.log("We have layers:");
        this.log(this.layers);

        this.map = L.map(this.config.mapid, _.defaults(this.config.leaflet, {
            fullscreenControl: true,
            attributionControl: false,
            keyboard: false,
            icons: this.config.icons,
            layers: [baseLayer].concat(_.values(this.layers))
        }));

        // optional control to select visible layers
        //L.control.groupedLayers(baseLayers, groupedOverlays).addTo(plo.map);

        L.control.attribution({position:'topright'}).addTo(this.map);

        // map events
        this.map.on('click', function(e) {
            this.log("! map clicked");
        });
        this.map.on('mousedown', function(e) {
            this.log("! mousedown");
            $('body').addClass("mousedown");
        });
        this.map.on('mouseup', function(e) {
            this.log("! mouseup");
            $('body').removeClass("mousedown");
        });
        this.map.on('move', function(e) {
            this.log("! moving");
            if(this.config.focusOnMove) this.updateFocusedThrottled();
            //plo.throttleFetch();
        });
        this.map.on('moveend', function(e) {
            this.log("! movedEnd");
            this.current && this.showCurrent();
            this.throttleFetch();
        });
        this.map.on("zoomstart", function(e) {
            this.log("! zoomstart");
        });
        this.map.on("zoomend", function(e) {
            this.log("! zoomend");
            //plo.updateFocused();
            //plo.showCurrent();
        });
        this.map.on('dragstart', function(e) {
            this.log("! dragstart");
        });


        if(this.config.leaflet.locateButton) {
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
                  //plo.fadeOutMask();
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
            }).addTo(this.map);
            // start browser geoloc
            //lc.locate();
        }
    },

    //////////////////////////////////////////////////////
    addPlouf: function(p) {

        // we may do things here if preplouf is defined
        if(typeof this.config.preplouf === 'function')
            p = this.config.preplouf(p);

        var markLayer = this.getMarkerLayer(p);
        var i = this.getIcon(p)(p);
        var ltln = new L.LatLng(p.lat, p.lng);

        // ! no need to check if already here, cause we now fetch with a "ya-here-blacklisted-ids"
        //var f = _.find(markLayer._layers, function(e){ return e.ploufdata.pid == p.pid; });
        var f = false;

        if(!f) {
            var newM = new plo.Marker(ltln,{
                icon: i,
                draggable: false,
                zIndexOffset: 0,
            });

            newM.ploufdata = _.extend(p,{
                seen: 'no'
            });

            // we used to set listener here, but better to plug it on layer creation
            // todo: verify it works with new added markers ?
            newM.on('click', function(ev) {
                this.clickMarker(ev,"marker");
            });
            newM.on('mouseover', function(ev) {
                this.current = ev.target;
                //plo.setMarkerStatus(ev.target,"focused");
                this.showCurrent();
            });
            newM.addTo(markLayer);

        } else {
            //plo.log("marker was already here");
        }
    },

    //////////////////////////////////////////////////////
    // will check at start if there is geojson markers to load, and fetch them once !
    fetchGeoJson: function() {
        _.each(this.config.markers, function(m,k) {
            // if starts by "http://", then try to load geojson feed
            if(/^http/.test(k)) {
                this.log("Adding geojson feed: "+k);
                $.get(k, function(response) {
                    console.log("Processing",response.features.length,"ploufs");
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
                        this.addPlouf(p);
                    });
                });
            }
        });
    },

    //////////////////////////////////////////////////////
    fetchPloufs: function() {
        var bounds = this.map.getBounds();
        var center = this.map.getCenter();

        var data = {
            without: plo.already,
            ptypes: _.keys(plo.config.markers),
            zoom: this.map.getZoom(),
            center: [center.lat,center.lng],
            bounds: [[bounds._southWest.lat,bounds._southWest.lng] , [bounds._northEast.lat,bounds._northEast.lng]]
            //zoomAttribute: true,
            //screen: [$(document).width(),$(document).height()]
        };

        //plo.log(data);
        $.post( this.config.serverUrl+"/p/get", data, _.bind(this.handleResponse, this));
    },

    handleResponse: function(response) {
        if(!_.isEmpty(response)) {
            var data = JSON.parse(response);
            //plo.log(Object.keys(data).length+" ploufs received !");
            //plo.log(data);
            _.each(data,function(p) {
                this.already.push(p._id);
                p.markertype = this.config.markers[p.ptype];
                try {
                    //p.text = plo.truncate($('<div>'+p.text+'</div>').text(),90);
                    p.text = $('<div>'+p.text+'</div>').text();
                } catch(err) {
                    p.text = "[error texting html]";
                    this.log("!! html>text error: "+err);
                    this.log(p);
                }
                this.addPlouf(p);
            });
        }
    },

    //////////////////////////////////////////////////////
    truncate: function(str,count) {
        if(str.length<count) return str;
        else if(str.length<3) return "[-]";
        else return str.slice(0,count) + "..";
    },

    //////////////////////////////////////////////////////
    initEventSource: function() {
        var source = new EventSource(this.config.serverUrl+'/riviere-de-ploufs');
        source.onopen = function() {
            this.log("Event Source connected");
        };
        source.onerror = function(err) {
            this.log("Event Source error ! ",err);
        };

        //source.addEventListener('connections', updateConnections, false);
        //source.addEventListener('requests', updateRequests, false);
        //source.addEventListener('uptime', updateUptime, false);

        source.onmessage = function(event) {
            //try {
                var newPlouf = JSON.parse(event.data);
                //plo.log("es-plouf", newPlouf);
                this.addPlouf(newPlouf);
            // } catch(er) {
            //     plo.log("event source message error: "+er);
            // }
        };
    },

    //////////////////////////////////////////////////////
    // special if heroku server
    initEventSourceHQ: function() {
      var source = new ESHQ(this.config.esChannel,{auth_url: this.config.serverUrl+'/riviere-de-ploufs-hq'});

      source.onopen = function(e) {
        this.log(" ... ESHQ connexion ok");
        // callback called when the connection is made
      };
      source.onmessage = function(e) {
        // callback called when a new message has been received
        this.log("Message type: %s, message data: %s", e.type, e.data);
      };
      source.onerror = function(e) {
        // callback called on errror
        this.log(" ... ESHQ connexion error");
        this.log(e);
      };

      source.addEventListener('newploufpublication', function(e) {
        var newdata = e;
        //var newdata = eval("("+e.data+")");
        this.log("ES:",newdata);
        this.addPlouf(newdata);
      });
    },

    //////////////////////////////////////////////////////
    // will POST down/up vote and swipe to next
    voteAndSwipe: function(vote) {
      data = {
        pid: this.current.ploufdata.pid,
        vote:vote ? 1 : -1
      };
      $.post( this.config.serverUrl+"/p/vote", data, function(response) {
          //var res = JSON.parse(response);
          this.log(response);
      });
    },

    //////////////////////////////////////////////////////
    sendForm: function() {
        this.log("Got form fields");
        var form = $("#form");
        form.submit(function() {
            // submit
            var newPlouf = {
                geo:        f.myGeoPosition,
                title:      f.messform.title,
                message:    f.messform.message
            };
            this.log(newPlouf);
            $.post( this.config.serverUrl+"/p/new", newPlouf,function(response) {
                this.log("form response ok");
            });
        });
    },

    //////////////////////////////////////////////////////
    throttleFetch: function() {
        this.throttleFetcher({
            leading:false,
            trailing:false
        });
    },

    throttleFetcher:  _.throttle(this.fetchPloufs, this.config.throttleDelay),
    updateFocusedThrottled: _.throttle(this.updateFocused, this.config.throttleCentererDelay),


};

return Ploufmap;
