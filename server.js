// ============================================================
// PROFITMASTERBOT — RAILWAY STABLE SERVER (STAGE 5 FIX)
// ============================================================

const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// ==============================
// LOAD BOT STATE SAFELY
// ==============================
const STATE_FILE = path.join(__dirname, "botstate.json");

function loadState() {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      fs.writeFileSync(
        STATE_FILE,
        JSON.stringify({ balance: 100, trades: [], status: "idle" }, null, 2)
      );
    }
    return JSON.parse(fs.readFileSync(STATE_FILE));
  } catch (err) {
    console.log("State load error:", err);
    return { balance: 100, trades: [], status: "idle" };
  }
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.log("State save error:", err);
  }
}

// ==============================
// ROUTES
// ==============================

// Main dashboard
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Health check (Railway monitor)
app.get("/health", (req, res) => {
  res.json({ status: "OK", time: new Date() });
});

// Get bot state
app.get("/api/state", (req, res) => {
  const state = loadState();
  res.json(state);
});

// Update bot state
app.post("/api/state", (req, res) => {
  const current = loadState();
  const updated = { ...current, ...req.body };
  saveState(updated);
  res.json({ success: true, state: updated });
});

// Simulate trade update (for dashboard testing)
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

  if (trade.result === "win") {
    state.balance += trade.amount * 0.8;
  } else {
    state.balance -= trade.amount;
  }

  saveState(state);

  res.json({ success: true, trade, balance: state.balance });
});

// Start server
app.listen(PORT, () => {
  console.log("===================================");
  console.log(" ProfitMasterBot Server Running");
  console.log(" Port:", PORT);
  console.log("===================================");
});
