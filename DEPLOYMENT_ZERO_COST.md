# Cloudflare Pages + D1 (Zero Mandatory Cost) Deployment Guide

This document explains how to deploy **REVENT Task Workspace** to Cloudflare Pages & Cloudflare D1 with **₹0 / $0 monthly hosting bill** and **no inactivity sleeping**.

## Why this architecture stays free forever:
1. **Cloudflare Pages / Workers**: Free plan includes 100,000 requests/day, unlimited static asset requests, and zero cold-start spin-down.
2. **Cloudflare D1 (Serverless SQLite)**: Free plan includes 5,000,000 read rows/day, 100,000 write rows/day, and 5 GB storage.
3. **No Container / VPS Sleeping**: Traditional free VPS or container platforms (Heroku, Render free tier) sleep after 15 minutes of inactivity. Cloudflare Pages and D1 are serverless edge instances that respond instantly whether accessed after 5 minutes or 5 weeks of zero traffic.

---

## 3-Step Production Deployment

### Step 1: Create Free Cloudflare D1 Database
In your Cloudflare dashboard (or via npx wrangler):
```bash
npx wrangler d1 create revent-production-db
```
Copy the generated `database_id` into `wrangler.toml`.

Apply the database schema:
```bash
npx wrangler d1 execute revent-production-db --file=./d1/schema.sql
```

### Step 2: Seed Initial Accounts & Organizational Data
Export existing database seed directly from the Admin settings UI or execute:
```bash
npx wrangler d1 execute revent-production-db --file=./d1/seed.sql
```

### Step 3: Deploy to Cloudflare Pages
Link your Git repository to **Cloudflare Pages**:
- **Framework preset**: Next.js (Edge / Pages)
- **Build command**: `npx @cloudflare/next-on-pages@1`
- **Output directory**: `.vercel/output/static`
- **Environment variables**:
  - `NODE_VERSION` = `20`
  - `JWT_SECRET` = `your-secure-random-secret`

---

## Production Cost Check

| Component | Provider | Free Tier Limit | Monthly Cost | Required Paid Plan? |
|---|---|---|---|---|
| Frontend Hosting | Cloudflare Pages | Unlimited bandwidth, 500 builds/mo | ₹0 | No |
| Backend Runtime | Cloudflare Workers | 100,000 requests/day | ₹0 | No |
| Database | Cloudflare D1 | 5M row reads/day, 100k row writes/day | ₹0 | No |
| Real-Time Presence | Edge Heartbeats | ~1,200 reqs/employee/workday (<15k/day) | ₹0 | No |
| Authentication | Built-in JWT + Sessions | Integrated edge session validation | ₹0 | No |
| Domain | *.pages.dev | Free SSL subdomain included | ₹0 | No |

Total Monthly Cost: **₹0 / $0**
