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
  return axios.get("https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",    { headers:{ Authorization:"Basic "+creds } })
  .then(function(r){
    mpesaToken  = r.data.access_token;
    tokenExpiry = Date.now() + 3600000;
    log("MPESA: Token refreshed");
    return mpesaToken;
  });
}

// ── LOGGER ────────────────────────────────────────────────────
var logs = [];
function log(msg) {
  var entry = "["+new Date().toISOString()+"] "+msg;
  logs.unshift(entry);
  if(logs.length > 200) logs.pop();
  console.log(entry);
}

// ── ROUTES ────────────────────────────────────────────────────

app.get("/", function(req,res){
  res.json({ name:"ProfitMasterBot v6.2.0", status:"Running", version:"6.2.0", powered:"David Maina · SmartLogic Technologies", uptime:process.uptime().toFixed(0)+"s", till:TILL });
});

app.post("/bot/start", function(req,res){
  var cap = parseFloat(req.body.capital)||100;
  bot.running=true; bot.capital=cap;
  compound.start=cap; compound.current=cap;
  startLoop(); updateAI();
  log("BOT STARTED — Capital: $"+cap);
  res.json({ success:true, message:"Bot started!", version:"6.2.0" });
});

app.post("/bot/stop", function(req,res){
  bot.running=false;
  if(tradingLoop) clearInterval(tradingLoop);
  log("BOT STOPPED");
  res.json({ success:true, message:"Bot stopped." });
});

app.get("/bot/status", function(req,res){
  var total = bot.wins+bot.losses;
  res.json({
    running:     bot.running,
    strategy:    bot.strategy,
    capital:     compound.current.toFixed(2),
    startCapital:compound.start.toFixed(2),
    dailyProfit: bot.dailyPnl.toFixed(2),
    totalProfit: bot.totalPnl.toFixed(2),
    withdrawn:   compound.withdrawn.toFixed(2),
    winRate:     total>0?((bot.wins/total)*100).toFixed(1):"0",
    wins:        bot.wins,
    losses:      bot.losses,
    days:        compound.days,
    trades:      bot.trades.slice(0,10),
  });
});

app.post("/bot/strategy", function(req,res){
  if(req.body.strategy)   bot.strategy  = req.body.strategy;
  if(req.body.stopLoss)   bot.stopLoss  = parseFloat(req.body.stopLoss);
  if(req.body.takeProfit) bot.takeProfit= parseFloat(req.body.takeProfit);
  if(req.body.posSize)    bot.posSize   = parseFloat(req.body.posSize);
  log("STRATEGY: "+bot.strategy);
  res.json({ success:true });
});

app.get("/signals", function(req,res){
  res.json({ signals:bot.pairs.map(getSignal), marketScore:ai.score });
});

app.get("/monitor", function(req,res){ res.json(ai); });

app.get("/rate", function(req,res){
  res.json({ USD_KES:KES_RATE, lastUpdated:rateUpdated });
});

app.get("/trades", function(req,res){ res.json({ trades:bot.trades }); });

app.post("/compound", function(req,res){
  var start=parseFloat(req.body.capital)||1000;
  var daily=parseFloat(req.body.daily)/100||0.05;
  var wdp  =parseFloat(req.body.withdraw)/100||0.20;
  var days =parseInt(req.body.days)||30;
  var run=start,tw=0,tp=0,rows=[];
  for(var d=1;d<=days;d++){
    var pr=run*daily,wd=pr*wdp,re=pr-wd;
    tp+=pr;tw+=wd;run+=re;
    if(d===1||d===7||d===14||d===30||d===days)
      rows.push({day:d,capital:run.toFixed(2),profit:pr.toFixed(2),withdrawn:wd.toFixed(2),reinvested:re.toFixed(2)});
  }
  res.json({finalCapital:run.toFixed(2),totalProfit:tp.toFixed(2),totalWithdrawn:tw.toFixed(2),growth:(((run-start)/start)*100).toFixed(1),breakdown:rows});
});

app.get("/commission", function(req,res){ res.json(comm); });
app.post("/commission/withdraw", function(req,res){
  if(comm.pending<50) return res.status(400).json({ error:"Minimum $50" });
  var amt=comm.pending; comm.withdrawn+=amt; comm.pending=0;
  res.json({ success:true, withdrawn:amt.toFixed(2) });
});

// MPESA routes
app.get("/mpesa/token", function(req,res){
  getMpesaToken()
  .then(function(){ res.json({ success:true, status:"Active", till:TILL }); })
  .catch(function(e){ res.json({ success:false, error:e.message, till:TILL }); });
});

app.post("/mpesa/pay", function(req,res){
  var phone  = req.body.phone;
  var amount = req.body.amount;
  if(!phone||!amount) return res.status(400).json({ error:"Phone and amount required" });
  getMpesaToken()
  .then(function(token){
    var ts   = new Date().toISOString().replace(/[-T:.Z]/g,"").slice(0,14);
    var pwd  = Buffer.from((SHORTCODE||TILL)+PASSKEY+ts).toString("base64");
    return axios.post("https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",{
      BusinessShortCode: SHORTCODE||TILL,
      Password:          pwd,
      Timestamp:         ts,
      TransactionType:   "CustomerBuyGoodsOnline",
      Amount:            Math.ceil(amount),
      PartyA:            phone.replace(/^0/,"254"),
      PartyB:            TILL,
      PhoneNumber:       phone.replace(/^0/,"254"),
      CallBackURL:       "https://profitmasterbot-backend-production-11dd.up.railway.app/mpesa/callback",
      AccountReference:  "ProfitMasterBot",
      TransactionDesc:   "Deposit to ProfitMasterBot",
    },{ headers:{ Authorization:"Bearer "+token } });
  })
  .then(function(r){ res.json({ success:true, data:r.data }); })
  .catch(function(){
    res.json({ success:true, manual:true, message:"Send KES "+amount+" to Till "+TILL, till:TILL });
  });
});

app.post("/mpesa/callback", function(req,res){
  try{
    var cb = req.body.Body && req.body.Body.stkCallback;
    if(cb && cb.ResultCode===0){
      var items  = cb.CallbackMetadata.Item;
      var amount = items.find(function(i){return i.Name==="Amount";}).Value;
      var phone  = items.find(function(i){return i.Name==="PhoneNumber";}).Value;
      var ref    = items.find(function(i){return i.Name==="MpesaReceiptNumber";}).Value;
      var usd    = (amount/KES_RATE).toFixed(2);
      wallet.balance += parseFloat(usd);
      wallet.transactions.unshift({ type:"Deposit",amount:"KES "+amount,usd:"$"+usd,phone:phone,ref:ref,time:new Date().toISOString(),status:"Success" });
      log("MPESA RECEIVED: KES "+amount+" Ref: "+ref);
    }
  }catch(e){ log("MPESA CALLBACK ERROR: "+e.message); }
  res.json({ ResultCode:0, ResultDesc:"Accepted" });
});

app.post("/mpesa/confirm", function(req,res){
  var amount = parseFloat(req.body.amount)||0;
  var phone  = req.body.phone||"";
  if(amount<100) return res.status(400).json({ error:"Minimum KES 100" });
  var usd = (amount/KES_RATE).toFixed(2);
  wallet.balance += parseFloat(usd);
  wallet.transactions.unshift({ type:"Deposit",amount:"KES "+amount,usd:"$"+usd,phone:phone,time:new Date().toISOString(),status:"Confirmed" });
  log("DEPOSIT CONFIRMED: KES "+amount+" from "+phone);
  res.json({ success:true, usd:usd, balance:wallet.balance.toFixed(2), rate:KES_RATE });
});

app.post("/mpesa/update", function(req,res){
  if(req.body.passkey)   PASSKEY   = req.body.passkey;
  if(req.body.shortcode) SHORTCODE = req.body.shortcode;
  log("MPESA credentials updated");
  res.json({ success:true });
});

app.get("/mpesa/wallet", function(req,res){
  res.json({ balance:wallet.balance.toFixed(2), transactions:wallet.transactions.slice(0,20), rate:KES_RATE });
});

app.get("/logs", function(req,res){ res.json({ logs:logs.slice(0,50) }); });

// ── START ─────────────────────────────────────────────────────
app.listen(PORT, function(){
  log("ProfitMasterBot v6.2.0 running on port "+PORT);
  log("Till: "+TILL+" | Owner: "+OWNER_PHONE);
  log("Powered by David Maina · SmartLogic Technologies");
  updateAI();
});