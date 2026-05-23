const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT;

app.use(express.json());
app.use(express.static("public"));

let botRunning = false;

// ======================
// WEBSOCKET
// ======================
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
    console.log("WS connected");

    ws.send(JSON.stringify({
        type: "init",
        running: botRunning
    }));
});

// ======================
// BROADCAST
// ======================
function broadcast(data) {
    const msg = JSON.stringify(data);

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

// ======================
// API
// ======================
app.post("/start", (req, res) => {
    botRunning = true;
    broadcast({ type: "status", running: true });
    res.json({ ok: true });
});

app.post("/stop", (req, res) => {
    botRunning = false;
    broadcast({ type: "status", running: false });
    res.json({ ok: true });
});

app.get("/status", (req, res) => {
    res.json({ running: botRunning });
});

// ======================
// START SERVER
// ======================
server.listen(PORT, "0.0.0.0", () => {
    console.log("Server running");
});
