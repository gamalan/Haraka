'use strict';

const utils        = require('haraka-utils');

const sock         = require('../line_socket');
const logger       = require('../logger');

const obc          = require('./config');

function _create_socket (name, port, host, local_addr, is_unix_socket, callback) {

    const socket = is_unix_socket ? sock.connect({path: host}) : sock.connect({port, host, localAddress: local_addr});
    socket.name = name;
    socket.__uuid = utils.uuid();
    socket.setTimeout(obc.cfg.connect_timeout * 1000);
    logger.logdebug(`[outbound] created. host: ${host} port: ${port}`, { uuid: socket.__uuid });
    socket.once('connect', () => {
        socket.removeAllListeners('error'); // these get added after callback
        socket.removeAllListeners('timeout');
        callback(null, socket);
    });
    socket.once('error', err => {
        socket.end();
        socket.removeAllListeners();
        socket.destroy();
        callback(`Outbound connection error: ${err}`, null);
    });
    socket.once('timeout', () => {
        socket.end();
        socket.removeAllListeners();
        socket.destroy();
        callback(`Outbound connection timed out to ${host}:${port}`, null);
    });
}


// Get a socket for the given attributes.
exports.get_client = (port, host, local_addr, is_unix_socket, callback) => {

    port = port || 25;
    host = host || 'localhost';
    const name = `outbound::${port}:${host}:${local_addr}`;

    return _create_socket(name, port, host, local_addr, is_unix_socket, callback)
}

exports.release_client = (socket, port, host, local_addr, error) => {
    logger.logdebug(`[outbound] release_client: ${socket.__uuid} ${host}:${port} to ${local_addr}`);
    socket.removeAllListeners();
    socket.destroy();
}
