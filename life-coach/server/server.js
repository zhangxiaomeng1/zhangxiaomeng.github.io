const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("../"));

app.post("/api/chat", async (req, res) => {
  try {
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.ARK_API_KEY}` },
      body: JSON.stringify({ model: process.env.ARK_MODEL, messages: req.body.messages, stream: true, temperature: 0.6 }),
    });
    if (!response.ok || !response.body) return res.status(response.status).json({ error: "Upstream service unavailable" });
    const reader = response.body.getReader();
    while (true) { const { done, value } = await reader.read(); if (done) break; res.write(new TextDecoder().decode(value)); }
    res.end();
  } catch { res.status(500).json({ error: "Service temporarily unavailable" }); }
});

app.listen(process.env.PORT || 3001);
