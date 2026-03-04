console.log("Server file loaded");
import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log("Starting server...");
  const app = express();
  const PORT = 3000;

  // Supabase Setup
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  let db: any;
  if (!supabase) {
    console.log("Supabase credentials missing, falling back to SQLite...");
    try {
      db = new Database("attribution.db");
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
          ad_guides TEXT,
          creator_fee REAL,
          cpm REAL,
          custom_roas_targets TEXT,
          calculated_budgets TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("SQLite initialized.");
    } catch (err) {
      console.error("Failed to initialize SQLite:", err);
    }
  } else {
    console.log("Supabase client initialized.");
  }

  app.use(express.json({ limit: '50mb' }));

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
      console.error("Failed to fetch simulations:", err);
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
          raw_simulation_log, ad_guide, ad_guides,
          creator_fee, cpm, custom_roas_targets, calculated_budgets
        } = req.body;

        const stmt = db.prepare(`
          INSERT INTO simulations (
            id, business_name, product_description, usp, campaign_goal,
            product_price, margin, conversion_rate,
            creator_name, audience_size, demographics, engagement_rate,
            predicted_low_price, predicted_med_price, predicted_high_price,
            discovered_click_rate, discovered_conversion_rate,
            raw_simulation_log, ad_guide, ad_guides,
            creator_fee, cpm, custom_roas_targets, calculated_budgets
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          id, business_name, product_description, usp, campaign_goal,
          product_price, margin, conversion_rate,
          creator_name, audience_size, demographics, engagement_rate,
          predicted_low_price, predicted_med_price, predicted_high_price,
          discovered_click_rate, discovered_conversion_rate,
          raw_simulation_log, ad_guide, ad_guides,
          creator_fee, cpm, custom_roas_targets, calculated_budgets
        );
        return res.json({ success: true });
      }
      res.status(500).json({ error: "No database available" });
    } catch (err: any) {
      console.error("Failed to save simulation:", err);
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
      console.error("Failed to update simulation:", err);
      res.status(500).json({ error: err.message });
    }
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

startServer().catch(err => {
  console.error("Critical server startup error:", err);
});
