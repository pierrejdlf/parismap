var publisherClient = null;
var params = require('./myparams.js');

if (params.ESHQ_KEY) {
  publisherClient = require('eshq-js')({
		key:	params.ESHQ_KEY,
		secret: params.ESHQ_SECRET
	});

  console.log("ESHQ publisher client made");
}

module.exports = publisherClient;