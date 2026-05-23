const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

let botRunning = false;

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
    ws.send(JSON.stringify({
        type: "init",
        running: botRunning
    }));
});

function broadcast(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

app.post("/start", (req, res) => {
    botRunning = true;

    broadcast({
        type: "status",
        running: true
    });

    res.json({ success: true });
});

app.post("/stop", (req, res) => {
    botRunning = false;

    broadcast({
        type: "status",
        running: false
    });

    res.json({ success: true });
});

app.get("/status", (req, res) => {
    res.json({ running: botRunning });
});

server.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port", PORT);
});
