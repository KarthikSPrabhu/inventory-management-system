import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

function Home() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Call our proxied health endpoint
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch backend health status:', err);
        setError(err.message || 'Could not reach backend API');
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-none">Antigravity Tracker</h1>
              <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">Inventory system</span>
            </div>
          </div>
          <nav className="flex gap-6">
            <Link to="/" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">Dashboard</Link>
            <Link to="/about" className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors">About</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl w-full mx-auto px-4 py-16 flex-grow flex flex-col justify-center">
        <div className="text-center mb-10">
          <span className="px-3 py-1 text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
            Phase 1: Project Foundation
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mt-4 tracking-tight leading-tight">
            Inventory Management System
          </h2>
          <p className="text-slate-400 mt-4 max-w-xl mx-auto text-base">
            Your React frontend is successfully connected with the Express API server. Follow the development setup to extend features in the next phases.
          </p>
        </div>

        {/* Status Dashboard Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl shadow-slate-950/50 backdrop-blur-xl relative overflow-hidden">
          {/* Decorative background gradients */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl"></div>

          <h3 className="text-sm font-bold text-slate-350 uppercase tracking-widest mb-6 pb-3 border-b border-slate-800/80 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Service Diagnostics
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Frontend Status */}
            <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Client Server</p>
                <h4 className="text-base font-bold text-white mt-1">React + Vite</h4>
                <p className="text-xs text-slate-400 mt-0.5">Port 5173</p>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-3 py-1 rounded-full text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-pulse"></span> Ready
              </div>
            </div>

            {/* Backend Status */}
            <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">REST API</p>
                <h4 className="text-base font-bold text-white mt-1">Express.js</h4>
                <p className="text-xs text-slate-400 mt-0.5">Port 5000</p>
              </div>

              {loading ? (
                <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/25 px-3 py-1 rounded-full text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-505 animate-pulse"></span> Connecting...
                </div>
              ) : error ? (
                <div className="flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/25 px-3 py-1 rounded-full text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Offline
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-3 py-1 rounded-full text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-pulse"></span> Online
                </div>
              )}
            </div>
          </div>

          {/* Connection Detail Log */}
          <div className="mt-6 bg-slate-955/80 border border-slate-850 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">API Connection Log</h4>
            <div className="font-mono text-xs text-slate-350 leading-relaxed">
              {loading ? (
                <p className="text-amber-450/90">Requesting status check from `/api/health`...</p>
              ) : error ? (
                <div>
                  <p className="text-rose-455 font-semibold">Error linking to the backend server:</p>
                  <p className="text-slate-500 mt-1 font-sans">Details: {error}</p>
                  <p className="text-slate-400 mt-2 font-sans">
                    Please make sure your Node backend server is running. You can launch it by navigating to <code className="text-indigo-400 bg-slate-900 px-1 py-0.5 rounded">backend/</code> and executing <code className="text-indigo-400 bg-slate-900 px-1 py-0.5 rounded">npm run dev</code>.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-emerald-400">Response payload returned from Express server `/api/health`:</p>
                  <pre className="mt-2 bg-slate-950 p-3 rounded border border-slate-850 text-indigo-300 overflow-x-auto">
                    {JSON.stringify(health, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>&copy; {new Date().getFullYear()} Inventory Location Tracking Application. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="text-slate-400">Mongoose Configured</span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-400">React Router Mounted</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function About() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between">
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-none">Antigravity Tracker</h1>
              <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">Inventory system</span>
            </div>
          </div>
          <nav className="flex gap-6">
            <Link to="/" className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors">Dashboard</Link>
            <Link to="/about" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">About</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16 flex-grow flex flex-col justify-center">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-slate-950/50 backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-white mb-4">About Phase 1</h2>
          <p className="text-slate-350 leading-relaxed mb-4">
            This project forms the layout foundation of an Inventory Management and Item Location Tracking web application.
          </p>
          <p className="text-slate-350 leading-relaxed mb-6">
            In Phase 1, we initialized the workspace codebase, configured backend cors settings, and added environment variables. Express endpoints interface with React Router views smoothly through dev proxies.
          </p>
          <div className="border-t border-slate-850 pt-6">
            <h3 className="font-semibold text-white mb-3 text-sm tracking-wide uppercase">Core Architecture:</h3>
            <ul className="list-disc list-inside text-sm text-indigo-300 space-y-1.5">
              <li>React Router client-side routing</li>
              <li>Express API with health statistics</li>
              <li>MongoDB connectivity configurations</li>
              <li>Tailwind CSS styling templates</li>
            </ul>
          </div>
          <div className="mt-8">
            <Link to="/" className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30 text-sm">
              &larr; Back to Dashboard
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-900 bg-slate-955 py-6 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Inventory Location Tracking Application. All rights reserved.</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  );
}

export default App;
