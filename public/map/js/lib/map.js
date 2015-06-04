
var L = require('leaflet/dist/leaflet');
var $ = require('jquery');
var _ = require('lodash');
var async = require('async');
//require('../../../../bower_components/leaflet-utfgrid/dist/leaflet.utfgrid');
//require('../../../../bower_components/leaflet-loading/src/Control.Loading');
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
        worldCopyJump: true//,
        ///loadingControl: true
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

    var querySlices = function(queries){
        var layers={}, color = chroma.scale('RdYlBu'), cnt=1;
        var split = 1/queries.length;
        async.eachSeries(queries,function(q,callback){
            var full = JSON.stringify({rq: q, type: 'auto', threshold: 100000, style: {pointScale: [color(split*cnt).hex()], fill: '#f33',stroke: 'rgb(229,245,249,.8)'}});
            cnt+=1;
            console.log(full)
            $.ajax(mapapi,{
                data: full,
                success: function(resp){
                    var l = L.tileLayer(resp.tiles,{minZoom: 0});
                   self.map.addLayer(l);
                   layers[q.datecollected.gte+' - '+q.datecollected.lte]=l;
                   callback();
                },
                dataType: 'json',
                contentType: 'application/json',
                type: 'POST',
                crossDomain: true
            })            
        },function(err){
            L.control.layers(baseLayer, layers).addTo(self.map);
        });
    }

    var _query = _.debounce(function(){
        var query = {rq: idbquery, type: 'auto', threshold: 100000, style: {fill: '#f33',stroke: 'rgb(229,245,249,.8)'}};
        var q = JSON.stringify(query), d = new Date;
        var time = d.getTime();
        self.currentQueryTime=time;

        $.ajax(mapapi,{
            data: q,
            success: function(resp){
                //console.log(resp.shortCode)
                //make sure last query run is the last one that renders
                //as responses can be out of order
                //mapCode = resp.shortCode;
                self.map.mapCode = resp.shortCode;
                self.map.resp=resp;
                if(time>=self.currentQueryTime){
                    /*if(typeof legend == 'object'){
                        //self.map.removeControl(legend);
                        legend.removeFrom(self.map)
                    }
                    legend = new legendPanel();
                    self.map.addControl(legend);*/
                    if(typeof idblayer == 'object'){
                        self.map.removeLayer(removeIdblayer());
                    }
                    self.map.addLayer(makeIdblayer(resp.tiles));
                    if(typeof utf8grid == 'object'){
                        self.map.removeLayer(utf8grid);
                    }
                    utf8grid = L.utfGrid(resp.utf8grid,{
                        useJsonP: false
                    });
                    self.map.addLayer(utf8grid);
                }
            },
            dataType: 'json',
            contentType: 'application/json',
            type: 'POST',
            crossDomain: true
        })
    }, 100,{'leading': false, 'trailing': true});
    
    /*
    * Event Actions
    ***/

    this.map.on('zoomend',function(e){
        /*if(typeof legend == 'object'){
            self.map.removeControl(legend);
            if(typeof self.map.mapCode != 'undefined'){
                self.map.addControl(legend)
            }
        }*/
        if(typeof idblayer == 'object'){
            self.map.removeLayer(removeIdblayer());
            if(typeof self.map.resp != 'undefined'){
                self.map.addLayer(makeIdblayer(self.map.resp.tiles))
            }
        }
    })

}