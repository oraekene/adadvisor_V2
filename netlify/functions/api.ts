import express from "express";
import serverless from "serverless-http";
import Database from "better-sqlite3";
import path from "path";

const app = express();
app.use(express.json({ limit: '50mb' }));

// On Netlify, the filesystem is ephemeral. 
// For a real deployment, you should use a remote database like Supabase, MongoDB, or PlanetScale.
// We'll use /tmp for the database so it can at least run, but data will be lost on function cold starts.
const dbPath = process.env.NODE_ENV === 'production' ? '/tmp/attribution.db' : 'attribution.db';
const db = new Database(dbPath);

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

// Migration: Add missing columns if they don't exist
const columns = db.prepare("PRAGMA table_info(simulations)").all();
const columnNames = (columns as any[]).map((c: any) => c.name);

const requiredColumns = [
  { name: 'product_description', type: 'TEXT' },
  { name: 'usp', type: 'TEXT' },
  { name: 'campaign_goal', type: 'TEXT' },
  { name: 'discovered_click_rate', type: 'REAL' },
  { name: 'discovered_conversion_rate', type: 'REAL' },
  { name: 'ad_guide', type: 'TEXT' }
];

for (const col of requiredColumns) {
  if (!columnNames.includes(col.name)) {
    try {
      db.exec(`ALTER TABLE simulations ADD COLUMN ${col.name} ${col.type}`);
    } catch (e) {
      console.error(`Failed to add column ${col.name}:`, e);
    }
  }
}

// API Routes
app.get("/api/simulations", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM simulations ORDER BY created_at DESC").all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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

  try {
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/simulations/:id", (req, res) => {
  const { actual_spend, actual_revenue, ad_guide } = req.body;
  try {
    if (ad_guide !== undefined) {
      const stmt = db.prepare("UPDATE simulations SET ad_guide = ? WHERE id = ?");
      stmt.run(ad_guide, req.params.id);
    } else {
      const stmt = db.prepare("UPDATE simulations SET actual_spend = ?, actual_revenue = ? WHERE id = ?");
      stmt.run(actual_spend, actual_revenue, req.params.id);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const handler = serverless(app);
