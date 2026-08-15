# Inventory Management & Item Location Tracking System

A full-stack application designed to track inventories and monitor item locations across multiple storage sites. 

This repository hosts the **Phase 2: Inventory Database & CRUD API** codebase.

---

## Technology Stack

### Frontend
- **React 19** & **Vite 8**
- **React Router DOM v6** (for UI views)
- **Tailwind CSS v3** (for premium designs)
- **Vanilla CSS**

### Backend
- **Node.js** & **Express.js**
- **Mongoose & MongoDB Atlas** (Database driver & configuration)
- **Cors** (Cross-Origin Resource Sharing)
- **Dotenv** (Environment variables)

---

## Folder Structure

```
Inventory-Management-System/
├── backend/                  # Express REST API
│   ├── src/
│   │   ├── config/          # Connection configs (db.js)
│   │   ├── controllers/      # inventoryController.js (CRUD controllers)
│   │   ├── middleware/       # Custom middlewares [.gitkeep]
│   │   ├── models/           # InventoryItem.js (Mongoose schema)
│   │   ├── routes/           # inventoryRoutes.js (REST endpoints)
│   │   └── server.js         # Entry main express application script
│   ├── .env                  # Port and MONGODB_URI configurations (git-ignored)
│   ├── .env.example          # Environment variables template
│   └── package.json          # Node script configurations
│
├── frontend/                 # React SPA Client
│   ├── src/
│   │   ├── assets/           # Client assets
│   │   ├── App.css           # Styling setup
│   │   ├── App.jsx           # App shell with client routes and diagnostics dashboard
│   │   ├── index.css         # Styling with Tailwind directives
│   │   └── main.jsx          # Vite React dom rendering mount
│   ├── postcss.config.js     # PostCSS tailwind configuration
│   ├── tailwind.config.js    # Tailwind configuration
│   ├── vite.config.js        # Vite config with dev port & proxy configurations
│   └── package.json          # Vite React dependencies
│
├── .gitignore                # Specifies intentionally untracked files to ignore
├── README.md                 # Project guide
└── package.json              # Workspace-wide launcher shortcuts
```

---

## Getting Started

### 1. Installation

You can install all dependencies for both the frontend and backend in one command from the project root:

```bash
npm run install:all
```

*Alternatively, install them separately:*
```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

1. In the `backend` directory, duplicate the template file:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Open `backend/.env` and update configurations with your MongoDB Atlas connection string:
   ```ini
   PORT=5000
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-address>/<db-name>?retryWrites=true&w=majority
   ```

*(Note: actual `.env` files are ignored by git in `.gitignore` to protect credentials).*

### 3. Execution

You can run both client and server applications concurrently using:

```bash
npm run dev
```

*Alternatively, run them in separate terminal windows:*

#### Start Backend
```bash
cd backend
npm run dev
```
The server will start on port `5000` with hot-reloading (nodemon). Check health at: `http://localhost:5000/api/health`.

#### Start Frontend
```bash
cd frontend
npm run dev
```
Vite will start the client server on port `5173`. Open your browser and navigate to: `http://localhost:5173`.

---

## Phase 2: Inventory Database & CRUD API

We use **MongoDB Atlas** as our remote database provider and **Mongoose** as our ODM. 

### 1. InventoryItem Schema

Located at [`backend/src/models/InventoryItem.js`](file:///D:/Inventory-Management-System/backend/src/models/InventoryItem.js).

*   `name`: String, required, trimmed, minlength 1, maxlength 100.
*   `image`: String, optional.
*   `quantity`: Number, required, integer, min 0, default 0.
*   `location`: Location object containing:
    *   `section`: String, required, trimmed, uppercase.
    *   `storageUnit`: Number, required, integer, min 1.
    *   `box`: Number, required, integer, min 1.
    *   `code`: String, required, trimmed, uppercase.
*   `timestamps`: `createdAt` and `updatedAt` are generated automatically.

### 2. Location Code Verification Rule
The location code is derived directly from the section name, storage unit number, and box number:
$$\text{code} = \text{section} + \text{storageUnit} + \text{box}$$

For example:
*   `section = "A"`, `storageUnit = 3`, `box = 19` $\implies$ `code = "A319"`.

Mismatched location details (e.g. sending `A`, `3`, `19` but code as `A320`) are rejected with `400 Bad Request`.

### 3. REST API Endpoints

All routes are mounted under `/api/inventory` (mapped in [`backend/src/routes/inventoryRoutes.js`](file:///D:/Inventory-Management-System/backend/src/routes/inventoryRoutes.js)):

| Method | Endpoint | Description | Request Body | Response Code (Success) |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/health` | Service status health check | None | 200 |
| **POST** | `/api/inventory` | Create a new item | JSON (Item details) | 201 |
| **GET** | `/api/inventory` | Get all inventory items | None | 200 |
| **GET** | `/api/inventory/:id` | Get single inventory item by ID | None | 200 |
| **PUT** | `/api/inventory/:id` | Update inventory item fields | JSON (Fields to change) | 200 |
| **DELETE**| `/api/inventory/:id` | Delete inventory item by ID | None | 200 |

### 4. Example API Request (Create Item)

**Request**:
`POST /api/inventory`

*Headers*:
`Content-Type: application/json`

*Body*:
```json
{
  "name": "ESP32 DevKit V1",
  "quantity": 12,
  "location": {
    "section": "A",
    "storageUnit": 3,
    "box": 19,
    "code": "A319"
  }
}
```

**Response**:
`Status: 201 Created`
```json
{
  "success": true,
  "data": {
    "name": "ESP32 DevKit V1",
    "image": "",
    "quantity": 12,
    "location": {
      "section": "A",
      "storageUnit": 3,
      "box": 19,
      "code": "A319"
    },
    "_id": "6a8069378c740fd509f8dfa4",
    "createdAt": "2026-08-15T13:27:19.398Z",
    "updatedAt": "2026-08-15T13:27:19.398Z",
    "__v": 0
  }
}
```

---

## Phase 3: Add Inventory Item UI

We implemented the core user interface layout and forms for registering new product records.

### 1. Dedicated Add Route
*   **Route Path**: `/inventory/add`
*   **Component**: [`frontend/src/pages/AddInventory.jsx`](file:///D:/Inventory-Management-System/frontend/src/pages/AddInventory.jsx)

### 2. Form Fields & Client Validations
*   **Item Name**: Text input (required, trimmed, max length 100). Displays error if blank.
*   **Stock Quantity**: Integer number input (required, min 0). Validates decimals or negative values before submission.
*   **Location Section**: String code (required, uppercase).
*   **Location Storage Unit**: Integer number input (required, min 1).
*   **Location Box Number**: Integer number input (required, min 1).
*   **Generated Location Code**: A read-only preview text box that automatically concatenates Section + Storage Unit + Box values (e.g., section `A` + unit `3` + box `19` = `A319`).
*   **Image URL**: String (optional). Renders a live visual preview thumbnail of the pasted URL.

### 3. API Integration & Routing
*   Requests are sent to the relative `/api/inventory` route.
*   During submission, the form changes state (loading indicators active, buttons disabled, preventing duplicate submit events).
*   Success events redirect the user to `/inventory` with a flash banner alert displaying the newly created item.

---

## Phase 4: Inventory Dashboard & Item Cards

We refactored the catalog listings into an interactive card-based inventory dashboard featuring metrics, responsive layouts, and a dedicated details route.

### 1. Catalog Dashboard & Summary Metrics
*   **Route Path**: `/inventory`
*   **Component**: [`frontend/src/pages/Inventory.jsx`](file:///D:/Inventory-Management-System/frontend/src/pages/Inventory.jsx)
*   **Summary Stats Section**: Shows `Total Items` (number of database documents) and `Total Quantity` (cumulative sum of stock levels across all tracked items) at the top of the catalog page, computed dynamically from the client-side API payload.

### 2. Inventory Item Cards
*   **Component**: [`frontend/src/components/inventory/InventoryCard.jsx`](file:///D:/Inventory-Management-System/frontend/src/components/inventory/InventoryCard.jsx)
*   **Visual Indicators**:
    *   *Image Window*: Shows the item image URL (if valid) or a clean styled vector placeholder graphic.
    *   *Stock Quantity Badges*: Matches three states based on quantity boundaries:
        *   `In Stock` (qty > 5): Emerald badge.
        *   `Low Stock` (qty 1 to 5): Amber warning badge.
        *   `Out of Stock` (qty = 0): Rose error badge.
    *   *Coordinate Badges*: Prominent `📍 Location Code` along with secondary unit, section, and box fields.
    *   *Action Button*: Triggers routing link to detail view `[ View Details ]`.

### 3. Detailed Item Route
*   **Route Path**: `/inventory/:id`
*   **Component**: [`frontend/src/pages/InventoryDetails.jsx`](file:///D:/Inventory-Management-System/frontend/src/pages/InventoryDetails.jsx)
*   **Fields Displayed**: Fetches single item data from Mongoose database records, displaying details including image, name, stock status, full coordinates, and formatted `createdAt`/`updatedAt` logs.
*   **Navigation Actions**: Offers `[ Back to Inventory ]` redirect link and a disabled `[ Edit Item ]` button (marked "Coming Soon").

### 4. UI/UX Loading & Error States
*   *Skeleton loaders*: Displays animated placeholder cards while queries are fetching.
*   *Error alerts*: Shows a `"Unable to load inventory"` connection box containing a functional `"Try Again"` refresh button if API requests fail.

---

## Phase 5: Search & Locate Inventory

We implemented a fast, client-side, real-time query interface to locate inventory items and coordinates instantly.

### 1. Unified Search Input Box
*   **Integrated inside**: `/inventory` (mapped in [`frontend/src/pages/Inventory.jsx`](file:///D:/Inventory-Management-System/frontend/src/pages/Inventory.jsx)).
*   **Behavior**: Real-time filtering matching queries against name, location code, section, storage unit, and box coordinate fields.
*   **Controls**: Includes a search magnifying icon and an `✕` reset control to instantly clear inputs.

### 2. Searchable Fields & Case-Insensitive Filter
*   `item.name` (case-insensitive text search)
*   `item.location.code` (e.g. `A319`)
*   `item.location.section` (e.g. Section `A`)
*   `item.location.storageUnit` (e.g. Storage Unit `3`)
*   `item.location.box` (e.g. Box `19`)

### 3. URL Parameter & Synchronization
*   Supports URL parameter bindings: opening `/inventory?search=ESP32` automatically populates the search bar and filters results on load.
*   Typing in the search input automatically reflects in the browser address bar.

### 4. Text Highlighting & Pill Suggestions
*   Matching substrings within product names and location codes are dynamically wrapped in a visual highlight container.
*   Includes quick-suggestion click badges (Try: `ESP32`, `A319`, `Section A`, `Unit 3`, `Box 19`) under the search input.

---

## Phase 6: Visual Storage Location System

We implemented a visual location mapping structure to translate location codes into clear, step-by-step physical coordinates, and integrated clipboard support.

### 1. Visual Location Map Component
*   **Component**: [`frontend/src/components/inventory/LocationDisplay.jsx`](file:///D:/Inventory-Management-System/frontend/src/components/inventory/LocationDisplay.jsx)
*   **Visual Hierarchy Flow**: Represents location mappings vertically:
    `Section` (e.g., A) $\rightarrow$ `Storage Unit` (e.g., 3) $\rightarrow$ `Box` (e.g., 19) $\rightarrow$ `Location Code` (e.g., A319) using distinct step indicators.

### 2. Clipboard API Integration
*   Adds a visual copy action button next to location code badges in both catalog cards and item details.
*   Uses the native browser Clipboard API (`navigator.clipboard.writeText`) to copy codes with zero external dependencies.
*   Displays a temporary green confirmation checkmark saying `"Copied!"` for 2 seconds upon success.

### 3. Page Layout Restructuring
*   **Catalog Cards**: Redesigned the coordinates section to arrange section, unit, and box values horizontally, conserving space while keeping location codes and copy actions prominent.
*   **Details View (`/inventory/:id`)**: Incorporated the `LocationDisplay` card as the primary visual component on the right-hand panel, giving storage tracking coordinates the highest visual priority on the page.

---

## Phase 7: Image-Based Physical Storage Locator

We implemented an interactive, image-based physical storage locator that utilizes high-definition transparent PNG images of the user's real 6-box vertical storage rack.

### 1. Transparent PNG Image Assets
* **Storage Images Location**: [`frontend/public/img/`](file:///D:/Inventory-Management-System/frontend/public/img/)
  * `0-removebg-preview.png`: All six boxes closed (Default State)
  * `1-removebg-preview.png`: Box 1 Open (Top)
  * `2-removebg-preview.png`: Box 2 Open
  * `3-removebg-preview.png`: Box 3 Open
  * `4-removebg-preview.png`: Box 4 Open
  * `5-removebg-preview.png`: Box 5 Open
  * `6-removebg-preview.png`: Box 6 Open (Bottom)

### 2. Component Architecture & Storage Configuration
* **Storage Configuration**: [`frontend/src/config/storageConfig.js`](file:///D:/Inventory-Management-System/frontend/src/config/storageConfig.js)
  * Houses `storageImages` dictionary and `physicalDrawerMap` mapping location codes (e.g. `A319` $\rightarrow$ Drawer 3, `A210` $\rightarrow$ Drawer 2) to physical drawer numbers (1–6).
* **Storage Visualizer Component**: [`frontend/src/components/storage/StorageVisualizer.jsx`](file:///D:/Inventory-Management-System/frontend/src/components/storage/StorageVisualizer.jsx)
  * Displays the large, hero-sized transparent PNG rack image with smooth crossfade opacity transitions.
  * Preloads all 7 images on mount for instant state switching without visual flickers.
  * Includes state badges ("ALL BOXES CLOSED" or "BOX X OPEN") and a `[ Reset Location ]` action button.
* **Location Panel Component**: [`frontend/src/components/storage/StorageLocationPanel.jsx`](file:///D:/Inventory-Management-System/frontend/src/components/storage/StorageLocationPanel.jsx)
  * Displays Section, Storage Unit, and Box breakdown alongside item details and a clipboard copy button for location codes.

### 3. Search & Locate Experience
* **Split-Pane Layout**: Active searches or location actions trigger a split 2-column layout:
  * **Left Column (45%)**: Search results with `[ LOCATE ]` and `[ Details ]` buttons.
  * **Right Column (55%)**: Prominent Storage Rack visualizer + Location Info panel.
* **Default State**: Opening `/inventory` without an active location selection shows the closed rack (`0-removebg-preview.png`).
* **Locate Action**: Clicking `[ LOCATE ]` on any item card identifies its mapped physical drawer (1–6) and transitions the rack image to show that drawer open.