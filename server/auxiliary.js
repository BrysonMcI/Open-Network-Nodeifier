const dns = require('dns');

var sockets = new Set();
var dns_cache = {};
var hits = 0;

exports.checkIP = function(ip) {
    if (!ip) {
        return "unknown";
    }
    if (dns_cache[ip]) {
  //      console.log('rdns', ip, '->', dns_cache[ip])
        //sendUpdate('dns', {ip: ip, name: dns_cache[ip]});
        hits++;
    } else {
        dns.reverse(ip, (e,a) => {
            if (!e && a.length > 0 && a[0] && a[0] !== '') {
                dns_cache[ip] = a[0];
                // console.log('rdns', ip, '->', a[0]);
                sendUpdate('dns', {ip: ip, name: a[0]});
            } else {
//                console.log('rdns', ip, '->', 'unknown');
                return "unknown"
            }
        });
        return 'unfilled'
    }
}

exports.setSockets = function(s) {
    sockets = s;
    console.log('new webapp socket count', sockets.size);
}

// wrapper for sending custom event to all web clients
function sendUpdate(event, data) {
    var struct = {
        type: event,
        data: data
    }
    sockets.forEach(function(sock) {
        sock.send(JSON.stringify(struct));
    });
}
