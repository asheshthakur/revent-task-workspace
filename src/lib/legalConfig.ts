/**
 * Centralized Legal & Commercial Configuration for VEYA.
 * 
 * Provides an authoritative single source of truth for:
 * - Legal Entity details and contact addresses
 * - Document versions and effective dates
 * - Governing law & dispute jurisdiction
 * - Commercial plans, seat limits, and features
 * - Data retention windows and operational deletion lifecycle
 * - Verified third-party subprocessors & infrastructure providers
 */

export interface SubprocessorInfo {
  name: string;
  role: string;
  processingLocation: string;
  entityName: string;
  privacyPolicyUrl: string;
}

export interface PricingPlan {
  id: 'free' | 'pro' | 'business' | 'enterprise';
  name: string;
  badge?: string;
  description: string;
  priceMonthlyUSD: number | null; // null for custom/enterprise
  priceAnnualMonthlyUSD: number | null;
  seatLimit: number | null; // null for unlimited
  features: string[];
  recommended?: boolean;
  ctaText: string;
  ctaHref: string;
}

export const VEYA_LEGAL_CONFIG = {
  // Brand & Platform
  PRODUCT_NAME: 'VEYA',
  PRODUCT_TAGLINE: "Team Workspace for Tasks, Collaboration & Work Management",
  PRODUCTION_DOMAIN: 'app.lucidmediax.in',
  PRODUCTION_BASE_URL: 'https://app.lucidmediax.in',
  
  // Legal Entity Details
  // [LEGAL REVIEW REQUIRED: Confirm official incorporated trade license entity name, registration number, and VAT registration]
  LEGAL_ENTITY_NAME: 'Lucid Media FZ-LLC [LEGAL REVIEW REQUIRED: Confirm incorporated entity]',
  TRADE_NAME: 'Lucid Media',
  REGISTRATION_NUMBER: '[LEGAL REVIEW REQUIRED: Commercial License / Registration Number]',
  TAX_VAT_NUMBER: '[LEGAL REVIEW REQUIRED: UAE TRN / Tax Registration Number]',
  REGISTERED_ADDRESS: 'Dubai, United Arab Emirates [LEGAL REVIEW REQUIRED: Complete registered office address]',
  JURISDICTION_COUNTRY: 'United Arab Emirates',
  
  // Applicable Laws & Dispute Resolution
  // UAE Federal Decree-Law No. 45 of 2021 on Personal Data Protection (PDPL)
  // UAE Federal Decree-Law No. 46 of 2021 on Electronic Transactions and Trust Services
  GOVERNING_LAW: 'Laws of the United Arab Emirates as applied in the Emirate of Dubai [LEGAL REVIEW REQUIRED]',
  DISPUTE_JURISDICTION: 'Competent Courts of Dubai, United Arab Emirates [LEGAL REVIEW REQUIRED]',
  
  // Official Contact Channels
  LEGAL_EMAIL: 'legal@lucidmediax.in',
  PRIVACY_EMAIL: 'privacy@lucidmediax.in',
  DPO_EMAIL: 'dpo@lucidmediax.in',
  SUPPORT_EMAIL: 'support@lucidmediax.in',
  BILLING_EMAIL: 'billing@lucidmediax.in',
  SECURITY_EMAIL: 'security@lucidmediax.in',

  // Document Versioning and Effective Dates
  DOCUMENTS: {
    TERMS_OF_SERVICE: {
      type: 'TERMS_OF_SERVICE',
      title: 'Terms of Service',
      version: '1.0',
      effectiveDate: '2026-10-08',
      publishedDate: '2026-10-08',
      route: '/legal/terms',
      summary: 'Governs access to VEYA workspaces, user accounts, customer content ownership, and operational acceptable use.',
    },
    PRIVACY_POLICY: {
      type: 'PRIVACY_POLICY',
      title: 'Privacy Policy',
      version: '1.0',
      effectiveDate: '2026-10-08',
      publishedDate: '2026-10-08',
      route: '/legal/privacy',
      summary: 'Details data processing activities, lawful basis under UAE PDPL, retention periods, and data subject rights.',
    },
    DPA: {
      type: 'DPA',
      title: 'Data Processing Agreement',
      version: '1.0',
      effectiveDate: '2026-10-08',
      publishedDate: '2026-10-08',
      route: '/legal/dpa',
      summary: 'Defines B2B Customer Controller vs VEYA Processor obligations, security measures, and subprocessor authorizations.',
    },
    SLA: {
      type: 'SLA',
      title: 'Service Level Agreement',
      version: '1.0',
      effectiveDate: '2026-10-08',
      publishedDate: '2026-10-08',
      route: '/legal/sla',
      summary: 'Outlines service target availability, support response time tiers, and maintenance communication windows.',
    },
    ACCEPTABLE_USE: {
      type: 'ACCEPTABLE_USE',
      title: 'Acceptable Use Policy',
      version: '1.0',
      effectiveDate: '2026-10-08',
      publishedDate: '2026-10-08',
      route: '/legal/acceptable-use',
      summary: 'Specifies prohibited security actions, unauthorized access attempts, abusive content, and API usage boundaries.',
    },
    DATA_RETENTION: {
      type: 'DATA_RETENTION',
      title: 'Data Retention & Deletion Policy',
      version: '1.0',
      effectiveDate: '2026-10-08',
      publishedDate: '2026-10-08',
      route: '/legal/data-retention',
      summary: 'Details lifecycle timelines for active, archived, soft-deleted, and customer-requested hard deletion of workspace data.',
    },
    SECURITY_OVERVIEW: {
      type: 'SECURITY_OVERVIEW',
      title: 'Security & Privacy Architecture',
      version: '1.0',
      effectiveDate: '2026-10-08',
      publishedDate: '2026-10-08',
      route: '/legal/security',
      summary: 'Technical overview of tenant isolation, edge encryption in transit, session auth, and access control model.',
    },
    ORDER_FORM_TEMPLATE: {
      type: 'ORDER_FORM',
      title: 'Master Subscription Order Form',
      version: '1.0',
      effectiveDate: '2026-10-08',
      publishedDate: '2026-10-08',
      route: '/legal/order-form',
      summary: 'Standard contractual order form template for B2B commercial agreements, plan tiers, and seat commitments.',
    },
  },

  // Operational Subprocessors (strictly audited from current architecture)
  SUBPROCESSORS: [
    {
      name: 'Cloudflare, Inc.',
      role: 'Global Edge Cloud compute (Workers), edge routing, distributed SQLite database (D1), object KV storage (FILES_KV), and DDoS/WAF protection.',
      processingLocation: 'Global Edge Network (including UAE / Middle East Edge Points of Presence)',
      entityName: 'Cloudflare, Inc. (101 Townsend St, San Francisco, CA 94107, USA)',
      privacyPolicyUrl: 'https://www.cloudflare.com/privacypolicy/',
    },
    {
      name: 'Google Workspace (Google LLC / Google Cloud)',
      role: 'Outbound transactional email dispatch via Google Apps Script and MailApp relay.',
      processingLocation: 'United States / Global Google Cloud infrastructure',
      entityName: 'Google LLC (1600 Amphitheatre Parkway, Mountain View, CA 94043, USA)',
      privacyPolicyUrl: 'https://policies.google.com/privacy',
    },
  ] as SubprocessorInfo[],

  // Service Level Commitments (aligned with current edge serverless architecture)
  SLA_COMMITMENTS: {
    // Target availability commitment
    TARGET_AVAILABILITY_PERCENT: 99.5, // Realistic standard B2B SaaS target for edge architecture
    ENTERPRISE_AVAILABILITY_PERCENT: 99.9, // Configurable target for Enterprise custom terms
    PLANNED_MAINTENANCE_ADVANCE_NOTICE_HOURS: 48,
    EMERGENCY_MAINTENANCE_COMMUNICATION_MINUTES: 30,
    SUPPORT_HOURS: 'Sunday – Thursday, 9:00 AM – 6:00 PM Gulf Standard Time (GST / UTC+4)',
    SEVERITY_LEVELS: [
      {
        severity: 'Severity 1 (Critical Outage)',
        definition: 'Production platform completely unavailable or primary business operations blocked for all users in a tenant.',
        targetInitialResponse: 'Within 2 business hours',
        targetStatusUpdates: 'Every 2 hours until resolution or workaround',
      },
      {
        severity: 'Severity 2 (High / Degraded)',
        definition: 'Core platform feature impaired (e.g. Chat or Tasks partially failing) with substantial operational impact.',
        targetInitialResponse: 'Within 4 business hours',
        targetStatusUpdates: 'Every 6 business hours',
      },
      {
        severity: 'Severity 3 (Medium / Standard)',
        definition: 'Non-critical function bug or inquiry; platform remains operational with workaround available.',
        targetInitialResponse: 'Within 1 business day',
        targetStatusUpdates: 'As updates become available',
      },
      {
        severity: 'Severity 4 (Low / General Inquiry)',
        definition: 'General product inquiries, feature requests, or minor cosmetic issues.',
        targetInitialResponse: 'Within 2 business days',
        targetStatusUpdates: 'Standard support queue updates',
      },
    ],
  },

  // Data Retention and Operational Lifecycles
  RETENTION_WINDOWS: {
    ACTIVE_WORKSPACE_DATA: 'Retained for active duration of customer organization subscription.',
    SESSION_TOKEN_EXPIRY_DAYS: 30,
    PASSWORD_RESET_TOKEN_EXPIRY_MINUTES: 30,
    AUDIT_LOG_RETENTION_DAYS: 365, // 1 year compliance audit log retention
    BACKUP_RETENTION_DAYS: 30, // Point-in-time database snapshot window
    DEACTIVATED_USER_GRACE_PERIOD_DAYS: 90,
    ORGANISATION_TERMINATION_GRACE_PERIOD_DAYS: 30, // Customer data export window following subscription termination
    HARD_DELETION_PURGE_WINDOW_DAYS: 14, // Maximum window to purge soft-deleted customer data after retention period expires
  },

  // Commercial Pricing & Plan Models
  PRICING_PLANS: [
    {
      id: 'free',
      name: 'Free Workspace',
      description: 'Essential task coordination and collaboration for small teams starting out.',
      priceMonthlyUSD: 0,
      priceAnnualMonthlyUSD: 0,
      seatLimit: 5,
      ctaText: 'Get Started Free',
      ctaHref: '/signup',
      features: [
        'Up to 5 team members',
        'Direct 1-on-1 & channel team chat',
        'Task management & priority ranking',
        'Personal task boards',
        'Community support',
        'Standard data export (JSON/CSV)',
      ],
    },
    {
      id: 'pro',
      name: 'Team Pro',
      badge: 'Popular for Growing Teams',
      description: 'Comprehensive workload tracking, time logging, and project milestones.',
      priceMonthlyUSD: 12, // per seat/month [LEGAL / BUSINESS REVIEW REQUIRED]
      priceAnnualMonthlyUSD: 10,
      seatLimit: 25,
      recommended: true,
      ctaText: 'Start Pro Trial',
      ctaHref: '/signup?plan=pro',
      features: [
        'Up to 25 team members',
        'Full Project & Milestone lifecycle management',
        'Native time tracking & active timers',
        'Client & external guest portal access',
        'Operational reporting & department breakdown',
        'Standard SLA (99.5% availability target)',
        'Next-business-day email support',
      ],
    },
    {
      id: 'business',
      name: 'Business Operations',
      badge: 'For Fast-Scaling SMEs',
      description: 'Advanced capacity management, operational finance overview, and automations.',
      priceMonthlyUSD: 24, // per seat/month [LEGAL / BUSINESS REVIEW REQUIRED]
      priceAnnualMonthlyUSD: 20,
      seatLimit: 100,
      ctaText: 'Upgrade to Business',
      ctaHref: '/signup?plan=business',
      features: [
        'Up to 100 team members',
        'Workload capacity balancing & planning',
        'Operational finance (Invoices, PDC, and Payments)',
        'Custom workspace automations & triggers',
        'Organization audit log exports (1-year retention)',
        'Enhanced support (Severity 1 response within 2 business hours)',
        'Designated account manager',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise Custom',
      badge: 'Tailored B2B',
      description: 'Custom legal agreements, DPA execution, custom SLA tiers, and high-volume seats.',
      priceMonthlyUSD: null, // Custom quote
      priceAnnualMonthlyUSD: null,
      seatLimit: null, // Unlimited
      ctaText: 'Contact Enterprise Sales',
      ctaHref: '/legal/order-form',
      features: [
        'Unlimited team members and multi-tenant workspaces',
        'Negotiable Master Services Agreement (MSA) & Custom DPA',
        'Dedicated 99.9% availability SLA target & financial service credits',
        'Custom subprocessor review and localized audit support',
        'Executive business reviews and prioritized roadmap input',
        'Invoiced payment options with UAE VAT tax invoices (TRN)',
        '24/7 Severity 1 emergency escalations',
      ],
    },
  ] as PricingPlan[],
};
