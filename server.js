const express = require("express");
const http = require("http");
const path = require("path");

const app = express();
const server = http.createServer(app);

// ======================
// IMPORTANT RAILWAY FIX
// ======================
const PORT = process.env.PORT;

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
    res.json({ success: true, running: botRunning });
});

// ======================
// STOP BOT
// ======================
app.post("/stop", (req, res) => {
    botRunning = false;
    console.log("Bot stopped");
    res.json({ success: true, running: botRunning });
});

// ======================
// STATUS ENDPOINT (FRONTEND USES THIS)
// ======================
app.get("/status", (req, res) => {
    res.json({
        running: botRunning,
        serverTime: new Date().toISOString()
    });
});

// ======================
// TEST ROUTE (VERY IMPORTANT FOR DEBUGGING)
// ======================
app.get("/test", (req, res) => {
    res.json({
        ok: true,
        message: "ProfitMasterBot server is alive",
        time: Date.now()
    });
});

// ======================
// HOME ROUTE
// ======================
app.get("/", (req, res) => {
    res.send("ProfitMasterBot Server Running");
});

// ======================
// ERROR HANDLING (PREVENT CRASH)
// ======================
process.on("uncaughtException", (err) => {
    console.log("Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (err) => {
    console.log("Unhandled Rejection:", err);
});

// ======================
// START SERVER (RAILWAY FIX)
// ======================
server.listen(PORT, "0.0.0.0", () => {
    console.log("ProfitMasterBot running on port", PORT);
});
