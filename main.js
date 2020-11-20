var WebSocketServer = require("ws").Server,
  http = require("http"),
  express = require("express"),
  app = express(),
  port = 5001;

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

wss.broadcast = function broadcast(data, channel, id) {
  if (channel === null) {
    wss.clients.forEach(function each(client) {
      client.send(data);
    });
  } else {
    wss.clients.forEach(function each(client) {
      if (client.channelTunnel == channel && client.id !== id) {
        console.log(Date(), "se fue a: " + client.id + " con data " + data);
        client.send(data);
      }
    });
  }
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
wss.list = [];
wss.on("connection", function (ws, req, hed) {
  var identy = "";

  if (req.rawHeaders.indexOf("Sec-Websocket-Key") > -1) {
    identy = req.rawHeaders[req.rawHeaders.indexOf("Sec-Websocket-Key") + 1];
  }

  if (req.rawHeaders.indexOf("Sec-WebSocket-Key") > -1) {
    identy = req.rawHeaders[req.rawHeaders.indexOf("Sec-WebSocket-Key") + 1];
  }

  if (req.rawHeaders.indexOf("sec-websocket-key") > -1) {
    identy = req.rawHeaders[req.rawHeaders.indexOf("sec-websocket-key") + 1];
  }

  ws.id = identy;
  if (req.url.indexOf("/") > -1) {
    let valores = req.url.split("/");
    if (valores.length == 4 || valores.length == 3) {
      let token = valores[1];
      let user_id = valores[2];
      ws.id_user = user_id;
      //   validar el usuario en la api
      verifyToken(user_id, token, function (result) {
        console.log(result);
        if (result[0] === true) {
          if (/^[a-zA-Z0-9]{40}$/.test(token) === true) {
            if (valores[3] !== undefined) {
              let channel = valores[3];
              //verifyToken(token, function (value) {
              //if (value[0] !== false) {
              ws.channelTunnel = channel;
              ws.on("message", function incoming(data) {
                console.log(Date(), "llego de: " + identy);
                console.log(Date(), "data es: " + data);
                console.log(Date(), "channel es: " + channel);

                console.log("es este ", wss.list);

                try {
                  let info = JSON.parse(data);
                  if (info.reconnect == true) {
                    //{"reconnect":true}
                    function filtro(valores) {
                      return valores.channel == channel;
                    }
                    let result = wss.list.find(filtro);
                    if (result !== undefined) {
                      if (result.from.indexOf(user_id) == -1) {
                        ws.send(
                          JSON.stringify({
                            confirm: true,
                            operations: result.data,
                          })
                        );
                      } else {
                        ws.send(JSON.stringify({ confirm: true }));
                      }
                    }
                  } else if (info.response == true) {
                    //{"response":true}
                    wss.list.find(function filtro(valores, index) {
                      if (valores.channel == channel) {
                        wss.list[index].from.push(user_id);
                        console.log(wss.list[index].from);
                        if (wss.list[index].from.length == 3) {
                          wss.list.splice(index, 1);
                        }
                        ws.send(JSON.stringify({ confirm: true }));
                      }
                    });
                  } else if (info.datas == true) {
                    //{"datas":true,"info":{"x":"y"}}
                    wss.list.push({
                      channel: channel,
                      data: info.info,
                      from: [user_id],
                    });
                    ws.send(JSON.stringify({ confirm: true }));
                    wss.broadcast(data, channel, identy);
                  }
                } catch (e) {
                  ws.send(JSON.stringify({ error: "not json" }));
                }
              });
            } else {
              ws.on("message", function incoming(data) {
                try {
                  let info = JSON.parse(data); // {"order":true,"id":"123456","type":"2", "order_id": 123555}
                  if (info.order == true) {
                    //el partner = 123456 y si es mi id uso el order como channel
                    wss.broadcast(data, null, identy);
                  }
                } catch (e) {
                  ws.send(JSON.stringify({ error: "not json" }));
                }
              });
            }
          }
        }
      });
    }
  }
});
