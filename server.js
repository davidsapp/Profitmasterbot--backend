const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

// IMPORTANT: Railway uses this port
const PORT = process.env.PORT;

app.use(express.json());
app.use(express.static("public"));

// ======================
// BOT STATE
// ======================
let botRunning = false;

// ======================
// WEBSOCKET SERVER (ATTACHED TO SAME HTTP SERVER)
// ======================
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    // send initial state
    ws.send(JSON.stringify({
        type: "init",
        running: botRunning
    }));

    ws.on("message", (msg) => {
        try {
            const data = JSON.parse(msg);

            if (data.type === "ping") {
                ws.send(JSON.stringify({ type: "pong" }));
            }
        } catch (e) {}
    });
});

// ======================
// BROADCAST FUNCTION
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
// START BOT
// ======================
app.post("/start", (req, res) => {
    botRunning = true;

    broadcast({
        type: "status",
        running: true
    });

    res.json({ ok: true, running: true });
});

// ======================
// STOP BOT
// ======================
app.post("/stop", (req, res) => {
    botRunning = false;

    broadcast({
        type: "status",
        running: false
    });

    res.json({ ok: true, running: false });
});

// ======================
// STATUS CHECK
// ======================
app.get("/status", (req, res) => {
    res.json({
        running: botRunning,
        time: Date.now()
    });
});

// ======================
// TEST ROUTE
// ======================
app.get("/test", (req, res) => {
    res.json({
        ok: true,
        message: "Server running"
    });
});

// ======================
// START SERVER (CRITICAL FIX)
// ======================
server.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port", PORT);
});
