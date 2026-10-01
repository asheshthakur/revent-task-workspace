# VEYA — Enterprise Work & Task Management

**VEYA** is a multi-tenant enterprise task, finance, and operational work management SaaS platform engineered for modern teams and distributed organizations.

- **Canonical Application URL**: [https://app.lucidmediax.in](https://app.lucidmediax.in) (or [https://app.veya.com](https://app.veya.com))
- **Production Workers.dev Fallback**: [https://revent-task-workspace.revent-workspace.workers.dev/](https://revent-task-workspace.revent-workspace.workers.dev/)
- **Marketing / Parent Website**: [https://www.lucidmediax.in/](https://www.lucidmediax.in/) (Preserved on WordPress.com)
- **Default / Initial Workspace**: Revent (`revent`)
- **Hosting & Infrastructure**: Cloudflare Workers + Cloudflare D1 (Zero Mandatory Monthly Cost architecture, serverless edge with zero cold-start spin-down).

---

## Architecture & Technology Stack

- **Frontend Framework**: Next.js 15 (App Router, React 19)
- **Styling**: Tailwind CSS v4, Lucide React Icons
- **Edge Server Runtime**: Cloudflare Workers (`workerd` runtime) via `@opennextjs/cloudflare`
- **Database**: Cloudflare D1 (Serverless edge SQLite in production) with local SQLite fallback for dev
- **Authentication**: Stateless HMAC-SHA256 JWT sessions (`jose`), secure HTTP-only cookies, password hashing with `bcryptjs`
- **Real-Time Presence**: Edge heartbeat mechanism tracking active sessions without paid third-party services
- **Multi-Tenant SaaS**: Complete workspace isolation via `organisations`, `organisation_members`, and role-based permissions (`owner`, `admin`, `member`)
- **Key Modules**:
  - **Task Management**: Hierarchical priority ranking, multiple lifecycle stages (*Not Started*, *Started*, *Half-way*, *Completed*), *My Tasks* & *Assigned by Me* views, deadline tracking, work links, and audit history.
  - **Internal Chat**: 1-to-1 direct messaging, group chat, and task-linked discussions with unread badges.
  - **Finance & Invoicing**: Client ledger, invoice generation, PDC (Post-Dated Cheque) tracking, payment receipts, and document management.
  - **Audit Logs & Analytics**: Organizational and employee-level productivity and audit trail logs.

---

## Getting Started (Local Development)

### 1. Prerequisites
- Node.js 20+
- npm or equivalent

### 2. Installation
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local` if needed:
```bash
cp .env.example .env.local
```
> **Security Notice**: Never commit `.env*` or secret keys to version control. Production secrets are managed securely via Cloudflare Workers / Wrangler secrets.

### 4. Running the Development Server
```bash
# Standard Next.js development server
npm run dev

# Or to run the local preview server on port 3005:
npm run start -- -p 3005
```

---

## Build & Test Commands

- **Type Check**:
  ```bash
  npx tsc --noEmit
  ```
- **Next.js Production Build**:
  ```bash
  npm run build
  ```
- **Cloudflare Edge Bundle Build (OpenNext)**:
  ```bash
  npx @opennextjs/cloudflare build
  ```

---

## Production Deployment Process

The live production application runs on Cloudflare Workers edge runtime backed by Cloudflare D1.

1. **Verify Wrangler Authentication**:
   ```bash
   npx wrangler whoami
   ```
2. **Compile Cloudflare Bundle**:
   ```bash
   npx @opennextjs/cloudflare build
   ```
3. **Deploy to Cloudflare Workers**:
   ```bash
   npx wrangler deploy
   ```

*Note: Pushing code to GitHub does not trigger automatic deployment unless a GitHub Actions / Cloudflare Pages CI/CD pipeline is explicitly connected.*

---

## Database & Schema Management

- D1 schema definitions and migration scripts are located in `d1/` and `scratch/`.
- Local development stores database state in `data/revent_tasks.db` (gitignored).
- Cloudflare D1 migrations can be applied remotely via:
  ```bash
  npx wrangler d1 execute revent-production-db --file=./d1/schema.sql
  ```

---

## License

Proprietary — Internal usage for REVENT.
