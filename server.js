const express = require("express");
const http = require("http");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT;

app.use(express.json());
app.use(express.static("public"));

let botRunning = false;

// START
app.post("/start", (req, res) => {
    botRunning = true;
    res.json({ running: true });
});

// STOP
app.post("/stop", (req, res) => {
    botRunning = false;
    res.json({ running: false });
});

// STATUS (POLLING)
app.get("/status", (req, res) => {
    res.json({ running: botRunning });
});

server.listen(PORT, "0.0.0.0", () => {
    console.log("Server running");
});
