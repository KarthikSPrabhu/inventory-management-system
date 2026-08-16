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

---

## Phase 8: Unified Inventory Workspace

We completely restructured the application's user experience into a single, unified **Physical Inventory Locator Workspace**.

### 1. Unified Main Landing Experience
* **Single Landing Page**: Opening `/` lands directly into `/inventory` (the unified Inventory Workspace).
* **Simplified Sidebar Navigation**: Removed separate Dashboard, Inventory Items, and Add Item sidebar entries. Replaced with a single primary `Inventory` navigation entry.
* **Top-Right Add Item Action**: Moved `[+ Add Item]` to the top right header of the main Inventory workspace.

### 2. Permanent Physical Storage Panel
* The Physical Storage visualizer panel is **permanently visible** on the right column (~35% width) on desktop browsers.
* Eliminates separate page switching or modal toggling for storage tracking.

### 3. Two-Way Interactive Navigation
* **Item $\rightarrow$ Drawer**: Clicking `[ LOCATE ]` on any inventory card opens its mapped physical drawer (1–6) on the right storage panel.
* **Drawer $\rightarrow$ Items**: Clicking any physical **Box 1 to 6** on the storage rack image instantly switches the rack image (`1..6-removebg-preview.png`), displays all items stored in that drawer, and highlights them.

---

## Phase 9: Project Management & Inventory Usage

We expanded the application into a complete **Inventory & Project Management System** with persistent project records, intelligent project suggestions, inventory withdrawal tracking, and aggregated component usage metrics.

### 1. Mongoose Data Models
* **Project Model**: [`backend/src/models/Project.js`](file:///D:/Inventory-Management-System/backend/src/models/Project.js)
  * `name`: String (required, unique, trimmed).
  * `description`: String (optional, max 500 chars).
  * `status`: String enum (`active`, `completed`, `archived`, default `active`).
  * `timestamps`: `createdAt`, `updatedAt`.
* **InventoryUsage Model**: [`backend/src/models/InventoryUsage.js`](file:///D:/Inventory-Management-System/backend/src/models/InventoryUsage.js)
  * `item`: ObjectId reference pointing to `InventoryItem` (required).
  * `project`: ObjectId reference pointing to `Project` (required).
  * `quantity`: Number (required positive integer $\ge 1$).
  * `location`: String (recorded location code at withdrawal time).
  * `notes`: String (optional, max 500 chars).
  * `timestamps`: `createdAt`, `updatedAt`.

### 2. REST API Endpoints
Project routes mounted under `/api/projects` in [`backend/src/routes/projectRoutes.js`](file:///D:/Inventory-Management-System/backend/src/routes/projectRoutes.js) and withdrawal routes mounted under `/api/usage` in [`backend/src/routes/usageRoutes.js`](file:///D:/Inventory-Management-System/backend/src/routes/usageRoutes.js):

| Method | Endpoint | Description | Request Body / Query | Response |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/projects` | Create new persistent project | `{ name, description, status }` | 201 Created |
| **GET** | `/api/projects` | List all projects with usage stats | None | 200 OK |
| **GET** | `/api/projects/suggestions` | Intelligent project suggestions | `?itemId=ITEM_ID` | 200 OK |
| **GET** | `/api/projects/:id` | Get project details by ID | None | 200 OK |
| **PATCH** | `/api/projects/:id` | Update project status/details | `{ name, description, status }` | 200 OK |
| **GET** | `/api/projects/:id/usage` | Aggregated components used by project | None | 200 OK |
| **POST** | `/api/usage` | Record item withdrawal & reduce stock | `{ itemId, projectId, quantity, notes }` | 201 Created |

### 3. Intelligent Ranking & Recommendation Logic
* `GET /api/projects/suggestions?itemId=ITEM_ID` checks historical `InventoryUsage` documents for `itemId`.
* Projects that previously used `itemId` are marked with `usedBefore: true` (`"Used this item before"`) and ranked **FIRST** in the project selector. Remaining active projects follow.

### 4. Component Usage Aggregation
* `GET /api/projects/:id/usage` aggregates multiple withdrawal transactions of the same item into a single total (e.g. 3 units + 2 units = **5 units total**), displaying current item locations even if stock is exhausted.

---

## Phase 10: Inventory Usage History & Activity

We added comprehensive auditability, withdrawal activity history, and usage analytics across the application.

### 1. Source of Truth & Preservation
* **Single Source of Truth**: All activity records utilize the existing `InventoryUsage` MongoDB collection created in Phase 9. No duplicate history collections were created.
* **Location Preservation**: Each historical record permanently preserves `location` (the exact location code string at withdrawal time). Even if an item's current location changes later, historical usage records retain their historical location code.

### 2. REST API Endpoints & Enhancements
Extended `GET /api/usage`, `GET /api/usage/item/:itemId`, and `GET /api/projects/:id/usage`:

| Method | Endpoint | Description | Request Query | Response |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/usage` | List usage records with pagination & filtering | `?page=1&limit=20&search=&itemId=&projectId=&dateRange=all` | `{ success, count, total, page, totalPages, data }` |
| **GET** | `/api/usage/item/:itemId` | Item summary metrics & withdrawal logs | None | `{ success, summary: { currentStock, totalUnitsUsed, projectsCount }, data }` |
| **GET** | `/api/projects/:id/usage` | Project summary, aggregated items, & activity logs | None | `{ success, data: { project, summary, items, activityRecords } }` |

### 3. History Page & Advanced Filtering
* **Navigation Entry**: Main navigation header features **Inventory**, **Projects**, and **History** tabs (`/history`).
* **History Page (`/history`)**: Lists all inventory withdrawal activity cards in reverse chronological order (newest first).
* **Filter Controls**:
  * **Search**: Free text matching on item name, project name, preserved location code, or notes.
  * **Item Filter**: Select specific inventory item.
  * **Project Filter**: Select specific project.
  * **Date Range Filter**: Filter by `Today`, `Last 7 days`, `Last 30 days`, or `All time`.
* **Pagination**: Server-side pagination support (`Showing X–Y of Z`, `[ Previous ]`, `[ Next ]`).
* **Activity Card Display**: Displays Item Name, Quantity Taken (e.g. `−3 units`), Project Name, Preserved Location (e.g. `📍 A319`), Timestamp, and Notes.

---

## Phase 11: Inventory Restocking / Stock In

We implemented inventory restocking capabilities, allowing stock additions to existing items, recording stock-in transactions in MongoDB Atlas, and unifying Stock In and Stock Out records in the History & Activity system.

### 1. Data Model (`InventoryStockIn`)
* **Mongoose Model**: [`backend/src/models/InventoryStockIn.js`](file:///D:/Inventory-Management-System/backend/src/models/InventoryStockIn.js)
  * `item`: ObjectId reference pointing to `InventoryItem` (required).
  * `quantity`: Number (required positive integer $\ge 1$).
  * `reason`: String (required: `Purchased`, `Returned`, `Found`, `Transferred In`, `Correction`, `Other` or custom explanation).
  * `notes`: String (optional, max 500 characters).
  * `timestamps`: `createdAt`, `updatedAt`.

### 2. REST API Endpoint (`POST /api/stock-in`)
* Endpoint mounted at `/api/stock-in` in [`backend/src/routes/stockInRoutes.js`](file:///D:/Inventory-Management-System/backend/src/routes/stockInRoutes.js):

| Method | Endpoint | Description | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/stock-in` | Record stock-in & increase inventory quantity | `{ itemId, quantity, reason, notes }` | 201 Created |

* **Validation Rules**:
  * `quantity`: Must be a positive integer $\ge 1$. Rejects 0, negative numbers, decimals, and non-numeric inputs.
  * `reason`: Required. Rejects empty string or whitespace. If `"Other"` is selected, custom explanation is required.
  * `notes`: Optional, maximum 500 characters.
  * `stale data protection`: Backend reads real-time current stock from MongoDB Atlas before incrementing.

### 3. Integrated Activity History API (`GET /api/usage`)
* Unified history endpoint merges `InventoryStockIn` (stock added) and `InventoryUsage` (stock withdrawn) into a single normalized chronological timeline (`createdAt DESC`).
* Supports `activityType` parameter (`all`, `stock_in`, `usage`).

---

## Phase 12: Inventory Analytics & Insights

We implemented a focused **Analytics & Intelligence** page (`/analytics`) driven by real-time MongoDB Atlas data and aggregation pipelines.

### 1. Data Model Enhancements
* **`lowStockThreshold`**: Added configurable `lowStockThreshold` field to `InventoryItemSchema` ([`backend/src/models/InventoryItem.js`](file:///D:/Inventory-Management-System/backend/src/models/InventoryItem.js)), defaulting to `5` units for all items.
* **Low Stock Status Logic**:
  * `OUT OF STOCK`: `quantity === 0`
  * `LOW STOCK`: `quantity > 0` and `quantity <= lowStockThreshold`
  * `IN STOCK`: `quantity > lowStockThreshold`

### 2. Analytics REST API (`/api/analytics`)
Endpoints implemented in [`backend/src/controllers/analyticsController.js`](file:///D:/Inventory-Management-System/backend/src/controllers/analyticsController.js) using read-only MongoDB aggregations:

| Method | Endpoint | Description | Request Query | Response |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/analytics/summary` | Distinct item count, total available units, low-stock count, out-of-stock count, stock in, stock out, net change | `?dateRange=today\|7days\|30days\|90days\|all` | `{ success, data: { totalItems, totalUnits, lowStockItems, outOfStockItems, stockIn, stockOut, netChange } }` |
| **GET** | `/api/analytics/most-used-items` | Top items by total units withdrawn | `?dateRange=all&limit=5` | `{ success, data: [{ itemId, name, location, currentStock, totalQuantityUsed }] }` |
| **GET** | `/api/analytics/most-used-projects` | Top projects by total units consumed | `?dateRange=all&limit=5` | `{ success, data: [{ projectId, name, status, totalUnitsConsumed }] }` |
| **GET** | `/api/analytics/low-stock` | Active low-stock and out-of-stock item lists | None | `{ success, data: { lowStock, outOfStock } }` |
| **GET** | `/api/analytics/movement` | Timeline of restocks vs withdrawals over time | `?dateRange=all` | `{ success, data: [{ date, stockIn, stockOut, netChange }] }` |

---

## Phase 13: Authentication & User Management

We implemented JWT-based authentication and role-based authorization (`admin` vs `member`), protecting both backend REST API endpoints and frontend routes.

### 1. User Model (`User`)
* **Mongoose Schema**: [`backend/src/models/User.js`](file:///D:/Inventory-Management-System/backend/src/models/User.js)
  * `name`: String (required, trim).
  * `email`: String (required, unique, lowercase, trim).
  * `passwordHash`: String (required, `select: false` so it is excluded from default queries).
  * `role`: String (enum: `['admin', 'member']`, default: `'member'`).
* **Password Hashing**: Passwords hashed securely using `bcryptjs` (salt factor 10). Plain-text passwords are never stored or exposed.

### 2. Authentication API (`/api/auth`)
* Mounted at `/api/auth` in [`backend/src/routes/authRoutes.js`](file:///D:/Inventory-Management-System/backend/src/routes/authRoutes.js):

| Method | Endpoint | Description | Access | Request / Response |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/login` | Authenticate user & issue JWT | Public | `{ email, password }` $\rightarrow$ `{ success, token, user: { id, name, email, role } }` |
| **GET** | `/api/auth/me` | Fetch authenticated user profile | Private (`requireAuth`) | Returns current user profile |

### 3. Middleware & Protected APIs
* **`requireAuth`**: Validates JWT token from `Authorization: Bearer <token>` header. Rejects missing/expired tokens with `401 Unauthorized`.
* **`requireRole('admin')`**: Enforces role checks. Rejects non-admin users with `403 Forbidden`.
* **API Permissions Matrix**:

| Feature / Action | Admin | Member | Unauthenticated |
| :--- | :--- | :--- | :--- |
| **View Catalog / Details** | ✅ | ✅ | ❌ (Redirect to `/login`) |
| **Take Item (Withdrawal)** | ✅ | ✅ | ❌ |
| **View History & Analytics** | ✅ | ✅ | ❌ |
| **Create Item / Edit Item / Delete Item** | ✅ | ❌ (`403 Forbidden`) | ❌ (`401 Unauthorized`) |
| **Restock Stock In (`+ Add Stock`)** | ✅ | ❌ (`403 Forbidden`) | ❌ (`401 Unauthorized`) |
| **Create Project / Edit / Delete Project** | ✅ | ❌ (`403 Forbidden`) | ❌ (`401 Unauthorized`) |

### 4. Initial Seed Accounts & Setup
Default initial accounts auto-bootstrap on server startup if the `User` collection is empty (or can be seeded via `node backend/src/scripts/seedAdmin.js`):
* **Admin**: `admin@inventory.com` | Password: `Admin@12345` (Role: `admin`)
* **Member**: `member@inventory.com` | Password: `Member@12345` (Role: `member`)

### 5. Frontend Auth State & UI Guarding
* **Auth Context**: [`frontend/src/context/AuthContext.jsx`](file:///D:/Inventory-Management-System/frontend/src/context/AuthContext.jsx) persists JWT token in `localStorage` and injects `Authorization: Bearer <token>` on API requests.
* **Protected Routes**: [`frontend/src/components/auth/ProtectedRoute.jsx`](file:///D:/Inventory-Management-System/frontend/src/components/auth/ProtectedRoute.jsx) guards `/inventory`, `/projects`, `/history`, and `/analytics`.
* **Login Page**: [`frontend/src/pages/LoginPage.jsx`](file:///D:/Inventory-Management-System/frontend/src/pages/LoginPage.jsx) provides a dark glassmorphic login interface.
* **Header Profile**: Displays current user name, role badge (`👑 ADMIN` / `👤 MEMBER`), and `Logout` button.






