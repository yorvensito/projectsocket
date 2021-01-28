var WebSocketServer = require("ws").Server,
    http = require("http"),
    express = require("express"),
    app = express(),
    port = 21000;

const axios = require("axios");
const { json } = require("body-parser");
const { response } = require("express");

app.get("/", function (req, res) {
    res.send('{"status":"200"}');
});

var server = http.createServer(app);

server.listen(port);

console.log("http server listening on %d", port);
var wss = new WebSocketServer({ server: server });

wss.options.maxPayload = 64 * 1024;
wss.options.server.timeout = 120000;
wss.options.server.keepAliveTimeout = 5000;

wss.broadcast = function broadcast(data,arraydetodos) {
    wss.clients.forEach(function each(client) {
        console.log("El id del cliente es :", client.id);
        console.log("El array de todos es :", arraydetodos);
        // console.log(arraydetodos.indexOf(client.id));
        if (arraydetodos.includes(parseInt(client.id))){
            client.send(data);
            console.log("envie esta data ",data," a ",client.id );
        }
    });
};

async function verifyToken(id_usuario, token, callback) {
    try {
        const res = await axios({
            method: "POST",
            url:
                "https://dev.totalkme.com:26000/api/v1/core/usuarios/validate/token/socket/",
            data: {
                id_usuario: id_usuario,
                token: token,
            },
        }).then((response) => response.data);
        return callback([true, res]);
    } catch (error) {
        return callback([false, error]);
    }
}

wss.on("connection", function (ws, req, hed) {
    var identy = "";

    if (req.url.indexOf("/") > -1) {
        let valores = req.url
            .split("/");
        if (valores.length == 3) {
            let id = valores[1];
            let token = valores[2];
            ws.id = id;

            console.log("Mi id es",ws.id);
            // console.log("El tipo de is es ", typeof ws.id);

            //   validar el usuario en la api
            verifyToken(ws.id, token, function (result) {
                if (result[0] === true) {
                    if (/^[a-zA-Z0-9]{40}$/.test(token) === true) {

                        ws.on("message", function incoming(data) {
                            console.log(Date(), "llego de: " + ws.id);
                            console.log(Date(), "data es: " + data);
                            
                            //try{
                                var datos = JSON.parse(data);
                                if(datos.status==1){ //voy a notificar a parnert {"status":1,"arraysdeparnet":[123456789,987654309],"info":""}
                                    wss.broadcast(JSON.stringify({"status":2}),datos.arraysdeparnet);
                                }else if(datos.status==3){// voy a enviar de uno a uno  {"status":3,"arraysdeparnet":[00012154],"info":""}
                                    wss.broadcast(JSON.stringify({"status":4}),datos.arraysdeparnet);
                                }else if(datos.status==6){//envio para saber mi id
                                    ws.send(JSON.stringify({"status":5,"id":ws.id}));
                                }
                            //}catch(e){
                            //    console.log(e);
                            //}

                        });


                    }
                }
            });

        }
    }
});
