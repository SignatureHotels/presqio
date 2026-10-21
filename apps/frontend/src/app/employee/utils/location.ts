export interface Fix {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
}

/**
 * Watches GPS and reports the most precise reading so far. Phones often start with a rough
 * network fix and sharpen within a few seconds.
 */
export function watchBestFix(onFix: (fix: Fix) => void, onError: (message: string) => void) {
  if (!("geolocation" in navigator)) {
    onError("This phone's browser can't share its location.");
    return () => undefined;
  }
  let best: Fix | null = null;
  const id = navigator.geolocation.watchPosition(
    (position) => {
      onError("");
      const fix: Fix = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
      };
      // Prefer the more precise reading, but never keep one older than a minute.
      const stale = best && Date.now() - new Date(best.capturedAt).getTime() > 60_000;
      if (!best || stale || fix.accuracy <= best.accuracy) {
        best = fix;
        onFix(fix);
      }
    },
    (error) =>
      onError(
        error.code === error.PERMISSION_DENIED
          ? "Location permission is off. Allow location for this site in your browser settings."
          : "We couldn't get your location. Move near a window or step outside and try again.",
      ),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}

/** Straight-line distance in metres (for the on-screen hint; the server decides). */
export function distanceMetres(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6_371_000 * Math.asin(Math.sqrt(h)));
}
