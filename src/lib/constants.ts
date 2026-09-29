export const PRIORITY_MAP: Record<string, number> = {
  'V. Urgent': 1,
  'Urgent': 2,
  'EOD': 3,
  'End of Week': 4,
  '15 Days': 5,
  'End of Month': 6,
};

export const PRIORITIES = [
  'V. Urgent',
  'Urgent',
  'EOD',
  'End of Week',
  '15 Days',
  'End of Month',
] as const;

export const STATUSES = [
  'Not Started',
  'Started',
  'Half-way',
  'Completed',
] as const;

export const USER_PRESENCE_STATUSES = [
  'Online',
  'Away',
  'DND',
  'Offline',
  'Holiday',
] as const;

export type PriorityType = typeof PRIORITIES[number];
export type StatusType = typeof STATUSES[number];
export type UserPresenceStatus = typeof USER_PRESENCE_STATUSES[number];

// Users specifically authorised to reset other employees' passwords
export const PASSWORD_RESET_AUTHORISED_EMAILS = [
  'admin@company.com',
  'dhananjay@company.com',
  'baldeep@company.com',
];

export const ANIMAL_EMOJIS = [
  '🦊', '🦁', '🐼', '🐨', '🐯', '🐸', '🐧', '🐻', '🐺', '🦅', '🦄', '🦉', '🐵', '🐰'
];

// Finance Constants
export const INVOICE_PAYMENT_STATUSES = [
  'Draft',
  'Sent',
  'Pending',
  'Partially Paid',
  'Paid',
  'Overdue',
  'Cancelled',
] as const;

export const PDC_STATUSES = [
  'None',
  'Pending',
  'Received',
  'Deposited',
  'Cleared',
  'Bounced',
  'Cancelled',
] as const;

export const PAYMENT_METHODS = [
  'Bank Transfer',
  'Cheque / PDC',
  'Cash',
  'Credit Card',
  'Online',
] as const;

export type InvoicePaymentStatus = typeof INVOICE_PAYMENT_STATUSES[number];
export type PdcStatus = typeof PDC_STATUSES[number];
export type PaymentMethod = typeof PAYMENT_METHODS[number];
