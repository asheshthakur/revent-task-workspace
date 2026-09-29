-- Additive Migration Script for Finance Module

-- 1. Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  contact_person TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  account_owner_id INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE,
  FOREIGN KEY (account_owner_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organisation_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

-- 2. Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id INTEGER NOT NULL DEFAULT 1,
  invoice_number TEXT NOT NULL,
  client_id INTEGER NOT NULL,
  account_owner_id INTEGER,
  invoice_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AED',
  subtotal REAL NOT NULL DEFAULT 0,
  vat_rate REAL NOT NULL DEFAULT 5.0,
  vat_amount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'Pending',
  pdc_status TEXT NOT NULL DEFAULT 'None',
  notes TEXT DEFAULT '',
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (account_owner_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organisation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_num ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date);

-- 3. Create pdc_records table
CREATE TABLE IF NOT EXISTS pdc_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id INTEGER NOT NULL DEFAULT 1,
  pdc_number TEXT NOT NULL,
  client_id INTEGER NOT NULL,
  invoice_id INTEGER,
  bank_name TEXT NOT NULL,
  cheque_date TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AED',
  received_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Received',
  notes TEXT DEFAULT '',
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_pdcs_org ON pdc_records(organisation_id);
CREATE INDEX IF NOT EXISTS idx_pdcs_client ON pdc_records(client_id);
CREATE INDEX IF NOT EXISTS idx_pdcs_invoice ON pdc_records(invoice_id);
CREATE INDEX IF NOT EXISTS idx_pdcs_cheque_date ON pdc_records(cheque_date);

-- 4. Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id INTEGER NOT NULL DEFAULT 1,
  client_id INTEGER NOT NULL,
  invoice_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  payment_date TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
  payment_reference TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  recorded_by INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(organisation_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);

-- 5. Create finance_documents table
CREATE TABLE IF NOT EXISTS finance_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id INTEGER NOT NULL DEFAULT 1,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  document_type TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  file_data TEXT NOT NULL,
  uploaded_by INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_finance_docs_org ON finance_documents(organisation_id);
CREATE INDEX IF NOT EXISTS idx_finance_docs_entity ON finance_documents(entity_type, entity_id);

-- 6. Additive column to tasks: invoice_id
ALTER TABLE tasks ADD COLUMN invoice_id INTEGER DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_invoice ON tasks(invoice_id);
