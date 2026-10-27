// Pure maths for the Drift & Tide map. No DOM here, so it can be tested on its own.

export const MS_TO_KN = 1 / 0.514444;
const R_NM = 3440.065;            // Earth radius in nautical miles
const M_PER_DEG_LAT = 111320;
const rad = d => d * Math.PI / 180;
const deg = r => r * 180 / Math.PI;

// ---------- Geometry ----------
export function distanceNM(lat1, lon1, lat2, lon2) {
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(a)));
}
export function bearingDeg(lat1, lon1, lat2, lon2) {
  const y = Math.sin(rad(lon2 - lon1)) * Math.cos(rad(lat2));
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lon2 - lon1));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

// ---------- Formatting ----------
export function fmtDDM(lat, lon) {
  const one = (v, pos, neg, dw) => {
    const h = v >= 0 ? pos : neg, a = Math.abs(v);
    let d = Math.floor(a), m = (a - d) * 60;
    if (m >= 59.995) { d += 1; m = 0; }
    return `${String(d).padStart(dw, "0")}° ${m.toFixed(2).padStart(5, "0")}′ ${h}`;
  };
  return `${one(lat, "N", "S", 2)}  ${one(lon, "E", "W", 3)}`;
}
export const fmtBrg = b => String(Math.round(b) % 360).padStart(3, "0") + "°T";

// ---------- Position parsing ----------
// Accepts "-41.29, 174.78", "41 17.4S 174 46.8E", "S41 17.4 E174 46.8", "41°17'24\"S 174°46'48\"E".
export function parsePosition(text) {
  if (!text) return null;
  let s = text.toUpperCase().replace(/[°º˚'′’"″”]/g, " ").replace(/\s+/g, " ").trim();
  const re = /([NSEW])?\s*(-?\d+(?:\.\d+)?)(?:\s+(\d+(?:\.\d+)?))?(?:\s+(\d+(?:\.\d+)?))?\s*([NSEW])?/g;
  const parts = s.includes(",") ? s.split(",").map(p => p.trim()) : null;
  const take = str => { re.lastIndex = 0; const out = []; let m; while ((m = re.exec(str)) && out.length < 2) { if (m[0].trim()) out.push(m); } return out; };
  let ms = parts && parts.length === 2 ? [take(parts[0])[0], take(parts[1])[0]] : take(s);
  if (ms.length < 2 || !ms[0] || !ms[1]) return null;
  const conv = m => {
    const hemi = m[1] || m[5] || "";
    const d = parseFloat(m[2]), mi = m[3] ? parseFloat(m[3]) : 0, se = m[4] ? parseFloat(m[4]) : 0;
    if (mi >= 60 || se >= 60) return null;
    if ((m[3] && !Number.isInteger(d)) || (m[4] && !Number.isInteger(mi))) return null;
    let v = Math.abs(d) + mi / 60 + se / 3600;
    if (d < 0 || hemi === "S" || hemi === "W") v = -v;
    return { v, hemi };
  };
  let a = conv(ms[0]), b = conv(ms[1]);
  if (!a || !b) return null;
  if ("EW".includes(a.hemi) && a.hemi && "NS".includes(b.hemi) && b.hemi) [a, b] = [b, a];
  const lat = a.v, lon = b.v;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

// ---------- Time series ----------
// Builds a sampler for hourly series given as unix seconds + value arrays. Returns null outside range or on gaps.
export function sampler(times, ...series) {
  return t => {
    if (!times.length || t < times[0] || t > times[times.length - 1]) return null;
    let i = Math.min(times.length - 2, Math.max(0, Math.floor((t - times[0]) / (times[1] - times[0]))));
    while (i > 0 && times[i] > t) i--;
    while (i < times.length - 2 && times[i + 1] < t) i++;
    const f = (t - times[i]) / (times[i + 1] - times[i]);
    const out = [];
    for (const s of series) {
      const a = s[i], b = s[i + 1];
      if (a == null || b == null || Number.isNaN(a) || Number.isNaN(b)) return null;
      out.push(a + (b - a) * f);
    }
    return out;
  };
}

// Converts speed + compass direction to east/north components.
// towards=true: direction the flow goes TO (ocean currents). towards=false: direction it comes FROM (wind).
export function toUV(speed, dirDeg, towards) {
  const d = rad(towards ? dirDeg : dirDeg + 180);
  return [speed * Math.sin(d), speed * Math.cos(d)];
}

// ---------- Drift ----------
// cur: {t, u, v} m/s (flow towards); wind: {t, u, v} m/s (air moving towards, i.e. downwind vector).
// obj: leeway entry {dw:[slope%,offset cm/s,std], cwr:[...], cwl:[...]}.
// Returns tracks for the right- and left-diverging leeway solutions plus a current-only track.
export function simulateDrift({ lat, lon, t0, hours, obj, cur, wind, stepMin = 10 }) {
  const cs = sampler(cur.t, cur.u, cur.v), ws = sampler(wind.t, wind.u, wind.v);
  const dt = stepMin * 60, steps = Math.round(hours * 3600 / dt);
  const P = { right: { lat, lon }, left: { lat, lon }, current: { lat, lon } };
  const tracks = { right: [[lat, lon, t0]], left: [[lat, lon, t0]], current: [[lat, lon, t0]] };
  const move = (p, u, v) => {
    p.lat += v * dt / M_PER_DEG_LAT;
    p.lon += u * dt / (M_PER_DEG_LAT * Math.cos(rad(p.lat)));
  };
  for (let k = 0; k < steps; k++) {
    const t = t0 + k * dt + dt / 2;           // mid-step sampling
    const c = cs(t), w = ws(t);
    if (!c) return { error: "No ocean current forecast for part of this period at this spot." };
    if (!w) return { error: "No wind forecast for part of this period at this spot." };
    const [cu, cv] = c, [wu, wv] = w;
    const W = Math.hypot(wu, wv);
    const du = W > 1e-6 ? wu / W : 0, dv = W > 1e-6 ? wv / W : 0;   // downwind unit vector
    const ru = dv, rv = -du;                                        // unit vector 90° right of downwind
    const dw = Math.max(0, obj.dw[0] / 100 * W + obj.dw[1] / 100);
    const cwR = obj.cwr[0] / 100 * W + obj.cwr[1] / 100;
    const cwL = obj.cwl[0] / 100 * W + obj.cwl[1] / 100;
    move(P.right, cu + dw * du + cwR * ru, cv + dw * dv + cwR * rv);
    move(P.left, cu + dw * du + cwL * ru, cv + dw * dv + cwL * rv);
    move(P.current, cu, cv);
    const te = t0 + (k + 1) * dt;
    for (const key of ["right", "left", "current"]) tracks[key].push([P[key].lat, P[key].lon, te]);
  }
  return tracks;
}

// Instantaneous leeway (knots) and direction for display.
export function leewayNow(obj, windSpeedMs, windFromDeg) {
  const dw = Math.max(0, obj.dw[0] / 100 * windSpeedMs + obj.dw[1] / 100);
  const cw = Math.max(Math.abs(obj.cwr[0] / 100 * windSpeedMs + obj.cwr[1] / 100), Math.abs(obj.cwl[0] / 100 * windSpeedMs + obj.cwl[1] / 100));
  return { dwKn: dw * MS_TO_KN, divergenceDeg: dw > 0 ? deg(Math.atan2(cw, dw)) : 0, towards: (windFromDeg + 180) % 360 };
}

// ---------- Tides ----------
// Finds highs and lows in an hourly series with parabolic refinement.
export function findExtrema(times, vals) {
  const out = [];
  for (let i = 1; i < vals.length - 1; i++) {
    const a = vals[i - 1], b = vals[i], c = vals[i + 1];
    if (a == null || b == null || c == null) continue;
    const isMax = b >= a && b > c, isMin = b <= a && b < c;
    if (!isMax && !isMin) continue;
    const den = a - 2 * b + c;
    const off = den !== 0 ? 0.5 * (a - c) / den : 0;
    const step = times[i + 1] - times[i];
    out.push({ t: times[i] + off * step, h: b - 0.25 * (a - c) * off, type: isMax ? "HW" : "LW" });
  }
  return out;
}

// Labels a list of [t, h] tide events (LINZ highs/lows) as HW or LW.
export function labelEvents(events) {
  return events.map(([t, h], i) => {
    const p = events[i - 1], n = events[i + 1];
    const ref = p && n ? (p[1] + n[1]) / 2 : (p || n)[1];
    return { t, h, type: h > ref ? "HW" : "LW" };
  });
}
