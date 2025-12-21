# CSS Picker Extension

A minimal Chrome Extension to pick and view CSS elements.

## Project Structure

- `manifest.json`: Extension configuration (Manifest V3)
- `popup.html`: The popup user interface
- `popup.css`: Styles for the popup
- `popup.js`: Logic for the popup
- `background.js`: Background service worker
- `content.js`: Content script

## Setup Instructions

1. **Load Extension in Chrome**:
   1. Open Chrome and navigate to `chrome://extensions/`.
   2. Enable **Developer mode** (toggle in the top right).
   3. Click **Load unpacked**.
   4. Select the directory containing these files (`dev-css-picker`).

## Usage

1. Click the extension icon in the Chrome toolbar.
2. The popup will appear with a "Pick Element" button.
3. (Future functionality) Click "Pick Element" to select an element on the page.
