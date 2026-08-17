# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

### Starting the Development Servers

**1. Start the MongoDB Database / Express Backend API:**
```bash
cd backend
npm run dev
```

**2. Start the React Frontend:**
```bash
cd frontend
npm run dev -- --host
```

### Mobile LAN Connectivity (Phase 17)
To test the application on a mobile device connected to the same Wi-Fi network:
1. Determine your PC's IP address (run `ipconfig` on Windows or `ifconfig` on Mac/Linux). Let's assume it is `192.168.1.10`.
2. Ensure both your PC and phone are connected to the exact same Wi-Fi network.
3. Open your mobile browser and navigate to `http://<PC-IP>:5173` (e.g., `http://192.168.1.10:5173`).
4. The Vite development proxy (`/api`) automatically forwards all API requests directly to the local Express backend, bypassing complex browser CORS requirements while maintaining a secure origin allowlist.

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

# Phase 18 — Authentication & Security

- **Authentication Architecture**: JWT-based session state managed via `AuthContext.jsx` with secure token validation across the backend Express API and the React frontend.
- **Password Hashing**: Uses `bcryptjs` with salting. Passwords are never stored in plain text and are always hidden from standard query selections.
- **JWT / Session Approach**: Tokens are generated on successful login. An expired or invalid token forces a logout across the application, directing the user back to the sign-in page safely.
- **User Roles**: Two core roles supported: `admin` (full access) and `member` (limited access).
- **User Management**: Admins have a dedicated Dashboard (`/users`) for monitoring and controlling the status of all accounts in the system.
- **Account Status**: Users can be marked active or disabled. A disabled user's sessions are invalidated, and they can no longer access protected endpoints or sign in.
- **Protected Routes**: React router is strictly protected using `ProtectedRoute`, managing role-based restrictions seamlessly.
- **API Authorization**: Explicit middleware implementations (`requireAuth`, `requireRole('admin')`) protect sensitive routes like User Management or Resource Modification.
- **Password Change**: Fully authenticated user profile area supports changing passwords requiring verification of the previous password, keeping all security contained in the backend logic.
- **Security Controls**: IDOR checks on all resource mutations. Rate-limiting enabled across API and authentication endpoints (max 15 attempts for login within 15 minutes).
- **Authentication Events**: Server logging captures core events safely ("Login successful", "Password changed successfully") without persisting sensitive payload data.
- **Environment Variables**: Sensitive variables (`JWT_SECRET`, `MONGODB_URI`) are strictly server-side inside `.env`.
- **Security Testing**: Covered test cases ensure disabled user lockout, IDOR prevention, and LAN backward compatibility functionality remain preserved perfectly.
