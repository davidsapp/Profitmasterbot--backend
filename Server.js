const express = require("express");
const app = express();

app.use(express.json());

/* =========================
   ADD THIS ROUTE HERE
========================= */
app.get("/api/dashboard", (req, res) => {
  res.json({
    portfolio: 24831,
    profit: 1247,
    winrate: 84.2,
    trades: [
      { pair: "BTC/USDT", pnl: "+124" },
      { pair: "ETH/USDT", pnl: "+67" }
    ]
  });
});

/* START SERVER */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on", PORT));
