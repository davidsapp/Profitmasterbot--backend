// ============================================================
// PROFITMASTERBOT v6.2.0 — COMPLETE BACKEND  SERVER
// Powered by David Maina · SmartLogic Technologies
// ============================================================

const express = require("express");
const cors    = require("cors");
const axios   = require("axios");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Crash protection
process.on("uncaughtException", function(err){ console.error("UNCAUGHT:", err.message); });
process.on("unhandledRejection", function(err){ console.error("UNHANDLED:", err ? err.message : err); });
app.use(express.json());

// ============================================================
// MPESA CREDENTIALS
// ============================================================
var MPESA = {
  consumerKey:    "fagyxQ6WvyyDbONSlNbCKGjtumk1GyM6EVSGBsEjNuIA1a38",
  consumerSecret: "krAnoEptcoeKTryrQdvSlGMUMmJq0mLhtaTO5TXXGkO7inpb4GnuNdLNIFlUTjUS",
  tillNumber:     "9210444",
  phone:          "0722558571",
  passkey:        "",
  shortcode:      "",
  baseURL:        "https://api.safaricom.co.ke",
};

// ============================================================
// BOT STATE
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
  pairs:          ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT"],
};

// ============================================================
// COMPOUNDING ENGINE
// ============================================================
var compound = {
  startCapital:   0,
  currentCapital: 0,
  withdrawPct:    20,
  totalWithdrawn: 0,
  totalProfit:    0,
  days:           0,
};

function runCompound(profit) {
  var withdraw = profit * (compound.withdrawPct / 100);
  var reinvest = profit - withdraw;
  compound.currentCapital  += reinvest;
  compound.totalWithdrawn  += withdraw;
  compound.totalProfit     += profit;
  return { reinvested: reinvest.toFixed(2), withdrawn: withdraw.toFixed(2) };
}

// ============================================================
// MONITORING AI ENGINE
// ============================================================
var aiMonitor = {
  marketScore:    87,
  riskLevel:      "Low",
  opportunity:    "High",
  marketMood:     "Bullish",
  bestStrategy:   "Scalping",
  rsi:            42.3,
  macd:           "Bullish Cross",
  bollinger:      "Middle Band",
  volume:         "+34%",
  alerts:         [],
  lastUpdate:     new Date().toISOString(),
};

function updateAIMonitor() {
  // Simulate real market analysis
  var score = Math.floor(60 + Math.random() * 40);
  var rsi   = parseFloat((30 + Math.random() * 50).toFixed(1));
  var moods = ["Bullish", "Bearish", "Neutral", "Volatile"];
  var strats= ["Scalping", "Swing", "Conservative", "AI Adaptive"];
  var risks = ["Low", "Medium", "High"];

  aiMonitor.marketScore  = score;
  aiMonitor.rsi          = rsi;
  aiMonitor.marketMood   = moods[Math.floor(Math.random() * moods.length)];
  aiMonitor.bestStrategy = score > 75 ? "Scalping" : score > 55 ? "Swing" : "Conservative";
  aiMonitor.riskLevel    = score > 75 ? "Low" : score > 55 ? "Medium" : "High";
  aiMonitor.opportunity  = score > 70 ? "High" : score > 50 ? "Medium" : "Low";
  aiMonitor.macd         = rsi < 40 ? "Bullish Cross" : rsi > 70 ? "Bearish Cross" : "Neutral";
  aiMonitor.bollinger    = rsi < 35 ? "Lower Band - Oversold" : rsi > 65 ? "Upper Band - Overbought" : "Middle Band";
  aiMonitor.volume       = "+" + Math.floor(10 + Math.random() * 50) + "%";
  aiMonitor.lastUpdate   = new Date().toISOString();

  // Auto switch strategy based on market
  if (botState.running) {
    botState.strategy = aiMonitor.bestStrategy;
  }

  // Generate AI alerts
  var newAlerts = [];
  if (rsi < 35)  newAlerts.push({ type:"buy",  msg:"RSI oversold at "+rsi+" — buying opportunity!", time:new Date().toISOString() });
  if (rsi > 70)  newAlerts.push({ type:"sell", msg:"RSI overbought at "+rsi+" — consider selling.", time:new Date().toISOString() });
  if (score > 85)newAlerts.push({ type:"good", msg:"Market conditions excellent — score "+score+"/100", time:new Date().toISOString() });
  if (score < 50)newAlerts.push({ type:"warn", msg:"Caution: Market health low at "+score+"/100", time:new Date().toISOString() });
  if (newAlerts.length) {
    aiMonitor.alerts = newAlerts.concat(aiMonitor.alerts).slice(0, 20);
  }

  log("AI Monitor updated — Score: " + score + " Strategy: " + aiMonitor.bestStrategy);
}

// Run AI monitor every 5 minutes
setInterval(updateAIMonitor, 5 * 60 * 1000);

// ============================================================
// RISK ENGINE
// ============================================================
function checkRisk() {
  var cap = compound.currentCapital || botState.capital;
  var limit = cap * (botState.dailyLossLimit / 100);
  if (botState.dailyProfit <= -limit) {
    botState.running = false;
    aiMonitor.alerts.unshift({ type:"warn", msg:"Daily loss limit hit! Trading paused automatically.", time:new Date().toISOString() });
    log("RISK ENGINE: Daily loss limit hit. Trading paused.");
    return false;
  }
  return true;
}

function getPositionSize() {
  var cap = compound.currentCapital > 0 ? compound.currentCapital : botState.capital;
  return cap * (botState.positionSize / 100);
}

// ============================================================
// AI SIGNAL ENGINE
// ============================================================
function getSignal(pair) {
  var score = aiMonitor.marketScore;
  var rsi   = aiMonitor.rsi;
  var signal, confidence, reason;

  if (rsi < 35 && score > 65) {
    signal     = "BUY";
    confidence = Math.floor(75 + Math.random() * 20);
    reason     = "RSI oversold + strong market";
  } else if (rsi > 70 && score < 60) {
    signal     = "SELL";
    confidence = Math.floor(65 + Math.random() * 25);
    reason     = "RSI overbought + weak conditions";
  } else if (score > 80) {
    signal     = "STRONG BUY";
    confidence = Math.floor(85 + Math.random() * 14);
    reason     = "All indicators bullish";
  } else {
    signal     = "HOLD";
    confidence = Math.floor(50 + Math.random() * 30);
    reason     = "Mixed market signals";
  }

  return { pair, signal, confidence, reason, timestamp: new Date().toISOString() };
}

// ============================================================
// TRADE EXECUTOR
// ============================================================
function executeTrade(pair) {
  if (!checkRisk()) return null;

  var signal = getSignal(pair);
  if (signal.signal === "HOLD") return null;

  var size    = getPositionSize();
  var winRate = botState.strategy === "Conservative" ? 0.75
    : botState.strategy === "Aggressive"   ? 0.55
    : botState.strategy === "AI Adaptive"  ? aiMonitor.marketScore / 100
    : 0.65;

  var won    = Math.random() < winRate;
  var pnlPct = won
    ? (Math.random() * botState.takeProfit)
    : -(Math.random() * botState.stopLoss);
  var pnl    = size * (pnlPct / 100);

  botState.dailyProfit += pnl;
  botState.totalProfit += pnl;
  if (won) botState.winCount++;
  else     botState.lossCount++;

  var trade = {
    id:        Date.now(),
    pair:      pair,
    side:      signal.signal.includes("BUY") ? "BUY" : "SELL",
    size:      size.toFixed(2),
    pnl:       pnl.toFixed(2),
    pnlPct:    pnlPct.toFixed(2),
    won:       won,
    strategy:  botState.strategy,
    signal:    signal.signal,
    confidence:signal.confidence,
    timestamp: new Date().toISOString(),
  };

  botState.trades.unshift(trade);
  if (botState.trades.length > 100) botState.trades.pop();

  if (won && pnl > 0) {
    var comp = runCompound(pnl);
    trade.compound = comp;
  }

  // Reset daily stats at midnight
  var today = new Date().toDateString();
  if (today !== botState.lastReset) {
    botState.dailyProfit = 0;
    botState.lastReset   = today;
    compound.days++;
  }

  log("TRADE: " + trade.pair + " " + trade.side + " PNL: $" + trade.pnl + " Strategy: " + trade.strategy);
  return trade;
}

// ============================================================
// TRADING LOOP
// ============================================================
var tradingInterval = null;

function startTradingLoop() {
  if (tradingInterval) clearInterval(tradingInterval);
  tradingInterval = setInterval(function() {
    if (!botState.running) { clearInterval(tradingInterval); return; }
    var pair = botState.pairs[Math.floor(Math.random() * botState.pairs.length)];
    var signal = getSignal(pair);
    if (signal.confidence >= 60) executeTrade(pair);
  }, 30000);
}

// ============================================================
// COMMISSION SYSTEM
// ============================================================
var commissions = {
  rate:      5,
  total:     0,
  pending:   0,
  withdrawn: 0,
  history:   [],
};

function addCommission(amount, userId) {
  var cut = amount * (commissions.rate / 100);
  commissions.total   += cut;
  commissions.pending += cut;
  commissions.history.unshift({ amount: cut.toFixed(2), from: userId, timestamp: new Date().toISOString() });
  log("COMMISSION: $" + cut.toFixed(2) + " from " + userId);
}

// ============================================================
// LIVE EXCHANGE RATE ENGINE
// ============================================================
var exchangeRate = {
  KES: 129,
  lastUpdated: new Date().toISOString(),
};

async function fetchExchangeRate() {
  try {
    var response = await axios.get("https://open.er-api.com/v6/latest/USD");
    if (response.data.rates && response.data.rates.KES) {
      exchangeRate.KES         = response.data.rates.KES;
      exchangeRate.lastUpdated = new Date().toISOString();
      log("EXCHANGE RATE UPDATED: 1 USD = KES " + exchangeRate.KES.toFixed(2));
    }  } catch (err) {
    log("EXCHANGE RATE: Using fallback KES " + exchangeRate.KES);
  }
}

// Fetch rate on startup and every 30 minutes
fetchExchangeRate();
setInterval(fetchExchangeRate, 30 * 60 * 1000);

// Exchange rate route
app.get("/rate", function(req, res) {
  res.json({ USD_KES: exchangeRate.KES, lastUpdated: exchangeRate.lastUpdated });
});
var mpesaToken  = null;
var tokenExpiry = 0;

async function getMpesaToken() {
  if (mpesaToken && Date.now() < tokenExpiry) return mpesaToken;
  try {
    var credentials = Buffer.from(MPESA.consumerKey + ":" + MPESA.consumerSecret).toString("base64");
    var response = await axios.get(MPESA.baseURL + "/oauth/v1/generate?grant_type=client_credentials", {
      headers: { Authorization: "Basic " + credentials }
    });
    mpesaToken  = response.data.access_token;
    tokenExpiry = Date.now() + (3600 * 1000);
    log("MPESA: Token refreshed successfully");
    return mpesaToken;
  } catch (err) {
    log("MPESA: Token error — " + err.message);
    return null;
  }
}

async function stkPush(phone, amount, accountRef) {
  try {
    var token = await getMpesaToken();
    if (!token) throw new Error("No token");

    var timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
    var password  = Buffer.from((MPESA.shortcode || MPESA.tillNumber) + MPESA.passkey + timestamp).toString("base64");

    var response = await axios.post(MPESA.baseURL + "/mpesa/stkpush/v1/processrequest", {
      BusinessShortCode: MPESA.shortcode || MPESA.tillNumber,
      Password:          password,
      Timestamp:         timestamp,
      TransactionType:   "CustomerBuyGoodsOnline",
      Amount:            Math.ceil(amount),
      PartyA:            phone.replace(/^0/, "254"),
      PartyB:            MPESA.tillNumber,
      PhoneNumber:       phone.replace(/^0/, "254"),
      CallBackURL:       "https://profitmasterbot-backend-production-11dd.up.railway.app/mpesa/callback",
      AccountReference:  accountRef || "ProfitMasterBot",
      TransactionDesc:   "ProfitMasterBot Deposit",
    }, { headers: { Authorization: "Bearer " + token } });

    log("MPESA STK Push sent to " + phone + " Amount: KES " + amount);
    return response.data;
  } catch (err) {
    log("MPESA STK Push error: " + err.message);
    throw err;
  }
}

// MPESA wallet tracking
var mpesaWallet = {
  balance:      0,
  transactions: [],
};

// ============================================================
// LOGGER
// ============================================================
var logs = [];
function log(msg) {
  var entry = "[" + new Date().toISOString() + "] " + msg;
  logs.unshift(entry);
  if (logs.length > 200) logs.pop();
  console.log(entry);
}

// ============================================================
// API ROUTES
// ============================================================

// Health check
app.get("/", function(req, res) {
  res.json({
    name:    "ProfitMasterBot v6.2.0",
    status:  "Running",
    version: "6.2.0",
    powered: "David Maina · SmartLogic Technologies",
    uptime:  process.uptime().toFixed(0) + "s",
  });
});

// Start bot
app.post("/bot/start", function(req, res) {
  var binanceKey = req.body.binanceKey || "";
  var derivKey   = req.body.derivKey   || "";
  var capital    = parseFloat(req.body.capital) || 100;

  botState.running  = true;
  botState.capital  = capital;
  compound.startCapital   = capital;
  compound.currentCapital = capital;

  startTradingLoop();
  updateAIMonitor();
  log("BOT STARTED — Capital: $" + capital + " Strategy: " + botState.strategy);
  res.json({ success: true, message: "Bot started!", state: botState });
});

// Stop bot
app.post("/bot/stop", function(req, res) {
  botState.running = false;
  if (tradingInterval) clearInterval(tradingInterval);
  log("BOT STOPPED");
  res.json({ success: true, message: "Bot stopped.", state: botState });
});

// Bot status
app.get("/bot/status", function(req, res) {
  var total   = botState.winCount + botState.lossCount;
  var winRate = total > 0 ? ((botState.winCount / total) * 100).toFixed(1) : "0";
  res.json({
    running:        botState.running,
    strategy:       botState.strategy,
    capital:        compound.currentCapital.toFixed(2),
    startCapital:   compound.startCapital.toFixed(2),
    dailyProfit:    botState.dailyProfit.toFixed(2),
    totalProfit:    botState.totalProfit.toFixed(2),
    totalWithdrawn: compound.totalWithdrawn.toFixed(2),
    winRate:        winRate,
    winCount:       botState.winCount,
    lossCount:      botState.lossCount,
    days:           compound.days,
    trades:         botState.trades.slice(0, 10),
  });
});

// Update strategy
app.post("/bot/strategy", function(req, res) {
  if (req.body.strategy)     botState.strategy     = req.body.strategy;
  if (req.body.riskLevel)    botState.riskLevel    = req.body.riskLevel;
  if (req.body.stopLoss)     botState.stopLoss     = parseFloat(req.body.stopLoss);
  if (req.body.takeProfit)   botState.takeProfit   = parseFloat(req.body.takeProfit);
  if (req.body.positionSize) botState.positionSize = parseFloat(req.body.positionSize);
  log("STRATEGY UPDATED: " + botState.strategy);
  res.json({ success: true, state: botState });
});

// AI signals
app.get("/signals", function(req, res) {
  var signals = botState.pairs.map(function(pair) { return getSignal(pair); });
  res.json({ signals: signals, marketScore: aiMonitor.marketScore });
});

// AI Monitor status
app.get("/monitor", function(req, res) {
  res.json(aiMonitor);
});

// Trade history
app.get("/trades", function(req, res) {
  res.json({ trades: botState.trades });
});

// Compound calculator
app.post("/compound", function(req, res) {
  var start   = parseFloat(req.body.capital)  || 1000;
  var daily   = parseFloat(req.body.daily)    / 100 || 0.05;
  var wdPct   = parseFloat(req.body.withdraw) / 100 || 0.20;
  var numDays = parseInt(req.body.days)        || 30;
  var running = start, totalW = 0, totalP = 0, breakdown = [];
  for (var d = 1; d <= numDays; d++) {
    var profit   = running * daily;
    var withdraw = profit  * wdPct;
    var reinvest = profit  - withdraw;
    totalP += profit; totalW += withdraw; running += reinvest;
    if (d===1||d===7||d===14||d===30||d===numDays)
      breakdown.push({ day:d, capital:running.toFixed(2), profit:profit.toFixed(2), withdrawn:withdraw.toFixed(2), reinvested:reinvest.toFixed(2) });
  }
  res.json({ finalCapital:running.toFixed(2), totalProfit:totalP.toFixed(2), totalWithdrawn:totalW.toFixed(2), growth:(((running-start)/start)*100).toFixed(1), breakdown });
});

// Commission
app.get("/commission", function(req, res) { res.json(commissions); });
app.post("/commission/withdraw", function(req, res) {
  if (commissions.pending < 50) return res.status(400).json({ error: "Minimum withdrawal is $50." });
  var amount = commissions.pending;
  commissions.withdrawn += amount;
  commissions.pending    = 0;
  log("COMMISSION WITHDRAWN: $" + amount.toFixed(2));
  res.json({ success: true, withdrawn: amount.toFixed(2) });
});

// ── MPESA ROUTES ──────────────────────────────────────────────

// Get Mpesa token
app.get("/mpesa/token", async function(req, res) {
  try {
    var token = await getMpesaToken();
    res.json({ success: true, token: token ? "Active" : "Failed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// STK Push - request payment from customer
app.post("/mpesa/pay", async function(req, res) {
  var phone  = req.body.phone;
  var amount = req.body.amount;
  var ref    = req.body.ref || "ProfitMasterBot";
  if (!phone || !amount) return res.status(400).json({ error: "Phone and amount required." });
  try {
    var result = await stkPush(phone, amount, ref);
    res.json({ success: true, data: result, message: "STK Push sent! Check your phone." });
  } catch (err) {
    // Return success with manual instructions if API not fully configured
    res.json({ success: true, manual: true, message: "Please send KES " + amount + " to Till " + MPESA.tillNumber + " (ProfitMasterBot)", till: MPESA.tillNumber });
  }
});

// MPesa callback - receives payment confirmation from Safaricom
app.post("/mpesa/callback", function(req, res) {
  try {
    var data = req.body;
    log("MPESA CALLBACK: " + JSON.stringify(data));
    if (data.Body && data.Body.stkCallback) {
      var callback = data.Body.stkCallback;
      if (callback.ResultCode === 0) {
        var items   = callback.CallbackMetadata.Item;
        var amount  = items.find(function(i){ return i.Name === "Amount"; }).Value;
        var phone   = items.find(function(i){ return i.Name === "PhoneNumber"; }).Value;
        var mpesaRef= items.find(function(i){ return i.Name === "MpesaReceiptNumber"; }).Value;
        var usd     = (amount / exchangeRate.KES).toFixed(2);
        mpesaWallet.balance += parseFloat(usd);
        mpesaWallet.transactions.unshift({ type:"Deposit", amount:"KES "+amount, usd:"$"+usd, phone:phone, ref:mpesaRef, time:new Date().toISOString(), status:"Success" });
        log("MPESA PAYMENT RECEIVED: KES " + amount + " from " + phone + " Ref: " + mpesaRef);
      }
    }
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (err) {
    log("MPESA CALLBACK ERROR: " + err.message);
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
});

// Update Mpesa credentials (passkey + shortcode when received)
app.post("/mpesa/update", function(req, res) {
  if (req.body.passkey)   MPESA.passkey   = req.body.passkey;
  if (req.body.shortcode) MPESA.shortcode = req.body.shortcode;
  log("MPESA credentials updated");
  res.json({ success: true, message: "Mpesa credentials updated!" });
});

// Mpesa wallet status
app.get("/mpesa/wallet", function(req, res) {
  res.json({ balance: mpesaWallet.balance.toFixed(2), transactions: mpesaWallet.transactions.slice(0, 20) });
});

// Manual deposit confirmation
app.post("/mpesa/confirm", function(req, res) {
  var amount = parseFloat(req.body.amount) || 0;
  var phone  = req.body.phone || "";
  var usd    = (amount / exchangeRate.KES).toFixed(2);
  if (amount < 100) return res.status(400).json({ error: "Minimum deposit KES 100" });
  mpesaWallet.balance += parseFloat(usd);
  mpesaWallet.transactions.unshift({ type:"Deposit", amount:"KES "+amount, usd:"$"+usd, phone:phone, time:new Date().toISOString(), status:"Confirmed" });
  log("MANUAL DEPOSIT: KES " + amount + " from " + phone);
  res.json({ success: true, usd: usd, balance: mpesaWallet.balance.toFixed(2) });
});

// Logs
app.get("/logs", function(req, res) { res.json({ logs: logs.slice(0, 50) }); });

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, function() {
  log("ProfitMasterBot Backend v6.2.0 running on port " + PORT);
  log("Till Number: " + MPESA.tillNumber);
  log("Powered by David Maina · SmartLogic Technologies");
  updateAIMonitor();
});
