import { queryFirst, queryAll, queryRun } from '@/lib/db';

export interface NotificationPreference {
  user_id: number;
  master_enabled: number;
  in_app_enabled: number;
  browser_enabled: number;
  desktop_enabled: number;
  tasks_enabled: number;
  task_assignments: number;
  task_status_changes: number;
  task_deadlines: number;
  task_discussions: number;
  chat_messages: number;
  finance_enabled: number;
  mentions_enabled: number;
  updated_at: string;
}

export type NotificationType =
  | 'task_assigned'
  | 'task_reassigned'
  | 'task_status_changed'
  | 'task_completed'
  | 'work_link_updated'
  | 'task_discussion'
  | 'chat_message'
  | 'finance_alert';

export async function getUserNotificationPreferences(userId: number): Promise<NotificationPreference> {
  const existing = await queryFirst<NotificationPreference>(
    'SELECT * FROM notification_preferences WHERE user_id = ?',
    [userId]
  );

  if (existing) {
    return existing;
  }

  // Default preferences: Everything enabled except browser push (until user grants browser permission)
  const now = new Date().toISOString();
  await queryRun(
    `INSERT OR IGNORE INTO notification_preferences 
     (user_id, master_enabled, in_app_enabled, browser_enabled, desktop_enabled, tasks_enabled, task_assignments, task_status_changes, task_deadlines, task_discussions, chat_messages, finance_enabled, mentions_enabled, updated_at)
     VALUES (?, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, ?)`,
    [userId, now]
  );

  return {
    user_id: userId,
    master_enabled: 1,
    in_app_enabled: 1,
    browser_enabled: 0,
    desktop_enabled: 1,
    tasks_enabled: 1,
    task_assignments: 1,
    task_status_changes: 1,
    task_deadlines: 1,
    task_discussions: 1,
    chat_messages: 1,
    finance_enabled: 1,
    mentions_enabled: 1,
    updated_at: now,
  };
}

export async function createNotificationEvent(params: {
  organisationId?: number;
  recipientUserId: number;
  actorUserId?: number;
  type: NotificationType;
  title: string;
  body: string;
  targetUrl: string;
  entityType?: string;
  entityId?: number;
}): Promise<{ delivered: boolean; inApp: boolean; browser: boolean; desktop: boolean } | null> {
  const {
    organisationId = 1,
    recipientUserId,
    actorUserId,
    type,
    title,
    body,
    targetUrl,
    entityType,
    entityId,
  } = params;

  // 1. Never notify a user of their own actions
  if (actorUserId && actorUserId === recipientUserId) {
    return null;
  }

  // 2. Fetch recipient preferences
  const prefs = await getUserNotificationPreferences(recipientUserId);

  // 3. Master switch check
  if (!prefs.master_enabled) {
    return { delivered: false, inApp: false, browser: false, desktop: false };
  }

  // 4. Category-specific checks
  let isCategoryEnabled = true;
  if (type === 'task_assigned' || type === 'task_reassigned') {
    isCategoryEnabled = Boolean(prefs.tasks_enabled && prefs.task_assignments);
  } else if (type === 'task_status_changed' || type === 'task_completed') {
    isCategoryEnabled = Boolean(prefs.tasks_enabled && prefs.task_status_changes);
  } else if (type === 'work_link_updated') {
    isCategoryEnabled = Boolean(prefs.tasks_enabled && prefs.task_status_changes);
  } else if (type === 'task_discussion') {
    isCategoryEnabled = Boolean(prefs.tasks_enabled && prefs.task_discussions);
  } else if (type === 'chat_message') {
    isCategoryEnabled = Boolean(prefs.chat_messages);
  } else if (type === 'finance_alert') {
    isCategoryEnabled = Boolean(prefs.finance_enabled);
  }

  if (!isCategoryEnabled) {
    return { delivered: false, inApp: false, browser: false, desktop: false };
  }

  // 5. Duplicate protection: if exact same event was created in the last 15 seconds, ignore
  const recentDuplicate = await queryFirst<any>(`
    SELECT id FROM notification_events 
    WHERE recipient_user_id = ? AND type = ? AND entity_type = ? AND entity_id = ?
      AND created_at > datetime('now', '-15 seconds')
  `, [recipientUserId, type, entityType || '', entityId || 0]);

  if (recentDuplicate) {
    return null;
  }

  const now = new Date().toISOString();

  // 6. Save in-app notification event
  if (prefs.in_app_enabled) {
    await queryRun(`
      INSERT INTO notification_events 
      (organisation_id, recipient_user_id, actor_user_id, type, title, body, target_url, entity_type, entity_id, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `, [organisationId, recipientUserId, actorUserId || null, type, title, body, targetUrl, entityType || null, entityId || null, now]);
  }

  return {
    delivered: true,
    inApp: Boolean(prefs.in_app_enabled),
    browser: Boolean(prefs.browser_enabled),
    desktop: Boolean(prefs.desktop_enabled),
  };
}
