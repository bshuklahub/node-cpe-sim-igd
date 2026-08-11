import { SocksClient } from 'socks';
import { Socket } from 'net';

const options = {
    proxy: {
        // IPv4, IPv6, or hostname
        host: '127.0.0.1',
        port: 8990,
        type: 5, // SOCKS v4, v4a, v5, and v5h are supported
        // Optional: userId and password for authentication
        // userId: 'username',
        // password: 'password'
    },
    command: 'connect', // Establish a direct TCP tunnel
    destination: {
        host: '10.190.23.233',
        port: 9990
    }
};

async function startTcpConnection() {
    try {
        // createConnection returns a Promise resolving to SocksClientEstablishedEvent
        const info = await SocksClient.createConnection(options);

        // info.socket is a standard Node.js net.Socket instance
        const socket = info.socket;
        console.log('Connected to target via SOCKS proxy');

        // Example: Sending a basic HTTP request over raw TCP
        socket.write('GET / HTTP/1.1\r\nHost: example.com\r\nConnection: close\r\n\r\n');

        socket.on('data', (data) => {
            console.log('Received data:', data.toString());
        });

        socket.on('error', (err) => {
            console.error('Socket error:', err.message);
        });

        // Required: sockets are paused right before the connection is established
        socket.resume();
    } catch (err) {
        console.error('Failed to establish proxy connection:', err);
    }
}

startTcpConnection();
