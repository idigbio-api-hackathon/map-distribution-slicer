
var L = require('leaflet/dist/leaflet');
var $ = require('jquery');
var _ = require('lodash');
var async = require('async');
//require('../../../../bower_components/leaflet-utfgrid/dist/leaflet.utfgrid');
require('../../../../bower_components/leaflet-loading/src/Control.Loading');
//require('../../../../bower_components/layer-control/leaflet.control.orderlayers.min');
var idbapi = require('./idbapi');
var chroma = require('chroma-js');

//elid: string name of element id;
//options: object map of settings
/*
*Map object
*initialize with new IDBMap(elid=String of element to bind to,options={} to overide defaults)
*popupContent: optional function for returning popup content(must return string) function(event,resp,map)
***/
module.exports = IDBMap =  function(elid, options, popupContent){
    var self=this;
    /*
    * Basic Options
    ****/
    var base = L.tileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        attribution: 'Map data © OpenStreetMap',
        minZoom: 0,
        reuseTiles: true
    });
    var baseLayer ={'base': base};
    this.defaults = {
        center: [0,0],
        zoom: 1,
        layers: [base],
        scrollWheelZoom: true,
        boxZoom: true,
        zoomControl: true,
        worldCopyJump: true,
        oadingControl: true
    };

    if(typeof options == 'object'){
        _.merge(this.defaults,options);
    }
    /*
    * Map Controls
    ****/
    var formatNum = function (val){
        if(isNaN(val)){
            return val;
        }else{
            return val.toString().replace(/,/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
    }

    //init map
    this.map = L.map(elid,this.defaults);
    //add mapper modal for maximize view

    this.map.addControl(new L.control.scale({
        position:'bottomright'
    }));

    /*
    * iDBLayer control and rendering with events
    ****/
    var idblayer;
    /*
    *Instance Methods
    **/
    this.currentQueryTime = 0;
    var idbquery;
    var mapapi = idbapi.host+"mapping/";
    
    var createSlices = function(start,end,interval){
        var start = Date.parse(start), end = Date.parse(end);
        var slice = interval * 1000 * 60 * 60 * 24 * 365;
        var dates=[],cur=start;
        while(cur<end){
            var stop;
            if(cur+slice>end){
                stop=end;
            }else{
                stop=cur+slice;
            }
            dates.push(
                [
                    dateToString(cur),
                    dateToString(stop)
                ]
            )
            cur+=(slice+ (1000 * 60 * 60 * 24));
        }
        return dates;
    }

    var dateToString = function(milli){
        var t = new Date(milli);
        var out = t.getFullYear()+'-'+(t.getMonth()+1)+'-'+t.getDate();
        return out;
    }

    this.query = function(query,dates,interval){
        var d = createSlices(dates[0],dates[1],interval);
        var queries=[];
        d.forEach(function(item){
            var q = _.cloneDeep(query);
            q['datecollected']={"type":"range","gte":item[0],"lte":item[1]}
            queries.push(q);
        });
        querySlices(queries);
    }
    var layerGroup=L.layerGroup();
    layerGroup.addTo(self.map);
    var layerControl = L.control.layers(baseLayer);
    layerControl.addTo(self.map);
    var layers=[];
    var querySlices = function(queries){
        layers.forEach(function(l){
            layerControl.removeLayer(l);
        })
        var  color = chroma.scale('RdYlBu'), cnt=1, colors={};
        var split = 1/queries.length;
        layerGroup.clearLayers();
        async.eachSeries(queries,function(q,callback){
            var c = color(split*cnt).hex(),key='<b>'+q.datecollected.gte+'</b> - <b>'+q.datecollected.lte+'</b>';
            colors[c]=key;
            var full = JSON.stringify({rq: q, type: 'auto', threshold: 100000, style: {scale: [c], pointScale: [c], fill: '#f33',stroke: 'rgb(229,245,249,.8)'}});
            cnt+=1;
            console.log(full)
            $.ajax(mapapi,{
                data: full,
                success: function(resp){
                   var l = L.tileLayer(resp.tiles,{minZoom: 0});
                   layerGroup.addLayer(l);
                   layerControl.addOverlay(l,'<span style="background-color:'+c+'" class="layer-color"></span>'+key);
                   //layers['<span style="background-color:'+c+'" class="layer-color"></span>'+key]=l;
                   layers.push(l);
                   callback();
                },
                dataType: 'json',
                contentType: 'application/json',
                type: 'POST',
                crossDomain: true
            })            
        },function(err){
            makeLegend(colors);
        });
    }
    
    var makeLegend = function(keys){
        var div='<div id="legend-block">';
        _.each(keys,function(v,k){
            div+='<div class="color-block"><span class="color" style="background-color:'+k+'"></span><span class="range">'+v+'</span></div>';
        });
        div+='</div>';
        $('#legend').html(div);
    }

}