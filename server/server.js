const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const url = require('url');

const rules = require('./rules');
const aux = require('./auxiliary');

const MAX_PACKETS = 100;

const app = express();
const server = http.createServer(app);
const wss_agents = new WebSocket.Server({noServer: true});
const wss_webapp = new WebSocket.Server({noServer: true});

app.use(express.static(__dirname +'/public'))

var packets = [];
// can eventually just use the clients attribute of the wss (and .forEach)
var sockets = new Set();

app.get('/', function(req, res) {
    res.sendFile(__dirname+'/public/index.html');
 });

app.get('/packets', function(req, res) {
    res.send(packets);
});

app.get('/dns', aux.sendDNSTable);

server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url).pathname;
    /* WebSocket code for the deployed agents */
    if(pathname === '/ws/agents') {
        wss_agents.handleUpgrade(request, socket, head, (ws) => {
            wss_agents.emit('connection', ws);
            console.log("agent connection opened, total agents:", wss_agents.clients.size);
            ws.on('message', function(data){
                data = JSON.parse(data);

                // apply rules to packet
                rules.processPacket(data);
                
                // apply any auxiliary processing
                aux.checkIP(data.ip.src);
                aux.checkIP(data.ip.dst);
                
                var struct = {
                    type: 'traffic',
                    data: data
                }
                data = JSON.stringify(struct);
                // send the data to everyone
                packets.push(data);
                // keep the list at most recent MAX_PACKETS
                if (packets.length > MAX_PACKETS) {
                    packets.shift()
                }
                for(let item of sockets){
                    item.send(data);
                }
            });
            ws.onclose = function() {
                console.log("agent connection closed, total agents:", wss_agents.clients.size);
            }
        });
    /* WebSocket code for the webapp clients */
    } else if(pathname === '/ws/webapp') {
        wss_webapp.handleUpgrade(request, socket, head, (ws) => {
            wss_webapp.emit('connection', ws);
            console.log("webapp connection opened, total webapps:", wss_webapp.clients.size);
            for(let item of packets) {
                ws.send(item);
            }
            sockets.add(ws);
            aux.setSockets(sockets);
            ws.on('message', function(data) {
                console.log('webapp', data);
            })
            ws.onclose = function(evt) {
                sockets.delete(evt.target);
                aux.setSockets(sockets);
                console.log("webapp connection closed, total webapps:", wss_webapp.clients.size);
            }
        });
    } else {
        socket.destroy();
    }
});

server.listen(8000, function listening() {
    console.log('listening on 8000');
});
