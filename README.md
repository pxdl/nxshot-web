# nxshot-web

Automatically organize and timestamp your Nintendo Switch screenshots, now in your browser!

<img width="3204" height="2222" alt="nxshot - Nintendo Switch Screenshot Organizer 2026-01-11 at 00 37 42@2x" src="https://github.com/user-attachments/assets/014a486b-3341-4126-a357-1de4970dc4d8" />

## Browser Support

Works on all modern browsers:

- Google Chrome 86+
- Microsoft Edge 86+
- Mozilla Firefox 90+
- Safari 15.4+
- Opera 72+

| Browser | Save Location | Large Files (2GB+) |
|---------|---------------|-------------------|
| Chrome, Edge, Opera | Save picker | Streaming (efficient) |
| Firefox | Downloads folder | Streaming (efficient) |
| Safari | Downloads folder | Buffered (may fail for very large collections) |

Chrome/Edge/Firefox use streaming to efficiently handle large collections without running out of memory. Safari uses a buffered approach which works reliably for most collections but may struggle with very large ones.

## Usage

1. Click the "Select Folder" button and choose the `Nintendo/Album` folder from your Nintendo Switch's SD card
2. Accept the browser prompt to allow access to the folder
3. After scanning completes, click "Download as ZIP" to get your organized screenshots

The ZIP file contains your screenshots organized by game name, with the correct file dates preserved.

<img width="801" alt="image" src="https://user-images.githubusercontent.com/17756301/178522830-a8979460-c4aa-43d0-ad52-38d3efabe11d.png">

If some of your screenshots end up in an "Unknown" folder, please open an issue with the capture ID from the screenshot filename so that the database can be updated.

## Capture ID Database

The code recognizes games using a database of capture IDs (the 32-character hex string in screenshot filenames). See [captureIds.json](public/data/captureIds.json) for the full list.

The database is automatically updated weekly via GitHub Actions, pulling from:
- [switchbrew.org](https://switchbrew.org/wiki/Title_list/Games)
- [nswdb.com](http://nswdb.com)
- [titledb](https://github.com/blawar/titledb)

## Development

```bash
pnpm install
pnpm dev
```

### Testing

```bash
pnpm test
```

### Updating the Capture ID Database

To manually update the capture ID database:

```bash
pip install -r scripts/requirements.txt
export CAPTURE_ID_KEY=<key>
python scripts/update_capture_ids.py
```

The encryption key can be found at offset `0x71000704D0` in the `capsrv` NSO loaded in IDA. The key hash for verification is `24e0dc62a15c11d38b622162ea2b4383`.

Options:
- `--source switchbrew|nswdb|titledb|all` - Choose data source (default: all)
- `--keep-existing` - Merge with existing data instead of replacing
- `--dry-run` - Show stats without writing file

## Help

If you have any questions, feel free to send me a tweet [**@pixeldeadlock**](https://twitter.com/pixeldeadlock).
