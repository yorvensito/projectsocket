var WebSocketServer = require("ws").Server;
var http = require("http");
var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var port = process.env.PORT || 5001;



//carlos.ariza@safekeeping.com
//Carlos-200
//redislabs

/* var redis = require('redis');
var redisClient = redis.createClient({host : 'redis-13341.c1.us-west-2-2.ec2.cloud.redislabs.com', port : 13341}); */

/* redisClient.auth('43Fq9hT5c6MEP6B7QGsjyq9PDPVMQBEc',function(err,reply) {
	if(!err) {
		console.log("Bien: Verificando la seguridad del sistema redis "+reply+" "+ Date());
	}else{
		console.log('Mal: Configure la seguridad del sistema redis  con > redi-cli.exe CONFIG SET requirepass "800ca200" '+err+' '+Date());
	}
}); */
//redisClient.del("channelist_All",function(err,val){});

/* redisClient.on('ready',function() {
	console.log("Bien: Redis is ready... OK "+ Date());
});

redisClient.on('error',function() {
	console.log("Mal: Error in Redis "+Date());
});
 */
app.get('/', function(req, res) {
  res.send('{"status":"200"}');
});


var server = http.createServer(app);

server.listen(port);

console.log("http server listening on %d", port)

var wss = new WebSocketServer({server: server})

wss.options.maxPayload = 512 * 1024;
wss.options.server.timeout = 120000;
wss.options.server.keepAliveTimeout = 5000;

var tunneles = [];

wss.broadcast = function broadcast(data,channel) {
  wss.clients.forEach(function each(client) {
	if(client.channelTunnel == channel){
		console.log(Date(),"se fue a: "+client.id+" con data "+data);
		client.send(data);
	}
  });
};

function verifyToken(token, callback){
	var jwt = require('jsonwebtoken');
	jwt.verify(token, 'clWve-G*-9)1', function(err, decoded) {
		if(err){
			return callback([false,false]);
		}else{
			return callback([true,decoded]);
		}
	});
}

wss.on("connection", function(ws,req,hed) {
	
	var identy = "";

	if(req.rawHeaders.indexOf("Sec-Websocket-Key")>-1){
		identy = req.rawHeaders[req.rawHeaders.indexOf("Sec-Websocket-Key") + 1];
	}
	
	if(req.rawHeaders.indexOf("Sec-WebSocket-Key")>-1){
		identy = req.rawHeaders[req.rawHeaders.indexOf("Sec-WebSocket-Key") + 1];
	}
	
	if(req.rawHeaders.indexOf("sec-websocket-key")>-1){
		identy = req.rawHeaders[req.rawHeaders.indexOf("sec-websocket-key") + 1];
	}
	
	

	ws.id = identy;
	if(req.url.indexOf("/")>-1){
		let valores = req.url.split("/");
		if(valores.length==3){
			let token = valores[1];
			let channel = valores[2];
			verifyToken(token,function(value){
				if(value[0]!==false){
					
					ws.channelTunnel = channel;
					ws.on('message', function incoming(data) {
						
						console.log(Date(),"llego de: "+identy);
						console.log(Date(),"data es: "+data);
						console.log(Date(),"channel es: "+channel);
						
						try{
							var info = JSON.parse(data);
							
							if(info.type == "new"){
								
								redisClient.get("channelist_"+channel,function(err,val){
									if(val==null){
										redisClient.set("channelist_"+channel,JSON.stringify([{"id":info.data.id,"name":identy,"media":info.data.media,"channel":channel}]),function(err,val){
											wss.broadcast(JSON.stringify({"type":"peers","data":[{"id":info.data.id,"name":identy,"media":info.data.media,"channel":channel}]}),channel);
										});
									}else{
										var nuevo = JSON.parse(val);
										
										function filtro(valores){
											return valores.id == info.data.id;
										}
										var resul = nuevo.find(filtro);
										if(resul==undefined && val.indexOf(identy)==-1){
											nuevo.push({"id":info.data.id,"name":identy,"media":info.data.media,"channel":channel});
											redisClient.set("channelist_"+channel,JSON.stringify(nuevo),function(err,val){
												wss.broadcast(JSON.stringify({"type":"peers","data":nuevo}),channel);
											});
										}else{
											wss.broadcast(JSON.stringify({"type":"peers","data":nuevo}),channel);
										}
									}
								});
								
							}else{
								wss.broadcast(data,channel);
							}
						}catch(e){
							console.log(e);
						}
					});
					
				}
			})
		}
	}
})

	//ws://localhost:5001/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiNTc4MDkyZDhhMDE4NjBlMmVlOThjOWQ4MWM4NjA1ZTczNmRlZWI3NDczNWIzZDJjZDZhYmMwZGZhMzdiZTRlMCIsImlhdCI6MTYwMTc0OTk1MiwiZXhwIjoxNjA2OTMzOTUyfQ.JRQeuob-I83ZSMKEwyR0iqeykrdPeexZwTiSrnbl4hI