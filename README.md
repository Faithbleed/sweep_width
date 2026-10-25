# Helo Sweep Width

Helicopter maritime sweep width lookup, from Table 1-6(1) Sweep Widths for Helicopters (NM), 500 ft and 1000 ft.
Installs to the iPhone home screen and works offline after the first open.

## Files

| File | What it is |
|---|---|
| index.html | The calculator |
| manifest.webmanifest | App name, icon and full-screen settings |
| sw.js | Saves the app on the phone so it works without signal |
| icon-180.png, icon-192.png, icon-512.png | Home-screen icons |

## Put it online (once, about 5 minutes, free)

Easiest on a computer, but it also works from Safari on an iPhone.

1. Create a free account at github.com.
2. Tap **+** (top right) > **New repository**. Name it `sweep-width`, set it to **Public**, tick **Add a README file**, and tap **Create repository**.
3. Tap **Add file** > **Upload files**. Select all six files above (not the zip, and not this README) and tap **Commit changes**.
4. Go to **Settings** > **Pages**. Under "Branch", choose **main** and **/ (root)**, then tap **Save**.
5. Wait a minute or two, then refresh that Settings > Pages screen. It shows your web address, which looks like
   `https://YOUR-USERNAME.github.io/sweep-width/`

That address is what you send to the crew.

## Install on an iPhone (each person, once)

1. Open the address in **Safari**. Wait for the page to load fully, with signal.
2. Tap **Share** (the square with an up arrow) > **Add to Home Screen** > **Add**.
3. Open it once from the new icon while you still have signal. After that it works offline.

On Android, open the address in Chrome and tap **Install app** or **Add to Home screen**.

## Updating the table later

1. On GitHub, open the file to change, tap the pencil icon, edit it, and commit. Or upload a replacement file.
2. In `sw.js`, change `sweep-v1` to `sweep-v2` (then `v3`, and so on) and commit. This tells every phone to fetch the new version.
3. Phones pick up the update the next time the app opens with signal. Closing and reopening it a second time shows the new version.

## Important

Values were transcribed from a photo of the table. Check them against the source document before operational use.
W shown is uncorrected. Apply your weather, fatigue and speed correction factors before setting track spacing.
