
var L = require('leaflet/dist/leaflet');
var $ = require('jquery');
var _ = require('lodash');
require('../../../../bower_components/leaflet-utfgrid/dist/leaflet.utfgrid');
//require('../../../../bower_components/leaflet-loading/src/Control.Loading');
var idbapi = require('./idbapi');

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
    var resizeFunction = function(){
        var width = $(window).width(), height = $(window).height();
        $('#'+elid).css('width', (width-53)+'px').css('height', (height-53)+'px');
        $('#'+elid).css('width', (width-53)+'px').css('height', (height-53)+'px');
        self.map.invalidateSize();
    }
    var formatNum = function (val){
        if(isNaN(val)){
            return val;
        }else{
            return val.toString().replace(/,/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
    }
    var MaximizeButton =  L.Control.extend({
        options: {
            position:"topright"
        },
        expanded: false,
        _div: L.DomUtil.create('a', 'map-button'),
        expandFunc: function(map,control){
            return function (e) {
                var cont = '#'+elid;
                if(!control.expanded){
                    L.DomEvent.stopPropagation(e);
                    var width = $(window).width(), height = $(window).height();
                    var contwidth = $(cont).width(), contheight = $(cont).height();
                    var pos = $(cont).position();
                    $(cont).css('position', 'fixed')
                    .css('top',pos.top+'px')
                    .css('left',pos.left+'px')
                    .css('width',contwidth+'px')
                    .css('height',contheight+'px')
                    .css('z-index','550');
                    $(cont).animate({width: (width-53), height: (height-53), margin: 25, left:0,top:0},{
                        duration: 200,
                        complete: function(){
                            $('#mapper-modal').show();
                            map.invalidateSize();
                        },
                        progress: function(){
                            map.invalidateSize();
                        }
                    });
                    L.DomEvent.addListener(window, 'resize', resizeFunction);
                    $('#map-maximize-button.maximize-button').removeClass('maximize-button').addClass('minimize-button');
                    control.expanded=true;                 
                }else{
                    L.DomEvent.stopPropagation(e);
                    L.DomEvent.removeListener(window, 'resize', resizeFunction);
                    $('#mapper-modal').hide();
                    $(cont).removeAttr('style');
                    map.invalidateSize();
                    //map.zoomOut();
                    $('#map-maximize-button.minimize-button').removeClass('minimize-button').addClass('maximize-button');
                    control.expanded=false;                   
                }
            }
        },
        onAdd: function(map){
            this.map = map;
            this._div.innerHTML = '<div title="maximize map" id="map-maximize-button" class="map-button-icon maximize-button"></div>';
            this.expandClick = this.expandFunc(map,this);
            L.DomEvent.addListener(this._div, 'click', this.expandClick);
            return this._div;
        },
        onRemove: function(map){
            L.DomEvent.removeListener(this._div, 'click', this.expandClick);
        }
    });


    var legendPanel = L.Control.extend({
        options: {
            position: "bottomleft"
        },
        _div: L.DomUtil.create('div','map-legend'),
        onAdd: function(map){
            var colors,control=this,header,def='',time=self.currentQueryTime;
           
            idbapi.mapping(map.mapCode+'/style/'+map.getZoom(),function(resp){
                if(time >= self.currentQueryTime){
                    //control response
                    map.legend=resp;
                    if(resp.order.length===0){
                        header='<span class="legend-header">No Map Points Available</span>';
                    }else if(isNaN(resp.order[0])){
                        header='<span class="legend-header">Top '+resp.order.length+' Taxa</span>';
                        def='<div class="legend-item">other<span class="legend-swatch" style="background-color:'+resp.default.fill+'"></span></div>'
                    }else{
                        header='<span class="legend-header">Record Density</span>';
                    }
                    colors=_.map(resp.order,function(val){
                        var swatch = '<div class="legend-item">';
                        swatch+=formatNum(val);
                        swatch+='<span class="legend-swatch" style="background-color:'+resp.colors[val.toString()].fill+'"></span></div>';
                        return swatch;
                    });
                    control._div.innerHTML='<div class="wrapper">'+header+colors.join('')+def+'</div>';
                }

            });
            return this._div;
        },
        onRemove: function(map){
            this._div.innerHTML=''
            return this._div;
        }
    });


    //init map
    this.map = L.map(elid,this.defaults);
    this.map.addControl(new MaximizeButton());
    //add mapper modal for maximize view
    $('body').append('<div id="mapper-modal"></div>');

    this.map.addControl(new L.control.scale({
        position:'bottomright'
    }));

/*
    * iDBLayer control and rendering with events
    ****/
    var idblayer;
    var idbloading = function(){
        self.map.fire('dataloading');
    }
    var idbload = function(){
        self.map.fire('dataload');
    }
    var makeIdblayer = function(tilePath){
        idblayer = L.tileLayer(tilePath,{minZoom: 0});
        idblayer.on('loading',idbloading);
        idblayer.on('load',idbload)
        return idblayer;
    }
    var removeIdblayer = function(){
        if(typeof idblayer == 'object'){
            idblayer.off('loading',idbloading);
            idblayer.off('load',idbload);
        }
        return idblayer;
    }
    /*
    *Instance Methods
    **/
    this.currentQueryTime = 0;
    var idbquery,utf8grid,legend;
    var mapapi = idbapi.host+"mapping/";
    
    this.query = function(query,dates,yearInterval){
        idbquery=query;
        _query();
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
    var popup = L.popup();

    this.map.on('click', function(e) {
        $.getJSON(mapapi + self.map.mapCode + "/points?lat=" + e.latlng.lat + "&lon=" + e.latlng.lng + "&zoom=" + self.map.getZoom(), function(data){
            var cont;
            if(data.itemCount>0){
                if(_.isUndefined(popupContent)){
                    cont = "You clicked the map at " + e.latlng.toString() + ".<br>There are " + data.itemCount + " records in this map cell.";
                }else{
                    cont = popupContent(e,data,self.map);
                }
                popup.setLatLng(e.latlng).setContent(cont).openOn(self.map);
            }
        });
    }); 

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