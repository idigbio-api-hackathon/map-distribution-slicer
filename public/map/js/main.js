/*
*
* Map.query : 
* Parameters:  
* rq = iDigBio rq query formated JSON,
* dates = [] (Array with 2 dates for date range), 
* yearSlice = how many years for slicing distribution
* 
* example
*  map.query({"genus":"acer"},['1902-10-3','1999'],5);
****/



var mapper = require('./lib/map');
window.$ = require('jquery');
var _ = require('lodash');


$(document).ready(function(){

	var map = new mapper('map');
	map.query({"genus":"acer", "geopoint":{"type":"bounding_box","top_left":{}}, ['1976-1-10','1999'], 5);
})