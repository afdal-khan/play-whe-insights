/* This is src/App.jsx (With Bet Planner Enabled) */

import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, query, orderBy, limit } from './firebase'; 

// Import Pages
import Dashboard from './pages/Dashboard';
import Statistics from './pages/Statistics';
import BetPlanner from './pages/BetPlanner'; // Import the new page

const DRAW_LIMIT = 300; 

function App() {
  const [view, setView] = useState('statistics');
  
  // --- CENTRALIZED STATE ---
  const [globalData, setGlobalData] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);

  // --- FETCH ONCE ON LOAD ---
  useEffect(() => {
    const fetchGlobalData = async () => {
      setIsLoading(true);
      try {
        const drawsRef = collection(db, 'draws');
        const q = query(drawsRef, orderBy('DrawNo', 'desc'), limit(DRAW_LIMIT));
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => {
            const r = doc.data();
            const date = new Date(r.Date + 'T00:00:00Z');
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return { id: doc.id, ...r, DayName: dayNames[date.getUTCDay()] };
        });

        setGlobalData(data);
      } catch (error) {
        console.error("Global Fetch Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGlobalData();
  }, []); 

  const NavLink = ({ page, title }) => {
    const isActive = view === page;
    return (
      <button
        onClick={() => setView(page)}
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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
      
      {/* Header */}
      <header className="bg-gray-800 shadow-lg sticky top-0 z-50">
        <nav className="container mx-auto max-w-7xl px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-cyan-400">Play Whe Insights</h1>
          <div className="flex space-x-2 md:space-x-4">
            <NavLink page="dashboard" title="Play Chart" />
            <NavLink page="statistics" title="Statistics" />
            <NavLink page="planner" title="Bet Planner" /> 
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-7xl p-4 md:p-6">
        
        {view === 'dashboard' && (
            <Dashboard data={globalData} loading={isLoading} />
        )}
        
        {view === 'statistics' && (
            <Statistics data={globalData} loading={isLoading} />
        )}
        
        {/* Render the Bet Planner */}
        {view === 'planner' && <BetPlanner />} 

      </main>
    </div>
  );
}

export default App;