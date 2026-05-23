// ============================================================
// PROFITMASTERBOT — FULL STABLE SERVER (STAGE 5 + STAGE 6)
// LIVE DASHBOARD + RAILWAY SAFE VERSION
// ============================================================

const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================
// MIDDLEWARE
// ==============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// ==============================
// STATE FILE SETUP
// ==============================
const STATE_FILE = path.join(__dirname, "botstate.json");

// ==============================
// LOAD STATE
// ==============================
function loadState() {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      fs.writeFileSync(
        STATE_FILE,
        JSON.stringify(
          { balance: 100, trades: [], status: "idle", lastUpdate: new Date().toISOString() },
          null,
          2
        )
      );
    }
    return JSON.parse(fs.readFileSync(STATE_FILE));
  } catch (err) {
    console.log("State load error:", err);
    return { balance: 100, trades: [], status: "idle" };
  }
}

// ==============================
// SAVE STATE
// ==============================
function saveState(state) {
  try {
    state.lastUpdate = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.log("State save error:", err);
  }
}

// ==============================
// LIVE CLIENTS (SSE)
// ==============================
let liveClients = [];

// Broadcast updates to all dashboards
function broadcast(data) {
  liveClients.forEach(client => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

// ==============================
// ROUTES
// ==============================

// Main dashboard
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Health check (Railway monitoring)
app.get("/health", (req, res) => {
  res.json({ status: "OK", time: new Date().toISOString() });
});

// ==============================
// LIVE STREAM (REAL-TIME)
// ==============================
app.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write("data: connected\n\n");

  liveClients.push(res);

  req.on("close", () => {
    liveClients = liveClients.filter(c => c !== res);
  });
});

// ==============================
// GET STATE
// ==============================
app.get("/api/state", (req, res) => {
  const state = loadState();
  res.json(state);
});

// ==============================
// UPDATE STATE
// ==============================
app.post("/api/state", (req, res) => {
  const current = loadState();
  const updated = { ...current, ...req.body };

  saveState(updated);

  broadcast({
    type: "state_update",
    state: updated
  });

  res.json({ success: true, state: updated });
});

// ==============================
// SIMULATE TRADE (LIVE UPDATE)
// ==============================
app.post("/api/trade", (req, res) => {
  const state = loadState();

  const trade = {
    id: Date.now(),
    pair: req.body.pair || "BTC/USDT",
    result: req.body.result || "win",
    amount: req.body.amount || 10,
    time: new Date().toISOString()
  };

  state.trades.push(trade);

  // Balance logic
  if (trade.result === "win") {
    state.balance += trade.amount * 0.8;
  } else {
    state.balance -= trade.amount;
  }

  saveState(state);

  // LIVE PUSH TO FRONTEND
  broadcast({
    type: "trade_update",
    state
  });

  res.json({
    success: true,
    trade,
    state
  });
});

// ==============================
// START SERVER
// ==============================
app.listen(PORT, () => {
  console.log("===================================");
  console.log(" ProfitMasterBot LIVE SERVER");
  console.log(" Port:", PORT);
  console.log(" Status: RUNNING");
  console.log("===================================");
});
