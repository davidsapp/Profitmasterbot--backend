const express = require("express");
const http = require("http");
const path = require("path");

const app = express();
const server = http.createServer(app);

// ======================
// RAILWAY SAFE PORT (CRITICAL FIX)
// ======================
const PORT = process.env.PORT || 3000;

// ======================
// MIDDLEWARE
// ======================
app.use(express.json());
app.use(express.static("public"));

// ======================
// BOT STATE
// ======================
let botRunning = false;

// ======================
// START BOT
// ======================
app.post("/start", (req, res) => {
    botRunning = true;
    console.log("Bot started");
    res.json({
        success: true,
        running: botRunning
    });
});

// ======================
// STOP BOT
// ======================
app.post("/stop", (req, res) => {
    botRunning = false;
    console.log("Bot stopped");
    res.json({
        success: true,
        running: botRunning
    });
});

// ======================
// STATUS (FRONTEND POLLING)
// ======================
app.get("/status", (req, res) => {
    res.json({
        running: botRunning,
        serverTime: Date.now()
    });
});

// ======================
// TEST ROUTE (CHECK DEPLOYMENT)
// ======================
app.get("/test", (req, res) => {
    res.json({
        ok: true,
        message: "Server is alive",
        time: Date.now()
    });
});

// ======================
// ROOT ROUTE
// ======================
app.get("/", (req, res) => {
    res.send("ProfitMasterBot is running");
});

// ======================
// ERROR SAFETY (PREVENT CRASH)
// ======================
process.on("uncaughtException", (err) => {
    console.log("Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (err) => {
    console.log("Unhandled Rejection:", err);
});

// ======================
// START SERVER (RAILWAY SAFE BINDING)
// ======================
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
