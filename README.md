# Chrome Extension: Text-to-Speech (TTS) with Azure

This Chrome extension allows users to convert selected text on a webpage into speech using Azure Text-to-Speech (TTS) service.

## Features
- Convert selected text to speech using Azure TTS
- Easy-to-use context menu option
- Simple configuration through the extension popup
- Voice selection from all available Azure voices
- Language filtering for easier voice selection

## Installation
1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" by toggling the switch in the top-right corner.
4. Click on the "Load unpacked" button and select the directory where you downloaded/cloned this repository.

## Usage
1. Click on the extension icon in the toolbar to open the popup.
2. Enter your Azure subscription key and region.
3. Click "Save Settings" to save your credentials.
4. Click "Load Voices" to fetch available voices from Azure.
5. Select a voice from the list and click "Save Selected Voice".
6. On any webpage, select text, right-click, and choose "Speak Text".

## Configuration
1. Create an Azure account and subscribe to the Cognitive Services API.
2. Get your subscription key and region from the Azure portal.
3. Enter these credentials in the extension popup.
4. Load and select your preferred voice.

## Authentication
This extension uses token-based authentication as recommended by Microsoft:
1. The extension obtains an access token using your subscription key
2. The token is then used to authenticate API calls
3. This approach is more secure than sending the subscription key with each request

## Files
- `manifest.json`: Configuration file for the Chrome extension
- `background.js`: JavaScript file that handles the context menu and TTS functionality
- `azureTTS.js`: JavaScript file that communicates with Azure TTS service
- `popup.html` and `popup.js`: Files for the extension popup UI and functionality
- `icons/`: Directory containing SVG icons for the extension

## License
This project is licensed under the MIT License.