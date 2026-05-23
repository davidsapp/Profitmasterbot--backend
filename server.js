// ==============================
// ProfitMasterBot v6.4 - WEBSOCKET VERSION (STAGE 7)
// ==============================

const express = require("express");
const fs = require("fs");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// ==============================
// MIDDLEWARE
// ==============================
app.use(express.json());
app.use(express.static("public"));

// ==============================
// STATE FILE
// ==============================
const STATE_FILE = path.join(__dirname, "botstate.json");

const defaultState = {
    botRunning: false,
    balance: 1000,
    trades: [],
    profit: 0,
    lastUpdate: new Date().toISOString()
};

// Load state
function loadState() {
    try {
        if (!fs.existsSync(STATE_FILE)) {
            fs.writeFileSync(STATE_FILE, JSON.stringify(defaultState, null, 2));
        }
        return JSON.parse(fs.readFileSync(STATE_FILE));
    } catch (err) {
        return defaultState;
    }
}

// Save state
function saveState(state) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

let state = loadState();

// ==============================
// WEBSOCKET CLIENTS
// ==============================
let clients = [];

// Broadcast to all WebSocket clients
function broadcast(data) {
    const message = JSON.stringify(data);

    clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
        }
    });
}

// ==============================
// WEBSOCKET CONNECTION
// ==============================
wss.on("connection", (ws) => {
    clients.push(ws);

    // Send initial state immediately
    ws.send(JSON.stringify({
        type: "init",
        state
    }));

    ws.on("close", () => {
        clients = clients.filter(c => c !== ws);
    });
});

// ==============================
// API ROUTES
// ==============================

// Get state
app.get("/state", (req, res) => {
    res.json(state);
});

// Start bot
app.post("/start", (req, res) => {
    state.botRunning = true;
    state.lastUpdate = new Date().toISOString();

    saveState(state);
    broadcast({ type: "update", state });

    res.json({ success: true, message: "Bot started" });
});

// Stop bot
app.post("/stop", (req, res) => {
    state.botRunning = false;
    state.lastUpdate = new Date().toISOString();

    saveState(state);
    broadcast({ type: "update", state });

    res.json({ success: true, message: "Bot stopped" });
});

// Trade simulation
app.post("/trade", (req, res) => {
    const amount = req.body.amount || 10;

    const profit = Math.random() > 0.5 ? amount * 0.9 : -amount;

    state.balance += profit;
    state.profit += profit;

    state.trades.push({
        time: new Date().toISOString(),
        amount,
        result: profit
    });

    state.lastUpdate = new Date().toISOString();

    saveState(state);
    broadcast({ type: "update", state });

    res.json({ success: true, profit });
});

// ==============================
// HEARTBEAT (WebSocket keep-alive)
// ==============================
setInterval(() => {
    broadcast({
        type: "heartbeat",
        time: new Date().toISOString()
    });
}, 15000);

// ==============================
// START SERVER
// ==============================
server.listen(PORT, () => {
    console.log(`ProfitMasterBot WebSocket running on port ${PORT}`);
});
