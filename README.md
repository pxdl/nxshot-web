# nxshot-web

Automatically organize and timestamp your Nintendo Switch screenshots, now in your browser!

<img width="3204" height="2222" alt="nxshot - Nintendo Switch Screenshot Organizer 2026-01-11 at 00 37 42@2x" src="https://github.com/user-attachments/assets/014a486b-3341-4126-a357-1de4970dc4d8" />

## Requirements

A supported browser is required to access the local file system. Current supported browsers include Google Chrome, Microsoft Edge, Opera and other Chromium-based browsers.

## Usage

1. Click the "Select Folder" button and choose the `Nintendo/Album` folder from your Nintendo Switch's SD card
2. Accept the browser prompt to allow access to the folder
3. After scanning completes, click "Download as ZIP" to get your organized screenshots

The ZIP file contains your screenshots organized by game name, with the correct file dates preserved.

<img width="801" alt="image" src="https://user-images.githubusercontent.com/17756301/178522830-a8979460-c4aa-43d0-ad52-38d3efabe11d.png">

If some of your screenshots end up in an "Unknown" folder, please open an issue with the game ID from the screenshot filename so that the game ID list can stay up to date.

## Current game ID list

To see what games are currently automatically recognized, take a look at the [gameids.json](src/data/gameids.json) file.

## Development

```bash
pnpm install
pnpm dev
```

### Testing

```bash
pnpm test
```

## Help

If you have any questions, feel free to send me a tweet [**@pixeldeadlock**](https://twitter.com/pixeldeadlock).
