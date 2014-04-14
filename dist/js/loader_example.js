
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
  var cloudmadeAttribution = 'MD &copy;2011 OSM contribs, Img &copy;2011 CloudMade';
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
    icons: {
      evt: function(p,clustCount) {
        p.cluster = clustCount>1;
        p.css = "point "+(p.cluster ? "cluster" : "normal");
        p.icon = EVENT_ICONS[p.ptype];
        p.timestr = moment(p.date.start).format("HH[h]mm").replace(/h00$/,"h").replace(/^0/,"");
        //var cclass = moment(p.date.start).format("[h]HH [m]mm");
        return L.divIcon({
          iconSize:     [0, 0],
          //iconAnchor:   [0, 0], / centered by default if size is specified !
          html: Handlebars.compile( $("#evt-template").html() )(p),
          className: clustCount>1 ? "parismap-icon event back" : "parismap-icon event front"
        });
      },
    }
  };



  ////////////////////////////////////////////
  var dev = window.location.hostname == "localhost";
  configs['twitter'] = {
    useServer: false,
    dev: dev,
    baseUrl: dev ? "http://localhost:8080" : "http://beta.parismappartient.fr",

    maxClusterRadius: 40,
    baseLayer: L.tileLayer('http://a.tiles.mapbox.com/v3/minut.map-qgm940aa/{z}/{x}/{y}.jpg70', {styleId: 22677, attribution: cloudmadeAttribution}), // black
    markers: {
        "tweet": 'msg',
        "cdlm": 'msg',
        "geolocate.csv": 'msg',
        "sample.csv": 'msg',
        "story.csv": 'msg',
    },
    icons: {
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
    }
  };


  ////////////////////////////////////////////
  configs['europewords'] = {
    clusterize: false,
    useServer: false,
    leaflet: {
      zoom: 5,
      minZoom: 4,
      maxZoom: 9,
      locateButton: false,
      scrollWheelZoom: false,
      fullscreenControl: false,
    },
    baseLayer: L.tileLayer('http://a.tiles.mapbox.com/v3/minut.hflfi81j/{z}/{x}/{y}.jpg70', {styleId: 22677, attribution: cloudmadeAttribution}), // whole europe
    markers: {
      'https://a.tiles.mapbox.com/v3/minut.hflfi81j/markers.geojson':'emi'
    },
    icons: {
      emi: function(p,clustCount) {
        var video = /:\/\//.test(p.description);
        var vimeo = /vimeo/.test(p.description);
        p.movie = video;
        p.icon = video ? "film" : "asterisk";
        p.jumpto = p.title.split(".")[0];
        p.title = p.title.replace(/\d*\./,"");
        var d = p.description ;

        if(!video) {      // un mot un jour
          var img = d.match(/\[\[(.*)\]\]/)[1];
          p.imgurl = "https://googledrive.com/host/0B2b_ECAYHVctWGJkUkdWTXFrdDA/"+img;
        } else if(vimeo)  // vimeo
          p.imgurl = d.match(/\((.*)\)/) ? d.match(/\((.*)\)/)[1] : "no";
        else            // youtube
          p.imgurl = d.replace(/^.*[\/=]([^\/^=]*)].*/,"http://i2.ytimg.com/vi/\$1/hqdefault.jpg");

        p.imgurl = p.imgurl.replace(/ /g,"%20");

        //console.log("Got: ",p.imgurl);

        return L.divIcon({
          iconSize:     [0, 0],
          html: Handlebars.compile( $("#emi-template").html() )(p),
          className: video ? "parismap-icon emi video" : "parismap-icon emi image",
        });
      },
    }
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

  var p = Ploufmap(options);  

});
