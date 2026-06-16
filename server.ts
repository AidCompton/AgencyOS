import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { GoogleGenAI } from "@google/genai";

const db = new Database("agencyos.db");
const JWT_SECRET = process.env.JWT_SECRET || "agency-os-secret-key-change-me";

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
    password_hash TEXT,
    google_id TEXT,
    role TEXT CHECK(role IN ('admin', 'account_manager', 'strategist', 'creative', 'analyst')) DEFAULT 'admin',
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

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Ensure auth fields exist in users table
try {
  db.prepare("SELECT password_hash FROM users LIMIT 1").get();
} catch (e: any) {
  if (e.message.includes("no such column: password_hash")) {
    console.log("Migrating database: adding auth fields to users table");
    db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT");
    db.exec("ALTER TABLE users ADD COLUMN google_id TEXT");
  }
}
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

// Migration: Ensure google auth token fields exist in users table
try {
  db.prepare("SELECT google_access_token FROM users LIMIT 1").get();
} catch (e: any) {
  if (e.message.includes("no such column: google_access_token")) {
    console.log("Migrating database: adding google token fields to users table");
    db.exec("ALTER TABLE users ADD COLUMN google_access_token TEXT");
    db.exec("ALTER TABLE users ADD COLUMN google_refresh_token TEXT");
    db.exec("ALTER TABLE users ADD COLUMN google_token_expiry INTEGER");
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

// Seed specific requested user for login
try {
  const existingUser = db.prepare("SELECT * FROM users WHERE email = ?").get("aidan@me.com");
  if (!existingUser) {
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync("1234567890", salt);
    db.prepare("INSERT INTO users (id, agency_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)")
      .run("user_aidan", "agency_1", "Aidan Compton", "aidan@me.com", password_hash, 'admin');
    console.log("Seeded user 'Aidan Compton' successfully.");
  }
} catch (e: any) {
  console.error("Error seeding specified user:", e.message);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // Google OAuth Token Helper
  async function getValidGoogleToken(userId: string): Promise<string | null> {
    try {
      const user = db.prepare("SELECT google_access_token, google_refresh_token, google_token_expiry FROM users WHERE id = ?").get(userId) as any;
      if (!user || !user.google_access_token) return null;

      // For mock tokens, return directly
      if (user.google_access_token.startsWith("mock_")) {
        return user.google_access_token;
      }

      const now = Date.now();
      // If token is expired or expiring in less than 5 min, refresh it
      if (user.google_token_expiry && user.google_token_expiry < now + 300000 && user.google_refresh_token && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        try {
          const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_id: process.env.GOOGLE_CLIENT_ID,
              client_secret: process.env.GOOGLE_CLIENT_SECRET,
              refresh_token: user.google_refresh_token,
              grant_type: "refresh_token"
            })
          });
          if (response.ok) {
            const data = await response.json();
            const newExpiry = Date.now() + (data.expires_in * 1000);
            db.prepare("UPDATE users SET google_access_token = ?, google_token_expiry = ? WHERE id = ?")
              .run(data.access_token, newExpiry, userId);
            return data.access_token;
          }
        } catch (e) {
          console.error("Failed to refresh Google Token:", e);
        }
      }
      return user.google_access_token;
    } catch (err) {
      console.error("Error retrieving Google token:", err);
      return null;
    }
  }

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // Auth Routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { name, email, password } = req.body;
      const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (existing) return res.status(400).json({ error: "Email already exists" });

      const password_hash = await bcrypt.hash(password, 10);
      const id = `user_${Date.now()}`;
      const agency_id = "agency_1"; // Default for demo

      db.prepare("INSERT INTO users (id, agency_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)")
        .run(id, agency_id, name, email, password_hash, 'admin');

      const token = jwt.sign({ id, email, name }, JWT_SECRET, { expiresIn: "7d" });
      res.cookie("auth_token", token, { httpOnly: true, secure: true, sameSite: 'none' });
      res.json({ success: true, user: { id, name, email } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user || !user.password_hash) return res.status(400).json({ error: "Invalid credentials" });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(400).json({ error: "Invalid credentials" });

      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
      res.cookie("auth_token", token, { httpOnly: true, secure: true, sameSite: 'none' });
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.cookie("auth_token", "", { 
      httpOnly: true, 
      secure: true, 
      sameSite: 'none', 
      expires: new Date(0),
      path: '/' 
    });
    res.json({ success: true });
  });

  app.get("/api/auth/me", (req, res) => {
    const token = req.cookies.auth_token;
    if (!token) return res.json({ user: null });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      res.json({ user: decoded });
    } catch (err) {
      res.json({ user: null });
    }
  });

  // Google OAuth Routes
  app.get("/api/auth/google/url", (req, res) => {
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const options = {
      redirect_uri: `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`,
      client_id: process.env.GOOGLE_CLIENT_ID || "MOCK_CLIENT_ID",
      access_type: "offline",
      response_type: "code",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/tasks"
      ].join(" "),
    };
    const qs = new URLSearchParams(options);
    res.json({ url: `${rootUrl}?${qs.toString()}` });
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const code = req.query.code as string;
    if (!code) return res.status(400).send("No code provided");

    let googleUser: any;
    let googleAccessToken: string | null = null;
    let googleRefreshToken: string | null = null;
    let googleTokenExpiry: number | null = null;

    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      try {
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`,
            grant_type: "authorization_code",
          }),
        });
        const tokens = await tokenRes.json();
        googleAccessToken = tokens.access_token || null;
        googleRefreshToken = tokens.refresh_token || null;
        googleTokenExpiry = tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null;

        const userRes = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${tokens.access_token}`);
        googleUser = await userRes.json();
      } catch (err) {
        console.error("Google Auth Error:", err);
        return res.status(500).send("Authentication failed");
      }
    } else {
      // Mock user for demo purposes if no keys
      googleUser = {
        id: "mock_google_id",
        email: "demo@gmail.com",
        name: "Demo User",
      };
      googleAccessToken = "mock_google_access_token_123";
      googleRefreshToken = "mock_google_refresh_token_123";
      googleTokenExpiry = Date.now() + 3600 * 1000 * 24; // 24 hours
    }

    let user = db.prepare("SELECT * FROM users WHERE email = ?").get(googleUser.email) as any;
    
    if (!user) {
      // Create user if they don't exist
      const id = `user_${Date.now()}`;
      db.prepare("INSERT INTO users (id, agency_id, name, email, google_id, role, google_access_token, google_refresh_token, google_token_expiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(id, "agency_1", googleUser.name, googleUser.email, googleUser.id, 'admin', googleAccessToken, googleRefreshToken, googleTokenExpiry);
      user = { id, name: googleUser.name, email: googleUser.email };
    } else {
      // Link Google ID and update tokens
      db.prepare(`
        UPDATE users 
        SET google_id = ?, 
            google_access_token = COALESCE(?, google_access_token), 
            google_refresh_token = COALESCE(?, google_refresh_token), 
            google_token_expiry = COALESCE(?, google_token_expiry) 
        WHERE id = ?
      `).run(googleUser.id, googleAccessToken, googleRefreshToken, googleTokenExpiry, user.id);
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("auth_token", token, { httpOnly: true, secure: true, sameSite: 'none' });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  });

  // API Routes (Protected)
  app.get("/api/agency/overview", authenticate, (req, res) => {
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

  app.get("/api/leads", authenticate, (req, res) => {
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

  app.post("/api/leads", authenticate, (req, res) => {
    try {
      const { company_name, industry, source, estimated_value } = req.body;
      const id = `lead_${Date.now()}`;
      const agency_id = "agency_1";
      db.prepare(`
        INSERT INTO leads (id, agency_id, company_name, industry, source, estimated_value)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, agency_id, company_name, industry || null, source || 'Direct', estimated_value || 0);
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/clients", authenticate, (req, res) => {
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

  app.post("/api/clients", authenticate, (req, res) => {
    try {
      const { name, lifecycle_stage, health_label, retainer_amount } = req.body;
      const id = `client_${Date.now()}`;
      const agency_id = "agency_1";
      db.prepare(`
        INSERT INTO clients (id, agency_id, name, lifecycle_stage, health_label, retainer_amount)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, agency_id, name, lifecycle_stage || 'onboarding', health_label || 'Healthy', retainer_amount || 0);
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/clients/:id", authenticate, (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const keys = Object.keys(updates);
      if (keys.length === 0) return res.status(400).json({ error: "No updates provided" });
      
      const setClause = keys.map(k => `${k} = ?`).join(", ");
      const values = [...Object.values(updates), id];
      
      db.prepare(`UPDATE clients SET ${setClause} WHERE id = ?`).run(...values);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/campaigns", authenticate, (req, res) => {
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

  app.get("/api/campaigns/:id/metrics", authenticate, (req, res) => {
    try {
      const metrics = db.prepare("SELECT * FROM campaign_metrics WHERE campaign_id = ? ORDER BY date ASC").all(req.params.id);
      res.json(metrics);
    } catch (error: any) {
      console.error("Error in /api/campaigns/:id/metrics:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tasks", authenticate, (req, res) => {
    try {
      const tasks = db.prepare("SELECT * FROM tasks").all();
      res.json(tasks);
    } catch (error: any) {
      console.error("Error in /api/tasks:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tasks", authenticate, (req, res) => {
    try {
      const { title, assigned_to, due_date, status, category, brief } = req.body;
      const id = `task_${Date.now()}`;
      db.prepare(`
        INSERT INTO tasks (id, title, assigned_to, due_date, status, category, brief)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, title, assigned_to || 'user_1', due_date || null, status || 'todo', category || 'General', brief || null);
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/events", authenticate, (req, res) => {
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

  // Global Search
  app.get("/api/search", authenticate, (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.json([]);
      const query = `%${q}%`;
      
      const clients = db.prepare("SELECT id, name, 'client' as type FROM clients WHERE name LIKE ?").all(query);
      const leads = db.prepare("SELECT id, company_name as name, 'lead' as type FROM leads WHERE company_name LIKE ?").all(query);
      const campaigns = db.prepare("SELECT id, name, 'campaign' as type FROM campaigns WHERE name LIKE ?").all(query);
      
      res.json([...clients, ...leads, ...campaigns]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Reports
  app.get("/api/reports", authenticate, (req, res) => {
    try {
      const reports = db.prepare("SELECT * FROM reports ORDER BY created_at DESC").all();
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/reports/generate", authenticate, async (req, res) => {
    try {
      const { type } = req.body;
      
      // Gather data for Gemini
      const mrr = db.prepare("SELECT SUM(amount) as total FROM retainers").get() as { total: number };
      const clientCount = db.prepare("SELECT COUNT(*) as count FROM clients").get() as { count: number };
      const topClients = db.prepare("SELECT name, health_score, health_label FROM clients ORDER BY health_score DESC LIMIT 5").all();
      const activeCampaigns = db.prepare("SELECT name, status, budget FROM campaigns WHERE status != 'completed'").all();
      
      const dataSummary = `
        Agency Overview:
        - Total MRR: $${mrr.total || 0}
        - Total Clients: ${clientCount.count}
        - Top Clients: ${JSON.stringify(topClients)}
        - Active Campaigns: ${JSON.stringify(activeCampaigns)}
      `;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a professional agency performance report based on this data: ${dataSummary}. Format as Markdown.`,
      });

      const content = response.text || "Failed to generate report content.";
      const id = `report_${Date.now()}`;
      const title = `${type.charAt(0).toUpperCase() + type.slice(1)} Performance Report - ${new Date().toLocaleDateString()}`;

      db.prepare("INSERT INTO reports (id, title, content, type) VALUES (?, ?, ?, ?)")
        .run(id, title, content, type);

      res.json({ success: true, report: { id, title, content, type, created_at: new Date().toISOString() } });
    } catch (error: any) {
      console.error("Report generation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // System Health
  app.get("/api/system/health", authenticate, (req, res) => {
    res.json({
      status: "operational",
      database: "connected",
      uptime: process.uptime(),
      version: "1.0.0",
      timestamp: new Date().toISOString()
    });
  });

  // Deletion Routes
  app.delete("/api/clients/:id", authenticate, (req, res) => {
    try {
      db.prepare("DELETE FROM clients WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/leads/:id", authenticate, (req, res) => {
    try {
      db.prepare("DELETE FROM leads WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/tasks/:id", authenticate, (req, res) => {
    try {
      db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Campaign Status Update
  app.patch("/api/campaigns/:id", authenticate, (req, res) => {
    try {
      const { status } = req.body;
      db.prepare("UPDATE campaigns SET status = ? WHERE id = ?").run(status, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/events", authenticate, (req, res) => {
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

  app.get("/api/team", authenticate, (req, res) => {
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

  app.get("/api/clients/:id/retainer", authenticate, (req, res) => {
    try {
      const retainer = db.prepare("SELECT * FROM retainers WHERE client_id = ?").get(req.params.id);
      res.json(retainer || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/clients/:id/services", authenticate, (req, res) => {
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

  app.get("/api/clients/:id/time-entries", authenticate, (req, res) => {
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

  app.get("/api/clients/:id/contracts", authenticate, (req, res) => {
    try {
      const contracts = db.prepare("SELECT * FROM contracts WHERE client_id = ?").all(req.params.id);
      res.json(contracts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tasks/:id/brief", authenticate, (req, res) => {
    try {
      const { brief } = req.body;
      db.prepare("UPDATE tasks SET brief = ? WHERE id = ?").run(brief, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/time-entries", authenticate, (req, res) => {
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

  // --- Google Workspace Sync Hub Endpoints ---

  // 1. Google Account Link Status
  app.get("/api/integrations/google/status", authenticate, async (req: any, res) => {
    try {
      const token = await getValidGoogleToken(req.user.id);
      if (!token) {
        return res.json({ connected: false });
      }
      
      // Determine if there is real credentials or fake mock key
      if (token.startsWith("mock_")) {
        return res.json({
          connected: true,
          email: `${req.user.email || 'user'}@gmail.com`,
          name: req.user.name || "Demo User",
          isMock: true
        });
      }

      // Live integration attempt
      try {
        const userRes = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (userRes.ok) {
          const googleUser = await userRes.json();
          return res.json({
            connected: true,
            email: googleUser.email,
            name: googleUser.name,
            picture: googleUser.picture,
            isMock: false
          });
        }
      } catch (err) {
        console.error("Google verify token failed:", err);
      }

      // Fallback response with db information if live fetch failed
      return res.json({
        connected: true,
        email: req.user.email,
        name: req.user.name,
        isMock: false,
        error: "Verified Offline"
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Gmail Feed
  app.get("/api/integrations/gmail/messages", authenticate, async (req: any, res) => {
    try {
      const token = await getValidGoogleToken(req.user.id);
      
      // Return high-fidelity mock emails if not connected or mock is active
      if (!token || token.startsWith("mock_")) {
        const mockEmails = [
          {
            id: "gmail_msg_1",
            from: "Marcus Vance <ceo@techflow.com>",
            subject: "Acme Retainer Pricing & Expansion",
            snippet: "Hi team, we've reviewed the proposal you sent last week. We are excited about expanding our organic search capabilities and want to lock in the retainer...",
            date: new Date(Date.now() - 3600000 * 2).toISOString(),
            label: "Inbox"
          },
          {
            id: "gmail_msg_2",
            from: "Clara Higgins <clara@acme.com>",
            subject: "[Brief] Meta Ads Creative Sign-Off",
            snippet: "Hey Sarah, I've uploaded the primary carousel designs and interest bundles for our June campaign. Let me know if you can sign off on these by Tuesday morning...",
            date: new Date(Date.now() - 3600000 * 8).toISOString(),
            label: "Acme Corp"
          },
          {
            id: "gmail_msg_3",
            from: "Douglas Kern <doug@vertexretail.io>",
            subject: "SEO Audit Feedback & Target Keywords",
            snippet: "Thanks for sending over the technical SEO audit results. Everything looks comprehensive, let's setup a brief sync on Google Meet to prioritize those redirect schemas...",
            date: new Date(Date.now() - 3600000 * 24).toISOString(),
            label: "SEO"
          },
          {
            id: "gmail_msg_4",
            from: "Google Calendar <calendar-notification@google.com>",
            subject: "New Event Created: Q3 Agency Strategy Alignment",
            snippet: "You have been invited to 'Q3 Agency Strategy Alignment' with attendees: Alex Reed, Sarah Chen, Acme Corp on June 22, 2026...",
            date: new Date(Date.now() - 3600000 * 48).toISOString(),
            label: "Calendar"
          }
        ];
        return res.json({ messages: mockEmails, source: "mock" });
      }

      // Live integration fetch
      try {
        const searchQ = req.query.q ? `?q=${encodeURIComponent(req.query.q as string)}` : "";
        const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages${searchQ}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!listRes.ok) throw new Error("Gmail API fetch failed");
        const listData = await listRes.json();
        const messages = listData.messages || [];

        // Fetch detailed content for top 10 messages
        const detailedMessages = await Promise.all(
          messages.slice(0, 10).map(async (msg: any) => {
            try {
              const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
                headers: { "Authorization": `Bearer ${token}` }
              });
              if (detailRes.ok) {
                const detail = await detailRes.json();
                const headers = detail.payload.headers;
                const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "No Subject";
                const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "Unknown";
                const dateVal = headers.find((h: any) => h.name.toLowerCase() === "date")?.value || "";
                return {
                  id: detail.id,
                  from,
                  subject,
                  snippet: detail.snippet,
                  date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
                  label: "Gmail"
                };
              }
            } catch (err) {
              console.warn("Failed retrieving detail for msg " + msg.id, err);
            }
            return null;
          })
        );
        return res.json({ messages: detailedMessages.filter(Boolean), source: "live" });
      } catch (gmailErr) {
        console.error("Failed fetching live Gmail messages:", gmailErr);
        res.status(502).json({ error: "Google API connection lost" });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Send Gmail Message
  app.post("/api/integrations/gmail/send", authenticate, async (req: any, res) => {
    try {
      const { to, subject, body } = req.body;
      if (!to || !subject || !body) {
        return res.status(400).json({ error: "Missing required mail fields" });
      }

      const token = await getValidGoogleToken(req.user.id);
      
      if (!token || token.startsWith("mock_")) {
        console.log(`[MOCK EMAIL SEND] To: ${to}, Subject: ${subject}`);
        return res.json({ success: true, messageId: `mock_send_${Date.now()}`, source: "mock" });
      }

      // RFC 2822 formatting
      const emailContent = [
        `To: ${to}`,
        `Subject: ${subject}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        body
      ].join("\r\n");

      const base64Encoded = Buffer.from(emailContent)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ raw: base64Encoded })
      });

      if (!sendRes.ok) {
        const errDetail = await sendRes.text();
        throw new Error(`Gmail API reject: ${errDetail}`);
      }

      const sendData = await sendRes.json();
      res.json({ success: true, messageId: sendData.id, source: "live" });
    } catch (err: any) {
      console.error("Gmail send error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Google Calendar Sync / Get Events
  app.get("/api/integrations/calendar/events", authenticate, async (req: any, res) => {
    try {
      const token = await getValidGoogleToken(req.user.id);

      if (!token || token.startsWith("mock_")) {
        // Return simulated meetings that sync to dashboard of AgencyOS
        const mockEvents = [
          {
            id: "cal_1",
            title: "Acme Corp PPC Kickoff & Strategy Review",
            date: new Date(Date.now() + 3600000 * 24).toISOString(), // Tomorrow
            end_date: new Date(Date.now() + 3600000 * 25).toISOString(),
            type: "meeting",
            description: "Direct sync: Review advertising deliverables, account asset structures, and initial targets."
          },
          {
            id: "cal_2",
            title: "Vanguard Team Alignment Standup",
            date: new Date(Date.now() + 3600000 * 48).toISOString(),
            end_date: new Date(Date.now() + 3600000 * 49).toISOString(),
            type: "internal",
            description: "Weekly synchronization of team loads and agency KPI targets."
          },
          {
            id: "cal_3",
            title: "Client Onboarding Touchpoint: TechFlow SaaS",
            date: new Date(Date.now() + 3600000 * 72).toISOString(),
            end_date: new Date(Date.now() + 3600000 * 73).toISOString(),
            type: "discovery",
            description: "Review questionnaire completion, share brand assets, and initiate client pipeline folders."
          },
          {
            id: "cal_4",
            title: "Q3 Agency Financial Planning",
            date: new Date(Date.now() + 3600000 * 120).toISOString(),
            end_date: new Date(Date.now() + 3600000 * 121).toISOString(),
            type: "internal",
            description: "Review Retainer margins and expansion pitches."
          }
        ];
        return res.json({ events: mockEvents, source: "mock" });
      }

      // Fetch live calendar events
      try {
        const calendarRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?orderBy=startTime&singleEvents=true&maxResults=15", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!calendarRes.ok) throw new Error("Google Calendar API fetch failed");
        const calData = await calendarRes.json();
        const calEvents = (calData.items || []).map((item: any) => ({
          id: item.id,
          title: item.summary || "Untitled Event",
          date: item.start?.dateTime || item.start?.date || "",
          end_date: item.end?.dateTime || item.end?.date || "",
          type: "meeting",
          description: item.description || ""
        }));

        // Dynamically cache these events inside our calendar_events database so they show up beautifully
        const cacheStmt = db.prepare(`
          INSERT OR IGNORE INTO calendar_events (id, agency_id, title, date, end_date, type, description)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const ev of calEvents) {
          if (ev.date) {
            cacheStmt.run(ev.id, "agency_1", ev.title, ev.date, ev.end_date, ev.type, ev.description);
          }
        }

        return res.json({ events: calEvents, source: "live" });
      } catch (calErr) {
        console.error("Live Calendar retrieve error:", calErr);
        res.status(502).json({ error: "Google Calendar connection lost" });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Create Calendar Event
  app.post("/api/integrations/calendar/events", authenticate, async (req: any, res) => {
    try {
      const { title, date, end_date, description, client_id } = req.body;
      if (!title || !date) {
        return res.status(400).json({ error: "Missing required fields (title, date)" });
      }

      const token = await getValidGoogleToken(req.user.id);
      const eventId = `event_gcal_${Date.now()}`;
      
      // Save locally first
      db.prepare(`
        INSERT INTO calendar_events (id, agency_id, client_id, title, date, end_date, type, description)
        VALUES (?, ?, ?, ?, ?, ?, 'meeting', ?)
      `).run(eventId, "agency_1", client_id || null, title, date, end_date || null, description || null);

      if (!token || token.startsWith("mock_")) {
        return res.json({ success: true, id: eventId, source: "mock" });
      }

      // Live Google Calendar insertion
      const startIso = new Date(date).toISOString();
      const endIso = end_date ? new Date(end_date).toISOString() : new Date(new Date(date).getTime() + 3600000).toISOString();

      const pushRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          summary: title,
          description: description || "Created via AgencyOS Dashboard",
          start: { dateTime: startIso },
          end: { dateTime: endIso }
        })
      });

      if (pushRes.ok) {
        const item = await pushRes.json();
        // Update local record to use GCal's ID
        db.prepare("UPDATE calendar_events SET id = ? WHERE id = ?").run(item.id, eventId);
        return res.json({ success: true, id: item.id, source: "live" });
      } else {
        const logErr = await pushRes.text();
        console.warn("Unable to push to Google Calendar, saved locally only:", logErr);
        return res.json({ success: true, id: eventId, source: "local-only", warnings: "Google Calendar rejected push" });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Google Tasks Sync Integration
  app.get("/api/integrations/tasks", authenticate, async (req: any, res) => {
    try {
      const token = await getValidGoogleToken(req.user.id);

      if (!token || token.startsWith("mock_")) {
        const mockTasks = [
          {
            id: "g_task_1",
            title: "Auditing TechFlow competitors' backlink profile [Google Tasks]",
            due: new Date(Date.now() + 3600000 * 24 * 2).toISOString().split('T')[0],
            notes: "Extract top 10 referring domains and identify target keyword gaps."
          },
          {
            id: "g_task_2",
            title: "Pitch Deck slide customization for retainer expansion [Google Tasks]",
            due: new Date(Date.now() + 3600000 * 24 * 4).toISOString().split('T')[0],
            notes: "Incorporate client success trends and renewal statistics."
          },
          {
            id: "g_task_3",
            title: "Meta Ads campaign budget redistribution proposal [Google Tasks]",
            due: new Date(Date.now() + 3600000 * 24 * 7).toISOString().split('T')[0],
            notes: "Reallocate spending from low conversion ad-sets to high performing carousels."
          }
        ];
        return res.json({ tasks: mockTasks, source: "mock" });
      }

      // Fetch live tasks from Google
      try {
        const tasksRes = await fetch("https://tasks.googleapis.com/tasks/v1/lists/@default/tasks", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!tasksRes.ok) throw new Error("Google Tasks API request failed");
        const tasksData = await tasksRes.json();
        const liveTasks = (tasksData.items || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          due: item.due ? item.due.split("T")[0] : "",
          notes: item.notes || ""
        }));

        // Automatically sync these imported items into our SQLite tasks database so they're fully interactive & assignable inside Workspace!
        const cacheStmt = db.prepare(`
          INSERT OR IGNORE INTO tasks (id, campaign_id, assigned_to, title, due_date, status, category, brief)
          VALUES (?, ?, ?, ?, ?, 'todo', 'Workspace Sync', ?)
        `);
        for (const t of liveTasks) {
          cacheStmt.run(t.id, null, req.user.id, t.title, t.due || null, t.notes || null);
        }

        return res.json({ tasks: liveTasks, source: "live" });
      } catch (tasksErr) {
        console.error("Live Tasks retrieve failed:", tasksErr);
        res.status(502).json({ error: "Google Tasks connection lost" });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Push Local Task to Google Tasks
  app.post("/api/integrations/tasks/push", authenticate, async (req: any, res) => {
    try {
      const { taskId } = req.body;
      if (!taskId) return res.status(400).json({ error: "taskId is required" });

      const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as any;
      if (!task) return res.status(404).json({ error: "Task not found" });

      const token = await getValidGoogleToken(req.user.id);
      if (!token || token.startsWith("mock_")) {
        return res.json({ success: true, notes: "Mock push successful", source: "mock" });
      }

      const postRes = await fetch("https://tasks.googleapis.com/tasks/v1/lists/@default/tasks", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: task.title,
          notes: task.brief || "Synced from AgencyOS",
          due: task.due_date ? `${task.due_date}T00:00:00.000Z` : undefined
        })
      });

      if (postRes.ok) {
        const item = await postRes.json();
        // Update local task ID to google's task ID if we like
        db.prepare("UPDATE tasks SET id = ? WHERE id = ?").run(item.id, taskId);
        return res.json({ success: true, id: item.id, source: "live" });
      } else {
        const errTxt = await postRes.text();
        console.warn("Google Tasks push rejected sync:", errTxt);
        return res.json({ success: true, notes: "Created local-only", warnings: "Google Tasks rejected sync" });
      }
    } catch (err: any) {
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
    console.log(`AgencyOS running on http://localhost:${PORT}`);
  });

  return app;
}

export const appPromise = startServer();
