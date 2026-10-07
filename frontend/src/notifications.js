/* Deadline notifications: native (Capacitor) + web fallback.
 * - Native iOS/Android: @capacitor/local-notifications, fires in background.
 * - Plain web: Web Notifications API only while the page is open (no background
 *   push without a server). Never crashes when unavailable or denied.
 */
import { LocalNotifications } from '@capacitor/local-notifications';

export function isNative() {
  try {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  } catch {
    return false;
  }
}

function toISODateLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* Stable 31-bit int id from a string key (djb2). Android needs 32-bit ints. */
export function notifId(key) {
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  return Math.abs(h) % 2000000000;
}

/* Schedule offsets, in days before the deadline. */
export const NOTIF_OFFSETS = [7, 1, 0];

function offsetKey(o) {
  return o === 0 ? '0d' : `${o}d`;
}

export function notifIdsFor(deadlineId) {
  return NOTIF_OFFSETS.map((o) => notifId(`${deadlineId}:${offsetKey(o)}`));
}

/* Fire time: 9:00 AM local on (deadline date - offset days). */
function fireDate(dateStr, offsetDays) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, 9, 0, 0, 0);
  dt.setDate(dt.getDate() - offsetDays);
  return dt;
}

const MANAGED_IDS_KEY = 'bienvenue-notif-ids';

function loadManagedIds() {
  try {
    const raw = localStorage.getItem(MANAGED_IDS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveManagedIds(ids) {
  try {
    localStorage.setItem(MANAGED_IDS_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

/**
 * Current permission state: 'granted' | 'denied' | 'prompt' | 'unsupported'.
 */
export async function getNotifPermission() {
  try {
    if (isNative()) {
      const r = await LocalNotifications.checkPermissions();
      const s = r && r.display;
      return s === 'granted' ? 'granted' : s === 'denied' ? 'denied' : 'prompt';
    }
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const p = Notification.permission;
      return p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'prompt';
    }
    return 'unsupported';
  } catch {
    return 'prompt';
  }
}

/**
 * Ask the user for permission. Returns true when granted.
 * Only call from a user gesture (toggle on / add deadline).
 */
export async function requestNotifPermission() {
  try {
    if (isNative()) {
      const r = await LocalNotifications.requestPermissions();
      return (r && r.display) === 'granted';
    }
    if (typeof window !== 'undefined' && 'Notification' in window && typeof Notification.requestPermission === 'function') {
      const p = await Notification.requestPermission();
      return p === 'granted';
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Cancel every notification we manage, then (re)schedule for the given items.
 * items: [{ id, label, date: 'YYYY-MM-DD' }] — reminders already filtered ON.
 * strings: dossier strings in the current language (title per offset).
 * fmtDate: (isoStr) => human-readable date in current language.
 * Idempotent: safe to call on every relevant state change.
 */
export async function syncDeadlineNotifications({ items, strings, fmtDate }) {
  if (!isNative()) return;
  const now = Date.now();
  try {
    const oldIds = loadManagedIds();
    if (oldIds.length) {
      await LocalNotifications.cancel({ notifications: oldIds.map((id) => ({ id })) });
    }
    const toSchedule = [];
    const newIds = [];
    for (const it of items) {
      if (!it || !it.date) continue;
      for (const o of NOTIF_OFFSETS) {
        const at = fireDate(it.date, o);
        if (at.getTime() <= now) continue; // never schedule in the past
        const id = notifId(`${it.id}:${offsetKey(o)}`);
        const title = o === 7 ? strings.notifTitle7 : o === 1 ? strings.notifTitle1 : strings.notifTitle0;
        toSchedule.push({
          id,
          title,
          body: `${it.label} — ${fmtDate(it.date)}`,
          schedule: { at },
          smallIcon: undefined,
          extra: { deadlineId: it.id },
        });
        newIds.push(id);
      }
    }
    if (toSchedule.length) {
      await LocalNotifications.schedule({ notifications: toSchedule });
    }
    saveManagedIds(newIds);
  } catch {
    /* notifications are best-effort: never break the app */
  }
}

/**
 * Cancel every notification we manage (e.g. when all reminders go off).
 */
export async function cancelAllManagedNotifications() {
  if (!isNative()) return;
  try {
    const oldIds = loadManagedIds();
    if (oldIds.length) {
      await LocalNotifications.cancel({ notifications: oldIds.map((id) => ({ id })) });
    }
    saveManagedIds([]);
  } catch {
    /* ignore */
  }
}

/* ---------------- web fallback (page open only) ---------------- */

const FIRED_KEY = 'bienvenue-notif-fired'; // { [deadlineId]: 'YYYY-MM-DD' }

function loadFired() {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    const o = raw ? JSON.parse(raw) : {};
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

/**
 * On web: if a reminder deadline is due today or tomorrow and we haven't
 * notified about it today, show a notification (page must be open).
 * items: [{ id, label, date, daysUntil }].
 */
export function checkWebDueNotifications({ items, strings, fmtDate }) {
  if (isNative()) return;
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    const fired = loadFired();
    const today = toISODateLocal(new Date());
    let changed = false;
    for (const it of items) {
      if (!it || !it.date) continue;
      const n = it.daysUntil;
      if ((n === 0 || n === 1) && fired[it.id] !== today) {
        const title = n === 0 ? strings.notifTitle0 : strings.notifTitle1;
        try {
          new Notification(title, { body: `${it.label} — ${fmtDate(it.date)}` });
          fired[it.id] = today;
          changed = true;
        } catch {
          /* ignore */
        }
      }
    }
    if (changed) {
      try {
        localStorage.setItem(FIRED_KEY, JSON.stringify(fired));
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}
