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


$(document).ready(function()
{

    //Mapping
	var map = new mapper('map');
	map.query({"genus":"accer"},5);



    $('#mapping').submit(function(){

        var genus = document.getElementById("genus").value;
        var family = document.getElementById("family").value;
        var species = document.getElementById("species").value;
        var date1 = document.getElementById("date1").value;
        var date2 = document.getElementById("date2").value;

        var map = new mapper('map');
        map.query({"genus":genus, "family":family, "species":species}, [date1,date2],5);

    });



})