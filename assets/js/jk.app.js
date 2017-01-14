var Tube = (function ($) {
    // 2016
    // @jessekorzan
    //
	var jk = {};
	jk.config = {};
	jk.vars = {
    	cnt : 0,
    	timer : 100,
        //channels : ["tyleroakley","caseyneistat","vlogbrothers", "LastWeekTonight", "vicenews", "TheYoungTurks", "MatthewPatrick13", "jacksepticeye", "ChloeMorello", "MichellePhan", "ThreadBanger", "destinws2", "pbsideachannel"]
        channels : ["LastWeekTonight"],
        dump : {
            currentChannel : "",
            currentChannelID : "",
            data : "/n"
        }
	}
/* --------------------------------------------------	
-------------------------------------------------- */
    // INIT this f**ker
    jk.init = function () {
        
        // header for data DUMP (CSV file)
        jk.vars.dump.data += 'USERNAME, '; 
        jk.vars.dump.data += 'CHANNEL ID, '; 
        jk.vars.dump.data += 'MESSAGE, ';        
        jk.vars.dump.data += 'PASSES, ';
        jk.vars.dump.data += 'HASHED, ';
        jk.vars.dump.data += 'BULLYING, ';
        jk.vars.dump.data += 'VULGAR, ';
        jk.vars.dump.data += 'RACIST, ';
        jk.vars.dump.data += 'SEXTING, ';
        jk.vars.dump.data += 'FIGHTING';
        
        // append these channels:
        // jk.vars.channels = [];
        
        // listeners
        jk.controller.ui();
        jk.views.subscriptions();
        
        
        var autoRun = Utilities.queryString.parameter("auto");
        
        if (autoRun) {
            jk.controller.run();
        }

    };
/* --------------------------------------------------	
-------------------------------------------------- */

    // ########################################
    // 
    // SERVICES
    //
    // ########################################
    jk.services = {
        channelID : function (userName) {
            
            var _options = {
                url : "https://www.googleapis.com/youtube/v3/channels",
                authorization : "Bearer " + ACCESS_TOKEN,
                data : {
                    part : "id",
                    forUsername : userName
                },
                callBack : function(data) {
                    // get the comments listed...
                    jk.services.comments(data.items[0].id, userName, jk.views.listFilteredComments);
                    
                    // update DUMP
                    jk.vars.dump.currentChannel = userName;
                    jk.vars.dump.currentChannelID = data.items[0].id;
                    
                }
            }
            Utilities.getJSON.process(_options);
            
        },
        comments : function (channelID, userName, func) {
            
            var _options = {
                url : "https://www.googleapis.com/youtube/v3/commentThreads",
                authorization : "Bearer " + ACCESS_TOKEN,
                data : {
                    part : "snippet",
                    maxResults : 100,
                    allThreadsRelatedToChannelId : channelID
                },
                callBack : function(data) {
                    func(data, userName);
                }
            }
            Utilities.getJSON.process(_options);
        },
        ninja : function (message, commentUserName, userName) {
            
            // clean it...
            message = message.replace(/&#39;/g, "'").replace(/&quot;/g, "");

            SiftNinja.services.classify(message, commentUserName, function(tags, hashes, response) {
                
                
                
                var _return = [];
                if (tags.length > 0) {
                    _return.push([hashes], [tags]);
                   
                } else {
                    _return.push([message]);
                }
                
                Utilities.pubSub.publish("appendMessage", {
                    channel : userName,
                    commenter : commentUserName,
                    response : _return,
                    ogMessage : message
                });
                
             
                // add new line to data DUMP
                jk.vars.dump.data += "\n";
                jk.vars.dump.data += jk.vars.dump.currentChannel + ', '; 
                jk.vars.dump.data += jk.vars.dump.currentChannelID + ', '; 
                jk.vars.dump.data += '"' + message.replace(/,/g, "") + '", ';   
                jk.vars.dump.data += response.response + ', ';
                jk.vars.dump.data += (response.hashes.length) ? '"' + response.hashes[0]['hashed'].replace(/,/g, "") + '", ' : ', ';
                jk.vars.dump.data += response.tags.bullying + ', ';
                jk.vars.dump.data += response.tags.vulgar + ', ';
                jk.vars.dump.data += response.tags.racist + ', ';
                jk.vars.dump.data += response.tags.sexting + ', ';
                jk.vars.dump.data += response.tags.fighting;
                
            });
            
        },
    };
    // ########################################
    // 
    // VIEWS
    //
    // ########################################
    jk.views = {
        addColumn : function (data) {
            Utilities.mustache.output({
                container : $(".dashboard"),
                template : "#list",
                data : data
            });
            
            var _dashboards = $(".dashboard > div");
            
            $(".dashboard").css({
	            "width" : (_dashboards.innerWidth() + 8) * _dashboards.length  + "px"
            })
        },
        addPanel : function (userName) {
            Utilities.mustache.output({
                container : $("#" + userName),
                template : "#list-panel"
            });
            
            jk.services.channelID(userName);
        },
        listFilteredComments : function (data, youTubeStar) {
            var _channel = $("#" + youTubeStar),
                _cnt = 0,
                _total = data.items.length;
            
            _channel.find(".ui-loading").addClass("off");
            
            // stats
            _channel.find(".meta-total").html(_total);
                                                            
	        // loop through comments --> send to Ninja 
	        function process (cnt) {
    	        var _item = data.items[cnt],
    	            _str = _item.snippet.topLevelComment.snippet.textDisplay.toString(),
                    _commentUserName = _item.snippet.topLevelComment.snippet.authorDisplayName;
    	        
    	        jk.services.ninja(_str, _commentUserName, youTubeStar);
	        }
	        
            var _timer = setInterval(function(){
                if (_cnt < _total) {
                    process(_cnt++);
                } else {
                    clearInterval(_timer);
                    // channel done, all messages sifted
                    // get next channel
                    Utilities.pubSub.publish("appendChannel", {});
                    
                }
                
            }, jk.vars.timer);
            
	        
	        
        },
        subscriptions : function () {
            Utilities.pubSub.subscribe("appendChannel", function (obj) {
                
                // auto channel list
                if (jk.vars.cnt < jk.vars.channels.length) {
            
                    jk.views.addColumn({
                        username : jk.vars.channels[jk.vars.cnt]
                    });
                    jk.views.addPanel(jk.vars.channels[jk.vars.cnt]);
                    jk.vars.cnt++;
                }
                
                
            });
            Utilities.pubSub.subscribe("appendMessage", function (obj) {
                
                var _channel = $("#" + obj.channel);
                
                // stats
                var _total = Number(_channel.find(".meta-total").html()),
                    _sifted = Number(_channel.find(".meta-sifted").html()) + 1;
                    
                _channel.find(".meta-sifted").html(_sifted);
                _channel.find(".progress-bar").css({
                    "width" : Math.floor((_sifted / _total) * 100) + "%"
                });
                
                
                // add passes or fails sample
                if (obj.response[1] == undefined) {
                    
                    Utilities.mustache.output({
                        container : _channel.find(".list"),
                        template : "#list-item-passes",
                        prepend : true,
                        data : {
                            user : obj.commenter,
                            message : obj.response[0]
                        }
                    });
                                        
                } else {
                    
                    Utilities.mustache.output({
                        container : _channel.find(".list"),
                        template : "#list-item-fails",
                        prepend : true,
                        data : {
                            user : obj.commenter,
                            message : "<span>" + obj.response[0] + "</span><span>" + obj.ogMessage + "</span>",
                            tags : obj.response[1][0]
                        }
                    });
                                       
                    // incident count (filtered messages)
                    _channel.find(".meta-incidents-total").html(Number(_channel.find(".meta-incidents-total").html()) + 1);
                    
                    // stats for tags
                    $.each(obj.response[1][0], function(){
                        var _risk = this.risk,
                            _tag = this.tag;
                        
                        _channel.find(".meta-" + _risk + "-total").append('<span class="tag ' + _risk + '">' + _tag + '</span>');
                    });
                    
                }
            });
        }
    }
     // ########################################
    // 
    // CONTROLLER
    //
    // ########################################
    jk.controller = {
        run : function() {
            jk.vars.channels = $(".js-channels").val().replace(/\n/g,'').split(",");
            $(".js-target div").not(".ui-admin").remove();
            // fire it up
            Utilities.pubSub.publish("appendChannel", {});
        },
        ui : function () {
            
            $("body").on("submit", "form", function(e){
                e.preventDefault();
                var _userName = $(this).find("input").val();
                               
                $(this).next(".panel").attr({
                    "id" : _userName
                });
                
                jk.views.addPanel(_userName);
            });
            
            $(".ui-add-list").on("click", this, function(e){
                e.preventDefault();
                jk.views.addColumn({
                    username : ""
                });   
            });
            
            $(".js-start").on("click", this, function(e){
                e.preventDefault();
                jk.controller.run();
                
            });
            
            $(".js-dump").on("click", this, function(e){
                var _textFile = null,
                    //_data = new Blob([jk.vars.dump.data], {type: 'text/csv'});
                    _data = new Blob([jk.vars.dump.data], {type: 'text/plain'});
                    
                if (_textFile !== null) {
                  window.URL.revokeObjectURL(_textFile);
                }
                _textFile = window.URL.createObjectURL(_data);
                window.open(_textFile, '_blank');
            });
        }
    }
    return jk;
})(jQuery);
$(function () {
	
});