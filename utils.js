module.exports.isPointInPoly = function(poly, pt){
	for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
		((poly[i][1] <= pt[1] && pt[1] < poly[j][1]) || (poly[j][1] <= pt[1] && pt[1] < poly[i][1]))
		&& (pt[0] < (poly[j][0] - poly[i][0]) * (pt[1] - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0])
		&& (c = !c);
	return c;
}
function getRandomArbitary(min, max) { 
	return Math.random() * (max - min) + min;
}
module.exports.getRandomPosInRect = function(rect) {
	return [getRandomArbitary(rect[0],rect[2]),getRandomArbitary(rect[1],rect[3])];
}
function deg2rad(deg) {
  return deg * (Math.PI/180)
}
module.exports.distanceBetweenPoints = function(arr) { // return meters
	//return Math.sqrt(Math.pow(p1[0]-p2[0],2) + Math.pow(p1[1]-p2[1],2));
	var R = 6371; // earth radius in km
	var dLat = deg2rad(arr[2]-arr[0]);
	var dLon = deg2rad(arr[3]-arr[1]);
	var lat1 = deg2rad(arr[0]);
	var lat2 = deg2rad(arr[2]);
	var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
		Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
	return d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 1000.0;
};

module.exports.isInMyRect = function(pt,arr) {
	return (pt[0]>=arr[0] && pt[0]<=arr[2] && pt[1]>=arr[1] && pt[1]<=arr[3]);
};

module.exports.formatMeter = function(nStr) {
	if(parseFloat(nStr)>1000)
		return (nStr/1000).toFixed(1)+"km"
	else
		return nStr.toFixed(0)+"m";
};
module.exports.formatSquare = function(nStr) {
	var res = null;
	if(parseFloat(nStr)==0) return "0 m²";
	else if(parseFloat(nStr)>1000000) {
		res = parseFloat(nStr)/1000000;
		return res.toFixed(2).replace(".",",")+" km²";
	}
	else {
		nStr += '';
		var x = nStr.split('.');
		var x1 = x[0];
		var x2 = x.length > 1 ? '.' + x[1] : '';
		var rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) { x1 = x1.replace(rgx, '$1' + ' ' + '$2'); }
		return (x1+x2)+" m²";
	}
};
module.exports.getLongestWord = function(t) {
	var text = t.replace(/[^ ]*http[^ ]*/g,'#');
	var words = text.split(/[ .,!?:;'"“”\(\)]+/);
	var maxw = "...";
	words.forEach(function(el) {
		if(el.length>maxw.length && el.indexOf('#')==-1 && el.indexOf('@')!=0 && el.indexOf('parismap')==-1)
			maxw = el;
	});
	return maxw;
};

// only return event occurences included in datetime interval
module.exports.getGoodEventOccurences = function(event,datetimeinterval) {
	var from = 	datetimeinterval[0],
		to = 	datetimeinterval[1];
	var occs = event.occurences;
	var goodOks = [];
	occs.forEach(function(e){
		var s = e.start,
			e = e.end;
		//console.log("    // "+s+" | "+e);
		if(e>from && s<to) {
			goodOks.push({
				start: 	s,
				end:	e
			})
		}
	});
	//console.log("event:"+event.idactivites+" ... kept "+goodOks.length+" occurences over "+occs.length);
	return goodOks;
};

