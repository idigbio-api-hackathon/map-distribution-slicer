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

window.mapper = require('./lib/map');
window.$ = require('jquery');
var _ = require('lodash');
