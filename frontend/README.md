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
