// server.js
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;

app.post("/execute", async (req, res) => {
  const { script, language, versionIndex = "0", stdin = "" } = req.body;

  try {
    // Note: The 'fetch' API is built into Node.js v18 and later.
    // If you are using an older version, you might need to install 'node-fetch'.
    const response = await fetch("https://api.jdoodle.com/v1/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: "e463db2adee1eed75d5839b6a3e9430f",   // 👈 JDoodle clientId
        clientSecret: "3ce3725c3a88ecd385ce9efd2048b0c11658072b9e98f9d7b8943ef3f3f247c7", // 👈 JDoodle clientSecret
        script,
        language,
        versionIndex,
        stdin,
      }),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("❌ Error connecting to JDoodle API:", err);
    res.status(500).json({ error: "Error connecting to JDoodle API" });
  }
});

app.listen(PORT, () => {
  // This line is now correct with backticks ``
  console.log(`✅ JDoodle proxy running on http://localhost:${PORT}`);
});