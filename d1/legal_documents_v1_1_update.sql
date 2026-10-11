-- ==============================================================================
-- VEYA — LEGAL DOCUMENTS UPDATE v1.1 (INDIAN LAW & LUCIDMEDIAX REVISION)
-- ==============================================================================

-- Deactivate outdated v1.0 documents and seed v1.1 documents
UPDATE legal_documents SET is_active = 0 WHERE version = '1.0';

INSERT OR REPLACE INTO legal_documents (id, document_type, version, title, summary, effective_date, published_date, is_active, changelog_notes)
VALUES 
('tos_v1_1', 'TERMS_OF_SERVICE', '1.1', 'Terms of Service', 'Governs access to VEYA workspaces, user accounts, customer content ownership, acceptable use, and electronic contracting under Indian law.', '2026-10-11', '2026-10-11', 1, 'Updated contracting party to LucidMediax (India MSME Udyam registered enterprise), governing law to India, GST references, and electronic contracting under Section 10A of IT Act 2000.'),
('privacy_v1_1', 'PRIVACY_POLICY', '1.1', 'Privacy Policy', 'Details data processing activities, lawful basis, retention schedules, and grievance redressal under Indian data protection legislation (including DPDP Act, 2023 and IT Act, 2000).', '2026-10-11', '2026-10-11', 1, 'Updated data protection framework to Digital Personal Data Protection Act 2023 and IT Act 2000, designated grievance officer contact info.lucidmediax@gmail.com, and aligned cross-border transfer rules.'),
('dpa_v1_1', 'DPA', '1.1', 'Data Processing Agreement', 'Defines B2B Customer Controller vs VEYA Processor obligations, security measures, and subprocessor authorizations under applicable Indian law.', '2026-10-11', '2026-10-11', 1, 'Updated contracting party to LucidMediax, aligned with DPDP Act 2023, and established Indian governing law.'),
('sla_v1_1', 'SLA', '1.1', 'Service Level Agreement', 'Outlines service target availability, support response time tiers, and maintenance communication windows.', '2026-10-11', '2026-10-11', 1, 'Updated support contact to info.lucidmediax@gmail.com and confirmed Indian legal jurisdiction.'),
('aup_v1_1', 'ACCEPTABLE_USE', '1.1', 'Acceptable Use Policy', 'Specifies prohibited security actions, unauthorized access attempts, abusive content, and API usage boundaries.', '2026-10-11', '2026-10-11', 1, 'Updated compliance reference to laws of India and security reporting channel.'),
('retention_v1_1', 'DATA_RETENTION', '1.1', 'Data Retention & Deletion Policy', 'Details lifecycle timelines for active, archived, soft-deleted, and customer-requested hard deletion of workspace data.', '2026-10-11', '2026-10-11', 1, 'Harmonized data minimization principles under DPDP Act 2023 and contact channels.'),
('security_v1_1', 'SECURITY_OVERVIEW', '1.1', 'Security & Privacy Architecture', 'Technical overview of tenant isolation, edge encryption in transit, session auth, and access control model.', '2026-10-11', '2026-10-11', 1, 'Confirmed factual technical controls, subprocessor edge network, and vulnerability disclosure.');

-- Archive / Deactivate public order form template in catalog
UPDATE legal_documents SET is_active = 0, changelog_notes = 'Withdrawn from public catalog; preserved as private internal commercial contracting template.' WHERE id = 'order_form_v1';
