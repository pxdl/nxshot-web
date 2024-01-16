# nxshot-web
Automatically organize ~~and timestamp~~ your Nintendo Switch captures, now in your browser!

![image](https://user-images.githubusercontent.com/17756301/180696032-28916212-8851-49bf-a4df-2eabebaa4c4f.png)

## Requirements

A supported browser is required to acces the local file system. Current supported browsers include Google Chrome, Microsoft Edge, Opera and other Chromium-based browsers.

## Usage

Click on the "Select Folder" button and chose the ``../Nintendo/Album`` folder from your Nintendo Switch's SD card. You might have to accept the prompt from you browser to allow access to the folder.

After the number of recognized files show up, simply click the "Organize" button to automatically sort the screenshots.

Organized ~~and tagged~~ files are copied to ``../Nintendo/Album/Organized`` in a folder with the game's name.

<img width="801" alt="image" src="https://user-images.githubusercontent.com/17756301/178522830-a8979460-c4aa-43d0-ad52-38d3efabe11d.png">

If some of your screenshots end up being copied to ``../Nintendo/Album/Organized/Unknown``, please open an issue with the game id from the screenshot filename so that I can update the gameid list.

## Current gameid list

To see what games are currently automatically recognized, take a look at the [gameids.json](src/data/gameids.json) file.

## To-do

Find a way to change the "modified date" when copying the files just like in the original nxshot.

## Help

If you have any questions, feel free to send me a tweet [**@pixeldeadlock**](https://twitter.com/pixeldeadlock).
