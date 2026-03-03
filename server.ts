import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("attribution.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS simulations (
    id TEXT PRIMARY KEY,
    business_name TEXT,
    product_description TEXT,
    usp TEXT,
    campaign_goal TEXT,
    product_price REAL,
    margin REAL,
    conversion_rate REAL,
    creator_name TEXT,
    audience_size INTEGER,
    demographics TEXT,
    engagement_rate REAL,
    predicted_low_price REAL,
    predicted_med_price REAL,
    predicted_high_price REAL,
    discovered_click_rate REAL,
    discovered_conversion_rate REAL,
    actual_spend REAL,
    actual_revenue REAL,
    raw_simulation_log TEXT,
    ad_guide TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' })); // Increase limit for large logs

  // API Routes
  app.get("/api/simulations", (req, res) => {
    const rows = db.prepare("SELECT * FROM simulations ORDER BY created_at DESC").all();
    res.json(rows);
  });

  app.post("/api/simulations", (req, res) => {
    const { 
      id, business_name, product_description, usp, campaign_goal,
      product_price, margin, conversion_rate,
      creator_name, audience_size, demographics, engagement_rate,
      predicted_low_price, predicted_med_price, predicted_high_price,
      discovered_click_rate, discovered_conversion_rate,
      raw_simulation_log, ad_guide
    } = req.body;

    const stmt = db.prepare(`
      INSERT INTO simulations (
        id, business_name, product_description, usp, campaign_goal,
        product_price, margin, conversion_rate,
        creator_name, audience_size, demographics, engagement_rate,
        predicted_low_price, predicted_med_price, predicted_high_price,
        discovered_click_rate, discovered_conversion_rate,
        raw_simulation_log, ad_guide
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, business_name, product_description, usp, campaign_goal,
      product_price, margin, conversion_rate,
      creator_name, audience_size, demographics, engagement_rate,
      predicted_low_price, predicted_med_price, predicted_high_price,
      discovered_click_rate, discovered_conversion_rate,
      raw_simulation_log, ad_guide
    );

    res.json({ success: true });
  });

  app.patch("/api/simulations/:id", (req, res) => {
    const { actual_spend, actual_revenue, ad_guide } = req.body;
    if (ad_guide !== undefined) {
      const stmt = db.prepare("UPDATE simulations SET ad_guide = ? WHERE id = ?");
      stmt.run(ad_guide, req.params.id);
    } else {
      const stmt = db.prepare("UPDATE simulations SET actual_spend = ?, actual_revenue = ? WHERE id = ?");
      stmt.run(actual_spend, actual_revenue, req.params.id);
    }
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
