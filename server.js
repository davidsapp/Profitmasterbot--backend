const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

// ======================
// BOT STATE
// ======================
let botRunning = false;

// ======================
// WEB SOCKET CONNECTION
// ======================
wss.on("connection", (ws) => {

    console.log("Client connected");

    // send initial state immediately
    ws.send(JSON.stringify({ running: botRunning }));

    ws.on("close", () => {
        console.log("Client disconnected");
    });
});

// broadcast helper
function broadcast(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
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
// START SERVER (IMPORTANT)
// ======================
server.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
