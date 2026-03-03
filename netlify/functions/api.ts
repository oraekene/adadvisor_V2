import express from "express";
import serverless from "serverless-http";
import Database from "better-sqlite3";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json({ limit: '50mb' }));

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// SQLite Setup (Fallback)
const dbPath = process.env.NODE_ENV === 'production' ? path.join('/tmp', 'attribution.db') : 'attribution.db';
let db: Database.Database | null = null;

if (!supabase) {
  try {
    db = new Database(dbPath);
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
  } catch (err) {
    console.error("Failed to open database at", dbPath, "falling back to in-memory");
    db = new Database(':memory:');
  }
}

// API Routes
app.get("/api/simulations", async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('simulations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return res.json(data);
    } else if (db) {
      const rows = db.prepare("SELECT * FROM simulations ORDER BY created_at DESC").all();
      return res.json(rows);
    }
    res.status(500).json({ error: "No database available" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/simulations", async (req, res) => {
  try {
    if (supabase) {
      const { error } = await supabase
        .from('simulations')
        .insert([req.body]);
      
      if (error) throw error;
      return res.json({ success: true });
    } else if (db) {
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

      return res.json({ success: true });
    }
    res.status(500).json({ error: "No database available" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/simulations/:id", async (req, res) => {
  try {
    if (supabase) {
      const { error } = await supabase
        .from('simulations')
        .update(req.body)
        .eq('id', req.params.id);
      
      if (error) throw error;
      return res.json({ success: true });
    } else if (db) {
      const { actual_spend, actual_revenue, ad_guide } = req.body;
      if (ad_guide !== undefined) {
        const stmt = db.prepare("UPDATE simulations SET ad_guide = ? WHERE id = ?");
        stmt.run(ad_guide, req.params.id);
      } else {
        const stmt = db.prepare("UPDATE simulations SET actual_spend = ?, actual_revenue = ? WHERE id = ?");
        stmt.run(actual_spend, actual_revenue, req.params.id);
      }
      return res.json({ success: true });
    }
    res.status(500).json({ error: "No database available" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const handler = serverless(app);
