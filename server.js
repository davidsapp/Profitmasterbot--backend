const express = require("express");
const http = require("http");
const path = require("path");

const app = express();
const server = http.createServer(app);

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
// STATUS CHECK (IMPORTANT)
// ======================
app.get("/status", (req, res) => {
    res.json({
        running: botRunning,
        serverTime: new Date().toISOString()
    });
});

// ======================
// HEALTH CHECK ROUTE
// ======================
app.get("/", (req, res) => {
    res.send("ProfitMasterBot Server is Running");
});

// ======================
// ERROR HANDLING (PREVENT CRASHES)
// ======================
process.on("uncaughtException", (err) => {
    console.log("Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (err) => {
    console.log("Unhandled Rejection:", err);
});

// ======================
// START SERVER
// ======================
server.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
