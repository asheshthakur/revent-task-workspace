-- ==============================================================================
-- VEYA — LEGAL DOCUMENTS UPDATE v1.2 (DATA RETENTION D1 RECOVERY WINDOW REALIGNMENT)
-- ==============================================================================

-- Deactivate v1.1 DATA_RETENTION document and seed v1.2
UPDATE legal_documents SET is_active = 0 WHERE document_type = 'DATA_RETENTION' AND version = '1.1';

INSERT OR REPLACE INTO legal_documents (id, document_type, version, title, summary, effective_date, published_date, is_active, changelog_notes)
VALUES 
('retention_v1_2', 'DATA_RETENTION', '1.2', 'Data Retention & Deletion Policy', 'Details lifecycle timelines for active, archived, soft-deleted, and customer-requested hard deletion of workspace data, distinguishing the 30-day export grace period, active database purge, immediate KV object erasure, and the 7-day Cloudflare D1 Time Travel recovery window.', '2026-10-11', '2026-10-11', 1, 'Corrected Cloudflare D1 disaster recovery window disclosure from 30 days to 7 days to match Workers Free plan Time Travel. Distinguished immediate KV object erasure.');
