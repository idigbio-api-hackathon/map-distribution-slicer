require('jquery');
module.exports = {
    host:'//beta-search.idigbio.org/v2/',
    search: function(query,callback){
        this._basic('POST','search/records/',query,callback);
    },
    media: function(query,callback){
        this._basic('POST','search/media/',query,callback);
    },
    publishers: function(query,callback){
        this._basic('POST','search/publishers/',query,callback);
    },
    recordsets: function(query,callback){
        this._basic('POST','search/recordsets/',query,callback);
    },
    createMap: function(query,callback){
        this._basic('POST','mapping/',query,callback);
    },
    mapping: function(path,callback){
        this._basic('GET','mapping/'+path,callback);
    },
    view: function(type,uuid,callback){
        this._basic('GET','view/'+type+'/'+uuid,callback);
    },
    summary: function(type,query,callback){
        this._basic('POST','summary/'+type,query,callback);
    },
    _basic: function(method,arg1,arg2,arg3){
        var options={
            error: function(jqxhr,status,error){
                console.log(status +': '+error);
            },
            dataType: 'json',
            contentType: 'application/json',
            type: method
        }
        var path=this.host;
        [arg1,arg2,arg3].forEach(function(arg){
            switch(typeof(arg)){
                case 'object':
                    options.data=JSON.stringify(arg);
                    break;
                case 'string':
                    path+=arg;
                    break;
                case 'function':
                    options.success = function(response){
                        arg(response);
                    }
                    break;
            }
        });
        $.ajax(path,options);        
    }
}