import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";

const db = new Database("agencyos.db");

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS agencies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    agency_id TEXT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK(role IN ('admin', 'account_manager', 'strategist', 'creative', 'analyst')),
    capacity_hours INTEGER DEFAULT 40,
    allocated_hours INTEGER DEFAULT 0,
    satisfaction_score REAL DEFAULT 0,
    FOREIGN KEY(agency_id) REFERENCES agencies(id)
  );

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    agency_id TEXT,
    company_name TEXT NOT NULL,
    industry TEXT,
    source TEXT,
    status TEXT DEFAULT 'lead',
    estimated_value REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(agency_id) REFERENCES agencies(id)
  );

  CREATE TABLE IF NOT EXISTS deals (
    id TEXT PRIMARY KEY,
    lead_id TEXT,
    name TEXT NOT NULL,
    stage TEXT DEFAULT 'lead',
    value REAL,
    probability INTEGER,
    expected_close_date DATE,
    FOREIGN KEY(lead_id) REFERENCES leads(id)
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    agency_id TEXT,
    name TEXT NOT NULL,
    onboarding_status TEXT DEFAULT 'pending',
    lifecycle_stage TEXT DEFAULT 'onboarding',
    health_score INTEGER DEFAULT 100,
    health_label TEXT DEFAULT 'Healthy', -- Healthy, Stable, At Risk, Critical
    retainer_amount REAL DEFAULT 0,
    last_communication DATETIME,
    communication_frequency INTEGER, -- days
    satisfaction_score INTEGER DEFAULT 10,
    contract_start DATE,
    contract_end DATE,
    renewal_date DATE,
    notice_period INTEGER, -- days
    cac REAL,
    ltv REAL,
    account_manager_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(agency_id) REFERENCES agencies(id),
    FOREIGN KEY(account_manager_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    name TEXT NOT NULL,
    type TEXT, -- PPC, SEO, Social, Email, Website
    status TEXT DEFAULT 'planning',
    budget REAL,
    start_date DATE,
    end_date DATE,
    launch_time_days INTEGER,
    complexity_score INTEGER DEFAULT 1,
    meta_ad_account_id TEXT,
    meta_access_token TEXT,
    meta_pixel_id TEXT,
    FOREIGN KEY(client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS campaign_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id TEXT,
    date DATE NOT NULL,
    spend REAL,
    impressions INTEGER,
    clicks INTEGER,
    conversions INTEGER,
    -- Paid Ads specific
    ctr REAL,
    cpc REAL,
    cpl REAL,
    cpa REAL,
    roas REAL,
    -- SEO specific
    organic_traffic INTEGER,
    keyword_rankings_top3 INTEGER,
    domain_authority INTEGER,
    -- Social specific
    engagement_rate REAL,
    reach INTEGER,
    -- Email specific
    open_rate REAL,
    click_rate REAL,
    FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    campaign_id TEXT,
    assigned_to TEXT,
    title TEXT NOT NULL,
    due_date DATE,
    internal_deadline DATE,
    external_deadline DATE,
    brief TEXT,
    completed_at DATETIME,
    status TEXT DEFAULT 'todo',
    category TEXT,
    FOREIGN KEY(campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY(assigned_to) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    agency_id TEXT,
    client_id TEXT,
    title TEXT NOT NULL,
    date DATETIME NOT NULL,
    end_date DATETIME,
    type TEXT,
    description TEXT,
    FOREIGN KEY(agency_id) REFERENCES agencies(id),
    FOREIGN KEY(client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS retainers (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    amount REAL,
    total_hours REAL DEFAULT 0,
    billing_cycle TEXT DEFAULT 'monthly',
    next_invoice_date DATE,
    status TEXT DEFAULT 'active',
    FOREIGN KEY(client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    retainer_id TEXT,
    name TEXT NOT NULL, -- Brand Management, Copywriting, etc.
    allocated_hours REAL DEFAULT 0,
    FOREIGN KEY(retainer_id) REFERENCES retainers(id)
  );

  CREATE TABLE IF NOT EXISTS time_entries (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    service_id TEXT,
    task_id TEXT,
    user_id TEXT,
    hours REAL NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    FOREIGN KEY(client_id) REFERENCES clients(id),
    FOREIGN KEY(service_id) REFERENCES services(id),
    FOREIGN KEY(task_id) REFERENCES tasks(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    title TEXT NOT NULL,
    document_url TEXT,
    signed_at DATETIME,
    status TEXT DEFAULT 'active',
    FOREIGN KEY(client_id) REFERENCES clients(id)
  );
`);

// Migration: Ensure Meta API fields exist in campaigns table
try {
  db.prepare("SELECT meta_ad_account_id FROM campaigns LIMIT 1").get();
} catch (e: any) {
  if (e.message.includes("no such column: meta_ad_account_id")) {
    console.log("Migrating database: adding Meta API fields to campaigns table");
    db.exec("ALTER TABLE campaigns ADD COLUMN meta_ad_account_id TEXT");
    db.exec("ALTER TABLE campaigns ADD COLUMN meta_access_token TEXT");
    db.exec("ALTER TABLE campaigns ADD COLUMN meta_pixel_id TEXT");
  }
}

// Migration: Ensure lifecycle_stage exists in clients table
try {
  db.prepare("SELECT lifecycle_stage FROM clients LIMIT 1").get();
} catch (e: any) {
  if (e.message.includes("no such column: lifecycle_stage")) {
    console.log("Migrating database: adding lifecycle_stage to clients table");
    db.exec("ALTER TABLE clients ADD COLUMN lifecycle_stage TEXT DEFAULT 'onboarding'");
  }
}

// Migration: Ensure task timeline fields exist
try {
  db.prepare("SELECT internal_deadline FROM tasks LIMIT 1").get();
} catch (e: any) {
  if (e.message.includes("no such column: internal_deadline")) {
    console.log("Migrating database: adding timeline fields to tasks table");
    db.exec("ALTER TABLE tasks ADD COLUMN internal_deadline DATE");
    db.exec("ALTER TABLE tasks ADD COLUMN external_deadline DATE");
    db.exec("ALTER TABLE tasks ADD COLUMN brief TEXT");
    db.exec("ALTER TABLE tasks ADD COLUMN category TEXT");
  }
}

// Migration: Ensure client_id and end_date exist in calendar_events table
try {
  db.prepare("SELECT client_id FROM calendar_events LIMIT 1").get();
} catch (e: any) {
  if (e.message.includes("no such column: client_id")) {
    console.log("Migrating database: adding client_id to calendar_events table");
    db.exec("ALTER TABLE calendar_events ADD COLUMN client_id TEXT");
  }
}

try {
  db.prepare("SELECT end_date FROM calendar_events LIMIT 1").get();
} catch (e: any) {
  if (e.message.includes("no such column: end_date")) {
    console.log("Migrating database: adding end_date to calendar_events table");
    db.exec("ALTER TABLE calendar_events ADD COLUMN end_date DATETIME");
  }
}

// Seed initial agency if empty
const agencyCount = db.prepare("SELECT count(*) as count FROM agencies").get() as { count: number };
if (agencyCount.count === 0) {
  const agencyId = "agency_1";
  db.prepare("INSERT INTO agencies (id, name) VALUES (?, ?)").run(agencyId, "Vanguard Marketing");
  db.prepare("INSERT INTO users (id, agency_id, name, email, role, capacity_hours) VALUES (?, ?, ?, ?, ?, ?)").run(
    "user_1", agencyId, "Alex Reed", "alex@vanguard.com", "admin", 40
  );
  db.prepare("INSERT INTO users (id, agency_id, name, email, role, capacity_hours) VALUES (?, ?, ?, ?, ?, ?)").run(
    "user_2", agencyId, "Sarah Chen", "sarah@vanguard.com", "strategist", 35
  );
  
  // Seed some leads
  const leadId = "lead_1";
  db.prepare("INSERT INTO leads (id, agency_id, company_name, industry, source, estimated_value) VALUES (?, ?, ?, ?, ?, ?)").run(
    leadId, agencyId, "TechFlow SaaS", "Technology", "Inbound", 5000
  );
  db.prepare("INSERT INTO deals (id, lead_id, name, stage, value) VALUES (?, ?, ?, ?, ?)").run(
    "deal_1", leadId, "Q1 Growth Strategy", "proposal_sent", 15000
  );

  // Seed a client
  const clientId = "client_1";
  db.prepare(`
    INSERT INTO clients (id, agency_id, name, onboarding_status, lifecycle_stage, health_score, health_label, retainer_amount, account_manager_id, contract_start, contract_end, renewal_date) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    clientId, agencyId, "Acme Corp", "completed", "active", 85, "Healthy", 3500, "user_1", "2023-01-01", "2024-01-01", "2024-01-01"
  );
  
  // Seed more clients for the pipeline
  db.prepare("INSERT INTO clients (id, agency_id, name, onboarding_status, lifecycle_stage, health_score, health_label, retainer_amount, account_manager_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
    "client_2", agencyId, "Global Logistics", "pending", "onboarding", 100, "Healthy", 2500, "user_2"
  );
  db.prepare("INSERT INTO clients (id, agency_id, name, onboarding_status, lifecycle_stage, health_score, health_label, retainer_amount, account_manager_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
    "client_3", agencyId, "BioHealth Inc", "completed", "strategy", 92, "Healthy", 4500, "user_2"
  );
  db.prepare("INSERT INTO clients (id, agency_id, name, onboarding_status, lifecycle_stage, health_score, health_label, retainer_amount, account_manager_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
    "client_4", agencyId, "Urban Wear", "completed", "implementation", 78, "Stable", 1800, "user_1"
  );
  db.prepare("INSERT INTO clients (id, agency_id, name, onboarding_status, lifecycle_stage, health_score, health_label, retainer_amount, account_manager_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
    "client_5", agencyId, "FinTech Solutions", "completed", "review", 95, "Healthy", 6000, "user_1"
  );
  db.prepare("INSERT INTO clients (id, agency_id, name, onboarding_status, lifecycle_stage, health_score, health_label, retainer_amount, account_manager_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
    "client_6", agencyId, "Solar Energy Co", "completed", "renewal", 65, "At Risk", 3000, "user_2"
  );
  db.prepare("INSERT INTO clients (id, agency_id, name, onboarding_status, lifecycle_stage, health_score, health_label, retainer_amount, account_manager_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
    "client_churned_1", agencyId, "Old Tech Co", "completed", "churned", 20, "Critical", 1000, "user_1"
  );
  db.prepare("INSERT INTO retainers (id, client_id, amount, total_hours, billing_cycle, next_invoice_date) VALUES (?, ?, ?, ?, ?, ?)").run(
    "ret_1", clientId, 3500, 40, "monthly", "2024-04-01"
  );

  // Seed services for the retainer
  db.prepare("INSERT INTO services (id, retainer_id, name, allocated_hours) VALUES (?, ?, ?, ?)").run(
    "serv_1", "ret_1", "Brand Management", 10
  );
  db.prepare("INSERT INTO services (id, retainer_id, name, allocated_hours) VALUES (?, ?, ?, ?)").run(
    "serv_2", "ret_1", "Graphic Design", 15
  );
  db.prepare("INSERT INTO services (id, retainer_id, name, allocated_hours) VALUES (?, ?, ?, ?)").run(
    "serv_3", "ret_1", "Copywriting", 15
  );

  // Seed some time entries
  db.prepare("INSERT INTO time_entries (id, client_id, service_id, user_id, hours, date, description) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    "time_1", clientId, "serv_1", "user_1", 4.5, "2026-03-01", "Logo refinement"
  );
  db.prepare("INSERT INTO time_entries (id, client_id, service_id, user_id, hours, date, description) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    "time_2", clientId, "serv_2", "user_1", 8, "2026-03-02", "Social media templates"
  );
  db.prepare("INSERT INTO time_entries (id, client_id, service_id, user_id, hours, date, description) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    "time_3", clientId, "serv_3", "user_1", 12, "2026-03-04", "Website copy draft"
  );

  // Seed a contract
  db.prepare("INSERT INTO contracts (id, client_id, title, signed_at, status) VALUES (?, ?, ?, ?, ?)").run(
    "cont_1", clientId, "Annual Retainer Agreement 2024", "2023-12-15", "active"
  );

  // Seed tasks
  db.prepare("INSERT INTO tasks (id, assigned_to, title, due_date, internal_deadline, external_deadline, status, category, brief) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
    "task_1", "user_1", "Review Q1 Strategy with Acme", "2026-03-06", "2026-03-05", "2026-03-07", "todo", "Strategy", "Initial review of the Q1 performance metrics and strategy adjustments for Q2."
  );
  db.prepare("INSERT INTO tasks (id, assigned_to, title, due_date, internal_deadline, external_deadline, status, category, brief) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
    "task_2", "user_1", "Prepare FinTech Monthly Report", "2026-03-07", "2026-03-06", "2026-03-08", "todo", "Reporting", "Comprehensive monthly report for FinTech Solutions, focusing on SEO growth and PPC ROI."
  );
  db.prepare("INSERT INTO tasks (id, assigned_to, title, due_date, internal_deadline, external_deadline, completed_at, status, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
    "task_comp_1", "user_1", "Initial Audit", "2026-02-20", "2026-02-18", "2026-02-22", "2026-02-18", "completed", "Audit"
  );
  db.prepare("INSERT INTO tasks (id, assigned_to, title, due_date, internal_deadline, external_deadline, completed_at, status, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
    "task_comp_2", "user_1", "Keyword Research", "2026-02-25", "2026-02-24", "2026-02-26", "2026-02-26", "completed", "SEO"
  );
  db.prepare("INSERT INTO tasks (id, assigned_to, title, due_date, internal_deadline, external_deadline, completed_at, status, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
    "task_comp_3", "user_2", "Strategy Deck", "2026-02-28", "2026-02-27", "2026-03-01", "2026-02-28", "completed", "Strategy"
  );

  // Seed events
  db.prepare("INSERT INTO calendar_events (id, agency_id, title, date, type) VALUES (?, ?, ?, ?, ?)").run(
    "event_1", agencyId, "Acme Corp Strategy Review", "2026-03-06T10:00:00", "client_meeting"
  );
  db.prepare("INSERT INTO calendar_events (id, agency_id, title, date, type) VALUES (?, ?, ?, ?, ?)").run(
    "event_2", agencyId, "FinTech Campaign Launch", "2026-03-10T09:00:00", "campaign_launch"
  );

  // Seed a campaign
  const campaignId = "camp_1";
  db.prepare("INSERT INTO campaigns (id, client_id, name, type, status, budget) VALUES (?, ?, ?, ?, ?, ?)").run(
    campaignId, clientId, "Spring PPC Blitz", "PPC", "launch", 10000
  );

  // Seed metrics
  const insertMetric = db.prepare(`
    INSERT INTO campaign_metrics (
      campaign_id, date, spend, impressions, clicks, conversions, 
      ctr, cpc, cpl, cpa, roas, organic_traffic, keyword_rankings_top3, engagement_rate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (30 - i));
    const dateStr = date.toISOString().split('T')[0];
    const spend = 300 + Math.random() * 100;
    const clicks = 200 + Math.random() * 50;
    const conversions = 10 + Math.random() * 5;
    insertMetric.run(
      campaignId, dateStr, spend, 5000 + Math.random() * 2000, clicks, conversions,
      (clicks / 5000), (spend / clicks), (spend / (conversions * 2)), (spend / conversions), (conversions * 50 / spend),
      1000 + Math.random() * 500, 15 + Math.random() * 5, 0.05 + Math.random() * 0.02
    );
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/campaigns", (req, res) => {
    try {
      const { client_id, name, type, budget, meta_ad_account_id, meta_access_token, meta_pixel_id } = req.body;
      const id = `camp_${Date.now()}`;
      db.prepare(`
        INSERT INTO campaigns (id, client_id, name, type, budget, meta_ad_account_id, meta_access_token, meta_pixel_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, client_id, name, type, budget, meta_ad_account_id, meta_access_token, meta_pixel_id);
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/campaigns/:id/sync-meta", (req, res) => {
    try {
      const campaign = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(req.params.id) as any;
      if (!campaign || !campaign.meta_ad_account_id || !campaign.meta_access_token) {
        return res.status(400).json({ error: "Meta API credentials missing for this campaign" });
      }

      // Mocking Meta Marketing API call
      // In a real app, you'd use axios to call https://graph.facebook.com/v18.0/${campaign.meta_ad_account_id}/insights
      
      const dateStr = new Date().toISOString().split('T')[0];
      const spend = 100 + Math.random() * 500;
      const impressions = 5000 + Math.random() * 10000;
      const clicks = 100 + Math.random() * 500;
      const conversions = 5 + Math.random() * 20;

      db.prepare(`
        INSERT INTO campaign_metrics (
          campaign_id, date, spend, impressions, clicks, conversions,
          ctr, cpc, cpl, cpa, roas
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        campaign.id, dateStr, spend, impressions, clicks, conversions,
        (clicks / impressions), (spend / clicks), (spend / (conversions * 2)), (spend / conversions), (conversions * 50 / spend)
      );

      res.json({ success: true, message: "Meta insights synced successfully (Mocked)" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/agency/overview", (req, res) => {
    try {
      const mrr = db.prepare("SELECT SUM(amount) as total FROM retainers").get() as { total: number };
      const activeCampaigns = db.prepare("SELECT COUNT(*) as count FROM campaigns WHERE status != 'completed'").get() as { count: number };
      const pipelineValue = db.prepare("SELECT SUM(value) as total FROM deals WHERE stage != 'won' AND stage != 'lost'").get() as { total: number };
      const clientCount = db.prepare("SELECT COUNT(*) as count FROM clients").get() as { count: number };
      const churnCount = db.prepare("SELECT COUNT(*) as count FROM clients WHERE lifecycle_stage = 'churned'").get() as { count: number };
      
      // Derived KPIs
      const totalMRR = mrr.total || 0;
      const arr = totalMRR * 12;
      const avgRetainer = clientCount.count > 0 ? totalMRR / clientCount.count : 0;

      res.json({
        mrr: totalMRR,
        arr,
        avgRetainer,
        activeCampaigns: activeCampaigns.count,
        pipelineValue: pipelineValue.total || 0,
        clientCount: clientCount.count,
        churnRate: clientCount.count > 0 ? (churnCount.count / clientCount.count) * 100 : 0
      });
    } catch (error: any) {
      console.error("Error in /api/agency/overview:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/leads", (req, res) => {
    try {
      const leads = db.prepare(`
        SELECT l.*, d.name as deal_name, d.stage as deal_stage, d.value as deal_value 
        FROM leads l 
        LEFT JOIN deals d ON l.id = d.lead_id
      `).all();
      res.json(leads);
    } catch (error: any) {
      console.error("Error in /api/leads:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/clients", (req, res) => {
    try {
      const clients = db.prepare(`
        SELECT c.*, r.amount as retainer_amount 
        FROM clients c 
        LEFT JOIN retainers r ON c.id = r.client_id
      `).all();
      res.json(clients);
    } catch (error: any) {
      console.error("Error in /api/clients:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/campaigns", (req, res) => {
    try {
      const campaigns = db.prepare(`
        SELECT camp.*, cl.name as client_name 
        FROM campaigns camp 
        JOIN clients cl ON camp.client_id = cl.id
      `).all();
      res.json(campaigns);
    } catch (error: any) {
      console.error("Error in /api/campaigns:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/campaigns/:id/metrics", (req, res) => {
    try {
      const metrics = db.prepare("SELECT * FROM campaign_metrics WHERE campaign_id = ? ORDER BY date ASC").all(req.params.id);
      res.json(metrics);
    } catch (error: any) {
      console.error("Error in /api/campaigns/:id/metrics:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tasks", (req, res) => {
    try {
      const tasks = db.prepare("SELECT * FROM tasks").all();
      res.json(tasks);
    } catch (error: any) {
      console.error("Error in /api/tasks:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/events", (req, res) => {
    try {
      const { client_id } = req.query;
      let events;
      if (client_id) {
        events = db.prepare("SELECT * FROM calendar_events WHERE client_id = ?").all(client_id);
      } else {
        events = db.prepare("SELECT * FROM calendar_events WHERE client_id IS NULL").all();
      }
      res.json(events);
    } catch (error: any) {
      console.error("Error in /api/events:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/events", (req, res) => {
    try {
      const { title, date, end_date, type, description, client_id, agency_id } = req.body;
      const id = `event_${Date.now()}`;
      db.prepare(`
        INSERT INTO calendar_events (id, agency_id, client_id, title, date, end_date, type, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, agency_id || 'agency_1', client_id || null, title, date, end_date || null, type, description || null);
      res.json({ success: true, id });
    } catch (error: any) {
      console.error("Error in POST /api/events:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/team", (req, res) => {
    try {
      const team = db.prepare(`
        SELECT 
          u.*, 
          (SELECT COUNT(*) FROM clients WHERE account_manager_id = u.id AND lifecycle_stage != 'churned') as client_count,
          (SELECT IFNULL(SUM(retainer_amount), 0) FROM clients WHERE account_manager_id = u.id AND lifecycle_stage != 'churned') as revenue_managed,
          (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id AND status = 'completed') as total_tasks,
          (SELECT COUNT(*) FROM tasks WHERE assigned_to = u.id AND status = 'completed' AND completed_at <= due_date) as on_time_tasks,
          (SELECT IFNULL(SUM(hours), 0) FROM time_entries WHERE user_id = u.id AND date >= date('now', 'start of month')) as allocated_hours,
          (SELECT COUNT(*) FROM clients WHERE account_manager_id = u.id) as total_clients_ever,
          (SELECT COUNT(*) FROM clients WHERE account_manager_id = u.id AND lifecycle_stage != 'churned') as active_clients
        FROM users u
      `).all() as any[];

      const processedTeam = team.map(member => {
        const onTimePercentage = member.total_tasks > 0 
          ? (member.on_time_tasks / member.total_tasks) * 100 
          : 100; // Default to 100 if no tasks completed
        
        const retentionRate = member.total_clients_ever > 0
          ? (member.active_clients / member.total_clients_ever) * 100
          : 100;

        return {
          ...member,
          on_time_percentage: Math.round(onTimePercentage),
          retention_rate: Math.round(retentionRate)
        };
      });

      res.json(processedTeam);
    } catch (error: any) {
      console.error("Error in /api/team:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/clients/:id/retainer", (req, res) => {
    try {
      const retainer = db.prepare("SELECT * FROM retainers WHERE client_id = ?").get(req.params.id);
      res.json(retainer || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/clients/:id/services", (req, res) => {
    try {
      const services = db.prepare(`
        SELECT s.*, SUM(te.hours) as used_hours
        FROM services s
        JOIN retainers r ON s.retainer_id = r.id
        LEFT JOIN time_entries te ON s.id = te.service_id
        WHERE r.client_id = ?
        GROUP BY s.id
      `).all(req.params.id);
      res.json(services);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/clients/:id/time-entries", (req, res) => {
    try {
      const entries = db.prepare(`
        SELECT te.*, s.name as service_name, u.name as user_name
        FROM time_entries te
        LEFT JOIN services s ON te.service_id = s.id
        LEFT JOIN users u ON te.user_id = u.id
        WHERE te.client_id = ?
        ORDER BY te.date DESC
      `).all(req.params.id);
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/clients/:id/contracts", (req, res) => {
    try {
      const contracts = db.prepare("SELECT * FROM contracts WHERE client_id = ?").all(req.params.id);
      res.json(contracts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tasks/:id/brief", (req, res) => {
    try {
      const { brief } = req.body;
      db.prepare("UPDATE tasks SET brief = ? WHERE id = ?").run(brief, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/time-entries", (req, res) => {
    try {
      const { client_id, service_id, user_id, hours, date, description } = req.body;
      const id = `time_${Date.now()}`;
      db.prepare(`
        INSERT INTO time_entries (id, client_id, service_id, user_id, hours, date, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, client_id, service_id, user_id, hours, date, description);
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
    console.log(`AgencyOS running on http://localhost:${PORT}`);
  });
}

startServer();
