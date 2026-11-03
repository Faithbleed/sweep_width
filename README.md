# Helo Sweep Width

A web app for helicopter maritime search. Open the address in any phone browser: there's nothing to install.

- **Sweep** (`index.html`): sweep widths from Table 1-6(1) Sweep Widths for Helicopters (NM), 500 ft and 1000 ft.
- **Drift & tide map** (`map.html`): tap the sea, or type the position from RCC, to set the last known position (LKP). The map then shows:
  - **Drift:** projected drift for the chosen search object from the last-seen time, drawn as an area between the left and right leeway solutions, with hourly positions, plus a current-only line.
  - **Wind, current and waves** at the LKP.
  - **LINZ tide** times and heights for the nearest LINZ tide point. That's either a port with its own daily LINZ predictions, or a LINZ secondary port worked out from its standard port with LINZ's published differences.

## What's in the folder

| File | What it is |
|---|---|
| index.html | Sweep width calculator |
| map.html, map.js, map.css | Drift & tide map |
| calc.js | Drift, tide and position maths |
| leeway.js | Leeway coefficients for each search object |
| config.js | Settings (optional LINZ aerial imagery key) |
| vendor/ | Leaflet map library (BSD licence) |
| tools/fetch_linz_tides.py, .github/workflows/linz-tides.yml | Monthly job that copies the LINZ tide tables into `tides/` (see below) |
| setup/linz-tides.yml | Visible copy of the workflow file, for step 4 below |
| sw.js, manifest.webmanifest, icon-*.png | Faster loading and home-screen icon |

## Put it online (once, about 10 minutes, free)

Do this on a computer.

1. Create a free account at github.com. Click **+** > **New repository**, name it `sweep-width`, choose **Public**, and click **Create repository**.
2. Click **uploading an existing file**. Drag in everything inside the `helo-sweep-width` folder, including the `vendor`, `tools` and `setup` folders, then click **Commit changes**.
3. Go to **Settings** > **Pages**. Under "Branch", choose **main** and **/ (root)**, then click **Save**. After a minute or two the page shows your address, for example `https://YOUR-USERNAME.github.io/sweep-width/`.
4. **Turn on official LINZ tides.** Mac and Windows hide the `.github` folder, so create its one file by hand:
   - In the repository, click **Add file** > **Create new file**.
   - In the name box, type `.github/workflows/linz-tides.yml`.
   - Open `setup/linz-tides.yml` from the folder, copy all of it, paste it in, and click **Commit changes**.
   - Go to the **Actions** tab. "Update LINZ tide predictions" runs automatically and takes about a minute. When it shows a green tick, a `tides` folder appears in the repository and the map shows official port tides.
   - It then runs again on the 1st of each month to stay current. To run it by hand, open it on the Actions tab and click **Run workflow**.
5. Optional: to add the LINZ aerial imagery layer, put a LINZ Basemaps key into `config.js` (click the file, then the pencil icon to edit). See the note in that file.

Send the address to the crew. The map is at the same address with `map.html` on the end, and the calculator links to it.

## Where the data comes from

| Data | Source | Notes |
|---|---|---|
| Ocean current and waves | Open-Meteo Marine API, using Météo-France SMOC (~8 km grid, includes tidal currents) | Live forecast at every tap. Unreliable close inshore and inside harbours. |
| Wind (10 m) | Open-Meteo forecast API | Live forecast. |
| Tides | Toitū Te Whenua LINZ daily port predictions and the LINZ secondary ports table, CC BY 4.0 | Copied monthly by the GitHub job. Secondary ports use the LINZ Nautical Almanac method. Times are port local time, heights are above chart datum. |
| Leeway | US Coast Guard coefficients (Allen & Plourde 1999; Allen 2005), as tabulated in OpenDrift | The same empirical basis as IAMSAR leeway tables. |
| Map | OpenStreetMap, OpenSeaMap seamarks, optional LINZ aerial | |

Open-Meteo is free for non-commercial use. If your organisation counts as commercial use, it needs an Open-Meteo API subscription.

## The monthly LINZ tide job

LINZ publishes its tide predictions as yearly files on its website, not as a live service the app can query. A small job therefore copies them into the site:

1. **What runs it:** GitHub Actions, GitHub's free automation, using `.github/workflows/linz-tides.yml`. It runs at about 4 pm NZ time on the 1st of each month. It also runs whenever that file or the script changes, and whenever you press **Run workflow** on the Actions tab.
2. **What it does:** `tools/fetch_linz_tides.py` downloads this year's and next year's daily prediction CSV for every LINZ port, plus the LINZ secondary ports table. It converts them to small files in the `tides/` folder and saves them back to the repository. GitHub Pages then publishes them with the site.
3. **What the app does:** when you set a position, the app reads those files from your own site, finds the nearest LINZ tide point and shows its times and heights. Nothing is downloaded from LINZ at that moment.
4. **How to check it's working:** the repository has a `tides` folder containing `ports.json` and `secondary.json`, and the Actions tab shows green ticks. A red cross means that month's run failed: open it to see why. The site keeps the previous month's files, which still cover the rest of the year.
5. **When it needs you:** if LINZ changes its website layout, the job stops with a clear message instead of saving bad data.

## How the drift is worked out

Every 10 minutes from the last-seen time, the object moves with the surface current plus leeway. Leeway is the downwind push (a percentage of the 10 m wind plus an offset) and the crosswind push to the left or right, using that object's coefficients. Running the left and right versions separately gives the two edges of the drift area. Forecasts are sampled at the LKP only, so changes in current along the track are not included.

**This is for situational awareness only. It does not replace RCCNZ drift modelling (SAROPS) or your SAR planning procedures.** It does not include survivor movement, error in the reported position, or forecast uncertainty.

## Updating

- Edit any file on GitHub with the pencil icon, or upload a replacement.
- After changing any file, also change `sweep-v3` in `sw.js` to the next number (`sweep-v4`, and so on). This makes phones fetch the new version instead of using their saved copy.

## Important

The sweep width values were transcribed from a photo of the table. Check them against the source document before operational use.
