var params = require("./myparams.js");

// setup publisher client
if (params.START_ESHQ) {
  var publisherClient = require("./publisher.js");
  
  if (publisherClient) {
    publisherClient.listen(app);
    console.log('publisher started.');
  }
}
else {
  console.warn('publisher not started as user demand.');
}


/////////////////////////////////////////////////////////////////////
// Twitter Stream API worker
if (params.START_TWITTER) {
  console.log('start twitter worker.');
  var twitterWorker = require("./twitter.js");
  twitterWorker();
}
else {
  console.warn('twitter worker not started as user demand.');
}