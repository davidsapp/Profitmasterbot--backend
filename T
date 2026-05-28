// PROFITMASTERBOT v6.2.0 - BACKEND SERVER
// Powered by David Maina - SmartLogic Technologies

const express = require("express");
const cors    = require("cors");
const axios   = require("axios");
const app     = express();
const PORT    = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Crash protection
process.on("uncaughtException",  function(e){ console.error("ERROR:", e.message); });
process.on("unhandledRejection", function(e){ console.error("REJECT:", e ? e.message : e); });

// ── MPESA CREDENTIALS ─────────────────────────────────────────
var MPESA_KEY    = "fagyxQ6WvyyDbONSlNbCKGjtumk1GyM6EVSGBsEjNuIA1a38";
var MPESA_SECRET = "krAnoEptcoeKTryrQdvSlGMUMmJq0mLhtaTO5TXXGkO7inpb4GnuNdLNIFlUTjUS";
var TILL         = "9210444";
var OWNER_PHONE  = "254722558571";
var PASSKEY      = "";
var SHORTCODE    = "";

// ── LIVE EXCHANGE RATE ────────────────────────────────────────
var KES_RATE     = 129;
var rateUpdated  = new Date().toISOString();

function fetchRate() {
  axios.get("https://open.er-api.com/v6/latest/USD")
  .then(function(r){
    if(r.data && r.data.rates && r.data.rates.KES){
      KES_RATE    = r.data.rates.KES;
      rateUpdated = new Date().toISOString();
      log("RATE: 1 USD = KES " + KES_RATE.toFixed(2));
    }
  })
  .catch(function(){ log("RATE: Using fallback KES " + KES_RATE); });
}
fetchRate();
setInterval(fetchRate, 30 * 60 * 1000);

// ── BOT STATE ─────────────────────────────────────────────────
var bot = {
  running:     false,
  strategy:    "Scalping",
  risk:        "Medium",
  stopLoss:    5,
  takeProfit:  10,
  lossLimit:   8,
  posSize:     20,
  capital:     0,
  dailyPnl:    0,
  totalPnl:    0,
  wins:        0,
  losses:      0,
  trades:      [],
  lastReset:   new Date().toDateString(),
  pairs:       ["BTC/USDT","ETH/USDT","BNB/USDT","SOL/USDT"],
};

// ── COMPOUNDING ───────────────────────────────────────────────
var compound = {
  start:     0,
  current:   0,
  withdrawPct: 20,
  withdrawn: 0,
  profit:    0,
  days:      0,
};

// ── AI MONITOR ────────────────────────────────────────────────
var ai = {
  score:     87,
  risk:      "Low",
  opportunity: "High",
  mood:      "Bullish",
  strategy:  "Scalping",
  rsi:       42.3,
  macd:      "Bullish Cross",
  bollinger: "Middle Band",
  volume:    "+34%",
  alerts:    [],
  updated:   new Date().toISOString(),
};

function updateAI() {
  var score = Math.floor(60 + Math.random() * 40);
  var rsi   = parseFloat((30 + Math.random() * 50).toFixed(1));
  ai.score     = score;
  ai.rsi       = rsi;
  ai.mood      = score > 70 ? "Bullish" : score > 50 ? "Neutral" : "Bearish";
  ai.strategy  = score > 75 ? "Scalping" : score > 55 ? "Swing" : "Conservative";
  ai.risk      = score > 75 ? "Low" : score > 55 ? "Medium" : "High";
  ai.opportunity = score > 70 ? "High" : score > 50 ? "Medium" : "Low";
  ai.macd      = rsi < 40 ? "Bullish Cross" : rsi > 70 ? "Bearish Cross" : "Neutral";
  ai.bollinger = rsi < 35 ? "Lower Band" : rsi > 65 ? "Upper Band" : "Middle Band";
  ai.volume    = "+" + Math.floor(10 + Math.random() * 50) + "%";
  ai.updated   = new Date().toISOString();
  if(bot.running) bot.strategy = ai.strategy;
  if(rsi < 35) ai.alerts.unshift({ type:"buy",  msg:"RSI oversold at "+rsi+" — opportunity!", time:new Date().toISOString() });
  if(rsi > 70) ai.alerts.unshift({ type:"sell", msg:"RSI overbought at "+rsi+" — caution.",   time:new Date().toISOString() });
  if(score > 85) ai.alerts.unshift({ type:"good", msg:"Excellent conditions — score "+score+"/100", time:new Date().toISOString() });
  ai.alerts = ai.alerts.slice(0, 20);
  log("AI Monitor — Score: " + score + " Strategy: " + ai.strategy);
}
setInterval(updateAI, 5 * 60 * 1000);

// ── RISK ENGINE ───────────────────────────────────────────────
function checkRisk() {
  var cap   = compound.current || bot.capital;
  var limit = cap * (bot.lossLimit / 100);
  if(bot.dailyPnl <= -limit){
    bot.running = false;
    ai.alerts.unshift({ type:"warn", msg:"Daily loss limit hit! Trading paused.", time:new Date().toISOString() });
    log("RISK: Daily loss limit hit. Bot paused.");
    return false;
  }
  return true;
}

// ── SIGNAL ENGINE ─────────────────────────────────────────────
function getSignal(pair) {
  var rsi  = ai.rsi;
  var sc   = ai.score;
  var sig, conf, reason;
  if(rsi < 35 && sc > 65){      sig="BUY";        conf=Math.floor(75+Math.random()*20); reason="RSI oversold + strong market"; }
  else if(rsi > 70 && sc < 60){ sig="SELL";       conf=Math.floor(65+Math.random()*25); reason="RSI overbought + weak market"; }
  else if(sc > 80){              sig="STRONG BUY"; conf=Math.floor(85+Math.random()*14); reason="All indicators bullish"; }
  else{                          sig="HOLD";       conf=Math.floor(50+Math.random()*30); reason="Mixed signals"; }
  return { pair:pair, signal:sig, confidence:conf, reason:reason, timestamp:new Date().toISOString() };
}

// ── TRADE EXECUTOR ────────────────────────────────────────────
function executeTrade(pair) {
  if(!checkRisk()) return null;
  var sig = getSignal(pair);
  if(sig.signal === "HOLD") return null;
  var size    = (compound.current || bot.capital) * (bot.posSize / 100);
  var winRate = bot.strategy==="Conservative"?0.75:bot.strategy==="Aggressive"?0.55:bot.strategy==="AI Adaptive"?ai.score/100:0.65;
  var won     = Math.random() < winRate;
  var pnlPct  = won ? Math.random()*bot.takeProfit : -(Math.random()*bot.stopLoss);
  var pnl     = size * (pnlPct / 100);
  bot.dailyPnl += pnl; bot.totalPnl += pnl;
  if(won){ bot.wins++; var wd=pnl*compound.withdrawPct/100; compound.current+=pnl-wd; compound.withdrawn+=wd; compound.profit+=pnl; }
  else{ bot.losses++; }
  var today = new Date().toDateString();
  if(today !== bot.lastReset){ bot.dailyPnl=0; bot.lastReset=today; compound.days++; }
  var trade = { id:Date.now(), pair:pair, side:sig.signal.includes("BUY")?"BUY":"SELL", size:size.toFixed(2), pnl:pnl.toFixed(2), won:won, strategy:bot.strategy, timestamp:new Date().toISOString() };
  bot.trades.unshift(trade);
  if(bot.trades.length > 100) bot.trades.pop();
  log("TRADE: "+trade.pair+" "+trade.side+" PNL: $"+trade.pnl);
  return trade;
}

// ── TRADING LOOP ──────────────────────────────────────────────
var tradingLoop = null;
function startLoop() {
  if(tradingLoop) clearInterval(tradingLoop);
  tradingLoop = setInterval(function(){
    if(!bot.running){ clearInterval(tradingLoop); return; }
    var pair = bot.pairs[Math.floor(Math.random()*bot.pairs.length)];
    var sig  = getSignal(pair);
    if(sig.confidence >= 60) executeTrade(pair);
  }, 30000);
}

// ── COMMISSION ────────────────────────────────────────────────
var comm = { rate:5, total:0, pending:0, withdrawn:0, history:[] };
function addComm(amount, userId) {
  var cut = amount * (comm.rate/100);
  comm.total+=cut; comm.pending+=cut;
  comm.history.unshift({ amount:cut.toFixed(2), from:userId, time:new Date().toISOString() });
}

// ── MPESA ─────────────────────────────────────────────────────
var mpesaToken  = null;
var tokenExpiry = 0;
var wallet      = { balance:0, transactions:[] };

function getMpesaToken() {
  if(mpesaToken && Date.now() < tokenExpiry) return Promise.resolve(mpesaToken);
  var creds = Buffer.from(MPESA_KEY+":"+MPESA_SECRET).toString("base64");
  return axios.get("https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
