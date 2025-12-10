/* This is src/App.jsx (Updated to use Supabase) */

import React, { useState, useEffect } from 'react';
import { supabase } from './supabase'; // Import the new client

// Import Pages
import Dashboard from './pages/Dashboard';
import Statistics from './pages/Statistics';
// import BetPlanner from './pages/BetPlanner'; 

const DRAW_LIMIT = 300; 

function App() {
  const [view, setView] = useState('statistics');
  
  // --- CENTRALIZED STATE ---
  const [globalData, setGlobalData] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);

  // --- FETCH ONCE ON LOAD (Supabase Version) ---
  useEffect(() => {
    const fetchGlobalData = async () => {
      setIsLoading(true);
      try {
        // Supabase Query: Select all columns from 'draws', sort by DrawNo descending, limit to 300
        const { data, error } = await supabase
          .from('draws')
          .select('*')
          .order('DrawNo', { ascending: false })
          .limit(DRAW_LIMIT);

        if (error) throw error;

        // Process data (Supabase returns an array of objects directly, much cleaner!)
        const processedData = data.map(r => {
            // Note: Supabase columns are case-sensitive. Ensure your DB columns are Capitalized (Date, Time) 
            // matching your CSV headers. If they are lowercase (date, time), update this map.
            const date = new Date(r.Date + 'T00:00:00Z');
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return { ...r, DayName: dayNames[date.getUTCDay()] };
        });

        setGlobalData(processedData);
        console.log(`Loaded ${data.length} draws from Supabase.`); 

      } catch (error) {
        console.error("Supabase Global Fetch Error:", error.message);
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
            {/* <NavLink page="planner" title="Bet Planner" /> */}
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
        
        {/* view === 'planner' && <BetPlanner /> */} 

      </main>
    </div>
  );
}

export default App;