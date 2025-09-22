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
        clientId: "27686bc9ea3a329b1d38d951ae665862",   // 👈 JDoodle clientId
        clientSecret: "86f03f32a35a7a53b841a1d3bde36beae17157d236e8b1462a83866355b8ab5f", // 👈 JDoodle clientSecret
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