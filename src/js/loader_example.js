
function getURLParameter(name) {return decodeURI((RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]);}

Handlebars.registerHelper('formatdate', function(date) {
  try {
    var datestr = moment(date.start).format("HH[h]mm")+"-"+moment(date.end).format("HH[h]mm");
    return new Handlebars.SafeString(datestr);
  } catch(er) {
    return "error";
  }
});
Handlebars.registerHelper('splitype', function(type) {
  return type.split("_")[1];
});

var EVENT_ICONS = {
    'event_demosphere':     'bullhorn',
    'event_lylo':           'eye',
    'event_quefaire':       'calendar',
    'event_sowprog':        'rss',
    'event_cibul':          'flash',
    'event_oneheart':       'globe',
    'event_opendatasoft':   'puzzle-piece',
    'event_calenda':        'book',
    'event_linternaute':    'unsorted'
};

$(function(){
    //L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {styleId: 999,   attribution: cloudmadeAttribution}),

    var configs = {};

    ////////////////////////////////////////////
    configs['parisevents'] = {
      baseLayer: L.tileLayer('http://a.tiles.mapbox.com/v3/minut.map-zvhmz6wx/{z}/{x}/{y}.jpg70', {styleId: 22677, attribution: cloudmadeAttribution}), // normal paris
      markers: {
          "event_cibul": 'evt',
          "event_demosphere": 'evt',
          "event_lylo": 'evt',
          "event_oneheart": 'evt',
          "event_opendatasoft": 'evt',
          "event_quefaire": 'evt',
          "event_sowprog": 'evt',
          "event_calenda": 'evt',
          "event_linternaute": 'evt'
      },
    };


    ////////////////////////////////////////////
    configs['twitter'] = {
      maxClusterRadius: 60,
      baseLayer: L.tileLayer('http://a.tiles.mapbox.com/v3/minut.map-qgm940aa/{z}/{x}/{y}.jpg70', {styleId: 22677, attribution: cloudmadeAttribution}), // black
      markers: {
          "tweet": 'msg',
          "cdlm": 'msg',
          "geolocate.csv": 'msg',
          "sample.csv": 'msg',
          "story.csv": 'msg',
      },
    };


    ////////////////////////////////////////////
    configs['europewords'] = {
      baseLayer: L.tileLayer('http://a.tiles.mapbox.com/v3/minut.hflfi81j/{z}/{x}/{y}.jpg70', {styleId: 22677, attribution: cloudmadeAttribution}), // whole europe
      markers: {
        'https://a.tiles.mapbox.com/v3/minut.hflfi81j/markers.geojson':'word'
      },
    };


    ////////////////////////////////////////////
    // which config to load ?
    var options = {};
    if(window.location.hash=='#msg')
      options = configs['twitter'];
    else if(window.location.hash=='#emi')
      options = configs['europewords'];
    else
      options = configs['parisevents'];
    
    ////////////////////////////////////////////
    var cloudmadeAttribution = 'MD &copy;2011 OSM contribs, Img &copy;2011 CloudMade';
    var dev = window.location.hostname == "localhost";

    // init map on div, with all required options
    var p = Ploufmap(_.extend(options, {
      map: "map", // map div id (carefull with css !)

      useServer: false,
      dev: dev,
      baseUrl: dev ? "http://localhost:8080" : "http://beta.parismappartient.fr",

      leaflet: {
        // here you could override default leaflet map options
        //minZoom: 2,
        //maxZoom: 18,
        //scrollWheelZoom: false,
      },

      clusterize: true,

      // define icons
      icons: {
        ///////////////////////////////////////////////////
        msg: function(p,clustCount) {
          var cla = "word";
          if(clustCount>1)
            cla += " cluster";
          return L.divIcon({
            iconAnchor:   [0, 0],
            iconSize:     [0, 0],
            html: Handlebars.compile(
              "<div class='"+cla+"'>"+
                '<div class="template">'+
                  '<div class="text">'+p.text+'</div>'+
                '</div>'+
                '<div>'+p.words.join(" ")+'</div>'+
              "</div>"
              )(p),
            //html:         "<div class='"+cla+"'><div class='clock "+cclass+"'></div><div class='arro'></div></div>",
            popupAnchor:  [0, 0],
            className: clustCount>1 ? "parismap-icon msg back" : "parismap-icon msg front"
          });
        },
        ///////////////////////////////////////////////////
        evt: function(p,clustCount) {
          var cla = "point"
          if(clustCount>1)
            cla += " cluster";
          var ic = EVENT_ICONS[p.ptype];
          //ic = "circle";
          var ti = moment(p.date.start).format("HH[h]mm");
          ti = ti.replace(/h00$/,"h").replace(/^0/,"");
          var cclass = moment(p.date.start).format("[h]HH [m]mm");

          var ht = '<div class="template {{markertype}}">'+
            '<div class="content">'+
              '<div class="meta">'+
                '<a class="link" href="{{link}}" target="_blank"><div class="address">{{place}} - {{address}}</div></a>'+
              '</div>'+
              '<div class="title">{{title}}</div>'+
              '<div class="text">{{text}}</div>'+
            '</div></div>';
          var html = Handlebars.compile(ht)(p);
          return L.divIcon({
            iconAnchor:   [0, 0],
            iconSize:     [0, 0],
            html: "<div class='"+cla+"'>"+
                      "<i class='fa fa-"+ic+"'></i>"+
                      "<div class='arrow'></div>"+
                      // "<div class='focus'><div class='line'></div></div>"+
                      // "    <div class='arc arc_start'></div>"+
                      // "    <div class='arc arc_end'></div>"+
                      "<div class='time'>"+ti+"</div>"+
                      html+
                  "</div>",
            //html:         "<div class='"+cla+"'><div class='clock "+cclass+"'></div><div class='arro'></div></div>",
            popupAnchor:  [0, 0],
            className: clustCount>1 ? "parismap-icon event back" : "parismap-icon event front"
          });
        },
        ///////////////////////////////////////////////////
      }
    }));
});