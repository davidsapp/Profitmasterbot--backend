const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// test route
app.get("/", (req, res) => {
  res.send("ProfitMasterBot Backend Running ✅");
});

// api test
app.get("/health", (req, res) => {
  res.json({
    status: "OK"
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Backend running on port " + PORT);
});
