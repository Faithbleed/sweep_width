#!/usr/bin/env python3
"""Download LINZ standard port tide predictions (CSV) and convert them for the map.

Run by the GitHub Action in .github/workflows/linz-tides.yml. Writes:
  tides/ports.json        list of ports with position, time zone and PDF links
  tides/<slug>.json       high/low water events as [unix_seconds_utc, height_m_above_chart_datum]
  tides/secondary.json    LINZ secondary ports: time differences, MSL and range ratio, and their standard port

Source: Toitu Te Whenua Land Information New Zealand (LINZ) tide predictions, CC BY 4.0.
Standard library only.
"""
import csv
import datetime as dt
import io
import html
import json
import os
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo

LIST_URL = os.environ.get(
    "LINZ_LIST_URL",
    "https://www.linz.govt.nz/products-services/tides-and-tidal-streams/tide-predictions/tide-predictions-list-view",
)
OUT = os.environ.get("TIDES_OUT", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tides"))
SEC_PAGE_URL = os.environ.get(
    "LINZ_SEC_PAGE_URL",
    "https://www.linz.govt.nz/guidance/marine-information/tide-prediction-guidance/how-calculate-tide-times-and-heights",
)
SEC_RE = re.compile(r"""(?:https?://www\.linz\.govt\.nz)?/sites/default/files/[^"'<>]*?Secondary-ports[^"'<>]*?\.csv""", re.I)
UA = {"User-Agent": "helo-sweep-width tide updater (GitHub Actions)"}
CSV_RE = re.compile(r"""(?:https?:)?//static\.charts\.linz\.govt\.nz/tide-tables/maj-ports/csv/[^"'<>]+?\.csv""", re.I)
MIN_PORTS = 10


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def norm_url(u):
    u = html.unescape(u.strip())
    if u.startswith("//"):
        u = "https:" + u
    p = urllib.parse.urlsplit(u)
    path = urllib.parse.quote(urllib.parse.unquote(p.path), safe="/")
    return urllib.parse.urlunsplit((p.scheme or "https", p.netloc, path, "", ""))


def slugify(name):
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def decode(raw):
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            pass
    raise ValueError("cannot decode")


def dms(field):
    m = re.search(r"(\d+)\D+(\d+(?:\.\d+)?)\D*?([NSEW])", field)
    if not m:
        raise ValueError(f"bad coordinate {field!r}")
    v = int(m.group(1)) + float(m.group(2)) / 60
    return -v if m.group(3) in "SW" else v


def parse_csv(text, name_hint):
    lines = [l for l in text.splitlines() if l.strip()]
    head = [c.strip() for c in lines[0].split(",")]
    name = head[1] if len(head) > 1 and head[1] else name_hint
    lat, lon = dms(head[2]), dms(head[3])
    tz = ZoneInfo("Pacific/Chatham" if "chatham" in (name + name_hint).lower() else "Pacific/Auckland")
    events = []
    for line in lines[1:]:
        c = [x.strip() for x in line.split(",")]
        if len(c) < 6 or not c[0].isdigit() or not c[2].isdigit() or not c[3].isdigit():
            continue  # header/notes lines
        day, month, year = int(c[0]), int(c[2]), int(c[3])
        for i in range(4, len(c) - 1, 2):
            tm, h = c[i], c[i + 1]
            if not tm or not h:
                continue
            hh, mm = (int(x) for x in tm.split(":"))
            t = dt.datetime(year, month, day, hh, mm, tzinfo=tz)
            events.append([int(t.timestamp()), round(float(h), 2)])
    events.sort()
    return name, lat, lon, tz.key, events


def tdiff(v):
    """'+0053' -> 53 minutes, '-0015' -> -15, '0000' -> 0, '-' or '' -> None."""
    m = re.fullmatch(r"([+-]?)(\d{1,2})(\d{2})", v.strip())
    if not m:
        return None
    mins = int(m.group(2)) * 60 + int(m.group(3))
    return -mins if m.group(1) == "-" else mins


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def parse_secondary(text):
    """Rows follow their standard port row (the one with 'hhmm' in the time columns)."""
    ref, ref_msl, out = None, None, []
    for c in csv.reader(io.StringIO(text)):
        c = [x.strip() for x in c] + [""] * 20
        if not c[0] or not c[1]:
            continue  # titles, headers and region names
        if c[6].lower() == "hhmm":
            ref, ref_msl = c[1], num(c[14])
            continue
        if ref is None or not re.match(r"\d", c[0]):
            continue
        try:
            lat = -(int(c[2]) + int(c[3]) / 60)
            lon_w = c[5].upper().endswith("W")
            lon = int(c[4]) + int(re.sub(r"\D", "", c[5])) / 60
            lon = -lon if lon_w else lon
        except ValueError:
            continue
        dhw, dlw = tdiff(c[6]), tdiff(c[8])
        if dhw is None or dlw is None:
            continue
        msl, rr = num(c[14]), num(c[15])
        out.append({"no": c[0], "name": c[1], "lat": round(lat, 4), "lon": round(lon, 4), "ref": ref,
                    "dHW": dhw, "dLW": dlw, "msl": msl, "rr": rr, "refMsl": ref_msl,
                    "approx": "*" in "".join(c[16:])})
    return out


def secondary_ports(ports):
    """Download the LINZ secondary ports table and link each port to a standard port we have predictions for."""
    try:
        page = decode(get(SEC_PAGE_URL))
        links = sorted({urllib.parse.urljoin("https://www.linz.govt.nz/", html.unescape(u)) for u in SEC_RE.findall(page)})
        if not links:
            print("No secondary ports CSV link found; secondary ports skipped.")
            return None
        url = links[-1]  # newest edition sorts last
        rows = parse_secondary(decode(get(url)))
    except Exception as ex:
        print(f"Secondary ports skipped: {ex}")
        return None
    by_name = {slugify(p["name"]): p for p in ports}
    out, missing = [], set()
    for r in rows:
        if r["lon"] < 0 and r["lat"] < -42:
            # Chatham Islands: these use a different local time from their standard port, so leave them
            # to the Chatham ports that have full LINZ predictions.
            continue
        p = by_name.get(slugify(r["ref"]))
        if not p:
            missing.add(r["ref"])
            continue
        r["refSlug"] = p["slug"]
        r["tz"] = p["tz"]
        out.append(r)
    if missing:
        print(f"  no daily predictions found for standard port(s): {', '.join(sorted(missing))}")
    print(f"  {len(out)} secondary ports from {url}")
    return {"source": url, "ports": out}


def main():
    page = decode(get(LIST_URL))
    links = sorted({norm_url(u) for u in CSV_RE.findall(page)})
    today = dt.date.today()
    years = {today.year, today.year + 1}
    by_port = {}
    for u in links:
        fname = urllib.parse.unquote(u.split("/maj-ports/csv/", 1)[1])[:-4]
        m = re.match(r"(.+?)\s+(\d{4})$", fname)
        if not m or int(m.group(2)) not in years:
            continue
        by_port.setdefault(m.group(1), {})[int(m.group(2))] = u
    print(f"Found {len(links)} CSV links, {len(by_port)} ports for {sorted(years)}")
    if len(by_port) < MIN_PORTS:
        sys.exit(f"Only {len(by_port)} ports found on {LIST_URL}; page layout may have changed. Nothing written.")

    keep_from = int((dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=40)).timestamp())
    ports, files = [], {}
    for hint, yrs in sorted(by_port.items()):
        evs, info = [], None
        for y, u in sorted(yrs.items()):
            try:
                name, lat, lon, tz, e = parse_csv(decode(get(u)), hint)
            except Exception as ex:  # keep going if one file is odd
                print(f"  skip {hint} {y}: {ex}")
                continue
            info = info or (name, lat, lon, tz)
            evs += e
        if not info or not evs:
            continue
        name, lat, lon, tz = info
        slug = slugify(hint)
        evs = sorted({tuple(x) for x in evs if x[0] >= keep_from})
        files[slug] = {"name": hint, "tz": tz, "datum": "Chart Datum", "source": "LINZ tide predictions, CC BY 4.0",
                       "fetched": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "events": [list(x) for x in evs]}
        ports.append({"name": hint, "slug": slug, "lat": round(lat, 4), "lon": round(lon, 4), "tz": tz,
                      "pdf": {str(y): u.replace("/csv/", "/pdf/")[:-4] + ".pdf" for y, u in yrs.items()}})
        print(f"  {hint}: {len(evs)} events")
    if len(ports) < MIN_PORTS:
        sys.exit(f"Only {len(ports)} ports parsed; nothing written.")

    sec = secondary_ports(ports)

    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith(".json"):
            os.remove(os.path.join(OUT, f))
    for slug, data in files.items():
        with open(os.path.join(OUT, slug + ".json"), "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(OUT, "ports.json"), "w", encoding="utf-8") as fh:
        json.dump(ports, fh, ensure_ascii=False, indent=1)
    if sec:
        with open(os.path.join(OUT, "secondary.json"), "w", encoding="utf-8") as fh:
            json.dump(sec, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"Wrote {len(ports)} ports to {OUT}")


if __name__ == "__main__":
    main()
