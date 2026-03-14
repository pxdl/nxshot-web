# Future Feature Ideas

## Medium Impact

### Collection Stats
After scanning, show a breakdown: screenshots per game (bar chart or ranked list), capture timeline, total size per game, screenshot vs video count. A fun "here's your Switch year in review" angle.

### Custom Folder Structure
Let users choose organization: by game (current default), by date (`2024/March/`), by game + date (`Zelda/2024-03/`), or flat with renamed files (`Zelda - 2024-03-15 14.30.00.jpg`).

### Per-Game ZIP Downloads
Instead of one giant ZIP, offer individual per-game downloads. Useful when someone only wants their screenshots from a specific game.

## Ambitious / Longer Term

### Image Viewer / Lightbox
Click any thumbnail to view full-size with metadata overlay (game name, date taken, resolution). Support keyboard navigation between images. Video playback for `.mp4` captures.

### PWA Support
Add a service worker and manifest to make it installable. Makes sense for a utility people might use repeatedly.

### Duplicate Detection
Flag potential duplicates (same game + timestamp, or perceptual image hashing). Switch users who've copied their SD card multiple times often have dupes.

### Export to Cloud
Direct upload to Google Photos / iCloud / Dropbox with the organized folder structure, preserving dates. Would need OAuth integration but eliminates the ZIP middleman.
