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