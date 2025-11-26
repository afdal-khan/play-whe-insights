/* This is the final src/App.jsx (Minimal working configuration) */

import React, { useState } from 'react';

// Import all our pages
import Dashboard from './pages/Dashboard';  // The NEW Play Chart
import Statistics from './pages/Statistics'; // The OLD Dashboard (charts)
// --- REMOVED: History and DreamBook pages ---


function App() {
  // Default view set to Statistics (Your strategic choice)
  const [view, setView] = useState('statistics'); 

  const NavLink = ({ page, title }) => {
    const isActive = view === page;
    return (
      <button
        onClick={() => setView(page)}
        className={`px-3 py-2 rounded-md text-sm font-medium ${
          isActive
            ? 'bg-cyan-600 text-white'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
      >
        {title}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      
      {/* Header & Navigation Bar */}
      <header className="bg-gray-800 shadow-lg sticky top-0 z-50">
        <nav className="container mx-auto max-w-7xl px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-cyan-400">Play Whe Insights</h1>
          
          {/* Nav Links - ONLY TWO WORKING PAGES */}
          <div className="flex space-x-2 md:space-x-4">
            <NavLink page="dashboard" title="Play Chart" />
            <NavLink page="statistics" title="Statistics" />
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto max-w-7xl p-4 md:p-6">
        
        {/* Page Router - ONLY TWO WORKING PAGES */}
        {view === 'dashboard' && <Dashboard />}
        {view === 'statistics' && <Statistics />}

      </main>
    </div>
  );
}

export default App;