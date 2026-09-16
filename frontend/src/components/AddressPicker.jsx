import React, { useEffect, useRef, useState } from "react";
import { MapPin, ExternalLink } from "lucide-react";
import { Input } from "./ui/input";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";

const GMAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

export const mapsLink = (loc) => loc?.lat && loc?.lng ? `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}` :
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([loc?.venue, loc?.address, loc?.city].filter(Boolean).join(", "))}`;

export function MapsLink({ loc, testid }) {
  const { lang } = useApp();
  return <a data-testid={testid} href={mapsLink(loc)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-sky-300 hover:underline"><ExternalLink size={11} /> {t("open_in_maps", lang)}</a>;
}

let gmapsPromise;
function loadGoogleMaps(lang) {
  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (!gmapsPromise) {
    gmapsPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places&language=${lang || "en"}&v=weekly`;
      s.async = true; s.onload = () => resolve(window.google); s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return gmapsPromise;
}

function parseComponents(place) {
  const get = (type, short) => { const c = (place.address_components || []).find(x => x.types.includes(type)); return c ? (short ? c.short_name : c.long_name) : ""; };
  const street = [get("street_number"), get("route")].filter(Boolean).join(" ");
  const postal = [get("postal_code"), get("postal_code_suffix")].filter(Boolean).join("-");
  return {
    address: place.formatted_address || "",
    street,
    city: get("locality") || get("postal_town") || get("sublocality_level_1") || get("administrative_area_level_2") || "",
    region: get("administrative_area_level_1", true),
    postal_code: postal,
    country: get("country"),
    lat: place.geometry?.location?.lat(), lng: place.geometry?.location?.lng(),
  };
}

function MapPreview({ loc, testid }) {
  const ref = useRef();
  useEffect(() => {
    if (!loc?.lat || !ref.current || !window.google?.maps) return;
    const pos = { lat: loc.lat, lng: loc.lng };
    const map = new window.google.maps.Map(ref.current, { center: pos, zoom: 15, disableDefaultUI: true, zoomControl: true, gestureHandling: "greedy" });
    new window.google.maps.Marker({ position: pos, map, title: loc.venue || loc.address });
  }, [loc?.lat, loc?.lng]);
  if (!loc?.lat) return null;
  return <div ref={ref} data-testid={`${testid}-map`} className="mt-2 h-40 w-full rounded-lg overflow-hidden border border-white/10" />;
}

function GoogleAddressPicker({ value, onChange, testid }) {
  const { lang } = useApp();
  const inputRef = useRef();
  const [q, setQ] = useState(value?.address || "");
  const [ready, setReady] = useState(!!window.google?.maps?.places);
  useEffect(() => { loadGoogleMaps(lang).then(() => setReady(true)).catch(() => setReady(false)); }, [lang]);
  useEffect(() => {
    if (!ready || !inputRef.current) return;
    const ac = new window.google.maps.places.Autocomplete(inputRef.current, { fields: ["address_components", "geometry", "formatted_address", "name"] });
    const l = ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (!place?.geometry) return;
      const p = parseComponents(place);
      onChange({ ...p, venue: value?.venue || (place.name && place.name !== p.address.split(",")[0] ? place.name : "") });
      setQ(p.address);
    });
    return () => l.remove();
  }, [ready]);
  return (
    <div className="relative w-full">
      <div className="relative">
        <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input ref={inputRef} data-testid={`${testid}-search-input`} value={q} onChange={e => setQ(e.target.value)} placeholder={t("search_address", lang)} autoComplete="off" className="bg-white/5 border-white/10 h-9 ps-8" />
      </div>
      <MapPreview loc={value} testid={testid} />
      {value?.lat && <div className="mt-1"><MapsLink loc={value} testid={`${testid}-maps-link`} /></div>}
    </div>
  );
}

// Fallback: OpenStreetMap Nominatim (no API key); result opens in Google Maps.
function OsmAddressPicker({ value, onChange, testid }) {
  const { lang } = useApp();
  const [q, setQ] = useState(value?.address || "");
  const [results, setResults] = useState([]);
  useEffect(() => {
    if (q.trim().length < 3) { setResults([]); return; }
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&accept-language=${lang}&q=${encodeURIComponent(q)}`);
        setResults(await r.json());
      } catch { setResults([]); }
    }, 400);
    return () => clearTimeout(id);
  }, [q, lang]);
  const pick = (r) => {
    const a = r.address || {};
    onChange({ address: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon), city: a.city || a.town || a.village || a.municipality || a.county || value?.city || "", postal_code: a.postcode || "", country: a.country || "", venue: value?.venue || a.amenity || a.shop || a.tourism || "" });
    setQ(r.display_name); setResults([]);
  };
  return (
    <div className="relative w-full">
      <div className="relative">
        <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input data-testid={`${testid}-search-input`} value={q} onChange={e => setQ(e.target.value)} placeholder={t("search_address", lang)} className="bg-white/5 border-white/10 h-9 ps-8" />
      </div>
      {results.length > 0 && (
        <div data-testid={`${testid}-results`} className="absolute z-30 mt-1 w-full rounded-lg border border-white/10 bg-[#161320] shadow-xl max-h-56 overflow-auto">
          {results.map(r => <button key={r.place_id} type="button" data-testid={`${testid}-result-${r.place_id}`} onClick={() => pick(r)} className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 border-b border-white/5 last:border-0">{r.display_name}</button>)}
        </div>
      )}
      {value?.lat && <div className="mt-1"><MapsLink loc={value} testid={`${testid}-maps-link`} /></div>}
    </div>
  );
}

export default function AddressPicker(props) {
  const Picker = GMAPS_KEY ? GoogleAddressPicker : OsmAddressPicker;
  return <Picker testid="address" {...props} />;
}
