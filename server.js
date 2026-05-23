// ==============================
// ProfitMasterBot v6.4 - STABLE SSE VERSION
// ==============================

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

// ==============================
// STATE FILE
// ==============================
const STATE_FILE = path.join(__dirname, "botstate.json");

const defaultState = {
    botRunning: false,
    status: "IDLE",
    balance: 1000,
    lastTrade: null,
    profit: 0,
    trades: []
};

function loadState() {
    try {
        if (!fs.existsSync(STATE_FILE)) {
            fs.writeFileSync(STATE_FILE, JSON.stringify(defaultState, null, 2));
            return defaultState;
        }
        return JSON.parse(fs.readFileSync(STATE_FILE));
    } catch (e) {
        return defaultState;
    }
}

function saveState(state) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

let botState = loadState();

// ==============================
// SSE CLIENTS (SAFE MODE)
// ==============================
let clients = [];

// ==============================
// SAFE BROADCAST (NO CRASH)
// ==============================
function broadcast(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;

    clients.forEach(res => {
        try {
            res.write(message);
        } catch (err) {
            // remove broken client silently
            clients = clients.filter(c => c !== res);
        }
    });
}

// ==============================
// SSE ENDPOINT (FIXED FOR RAILWAY)
// ==============================
app.get("/events", (req, res) => {
    req.socket.setTimeout(0);
    req.socket.setNoDelay(true);
    req.socket.setKeepAlive(true);

    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "Access-Control-Allow-Origin": "*"
    });

    // initial connection event
    res.write(`data: ${JSON.stringify({
        type: "connection",
        status: "connected",
        botStatus: botState.status
    })}\n\n`);

    clients.push(res);

    // 🔥 HEARTBEAT (CRITICAL FIX FOR DISCONNECTION)
    const heartbeat = setInterval(() => {
        res.write(`data: ${JSON.stringify({
            type: "heartbeat",
            status: botState.status,
            botRunning: botState.botRunning,
            time: Date.now()
        })}\n\n`);
    }, 10000); // every 10 sec

    req.on("close", () => {
        clearInterval(heartbeat);
        clients = clients.filter(c => c !== res);
    });
});

// ==============================
// GET STATE
// ==============================
app.get("/state", (req, res) => {
    res.json(botState);
});

// ==============================
// START BOT
// ==============================
app.post("/bot/start", (req, res) => {
    botState.botRunning = true;
    botState.status = "RUNNING";
    saveState(botState);

    broadcast({ type: "status", status: "RUNNING" });

    res.json({ success: true });
});

// ==============================
// STOP BOT
// ==============================
app.post("/bot/stop", (req, res) => {
    botState.botRunning = false;
    botState.status = "STOPPED";
    saveState(botState);

    broadcast({ type: "status", status: "STOPPED" });

    res.json({ success: true });
});

// ==============================
// TRADE ENGINE (SIMULATED)
// ==============================
app.post("/trade", (req, res) => {
    const { pair, amount } = req.body;

    if (!botState.botRunning) {
        return res.json({ success: false, message: "Bot stopped" });
    }

    const win = Math.random() > 0.5;
    const profit = win ? amount * 0.8 : -amount;

    botState.balance += profit;
    botState.profit += profit;

    const trade = {
        pair,
        amount,
        result: win ? "WIN" : "LOSS",
        profit,
        time: new Date().toISOString()
    };

    botState.lastTrade = trade;
    botState.trades.push(trade);

    saveState(botState);

    broadcast({
        type: "trade",
        trade
    });

    res.json({ success: true, trade });
});

// ==============================
// AUTO STATUS ENGINE (FIXED)
// ==============================
setInterval(() => {
    if (botState.botRunning) {
        botState.status = "RUNNING";
    } else {
        botState.status = "IDLE";
    }

    broadcast({
        type: "heartbeat",
        status: botState.status,
        botRunning: botState.botRunning
    });

}, 5000);

// ==============================
// CLEANUP DEAD CLIENTS
// ==============================
setInterval(() => {
    clients = clients.filter(res => !res.destroyed);
}, 30000);

// ==============================
// START SERVER
// ==============================
app.listen(PORT, () => {
    console.log(`ProfitMasterBot running on port ${PORT}`);
});
