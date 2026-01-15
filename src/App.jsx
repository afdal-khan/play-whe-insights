import React, { useState, useEffect } from 'react';
import { supabase } from './supabase'; 
import LaneAnalytics from './pages/LaneAnalytics'; 
import Dashboard from './pages/Dashboard';
import Statistics from './pages/Statistics';

const DRAW_LIMIT = 300; 

function App() {
  // CHANGE 1: Set default view to 'lanes'
  const [view, setView] = useState('lanes');
  
  const [globalData, setGlobalData] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGlobalData = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('draws')
          .select('*')
          .order('DrawNo', { ascending: false })
          .limit(DRAW_LIMIT);

        if (error) throw error;

        const processedData = data.map(r => {
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
        className={`px-3 py-2 rounded-md text-sm font-bold transition-colors uppercase tracking-wider ${
          isActive
            ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        }`}
      >
        {title}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 font-sans">
      
      {/* Header */}
      <header className="bg-[#050505]/95 backdrop-blur shadow-lg sticky top-0 z-50 border-b border-white/10">
        <nav className="container mx-auto max-w-7xl px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-black text-white tracking-tighter">IZI SYSTEMS</h1>
          
          <div className="flex space-x-2">
            {/* CHANGE 2: Updated Navigation Order */}
            <NavLink page="lanes" title="Lane Chart" />
            <NavLink page="statistics" title="Statistics" />
            <NavLink page="dashboard" title="Play Chart" />
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-7xl p-0 md:p-6">
        
        {/* Renders Lane Analytics (Default) */}
        {view === 'lanes' && (
            <LaneAnalytics />
        )}

        {view === 'statistics' && (
            <Statistics data={globalData} loading={isLoading} />
        )}

        {view === 'dashboard' && (
            <Dashboard data={globalData} loading={isLoading} />
        )}

      </main>
    </div>
  );
}

export default App;