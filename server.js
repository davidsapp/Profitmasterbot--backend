// ============================================================
// PROFITMASTERBOT v6.2.0 — CLEAN RAILWAY SAFE VERSION
// Powered by David Maina · SmartLogic Technologies
// ============================================================

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const http = require("http");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ============================================================
// SAFE ERROR HANDLING
// ============================================================
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT ERROR:", err.message);
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION:", err?.message || err);
});

// ============================================================
// BASIC HEALTH CHECK (RAILWAY NEEDS THIS)
// ============================================================
app.get("/", (req, res) => {
  res.json({
    status: "online",
    app: "ProfitMasterBot",
    version: "6.2.0",
    owner: "David Maina"
  });
});

// ============================================================
// BOT STATE
// ============================================================
let botState = {
  running: false,
  capital: 0,
  strategy: "Scalping",
  dailyProfit: 0,
  totalProfit: 0,
  trades: []
};

// ============================================================
// SIMPLE AI MONITOR (SAFE VERSION)
// ============================================================
let aiMonitor = {
  score: 70,
  mood: "Neutral",
  lastUpdate: new Date().toISOString()
};

function updateAIMonitor() {
  try {
    aiMonitor.score = Math.floor(50 + Math.random() * 50);
    aiMonitor.mood =
      aiMonitor.score > 75 ? "Bullish" :
      aiMonitor.score > 50 ? "Neutral" : "Bearish";

    aiMonitor.lastUpdate = new Date().toISOString();

    console.log("AI updated:", aiMonitor.score);
  } catch (e) {
    console.log("AI monitor error:", e.message);
  }
}

setInterval(updateAIMonitor, 5 * 60 * 1000);

// ============================================================
// TRADE SIMULATION ENGINE (SAFE)
// ============================================================
function executeTrade() {
  if (!botState.running) return;

  const win = Math.random() > 0.4;
  const pnl = win ? Math.random() * 10 : -Math.random() * 8;

  botState.dailyProfit += pnl;
  botState.totalProfit += pnl;

  const trade = {
    id: Date.now(),
    result: win ? "WIN" : "LOSS",
    pnl: pnl.toFixed(2),
    strategy: botState.strategy,
    time: new Date().toISOString()
  };

  botState.trades.unshift(trade);
  if (botState.trades.length > 50) botState.trades.pop();

  console.log("TRADE:", trade.result, trade.pnl);
}

// run trade loop safely
setInterval(() => {
  try {
    executeTrade();
  } catch (e) {
    console.log("Trade error:", e.message);
  }
}, 30000);

// ============================================================
// BOT CONTROLS
// ============================================================

app.post("/bot/start", (req, res) => {
  botState.running = true;
  botState.capital = req.body.capital || 100;

  res.json({
    success: true,
    message: "Bot started",
    state: botState
  });
});

app.post("/bot/stop", (req, res) => {
  botState.running = false;

  res.json({
    success: true,
    message: "Bot stopped",
    state: botState
  });
});

// ============================================================
// STATUS ENDPOINT
// ============================================================
app.get("/bot/status", (req, res) => {
  res.json({
    running: botState.running,
    capital: botState.capital,
    strategy: botState.strategy,
    dailyProfit: botState.dailyProfit.toFixed(2),
    totalProfit: botState.totalProfit.toFixed(2),
    trades: botState.trades.slice(0, 10),
    ai: aiMonitor
  });
});

// ============================================================
// START SERVER (RAILWAY SAFE)
// ============================================================
server.listen(PORT, () => {
  console.log("====================================");
  console.log("ProfitMasterBot v6.2.0 RUNNING");
  console.log("PORT:", PORT);
  console.log("Owner: David Maina");
  console.log("====================================");
  updateAIMonitor();
});
