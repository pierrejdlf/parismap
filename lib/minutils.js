moment.lang('fr', {
	relativeTime : {
		future : "dans %s",
		past : "il y a %s",
		s : "qq secondes",
		m : "une min.",
		mm : "%d min.",
		h : "une heure",
		hh : "%d heures",
		d : "un jour",
		dd : "%d jours",
		M : "un mois",
		MM : "%d mois",
		y : "un an",
		yy : "%d ans"
	}
});

/*
	moment.js formats
	M, MM	Month Number (1 - 12)
	MMM, MMMM	Month Name (In currently language set by `moment.lang()`)
	D, DD	Day of month
	DDD, DDDD	Day of year
	d, dd, ddd, dddd	Day of week (NOTE: the input for these tokens is ignored, as there are 4-5 weeks in a month, and it would be impossible to get the day of the month based off the day of the week)
	YY	2 digit year (if greater than 68 will return 1900's, otherwise 2000's)
	YYYY	4 digit year
	a, A	AM/PM
	H, HH	24 hour time
	h, hh	12 hour time (use in conjunction with a or A)
	m, mm	Minutes
	s, ss	Seconds
	S	Deciseconds (1/10th of a second)
	SS	Centiseconds (1/100th of a second)
	SSS	Milliseconds (1/1000th of a second)
	Z, ZZ	 Timezone offset as `+0700` or `+07:30`
	X	 Unix timestamp
*/


var formatDate = function(d,format) {
	return moment(d).format(format);
};
var formatDateFromNow = function(d) {
	return moment(d).fromNow();
}
var formatMeter = function(nStr) {
	if(parseFloat(nStr)>1000)
		return (nStr/1000).toFixed(1)+"km"
	else
		return nStr.toFixed(0)+"m";
};
var formatSquare = function(nStr) {
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

// cause .link() js function does not allow target=_blank
var newLink = function(t,url) {
	return '<a href="'+url+'" target="_blank">'+t+'</a>';
};
String.prototype.parseURL = function() {
	return this.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&~\?\/.=]+/g, function(url) {
		return newLink(url,url);
	});
};
String.prototype.parseUsername = function() {
	return this.replace(/[@]+[A-Za-z0-9-_]+/g, function(u) {
		var username = u.replace("@","")
		return newLink(u,"https://twitter.com/"+username);
	});
};
String.prototype.parseHashtag = function() {
	return this.replace(/[#]+[A-Za-z0-9-_]+/g, function(t) {
		var tag = t.replace("#","%23")
		//return newLink(t,"http://search.twitter.com/search?q="+tag);
		return newLink(t,"https://twitter.com/search/realtime?q="+tag+"&src=typd");
	});
};
var formatTweet = function(str) {
	return str.parseURL().parseUsername().parseHashtag();
};