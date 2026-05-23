// ==============================
// ProfitMasterBot v6.4 - FINAL WEBSOCKET STABLE VERSION
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
    lastSignal: null,
    connectedClients: 0
};

// Load state safely
function loadState() {
    try {
        if (!fs.existsSync(STATE_FILE)) {
            fs.writeFileSync(STATE_FILE, JSON.stringify(defaultState, null, 2));
            return defaultState;
        }
        return JSON.parse(fs.readFileSync(STATE_FILE));
    } catch (err) {
        return defaultState;
    }
}

// Save state safely
function saveState(state) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

let state = loadState();

// ==============================
// WEBSOCKET CONNECTION HANDLER
// ==============================
wss.on("connection", (ws) => {
    state.connectedClients = wss.clients.size;

    // send initial state
    ws.send(JSON.stringify({
        type: "init",
        state
    }));

    broadcast({
        type: "status",
        message: "Client connected",
        clients: state.connectedClients
    });

    ws.on("close", () => {
        state.connectedClients = wss.clients.size;

        broadcast({
            type: "status",
            message: "Client disconnected",
            clients: state.connectedClients
        });
    });
});

// ==============================
// CRITICAL RAILWAY WEB SOCKET FIX
// ==============================
server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
    });
});

// ==============================
// BROADCAST FUNCTION
// ==============================
function broadcast(data) {
    const msg = JSON.stringify(data);

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

// ==============================
// HEARTBEAT (prevents disconnect)
// ==============================
setInterval(() => {
    broadcast({
        type: "heartbeat",
        time: Date.now(),
        clients: state.connectedClients
    });
}, 15000);

// ==============================
// BOT SIMULATION LOOP
// ==============================
setInterval(() => {
    if (!state.botRunning) return;

    const profit = (Math.random() - 0.45) * 12;
    state.balance += profit;

    const trade = {
        time: new Date().toISOString(),
        profit: profit.toFixed(2),
        balance: state.balance.toFixed(2)
    };

    state.trades.push(trade);
    if (state.trades.length > 50) state.trades.shift();

    saveState(state);

    broadcast({
        type: "trade_update",
        trade,
        balance: state.balance
    });

}, 5000);

// ==============================
// API ROUTES
// ==============================
app.get("/state", (req, res) => {
    res.json(state);
});

app.post("/start", (req, res) => {
    state.botRunning = true;
    saveState(state);

    broadcast({
        type: "status",
        message: "Bot Started"
    });

    res.json({ success: true });
});

app.post("/stop", (req, res) => {
    state.botRunning = false;
    saveState(state);

    broadcast({
        type: "status",
        message: "Bot Stopped"
    });

    res.json({ success: true });
});

// ==============================
// START SERVER
// ==============================
server.listen(PORT, () => {
    console.log("ProfitMasterBot WebSocket server running on port " + PORT);
});
