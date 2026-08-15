# Inventory Management & Item Location Tracking System

A full-stack application designed to track inventories and monitor item locations across multiple storage sites. 

This repository currently hosts the **Phase 1: Project Foundation** codebase.

---

## Technology Stack

### Frontend
- **React 19** & **Vite 8**
- **React Router DOM v6** (for UI views)
- **Tailwind CSS v3** (for premium designs)
- **Vanilla CSS**

### Backend
- **Node.js** & **Express.js**
- **Mongoose & MongoDB** (Database driver & configuration)
- **Cors** (Cross-Origin Resource Sharing)
- **Dotenv** (Environment variables)

---

## Folder Structure

```
Inventory-Management-System/
├── backend/                  # Express REST API
│   ├── src/
│   │   ├── config/          # Connection configs (db.js)
│   │   ├── controllers/      # Route handler logics [.gitkeep]
│   │   ├── middleware/       # Custom middlewares [.gitkeep]
│   │   ├── models/           # Mongoose schemas [.gitkeep]
│   │   ├── routes/           # REST endpoints definitions [.gitkeep]
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
2. Open `backend/.env` and update configurations with your MongoDB URI if necessary:
   ```ini
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/inventory_db
   ```

*(Note: actual `.env` files are ignored by git in `.gitignore` to protect production and local secrets).*

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

## System Health Diagnostics

In Phase 1, the frontend dashboard requests server status through its relative path proxy.
If the backend server is active:
- The dashboard status indicator turns green, displaying **"Online"**.
- It shows the raw JSON payload returned from the `/api/health` API.