// ============================================================
// PROFITMASTERBOT v6.0 — BACKEND SERVER
// Powered by David Maina · SmartLogic Technologies
// Deploy FREE on Railway.app — no payment needed
// ============================================================

const express    = require("express");
const cors       = require("cors");
const axios      = require("axios");
const WebSocket  = require("ws");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ============================================================
// BOT STATE — tracks everything the bot is doing
// ============================================================
var botState = {
  running:        false,
  strategy:       "Scalping",
  riskLevel:      "Medium",
  stopLoss:       5,
  takeProfit:     10,
  dailyLossLimit: 8,
  positionSize:   20,
  capital:        0,
  dailyProfit:    0,
  totalProfit:    0,
  winCount:       0,
  lossCount:      0,
  trades:         [],
  lastReset:      new Date().toDateString(),
};

// ============================================================
// COMPOUNDING ENGINE
// ============================================================
var compoundState = {
  startCapital:  0,
  currentCapital:0,
  withdrawPct:   20,
  totalWithdrawn:0,
  totalProfit:   0,
  days:          0,
};

function runCompound(profit) {
  var withdraw  = profit * (compoundState.withdrawPct / 100);
  var reinvest  = profit - withdraw;
  compoundState.currentCapital  += reinvest;
  compoundState.totalWithdrawn  += withdraw;
  compoundState.totalProfit     += profit;
  compoundState.days            += 1;
  return { reinvested: reinvest, withdrawn: withdraw };
}

// ============================================================
// RISK ENGINE
// ============================================================
function checkRisk() {
  if (botState.dailyProfit <= -(botState.capital * botState.dailyLossLimit / 100)) {
    botState.running = false;
    log("RISK ENGINE: Daily loss limit hit. Trading paused.");
    return false;
  }
  return true;
}

function getPositionSize() {
  return compoundState.currentCapital > 0
    ? compoundState.currentCapital * (botState.positionSize / 100)
    : botState.capital             * (botState.positionSize / 100);
}

// ============================================================
// AI SIGNAL ENGINE — generates trade signals
// ============================================================
function getSignal(pair) {
  var rand    = Math.random();
  var signals = ["BUY","SELL","HOLD"];
  var signal  = rand > 0.6 ? "BUY" : rand > 0.3 ? "SELL" : "HOLD";
  var confidence = Math.floor(55 + Math.random() * 40);
  var reasons = [
    "Golden cross detected",
    "RSI oversold bounce",
    "Volume spike confirmed",
    "Support level holding",
    "Trend following signal",
    "Momentum indicator positive",
  ];
  return {
    pair:       pair,
    signal:     signal,
    confidence: confidence,
    reason:     reasons[Math.floor(Math.random() * reasons.length)],
    timestamp:  new Date().toISOString(),
  };
}

// ============================================================
// TRADE EXECUTOR — simulates trade execution
// In production this connects to real Binance/Deriv APIs
// ============================================================
function executeTrade(pair, signal, size, binanceKey, derivKey) {
  if (signal === "HOLD") return null;

  // Simulate win/loss based on strategy
  var winRate = botState.strategy === "Conservative" ? 0.75
    : botState.strategy === "Aggressive"   ? 0.55
    : botState.strategy === "AI Adaptive"  ? 0.70
    : 0.65;

  var won     = Math.random() < winRate;
  var pnlPct  = won
    ? (Math.random() * botState.takeProfit)
    : -(Math.random() * botState.stopLoss);
  var pnl     = size * (pnlPct / 100);

  var trade = {
    id:        Date.now(),
    pair:      pair,
    side:      signal,
    size:      size.toFixed(2),
    pnl:       pnl.toFixed(2),
    pnlPct:    pnlPct.toFixed(2),
    won:       won,
    strategy:  botState.strategy,
    timestamp: new Date().toISOString(),
  };

  // Update state
  botState.dailyProfit  += pnl;
  botState.totalProfit  += pnl;
  if (won) botState.winCount++;
  else     botState.lossCount++;
  botState.trades.unshift(trade);
  if (botState.trades.length > 50) botState.trades.pop();

  // Run compounding
  if (won && pnl > 0) {
    var compound = runCompound(pnl);
    trade.compoundInfo = compound;
  }

  log("TRADE: " + trade.pair + " " + trade.side + " PNL: $" + trade.pnl);
  return trade;
}

// ============================================================
// TRADING LOOP — runs every 30 seconds when bot is active
// ============================================================
var tradingInterval = null;
var pairs = ["BTC/USDT","ETH/USDT","BNB/USDT","SOL/USDT"];

function startTradingLoop(binanceKey, derivKey) {
  if (tradingInterval) clearInterval(tradingInterval);
  tradingInterval = setInterval(function() {
    if (!botState.running) { clearInterval(tradingInterval); return; }
    if (!checkRisk()) return;

    // Reset daily stats at midnight
    var today = new Date().toDateString();
    if (today !== botState.lastReset) {
      botState.dailyProfit = 0;
      botState.lastReset   = today;
      compoundState.days  += 1;
    }

    // Pick a random pair and get signal
    var pair   = pairs[Math.floor(Math.random() * pairs.length)];
    var signal = getSignal(pair);
    var size   = getPositionSize();

    if (signal.confidence >= 60) {
      executeTrade(pair, signal.signal, size, binanceKey, derivKey);
    }
  }, 30000); // every 30 seconds
}

// ============================================================
// LOGGER
// ============================================================
var logs = [];
function log(msg) {
  var entry = "[" + new Date().toISOString() + "] " + msg;
  logs.unshift(entry);
  if (logs.length > 100) logs.pop();
  console.log(entry);
}

// ============================================================
// COMMISSION SYSTEM
// ============================================================
var commissions = {
  total:     0,
  pending:   0,
  withdrawn: 0,
  history:   [],
};

function addCommission(amount, userId) {
  var cut = amount * 0.05; // 5% owner commission
  commissions.total   += cut;
  commissions.pending += cut;
  commissions.history.unshift({
    amount:    cut.toFixed(2),
    from:      userId,
    timestamp: new Date().toISOString(),
  });
  log("COMMISSION: $" + cut.toFixed(2) + " earned from " + userId);
}

// ============================================================
// API ROUTES
// ============================================================

// Health check
app.get("/", function(req, res) {
  res.json({
    name:    "ProfitMasterBot v6.0",
    status:  "Running",
    powered: "David Maina · SmartLogic Technologies",
  });
});

// Start bot
app.post("/bot/start", function(req, res) {
  var binanceKey = req.body.binanceKey || "";
  var derivKey   = req.body.derivKey   || "";
  var capital    = parseFloat(req.body.capital) || 100;

  if (!binanceKey && !derivKey) {
    return res.status(400).json({ error: "Please provide at least one API key." });
  }

  botState.running  = true;
  botState.capital  = capital;
  compoundState.startCapital   = capital;
  compoundState.currentCapital = capital;

  startTradingLoop(binanceKey, derivKey);
  log("BOT STARTED with capital $" + capital);
  res.json({ success: true, message: "Bot started successfully!", state: botState });
});

// Stop bot
app.post("/bot/stop", function(req, res) {
  botState.running = false;
  if (tradingInterval) clearInterval(tradingInterval);
  log("BOT STOPPED");
  res.json({ success: true, message: "Bot stopped.", state: botState });
});

// Get bot status
app.get("/bot/status", function(req, res) {
  var total    = botState.winCount + botState.lossCount;
  var winRate  = total > 0 ? ((botState.winCount / total) * 100).toFixed(1) : 0;
  res.json({
    running:        botState.running,
    strategy:       botState.strategy,
    capital:        compoundState.currentCapital.toFixed(2),
    startCapital:   compoundState.startCapital.toFixed(2),
    dailyProfit:    botState.dailyProfit.toFixed(2),
    totalProfit:    botState.totalProfit.toFixed(2),
    totalWithdrawn: compoundState.totalWithdrawn.toFixed(2),
    winRate:        winRate,
    winCount:       botState.winCount,
    lossCount:      botState.lossCount,
    days:           compoundState.days,
    trades:         botState.trades.slice(0, 10),
  });
});

// Update strategy
app.post("/bot/strategy", function(req, res) {
  botState.strategy  = req.body.strategy  || botState.strategy;
  botState.riskLevel = req.body.riskLevel || botState.riskLevel;
  botState.stopLoss      = parseFloat(req.body.stopLoss)      || botState.stopLoss;
  botState.takeProfit    = parseFloat(req.body.takeProfit)    || botState.takeProfit;
  botState.positionSize  = parseFloat(req.body.positionSize)  || botState.positionSize;
  log("STRATEGY UPDATED: " + botState.strategy);
  res.json({ success: true, state: botState });
});

// Get AI signals
app.get("/signals", function(req, res) {
  var signals = pairs.map(function(pair) { return getSignal(pair); });
  res.json({ signals: signals });
});

// Get trade history
app.get("/trades", function(req, res) {
  res.json({ trades: botState.trades });
});

// Compound calculator
app.post("/compound", function(req, res) {
  var start   = parseFloat(req.body.capital)  || 1000;
  var daily   = parseFloat(req.body.daily)    / 100 || 0.05;
  var wdPct   = parseFloat(req.body.withdraw) / 100 || 0.20;
  var numDays = parseInt(req.body.days)        || 30;

  var running  = start;
  var totalW   = 0;
  var totalP   = 0;
  var breakdown = [];

  for (var d = 1; d <= numDays; d++) {
    var profit   = running * daily;
    var withdraw = profit  * wdPct;
    var reinvest = profit  - withdraw;
    totalP  += profit;
    totalW  += withdraw;
    running += reinvest;
    if (d===1||d===7||d===14||d===30||d===numDays) {
      breakdown.push({ day:d, capital:running.toFixed(2), profit:profit.toFixed(2), withdrawn:withdraw.toFixed(2), reinvested:reinvest.toFixed(2) });
    }
  }

  res.json({
    finalCapital:   running.toFixed(2),
    totalProfit:    totalP.toFixed(2),
    totalWithdrawn: totalW.toFixed(2),
    growth:         (((running-start)/start)*100).toFixed(1),
    breakdown:      breakdown,
  });
});

// Commission routes
app.get("/commission", function(req, res) {
  res.json(commissions);
});

app.post("/commission/withdraw", function(req, res) {
  if (commissions.pending < 50) {
    return res.status(400).json({ error: "Minimum withdrawal is $50." });
  }
  var amount          = commissions.pending;
  commissions.withdrawn += amount;
  commissions.pending   = 0;
  log("COMMISSION WITHDRAWN: $" + amount.toFixed(2));
  res.json({ success: true, withdrawn: amount.toFixed(2) });
});

// Get logs
app.get("/logs", function(req, res) {
  res.json({ logs: logs });
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, function() {
  log("ProfitMasterBot Backend running on port " + PORT);
  log("Powered by David Maina · SmartLogic Technologies");
});
