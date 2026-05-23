// ==============================
// ProfitMasterBot v6.4
// STABLE WEBSOCKET VERSION
// ==============================

const express = require("express");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

// ==============================
// WEBSOCKET SERVER
// ==============================

const wss = new WebSocket.Server({ server });

// ==============================
// BOT STATE
// ==============================

let botState = {
    running: false
};

// ==============================
// MIDDLEWARE
// ==============================

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ==============================
// BROADCAST FUNCTION
// ==============================

function broadcastState() {

    const data = JSON.stringify(botState);

    wss.clients.forEach(client => {

        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }

    });

}

// ==============================
// WEBSOCKET CONNECTION
// ==============================

wss.on("connection", (ws) => {

    console.log("Client connected");

    ws.send(JSON.stringify(botState));

    ws.on("close", () => {
        console.log("Client disconnected");
    });

});

// ==============================
// ROUTES
// ==============================

app.get("/status", (req, res) => {
    res.json(botState);
});

app.post("/start", (req, res) => {

    botState.running = true;

    broadcastState();

    console.log("Bot started");

    res.json({
        success: true,
        running: true
    });

});

app.post("/stop", (req, res) => {

    botState.running = false;

    broadcastState();

    console.log("Bot stopped");

    res.json({
        success: true,
        running: false
    });

});

// ==============================
// DEFAULT ROUTE
// ==============================

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==============================
// START SERVER
// ==============================

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
