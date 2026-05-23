const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);

// IMPORTANT: keepAlive for Railway stability
server.keepAliveTimeout = 61000;
server.headersTimeout = 62000;

const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

// ======================
// BOT STATE
// ======================
let botRunning = false;

// ======================
// WEB SOCKET HEARTBEAT
// ======================
function heartbeat() {
    this.isAlive = true;
}

// ======================
// CONNECTION HANDLING
// ======================
wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.isAlive = true;
    ws.on("pong", heartbeat);

    // send initial state
    ws.send(JSON.stringify({ running: botRunning }));

    ws.on("close", () => {
        console.log("Client disconnected");
    });
});

// cleanup dead connections every 30s
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            console.log("Terminating dead client");
            return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

// stop interval if server closes
wss.on("close", () => {
    clearInterval(interval);
});

// ======================
// BROADCAST FUNCTION
// ======================
function broadcast(data) {
    const message = JSON.stringify(data);

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(message);
            } catch (err) {
                console.log("Broadcast error:", err.message);
            }
        }
    });
}

// ======================
// API ROUTES
// ======================
app.post("/start", (req, res) => {
    botRunning = true;
    broadcast({ running: true });
    res.json({ success: true, running: true });
});

app.post("/stop", (req, res) => {
    botRunning = false;
    broadcast({ running: false });
    res.json({ success: true, running: false });
});

// ======================
// HEALTH CHECK
// ======================
app.get("/", (req, res) => {
    res.send("ProfitMasterBot WebSocket Server Running");
});

// ======================
// START SERVER
// ======================
server.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
