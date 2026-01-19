import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

const RowHunter = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]); 
  const [lastDrawStats, setLastDrawStats] = useState(null);
  const [rawData, setRawData] = useState([]);
  
  // VIEW MODE: 'mark', 'line', 'suit'
  const [viewMode, setViewMode] = useState('mark');

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('draws')
      .select('*')
      .order('Date', { ascending: false }) 
      .order('id', { ascending: false }) 
      .limit(600); 

    if (error) {
      console.error('Error fetching draws:', error);
    } else if (data && data.length > 0) {
      setRawData(data);
      setLastDrawStats(data[0]);
      processData(data, 'mark');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const processData = (draws, mode) => {
    const groups = {};
    const nameMap = {}; // Helper to store Mark Names (e.g. 1 -> Centipede)

    draws.forEach((draw, index) => {
      let key = null;
      if (mode === 'mark') key = draw.Mark;
      if (mode === 'line') key = draw.Line; 
      if (mode === 'suit') key = draw.Suit; 

      if (!key) return;

      // Capture Mark Name mapping if available
      if (mode === 'mark' && draw.MarkName) {
        nameMap[key] = draw.MarkName;
      }

      if (!groups[key]) {
        groups[key] = {
          id: key,
          lastSeenIndex: -1,
          items: new Set()
        };
      }
      
      // Index 0 is the NEWEST draw.
      if (groups[key].lastSeenIndex === -1) {
        groups[key].lastSeenIndex = index;
      }
      
      if (draw.Mark) groups[key].items.add(parseInt(draw.Mark));
    });

    const processed = Object.values(groups).map(group => {
      return {
        id: group.id,
        // Use the captured name for Marks, otherwise use the Group Name
        name: mode === 'mark' ? (nameMap[group.id] || '-') : group.id,
        wait: group.lastSeenIndex,
        items: Array.from(group.items).sort((a,b) => a-b)
      };
    });

    // ALWAYS SORT BY WAIT TIME (Descending) -> Most Due at Top
    processed.sort((a, b) => b.wait - a.wait);
    
    setStats(processed);
  };

  const switchMode = (mode) => {
      setViewMode(mode);
      processData(rawData, mode);
  };

  // --- METER COLORS ---
  const getMeterColor = (wait, mode) => {
      const lateThreshold = mode === 'mark' ? 60 : (mode === 'line' ? 20 : 12);
      
      // CRITICAL (Red)
      if (wait > lateThreshold) return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]';
      // WARNING (Orange)
      if (wait > (lateThreshold / 2)) return 'bg-orange-500';
      // RECENT (Cyan)
      return 'bg-cyan-500';
  };

  const getRowStyle = (wait, mode) => {
      const lateThreshold = mode === 'mark' ? 60 : (mode === 'line' ? 20 : 12);
      if (wait > lateThreshold) return 'bg-red-900/10 border-red-500/30';
      return 'border-gray-700/50 hover:bg-gray-700/30';
  };

  return (
    <div className="min-h-screen pb-20 flex flex-col font-sans">
      
      {/* HEADER & CONTROLS */}
      <div className="bg-gray-800 rounded-xl shadow-lg p-4 mb-4 border-b border-gray-700 shrink-0 mx-4 mt-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span>Gap Table</span>
                    <span className="px-2 py-0.5 text-[10px] uppercase bg-cyan-900 text-cyan-300 rounded border border-cyan-700">Sorted by Missing</span>
                </h1>
            </div>

            {/* TOGGLES */}
            <div className="bg-gray-700 p-1 rounded-lg flex">
                {['mark', 'line', 'suit'].map((type) => ( 
                    <button 
                        key={type} 
                        onClick={() => switchMode(type)} 
                        className={`px-4 py-1.5 text-xs font-bold uppercase rounded-md transition-all duration-200 ${ 
                            viewMode === type 
                            ? 'bg-cyan-600 text-white shadow-md' 
                            : 'text-gray-400 hover:text-white hover:bg-gray-600' 
                        }`}
                    > 
                        {type}s
                    </button> 
                ))}
            </div>
        </div>
      </div>

      {/* TABLE CONTAINER */}
      <div className="px-4 max-w-5xl mx-auto w-full">
        <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
            
            {/* TABLE HEADER */}
            <div className="grid grid-cols-12 bg-gray-900/50 text-[11px] font-bold text-gray-500 uppercase tracking-widest py-3 px-4 border-b border-gray-700">
                <div className="col-span-2">Mark #</div>
                <div className="col-span-4">{viewMode === 'mark' ? 'Mark Name' : 'Numbers In Group'}</div>
                <div className="col-span-4">Wait Meter</div>
                <div className="col-span-2 text-right">Missing</div>
            </div>

            {/* TABLE BODY */}
            <div className="divide-y divide-gray-700/50">
                {stats.map((item) => {
                    const threshold = viewMode === 'mark' ? 60 : (viewMode === 'line' ? 20 : 12);
                    const percentage = Math.min((item.wait / (threshold * 1.5)) * 100, 100);
                    
                    return (
                        <div 
                            key={item.id} 
                            className={`grid grid-cols-12 items-center py-3 px-4 transition-colors ${getRowStyle(item.wait, viewMode)}`}
                        >
                            {/* COL 1: ID */}
                            <div className="col-span-2">
                                <span className={`text-lg font-bold ${item.wait > threshold ? 'text-red-400' : 'text-white'}`}>
                                    {item.id}
                                </span>
                            </div>

                            {/* COL 2: NAME or NUMBERS */}
                            <div className="col-span-4 pr-4">
                                {viewMode === 'mark' ? (
                                    <span className="text-sm text-gray-300 font-medium">{item.name}</span>
                                ) : (
                                    <div className="flex flex-wrap gap-1">
                                        {item.items.map(n => (
                                            <span key={n} className="text-[10px] text-gray-400 bg-gray-900 px-1.5 rounded border border-gray-700">
                                                {n}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* COL 3: METER */}
                            <div className="col-span-4 pr-6">
                                <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-700">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${getMeterColor(item.wait, viewMode)}`}
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* COL 4: MISSING COUNT */}
                            <div className="col-span-2 text-right">
                                <span className={`text-xl font-black ${item.wait > threshold ? 'text-red-500' : 'text-cyan-400'}`}>
                                    {item.wait}
                                </span>
                                <span className="text-[9px] text-gray-500 uppercase ml-1">Draws</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
        
        {/* FOOTER STATS */}
        <div className="text-center mt-4 text-xs text-gray-500">
            Scanning last 600 draws based on <span className="text-cyan-500 font-bold">{lastDrawStats?.MarkName} ({lastDrawStats?.Mark})</span>
        </div>

      </div>
    </div>
  );
};

export default RowHunter;