# Picky.Editor - Architecture and Logic Documentation

Picky.Editor is a Chrome Extension designed for picking, inspecting, and editing CSS elements on web pages directly from a side panel.

## Table of Contents
1. [Project Structure](#project-structure)
2. [Core Architecture Overview](#core-architecture-overview)
3. [Component Breakdown](#component-breakdown)
   - [Background Service Worker](#background-service-worker)
   - [Content Scripts](#content-scripts)
   - [Extension UI (Sidebar App)](#extension-ui-sidebar-app)
4. [Data Flow and Logic](#data-flow-and-logic)
   - [Element Picking Flow](#element-picking-flow)
   - [Property Editing Flow](#property-editing-flow)
   - [Page Scanning Flow](#page-scanning-flow)
5. [Key Mechanisms](#key-mechanisms)
   - [Element Tracking](#element-tracking)
   - [Overlay Highlights](#overlay-highlights)

---

## Project Structure

The project is divided into two primary directories:
- **`extension/`**: Contains the standard Chrome Extension files (`manifest.json`, `background.js`, and vanilla JavaScript content scripts).
- **`extension-ui/`**: A React application set up with Vite, acting as the frontend for the Side Panel. The build output from this project goes into `extension/sidebar/`.

## Core Architecture Overview

Picky.Editor relies on Chrome's **Side Panel API**. It injects a suite of Modular Content Scripts into the user's current webpage. These scripts are responsible for reading the DOM, extracting computed styles, handling cursor hover overlays, picking elements, and temporarily modifying element styles. 

The **React Sidebar (UI)** communicates with the **Content Scripts** via structured Chrome runtime messages. The **Background Service Worker** acts as a lifecycle manager to ensure the overlay and picking mode are disabled when the side panel is closed.

```
+----------------+                       +-------------------+
| React Sidebar  |   Message Passing     |  Content Scripts  |
| (extension-ui) | <===================> |   (DOM runtime)   |
+--------+-------+                       +---------+---------+
         |                                         |
         |         +-------------------+           |
         +-------- | Background Script | ----------+
                   |  (background.js)  |
                   +-------------------+
```

---

## Component Breakdown

### Background Service Worker (`extension/background.js`)
- Initializes the Side Panel when the extension icon is clicked.
- Maintains a reference count of active Side Panel connections.
- Detects when the Side Panel is fully closed and broadcasts a `STOP_PICKING` message to the active tab to safely terminate the content script overlay and picking event listeners.

### Content Scripts (`extension/content-script/`)
The content scripts run in the context of the user's webpage. They are modularized inside an IIFE (Immediately Invoked Function Expression) and namespaced under `window.Picky_Editor`.

- **`init.js`**: Re-exports all sub-modules and initializes the ElementChangeTracker and Messaging listeners.
- **`messaging.js`**: The central router for incoming messages from the React Side Panel (`START_PICKING`, `STOP_PICKING`, `SCAN_PAGE`, `UPDATE_STYLE`, etc.). Dispatches actions to their respective handlers.
- **`picking.js`**: Activates a global `mousemove` and `click` listener. Adds a global `<style>` injecting `cursor: crosshair !important;`. Upon hovering an element, it calls the overlay module to highlight it. Upon clicking, it extracts the info and sends it to the Extension UI.
- **`inspector.js`**: The "DOM Reader." For a given element, it deeply extracts bounding rects, computed CSS variables, typography info, box-models, and hierarchy up to the HTML node. It also inspects embedded images and inline SVGs.
- **`overlay.js`**: Creates a non-intrusive highlight box around the hovered/selected element by utilizing the **Shadow DOM** so that it doesn't conflict with the page's existing styles (`css-picker-overlay-root`).
- **`tracker.js`**: `ElementChangeTracker`. Records the *original* inline styles of elements before they are modified by the side panel using a `WeakMap`. Facilitates safe restoration of property values.
- **`scanner.js`**: Implements a brute-force scan of the top 800 DOM nodes to aggregate and sort the most commonly used font families, text colors, and background colors.

### Extension UI (Sidebar App)
A React application featuring a tabbed interface (`OverviewTab`, `InspectorTab`, `AssetsTab`, `LayoutTab`, `ColorsTab`).
- Uses `zustand` (implied `useDevToolsStore`) for global state management (`isInspectMode`, `selectedElement`).
- Monitors tab lifecycle events (`chrome.tabs.onActivated`, `chrome.tabs.onUpdated`) to clear out selected elements and pause inspection if the user switches active tabs.

---

## Data Flow and Logic

### Element Picking Flow
1. **User turns on Inspect Mode:** The React UI sets `isInspectMode = true` and sends a `START_PICKING` message.
2. **Content Script Activates:** `messaging.js` receives `START_PICKING` and calls `picking.startPicking()`.
3. **Tracking interactions:** `picking.js` begins listening to mouse movements.
4. **Hovering:** On `mousemove`, `overlay.js` calculates the hovered element's dimension and positions the shadow DOM highlight box over it.
5. **Selection:** The user clicks an element. The click is intercepted, and `inspector.js` runs `getElementInfo(el)`.
6. **Data Transport:** A message `ELEMENT_SELECTED` with the serialized element data is fired back to the React UI.
7. **UI Update:** The UI updates its global store, filling the layout/colors tabs with the computed values.

### Property Editing Flow
1. **User Modifies Property:** E.g., The user changes `padding-top` inside the `LayoutTab`.
2. **Message Sent:** The UI fires an `UPDATE_STYLE` message with the assigned CP ID and the new style object `{ padding: { top: "10px" } }`.
3. **Content Script Intercepts:** `messaging.js` finds the element by its assigned temporary ID (`[data-cp-id="..."]`).
4. **Tracker Logs Original:** `tracker.js` verifies if it has logged the original `padding-top`. If not, it saves it into its `WeakMap`.
5. **Style Applied:** The new style is applied as inline CSS `element.style.setProperty('padding-top', '10px', 'important')`. A reflow is manually triggered if the property affects the layout.
6. **UI Feedback:** The overlay highlight box shifts its bounds based on the modified width/height. A new computed properties payload is returned mapping back to the React UI.

### Page Scanning Flow
1. **User Opens Overview:** The `<OverviewTab/>` mounts.
2. **Trigger Scan:** Sends a `SCAN_PAGE` message.
3. **Execution:** `scanner.js` pulls an array of `document.querySelectorAll('*')`, iterates through the first 800 nodes, tallies background/text colors, translates `rgb/rgba` to HEX and tallies font families.
4. **Response:** Sorts the arrays by frequency and returns them so the UI can populate the "Project Overview" chart.

---

## Key Mechanisms

### Element Tracking
Because the extension allows real-time manipulation of DOM element styles, reverting or resetting styles relies on tracking. A `WeakMap` maintains a reference to the modified DOM elements without delaying memory garbage collection. For every property modified, the system snapshots the initially `window.getComputedStyle(el)` resolved property.

### Overlay Highlights
To prevent interference (e.g., hovering the highlight box itself), `overlay.js` attaches `.highlight-box` properties onto a newly forged `div` coupled with a Shadow Root. `pointer-events: none` ensures the mouse pointer correctly reads elements beneath the visual highlight rather than trapping interaction on the overlay boundary itself.
