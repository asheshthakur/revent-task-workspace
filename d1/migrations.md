# Database Schema & Migrations

This folder maintains the relational database schemas for **REVENT Task Workspace** running on Cloudflare D1 (and SQLite locally).

### Schema Evolution:
1. `schema.sql`: Core schema (users, sessions, tasks, task_assignment_history, task_status_history, audit_logs, conversations, conversation_members, messages).
2. Multi-tenant Schema (`organisations`, `organisation_members`, `organisation_invitations`, plus `organisation_id` scopes on all entities).
3. Finance Module Schema (`clients`, `invoices`, `pdc_records`, `payments`, `finance_documents`, and `invoice_id` foreign key on tasks).

See `d1/schema.sql` and `scratch/migration_finance.sql` for full declarative statements.
