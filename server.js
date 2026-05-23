const express = require("express");
const path = require("path");

const app = express();

/* THIS SERVES YOUR HTML FILE */
app.use(express.static(__dirname));

/* MAIN PAGE */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* BACKEND TEST ROUTE (optional) */
app.get("/status", (req, res) => {
  res.json({ status: "online" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
