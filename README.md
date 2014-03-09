# Parismap client

## Install

you need

* npm
* bower (sudo npm install -g bower)

* npm install && bower install

## Build

- grunt

## App
### android
> keytool -genkey -v -keystore parismapstore.keystore -alias parismapkey -keyalg RSA -keysize 2048 -validity 10000

### ios
if you really want to be part of the system
> https://coderwall.com/p/eceasa

## Licence
Both parismap client and server are MIT Licensed

# Ploufmap options

  var p = Ploufmap(options)

* `markers`
	* can either be: [from our parismap server] which marker type will be fetched from server. and wich icon 'type' [aka msg,evt] it will have
    * can either be: [from an external geojson feed]: the geojson feed(s) address and their marker 'type'

* `ploufEndpoint=/p/get|/p/zoomed` (please see server)
  * `/p/get` all ploufs within the given rectangle
  * `/p/zoomed` all ploufs with a `onZoom` property to set their opacity depending on zoom
* `zoomClustering=true|false` to set opacity of ploufs based on `onZoom` property of fetched ploufs
