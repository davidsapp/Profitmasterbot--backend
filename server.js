// ============================================================
// ProfitMasterBot v6.4 - STAGE 7 FULL FIXED BACKEND
// ONE FILE DEPLOY READY (RAILWAY + MOBILE SAFE)
// ============================================================

const express = require("express");
const cors = require("cors");
const http = require("http");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// IMPORTANT: your index.html must be inside /public
app.use(express.static(path.join(__dirname, "public")));

// =========================
// BOT STATE
// =========================

const stateFile = path.join(__dirname, "botstate.json");

let botState = {
    running: false,
    balance: 1000,
    profit: 0,
    loss: 0,
    trades: 0
};

// load state if exists
if (fs.existsSync(stateFile)) {
    try {
        botState = JSON.parse(fs.readFileSync(stateFile));
    } catch (e) {
        console.log("⚠️ State load error, using default state");
    }
}

function saveState() {
    fs.writeFileSync(stateFile, JSON.stringify(botState, null, 2));
}

// =========================
// SSE CLIENTS
// =========================

let clients = [];

function broadcast(data) {
    const msg = `data: ${JSON.stringify(data)}\n\n`;
    clients.forEach(c => c.write(msg));
}

// =========================
// SSE ENDPOINT (FIXED FOR RAILWAY)
// =========================

app.get("/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // IMPORTANT FIX

    res.flushHeaders?.();

    clients.push(res);

    // initial connection message
    res.write(`data: ${JSON.stringify({
        type: "bot",
        status: botState.running ? "Running" : "Idle"
    })}\n\n`);

    res.write(`data: ${JSON.stringify({
        type: "stats",
        balance: botState.balance,
        profit: botState.profit,
        loss: botState.loss,
        trades: botState.trades
    })}\n\n`);

    req.on("close", () => {
        clients = clients.filter(c => c !== res);
    });
});

// =========================
// START BOT
// =========================

app.post("/start", (req, res) => {
    botState.running = true;
    saveState();

    broadcast({ type: "bot", status: "Running" });
    broadcast({ type: "log", message: "Bot started successfully" });

    res.json({ ok: true });
});

// =========================
// STOP BOT
// =========================

app.post("/stop", (req, res) => {
    botState.running = false;
    saveState();

    broadcast({ type: "bot", status: "Stopped" });
    broadcast({ type: "log", message: "Bot stopped" });

    res.json({ ok: true });
});

// =========================
// SIMULATED TRADING ENGINE
// =========================

setInterval(() => {
    if (!botState.running) return;

    const win = Math.random() > 0.5;
    const amount = +(Math.random() * 10).toFixed(2);

    if (win) {
        botState.balance += amount;
        botState.profit += amount;
        broadcast({ type: "log", message: `WIN +$${amount}` });
    } else {
        botState.balance -= amount;
        botState.loss += amount;
        broadcast({ type: "log", message: `LOSS -$${amount}` });
    }

    botState.trades += 1;
    saveState();

    broadcast({
        type: "stats",
        balance: botState.balance.toFixed(2),
        profit: botState.profit.toFixed(2),
        loss: botState.loss.toFixed(2),
        trades: botState.trades
    });

}, 5000);

// =========================
// HEARTBEAT (PREVENT DISCONNECT)
// =========================

setInterval(() => {
    broadcast({
        type: "log",
        message: "heartbeat: server active"
    });
}, 15000);

// =========================
// START SERVER
// =========================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("ProfitMasterBot v6.4 running on port", PORT);
});
