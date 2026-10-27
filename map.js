import * as L from "./vendor/leaflet.esm.js";
import * as C from "./calc.js";
import { LEEWAY } from "./leeway.js";

const CFG = window.SWEEP_CONFIG || {};
const $ = id => document.getElementById(id);
const ORANGE = "#e2550f", BLUE = "#1f6fd1";
const OBJECTS = Object.fromEntries(LEEWAY.flatMap(g => g.items.map(i => [i.id, i])));

// ---------- Saved settings ----------
const store = {
  get() { try { return JSON.parse(localStorage.getItem("sw-map")) || {}; } catch (e) { return {}; } },
  set(patch) { try { localStorage.setItem("sw-map", JSON.stringify(Object.assign(store.get(), patch))); } catch (e) {} }
};
const saved = store.get();

// ---------- Map ----------
const map = L.map("map", { zoomControl: true, worldCopyJump: true }).setView([-41.0, 173.5], 5);
const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
});
const bases = { "Map": osm };
if (CFG.linzApiKey) {
  bases["NZ aerial (LINZ)"] = L.tileLayer(
    "https://basemaps.linz.govt.nz/v1/tiles/aerial/3857/{z}/{x}/{y}.webp?api=" + encodeURIComponent(CFG.linzApiKey), {
      maxZoom: 20,
      attribution: '<a href="https://www.linz.govt.nz/linz-copyright" target="_blank" rel="noopener">LINZ CC BY 4.0</a> © <a href="https://www.linz.govt.nz/data/linz-data/linz-basemaps/data-attribution" target="_blank" rel="noopener">Imagery Basemap contributors</a>'
    });
}
const seamarks = L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", {
  maxZoom: 18, attribution: '© <a href="https://www.openseamap.org" target="_blank" rel="noopener">OpenSeaMap</a>'
});
const baseName = bases[saved.base] ? saved.base : "Map";
bases[baseName].addTo(map);
if (saved.seamarks !== false) seamarks.addTo(map);
L.control.layers(bases, { "Seamarks": seamarks }, { position: "topright" }).addTo(map);
L.control.scale({ imperial: false }).addTo(map);
map.on("baselayerchange", e => store.set({ base: e.name }));
map.on("overlayadd overlayremove", e => { if (e.layer === seamarks) store.set({ seamarks: e.type === "overlayadd" }); });

const lkpIcon = L.divIcon({ className: "", html: '<div class="lkp-icon"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
let lkpMarker = null;
const driftLayer = L.layerGroup().addTo(map);

// ---------- State ----------
const S = { lat: null, lon: null, data: null, dataKey: null, loading: null, fit: false };

// ---------- Controls ----------
const objSel = $("obj");
for (const g of LEEWAY) {
  const og = document.createElement("optgroup"); og.label = g.group;
  for (const it of g.items) { const o = document.createElement("option"); o.value = it.id; o.textContent = it.name; og.appendChild(o); }
  objSel.appendChild(og);
}
objSel.value = OBJECTS[saved.obj] ? saved.obj : "PIW-1";
$("hours").value = saved.hours && [...$("hours").options].some(o => o.value === String(saved.hours)) ? String(saved.hours) : "6";

function localInputValue(d) {
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
const now0 = new Date(); now0.setSeconds(0, 0); now0.setMinutes(now0.getMinutes() - now0.getMinutes() % 5);
$("t0").value = localInputValue(now0);

objSel.addEventListener("change", () => { store.set({ obj: objSel.value }); renderDrift(); });
$("hours").addEventListener("change", () => { store.set({ hours: +$("hours").value }); renderDrift(); });
$("t0").addEventListener("change", renderDrift);

// Tabs
for (const [tab, panel] of [["tab-drift", "panel-drift"], ["tab-tide", "panel-tide"]]) {
  $(tab).addEventListener("click", () => {
    for (const [t2, p2] of [["tab-drift", "panel-drift"], ["tab-tide", "panel-tide"]]) {
      $(t2).setAttribute("aria-selected", String(t2 === tab)); $(p2).hidden = p2 !== panel;
    }
    if (panel === "panel-tide") renderTide();
  });
}
// Sheet collapse
$("sheet-toggle").addEventListener("click", () => {
  const c = $("sheet").classList.toggle("collapsed");
  $("sheet-toggle").setAttribute("aria-expanded", String(!c));
  setTimeout(() => map.invalidateSize(), 50);
});

// Position entry
const dlg = $("dlg-pos");
$("btn-pos").addEventListener("click", () => {
  $("pos-err").hidden = true;
  if (S.lat != null) $("pos-in").value = C.fmtDDM(S.lat, S.lon).replace(/[°′]/g, "").replace(/\s+/g, " ");
  dlg.showModal(); $("pos-in").focus(); $("pos-in").select();
});
$("pos-cancel").addEventListener("click", () => dlg.close());
$("form-pos").addEventListener("submit", e => {
  const p = C.parsePosition($("pos-in").value);
  if (!p) { e.preventDefault(); $("pos-err").hidden = false; return; }
  setDatum(p.lat, p.lon, true);
});
$("btn-loc").addEventListener("click", () => {
  if (!navigator.geolocation) return status("drift", "This device can't share its location.", true);
  $("btn-loc").disabled = true;
  navigator.geolocation.getCurrentPosition(
    pos => { $("btn-loc").disabled = false; setDatum(pos.coords.latitude, pos.coords.longitude, true); },
    () => { $("btn-loc").disabled = false; showSheetBody(); status("drift", "Location unavailable. Check location permission for this site, or enter the position instead.", true); },
    { enableHighAccuracy: true, timeout: 15000 });
});
$("btn-copy").addEventListener("click", async () => {
  const txt = `${C.fmtDDM(S.lat, S.lon)}  (${S.lat.toFixed(5)}, ${S.lon.toFixed(5)})`;
  try { await navigator.clipboard.writeText(txt); $("btn-copy").textContent = "Copied"; }
  catch (e) { const r = document.createRange(); r.selectNodeContents($("pos-ddm")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); $("btn-copy").textContent = "Selected"; }
  setTimeout(() => ($("btn-copy").textContent = "Copy"), 1500);
});

map.on("click", e => setDatum(e.latlng.lat, e.latlng.lng, false));

// ---------- Helpers ----------
function status(which, msg, isErr) {
  const el = $(which + "-status"); el.textContent = msg || ""; el.classList.toggle("err", !!isErr); el.hidden = !msg;
}
const fmtTime = (t, tz) => new Intl.DateTimeFormat("en-NZ", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(t * 1000));
const fmtClock = (t, tz) => new Intl.DateTimeFormat("en-NZ", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(t * 1000));
const kn = ms => (ms * C.MS_TO_KN).toFixed(1);
const wrapLon = lon => ((lon + 540) % 360) - 180;
function showSheetBody() { $("sheet-empty").hidden = true; $("sheet-body").hidden = false; }

// ---------- Datum ----------
function setDatum(lat, lon, pan) {
  lon = wrapLon(lon);
  S.lat = lat; S.lon = lon; S.fit = true;
  store.set({ lat, lon });
  if (!lkpMarker) lkpMarker = L.marker([lat, lon], { icon: lkpIcon, keyboard: false, zIndexOffset: 1000 }).addTo(map);
  else lkpMarker.setLatLng([lat, lon]);
  if (pan) map.setView([lat, lon], Math.max(map.getZoom(), 10));
  showSheetBody();
  $("pos-ddm").textContent = C.fmtDDM(lat, lon);
  $("pos-dec").textContent = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  $("sheet").classList.remove("collapsed");
  setTimeout(() => map.invalidateSize(), 50);
  loadData();
}

// ---------- Data ----------
const SPEED_TO_MS = { "km/h": 1 / 3.6, "m/s": 1, "kn": 0.514444, "knots": 0.514444, "mp/h": 0.44704, "mph": 0.44704 };

async function getJSON(url, signal) {
  const r = await fetch(url, { signal });
  if (!r.ok) {
    let reason = ""; try { reason = (await r.json()).reason || ""; } catch (e) {}
    throw new Error(reason || `HTTP ${r.status}`);
  }
  return r.json();
}

async function loadData() {
  const lat = S.lat, lon = S.lon;
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (S.dataKey === key && S.data) { renderDrift(); renderTide(); return; }
  if (S.loading) S.loading.abort();
  const ac = new AbortController(); S.loading = ac;
  S.data = null; S.dataKey = key;
  driftLayer.clearLayers(); $("drift-out").hidden = true;
  status("drift", "Loading wind and current forecast…"); status("tide", "Loading tide…");
  $("model").innerHTML = ""; renderLinz();
  const q = `latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&past_days=2&forecast_days=3&timeformat=unixtime&timezone=GMT`;
  try {
    const [marine, wx] = await Promise.all([
      getJSON(`https://marine-api.open-meteo.com/v1/marine?${q}&cell_selection=sea&hourly=ocean_current_velocity,ocean_current_direction,sea_level_height_msl,wave_height`, ac.signal),
      getJSON(`https://api.open-meteo.com/v1/forecast?${q}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=ms`, ac.signal)
    ]);
    if (S.dataKey !== key) return;
    const mh = marine.hourly, wh = wx.hourly;
    const cf = SPEED_TO_MS[marine.hourly_units?.ocean_current_velocity] ?? (1 / 3.6);
    const wf = SPEED_TO_MS[wx.hourly_units?.wind_speed_10m] ?? 1;
    const cur = { t: mh.time, u: [], v: [], spd: [], dir: mh.ocean_current_direction };
    mh.time.forEach((_, i) => {
      const sp = mh.ocean_current_velocity[i], d = mh.ocean_current_direction[i];
      if (sp == null || d == null) { cur.u.push(null); cur.v.push(null); cur.spd.push(null); return; }
      const [u, v] = C.toUV(sp * cf, d, true); cur.u.push(u); cur.v.push(v); cur.spd.push(sp * cf);
    });
    const wind = { t: wh.time, u: [], v: [], spd: [], dir: wh.wind_direction_10m, gust: wh.wind_gusts_10m.map(g => g == null ? null : g * wf) };
    wh.time.forEach((_, i) => {
      const sp = wh.wind_speed_10m[i], d = wh.wind_direction_10m[i];
      if (sp == null || d == null) { wind.u.push(null); wind.v.push(null); wind.spd.push(null); return; }
      const [u, v] = C.toUV(sp * wf, d, false); wind.u.push(u); wind.v.push(v); wind.spd.push(sp * wf);
    });
    S.data = {
      cur, wind, sea: { t: mh.time, h: mh.sea_level_height_msl }, wave: mh.wave_height,
      cellLat: marine.latitude, cellLon: marine.longitude,
      cellNM: C.distanceNM(lat, lon, marine.latitude, marine.longitude),
      noOcean: cur.spd.every(v => v == null)
    };
    status("drift", ""); status("tide", "");
    renderDrift(); renderTide();
  } catch (e) {
    if (e.name === "AbortError") return;
    const msg = `Couldn't load forecast data (${e.message}). Check signal, then tap the point again.`;
    status("drift", msg, true); status("tide", msg, true);
  }
}

// ---------- Drift ----------
function renderDrift() {
  driftLayer.clearLayers();
  const D = S.data; if (!D) return;
  $("drift-out").hidden = true;
  if (D.noOcean) return status("drift", "No ocean current data here. The point may be on land or in an enclosed harbour outside the ocean model.", true);
  const obj = OBJECTS[objSel.value], hours = +$("hours").value;
  const t0 = Math.round(new Date($("t0").value).getTime() / 1000);
  if (!Number.isFinite(t0)) return status("drift", "Set the last-seen date and time.", true);
  const tStart = Math.max(D.cur.t[0], D.wind.t[0]), tEnd = Math.min(D.cur.t.at(-1), D.wind.t.at(-1));
  if (t0 < tStart) return status("drift", `Last seen is too long ago. Forecast data starts ${fmtTime(tStart)}.`, true);
  if (t0 + hours * 3600 > tEnd) return status("drift", `Forecast data ends ${fmtTime(tEnd)}. Choose a shorter drift time or a later last-seen time.`, true);

  const r = C.simulateDrift({ lat: S.lat, lon: S.lon, t0, hours, obj, cur: D.cur, wind: D.wind });
  if (r.error) return status("drift", r.error, true);
  status("drift", "");

  const mid = r.left.map((p, i) => [(p[0] + r.right[i][0]) / 2, (p[1] + r.right[i][1]) / 2, p[2]]);
  const ll = a => a.map(p => [p[0], p[1]]);
  // Drift area between the two leeway solutions
  L.polygon([...ll(r.left), ...ll(r.right).reverse()], { color: ORANGE, weight: 0, fillColor: ORANGE, fillOpacity: 0.2, interactive: false }).addTo(driftLayer);
  L.polyline(ll(r.left), { color: ORANGE, weight: 2.5, interactive: false }).addTo(driftLayer);
  L.polyline(ll(r.right), { color: ORANGE, weight: 2.5, interactive: false }).addTo(driftLayer);
  L.polyline(ll(r.current), { color: BLUE, weight: 2.5, dashArray: "6 6", interactive: false }).addTo(driftLayer);

  // Hour marks on the centre line
  const stepsPerHour = 6;
  const labelEvery = hours <= 6 ? 1 : hours <= 12 ? 3 : hours <= 24 ? 6 : 12;
  for (let h = 1; h <= hours; h++) {
    const p = mid[h * stepsPerHour]; if (!p) continue;
    L.circleMarker([p[0], p[1]], { radius: h === hours ? 6 : 3.5, color: "#fff", weight: 1.5, fillColor: ORANGE, fillOpacity: 1, interactive: false }).addTo(driftLayer);
    if (h % labelEvery === 0 || h === hours) {
      L.marker([p[0], p[1]], { interactive: false, icon: L.divIcon({ className: "", html: `<span class="hr-lab">+${h} h</span>`, iconSize: null, iconAnchor: [-8, 8] }) }).addTo(driftLayer);
    }
  }
  const nowT = Date.now() / 1000;
  let nowIdx = null;
  if (nowT > t0 + 300 && nowT < t0 + hours * 3600) {
    nowIdx = Math.round((nowT - t0) / 600);
    const p = mid[nowIdx];
    L.circleMarker([p[0], p[1]], { radius: 9, color: ORANGE, weight: 3, fill: false, interactive: false }).addTo(driftLayer);
    L.marker([p[0], p[1]], { interactive: false, icon: L.divIcon({ className: "", html: `<span class="hr-lab">Now</span>`, iconSize: null, iconAnchor: [-12, 20] }) }).addTo(driftLayer);
  }

  // Readout
  const end = mid.at(-1), le = r.left.at(-1), re = r.right.at(-1);
  const dist = C.distanceNM(S.lat, S.lon, end[0], end[1]);
  $("res-title").textContent = `Drift after ${hours} h · centre of area`;
  $("res-dist").textContent = dist.toFixed(1);
  $("res-brg").textContent = C.fmtBrg(C.bearingDeg(S.lat, S.lon, end[0], end[1]));
  $("res-detail").textContent = `Centre ${C.fmtDDM(end[0], end[1])} at ${fmtTime(end[2])}. Left–right spread ${C.distanceNM(le[0], le[1], re[0], re[1]).toFixed(1)} NM.`;

  // Conditions at last-seen time
  const ws = C.sampler(D.wind.t, D.wind.spd, D.wind.gust || D.wind.spd)(t0);
  const wuv = C.sampler(D.wind.t, D.wind.u, D.wind.v)(t0);
  const cuv = C.sampler(D.cur.t, D.cur.u, D.cur.v)(t0);
  const wv = C.sampler(D.cur.t, D.wave)(t0);
  if (ws && wuv) {
    const from = (Math.atan2(-wuv[0], -wuv[1]) * 180 / Math.PI + 360) % 360;
    $("c-wind").textContent = `${kn(ws[0])} kn`;
    $("c-wind2").textContent = `from ${C.fmtBrg(from)}${ws[1] ? ` · gust ${kn(ws[1])}` : ""}`;
    const lw = C.leewayNow(obj, ws[0], from);
    $("c-lee").textContent = `${lw.dwKn.toFixed(2)} kn`;
    $("c-lee2").textContent = lw.dwKn > 0 ? `to ${C.fmtBrg(lw.towards)} ±${Math.round(lw.divergenceDeg)}°` : "no wind effect";
  }
  if (cuv) {
    $("c-cur").textContent = `${kn(Math.hypot(cuv[0], cuv[1]))} kn`;
    $("c-cur2").textContent = `to ${C.fmtBrg((Math.atan2(cuv[0], cuv[1]) * 180 / Math.PI + 360) % 360)}`;
  }
  $("c-when").textContent = `Conditions at last-seen time${wv && wv[0] != null ? ` · waves ${wv[0].toFixed(1)} m` : ""}.` +
    (D.cellNM > 3 ? ` Ocean model cell is ${D.cellNM.toFixed(1)} NM from this point, so nearshore currents may differ.` : "");

  // Positions table
  const rows = [];
  const marks = [1, 2, 3, 6, 12, 24, 48].filter(h => h <= hours);
  if (!marks.includes(hours)) marks.push(hours);
  const items = marks.map(h => ({ idx: h * stepsPerHour, label: `+${h} h`, now: false }));
  if (nowIdx != null) items.push({ idx: nowIdx, label: "Now", now: true });
  items.sort((a, b) => a.idx - b.idx);
  for (const it of items) {
    const p = mid[it.idx];
    rows.push(`<tr><td class="${it.now ? "now" : ""}">${it.label}</td><td>${fmtClock(p[2])}</td><td>${C.fmtDDM(p[0], p[1])}</td><td>${C.distanceNM(S.lat, S.lon, p[0], p[1]).toFixed(1)} NM ${C.fmtBrg(C.bearingDeg(S.lat, S.lon, p[0], p[1]))}</td></tr>`);
  }
  $("pts").innerHTML = `<tr><th></th><th>Time</th><th>Centre position</th><th>From LKP</th></tr>` + rows.join("");
  $("drift-out").hidden = false;

  const b = L.latLngBounds([[S.lat, S.lon], ...ll(r.left), ...ll(r.right), ...ll(r.current)]);
  if (S.fit || !map.getBounds().contains(b)) map.fitBounds(b.pad(0.3), { maxZoom: 13 });
  S.fit = false;
}

// ---------- Tide ----------
function renderTide() {
  if ($("panel-tide").hidden) return;
  renderLinz();
  renderModel();
}

function renderModel() {
  const D = S.data, el = $("model");
  if (!D) { el.innerHTML = ""; return; }
  const { t, h } = D.sea;
  if (h.every(v => v == null)) { el.innerHTML = `<h3>Modelled tide here</h3><div class="sub">No sea-level model data at this point.</div>`; return; }
  const now = Date.now() / 1000, a = now - 6 * 3600, b = now + 42 * 3600;
  const idx = t.map((x, i) => i).filter(i => t[i] >= a - 3600 && t[i] <= b + 3600 && h[i] != null);
  const ts = idx.map(i => t[i]), hs = idx.map(i => h[i]);
  const ext = C.findExtrema(ts, hs).filter(e => e.t >= a && e.t <= b);
  const sm = C.sampler(ts, hs), hNow = sm(now)?.[0] ?? null, hSoon = sm(now + 900)?.[0] ?? null;
  const trend = hNow != null && hSoon != null ? (hSoon > hNow ? "rising" : "falling") : "";
  // Chart
  const W = 600, H = 170, pl = 30, pr = 8, pt = 22, pb = 22;
  const lo = Math.min(...hs) - 0.15, hi = Math.max(...hs) + 0.15;
  const X = x => pl + (x - a) / (b - a) * (W - pl - pr), Y = y => pt + (hi - y) / (hi - lo) * (H - pt - pb);
  const pts = ts.map((x, i) => [X(Math.min(b, Math.max(a, x))), Y(hs[i])]);
  const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  let grid = "";
  const tick0 = Math.ceil(a / 21600) * 21600;
  for (let x = tick0; x <= b; x += 21600) grid += `<line class="grid" x1="${X(x)}" x2="${X(x)}" y1="${pt}" y2="${H - pb}"/><text x="${X(x)}" y="${H - 6}" text-anchor="middle">${fmtTime(x).replace(/ /, " ")}</text>`;
  for (let y = Math.ceil(lo * 2) / 2; y <= hi; y += 0.5) grid += `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${Y(y)}" y2="${Y(y)}"/><text x="${pl - 4}" y="${Y(y) + 4}" text-anchor="end">${y.toFixed(1)}</text>`;
  const labs = ext.map(e => `<text class="lab" x="${X(e.t)}" y="${e.type === "HW" ? Y(e.h) - 7 : Y(e.h) + 15}" text-anchor="middle">${fmtClock(e.t)}</text>`).join("");
  const svg = `<svg class="tchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Modelled tide curve, next 42 hours">${grid}
    <path class="fill" d="${path} L${pts.at(-1)[0]} ${H - pb} L${pts[0][0]} ${H - pb} Z"/><path class="curve" d="${path}"/>
    <line class="now" x1="${X(now)}" x2="${X(now)}" y1="${pt - 8}" y2="${H - pb}"/><text x="${X(now)}" y="${pt - 11}" text-anchor="middle" class="lab">now</text>${labs}</svg>`;
  const evs = ext.slice(0, 6).map(e => `<div class="${e.t < now ? "past" : ""}"><div class="k ${e.type === "HW" ? "hw" : ""}">${e.type === "HW" ? "HIGH" : "LOW"}</div><div class="tm">${fmtClock(e.t)}</div><div class="h">${fmtTime(e.t).split(" ")[0]} · ${e.h >= 0 ? "+" : ""}${e.h.toFixed(2)} m</div></div>`).join("");
  el.innerHTML = `<h3>Modelled tide at this point</h3>
    <div class="sub">${hNow != null ? `Now ${hNow >= 0 ? "+" : ""}${hNow.toFixed(2)} m relative to mean sea level, ${trend}.` : ""} Global model on an ~8 km grid. Unreliable inside harbours and inlets. Use for timing, not depth.</div>
    ${svg}<div class="ev">${evs}</div>`;
}

let portsPromise = null;
function loadPorts() {
  if (!portsPromise) portsPromise = fetch("tides/ports.json").then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(e => { portsPromise = null; throw e; });
  return portsPromise;
}
const portCache = {};
async function renderLinz() {
  const el = $("linz");
  if (S.lat == null) { el.innerHTML = ""; return; }
  const lat = S.lat, lon = S.lon;
  let ports;
  try { ports = await loadPorts(); }
  catch (e) {
    el.innerHTML = `<h3>Official LINZ tide</h3><div class="sub">Official port predictions aren't loaded on this site yet. See the <a href="https://www.linz.govt.nz/products-services/tides-and-tidal-streams/tide-predictions" target="_blank" rel="noopener">LINZ tide predictions</a> page.</div>`;
    return;
  }
  if (S.lat !== lat || S.lon !== lon) return;
  const near = ports.map(p => ({ p, d: C.distanceNM(lat, lon, p.lat, p.lon) })).sort((x, y) => x.d - y.d)[0];
  const P = near.p;
  try {
    const data = portCache[P.slug] || (portCache[P.slug] = await fetch(`tides/${P.slug}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }));
    if (S.lat !== lat || S.lon !== lon) return;
    const now = Date.now() / 1000;
    const all = C.labelEvents(data.events);
    let i = all.findIndex(e => e.t > now); if (i < 0) i = all.length;
    const show = all.slice(Math.max(0, i - 1), i + 5);
    const tz = P.tz;
    const nxt = all[i];
    const stage = nxt ? (nxt.type === "HW" ? "Rising" : "Falling") + `, ${nxt.type === "HW" ? "high" : "low"} water at ${fmtClock(nxt.t, tz)}` : "";
    const yr = new Intl.DateTimeFormat("en-NZ", { timeZone: tz, year: "numeric" }).format(new Date());
    const pdf = P.pdf && (P.pdf[yr] || Object.values(P.pdf)[0]);
    el.innerHTML = `<h3>Official LINZ tide · ${P.name}</h3>
      <div class="sub">Nearest standard port, ${near.d.toFixed(0)} NM ${C.fmtBrg(C.bearingDeg(lat, lon, P.lat, P.lon))} from the LKP. ${stage}. Heights above chart datum, port local time.</div>
      ${near.d > 20 ? `<div class="warnline">The port is ${near.d.toFixed(0)} NM away. Tide times at the LKP can differ. Check the secondary port offsets in the LINZ tables.</div>` : ""}
      <div class="ev">${show.map(e => `<div class="${e.t < now ? "past" : ""}"><div class="k ${e.type === "HW" ? "hw" : ""}">${e.type === "HW" ? "HIGH" : "LOW"}</div><div class="tm">${fmtClock(e.t, tz)}</div><div class="h">${fmtTime(e.t, tz).split(" ")[0]} · ${e.h.toFixed(1)} m</div></div>`).join("")}</div>
      ${pdf ? `<div class="sub" style="margin-top:6px"><a href="${pdf}" target="_blank" rel="noopener">Full ${yr} LINZ tide table for ${P.name} (PDF)</a></div>` : ""}`;
  } catch (e) {
    el.innerHTML = `<h3>Official LINZ tide · ${P.name}</h3><div class="sub">Couldn't load the predictions for this port. Check signal and try again.</div>`;
  }
}

// ---------- Restore ----------
if (typeof saved.lat === "number" && typeof saved.lon === "number") {
  map.setView([saved.lat, saved.lon], 9);
  setDatum(saved.lat, saved.lon, false);
}
