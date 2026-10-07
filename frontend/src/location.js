/* Emergency location sharing.
 * - Native iOS/Android: @capacitor/geolocation (permission prompt handled by OS).
 * - Plain web: navigator.geolocation.
 * Location is obtained ONLY on user tap, stays on device, and nothing is sent
 * anywhere unless the user presses a share button. Never crashes when
 * geolocation is unavailable or denied.
 */
import { Geolocation } from '@capacitor/geolocation';

export function isNative() {
  try {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  } catch {
    return false;
  }
}

/**
 * Resolve with { lat, lng } or reject with an Error whose message is one of:
 * 'denied' | 'timeout' | 'unavailable'.
 */
export function getPosition() {
  if (isNative()) {
    return (async () => {
      try {
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
          const req = await Geolocation.requestPermissions();
          if (req.location !== 'granted' && req.coarseLocation !== 'granted') {
            throw new Error('denied');
          }
        }
      } catch (err) {
        if (err && err.message === 'denied') throw err;
        throw new Error('denied');
      }
      try {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        });
        return { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch {
        throw new Error('unavailable');
      }
    })();
  }

  // Web fallback.
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('unavailable'));
      return;
    }
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('timeout'));
      }
    }, 20000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (err && err.code === 1) reject(new Error('denied'));
        else if (err && err.code === 3) reject(new Error('timeout'));
        else reject(new Error('unavailable'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}

export function mapsLink(lat, lng) {
  return `https://www.google.com/maps?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
}

/* Keep only digits and a leading + for tel:/sms: URIs. */
export function cleanPhone(raw) {
  const s = String(raw || '').trim();
  const plus = s.startsWith('+') ? '+' : '';
  return plus + s.replace(/[^0-9]/g, '');
}

/* iOS uses `sms:number&body=`, Android/web use `sms:number?body=`. */
export function isIOS() {
  try {
    if (window.Capacitor && window.Capacitor.getPlatform) {
      if (window.Capacitor.getPlatform() === 'ios') return true;
    }
  } catch {
    /* ignore */
  }
  return /iPad|iPhone|iPod/.test(navigator.userAgent || '');
}

export function smsUri(phone, body) {
  const enc = encodeURIComponent(body);
  const sep = isIOS() ? '&' : '?';
  if (phone) return `sms:${phone}${sep}body=${enc}`;
  // No recipient: open the composer and let the user pick one.
  return isIOS() ? `sms:?&body=${enc}` : `sms:?body=${enc}`;
}

export function whatsappUri(body) {
  return `https://wa.me/?text=${encodeURIComponent(body)}`;
}
