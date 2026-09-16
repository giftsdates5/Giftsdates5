// Browser geolocation + free reverse-geocoding (no API key required).
// Uses the device GPS/Wi-Fi location (phone or laptop) via navigator.geolocation,
// then resolves a human-readable city/country with BigDataCloud's free client API.

export function getBrowserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("geolocation_unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}

export async function reverseGeocode(lat, lng, lang = "en") {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=${encodeURIComponent(lang)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("reverse_failed");
    const d = await res.json();
    const city = d.city || d.locality || d.principalSubdivision || "";
    const country = d.countryName || "";
    return { city, country };
  } catch {
    return { city: "", country: "" };
  }
}

// One-shot: detect the user's coordinates and resolve city/country.
export async function detectLocation(lang = "en") {
  const pos = await getBrowserPosition();
  const place = await reverseGeocode(pos.lat, pos.lng, lang);
  return { lat: pos.lat, lng: pos.lng, ...place };
}

// Format a distance (in km) into a short, localized "X km / X m away" string.
export function formatDistance(km, t, lang) {
  if (km == null || isNaN(km)) return null;
  if (km < 1) return `${Math.max(1, Math.round(km * 1000))} ${t("m_away", lang)}`;
  if (km < 10) return `${km.toFixed(1)} ${t("km_away", lang)}`;
  return `${Math.round(km)} ${t("km_away", lang)}`;
}
