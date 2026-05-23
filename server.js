// ============================================================
// PROFITMASTERBOT v6.4.0 — RAILWAY STABLE SERVER
// Fix: Blank dashboard, static hosting, API safety
// ============================================================

const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ===============================
// Serve frontend (IMPORTANT FIX)
// ===============================
app.use(express.static(path.join(__dirname, "public")));

// If index.html is in root (fallback fix)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ===============================
// Health check (Railway test)
// ===============================
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    app: "ProfitMasterBot",
    version: "6.4.0",
    time: new Date().toISOString()
  });
});

// ===============================
// Example API route (live sync safe)
// ===============================
app.get("/api/rate", async (req, res) => {
  try {
    // fallback safe exchange rate
    const rate = {
      usd_kes: 129.62,
      updated: new Date().toISOString()
    };

    res.json(rate);
  } catch (err) {
    res.status(500).json({ error: "Rate fetch failed" });
  }
});

// ===============================
// Start server
// ===============================
app.listen(PORT, () => {
  console.log(`ProfitMasterBot running on port ${PORT}`);
});
