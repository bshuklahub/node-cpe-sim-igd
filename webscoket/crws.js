import WebSocket from 'ws';
import { SocksProxyAgent } from 'socks-proxy-agent';

//const WS_URL = 'ws://localhost:9990/ws/chat';
//This is lab
const WS_URL = 'ws://127.0.0.1:9991/ws/chat';
//This is for local setup
//const WS_URL = 'ws://localhost:9990/ws/chat';
//const proxyUrl = 'socks4://127.0.0.1:8990';
//const agent = new SocksProxyAgent(proxyUrl);
//const socket = new WebSocket(WS_URL, { agent });
const socket = new WebSocket(WS_URL);
//const code = JSON.parse(`{"eventCode":"7 CONNECTION REQUEST"}`);
const datadataToSend = { eventCode: '7 CONNECTION REQUEST', role: 'Developer' };
//console.log(datadataToSend);
if (sendCRWSMessage()) {
    console.log("CRWS Message Sent Successfully");
    process.exit(0);
} else {
    console.log("CRWS Message Sending Failed");
}
socket.on('open', () => {
    console.log('Connected to BRUM WebSocket Server');
});
//set DEBUG=socks-proxy-agent,socket.io*,engine*

socket.on('message', async (data) => {
    try {
        const rawData = data.toString();
        console.log(`Valid Backup Received. ID: ${rawData}`);
        //Now send the 

        console.log(datadataToSend);
        const res = await fetch("http://localhost:8080/api/simulation/inform", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datadataToSend),

        });
        console.log(res.status);

    } catch (err) {
        console.error('Failed to parse message:', err);
    }
});

socket.on('error', (err) => console.error('WS Error:', err));

async function sendCRWSMessage() {

    const res = await fetch("http://localhost:5000/api/simulation/inform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datadataToSend),

    });
    console.log(res.status);
    return true;
}