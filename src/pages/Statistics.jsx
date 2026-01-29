import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

const Statistics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]); 
  const [lastDrawStats, setLastDrawStats] = useState(null);
  const [rawData, setRawData] = useState([]);
  
  // VIEW MODE: 'mark', 'line', 'suit'
  const [viewMode, setViewMode] = useState('mark');

  // SORT MODE: 'wait', 'pressure'
  const [sortMode, setSortMode] = useState('wait');

  // FILTERS (NEW)
  const [timeFilter, setTimeFilter] = useState('All');
  const [dayFilter, setDayFilter] = useState('All');

  // TIME TRAVEL STATE
  const [historyOffset, setHistoryOffset] = useState(0); 

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
      updateView(data, 0, viewMode);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // When filters change, re-run the view update
  useEffect(() => {
    if (rawData.length > 0) {
        updateView(rawData, historyOffset, viewMode);
    }
  }, [timeFilter, dayFilter]); // Trigger when filters change

  const updateView = (allData, offset, mode) => {
    // 1. Slice for Time Travel (Global History)
    const activeData = allData.slice(offset);

    if (activeData.length > 0) {
        setLastDrawStats(activeData[0]); 
        processData(activeData, mode);
    }
  };

  const switchMode = (mode) => {
      setViewMode(mode);
      updateView(rawData, historyOffset, mode);
  };

  const changeOffset = (newOffset) => {
      if (newOffset < 0) newOffset = 0;
      if (newOffset >= rawData.length - 1) newOffset = rawData.length - 1;
      setHistoryOffset(newOffset);
      updateView(rawData, newOffset, viewMode);
  };

  // --- HELPER: GET DAY NAME ---
  const getDayName = (dateStr) => {
      const date = new Date(dateStr);
      // Fix for timezone issues if dateStr is YYYY-MM-DD
      const dayIndex = new Date(dateStr + 'T00:00:00').getDay();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[dayIndex];
  };

  const processData = (draws, mode) => {
    // --- STEP 0: APPLY FILTERS ---
    // We filter the dataset BEFORE calculating gaps.
    // This ensures "Draws Ago" means "Evening Draws Ago" (if filtered).
    const filteredDraws = draws.filter(d => {
        const tMatch = timeFilter === 'All' || d.Time === timeFilter;
        
        // Check Day Match (Handle case where DayName might be missing in DB)
        const dName = d.DayName || getDayName(d.Date);
        const dMatch = dayFilter === 'All' || dName === dayFilter;

        return tMatch && dMatch;
    });

    const groups = {};
    const nameMap = {}; 
    
    // --- STEP 1: CALCULATE GAP FOR EVERY INDIVIDUAL MARK FIRST ---
    // We iterate through the FILTERED list. 
    const markWaits = {};
    const markFound = {}; 

    filteredDraws.forEach((draw, index) => {
        const m = parseInt(draw.Mark);
        if (m && markFound[m] === undefined) {
            markWaits[m] = index;
            markFound[m] = true;
        }
    });

    // --- STEP 2: PROCESS GROUPS ---
    filteredDraws.forEach((draw, index) => {
      let key = null;
      if (mode === 'mark') key = draw.Mark;
      if (mode === 'line') key = draw.Line; 
      if (mode === 'suit') key = draw.Suit; 

      if (!key) return;

      if (mode === 'mark' && draw.MarkName) nameMap[key] = draw.MarkName;

      if (!groups[key]) {
        groups[key] = {
          id: key,
          lastSeenIndex: -1,
          items: new Set()
        };
      }
      
      if (groups[key].lastSeenIndex === -1) {
        groups[key].lastSeenIndex = index;
      }
      
      if (draw.Mark) groups[key].items.add(parseInt(draw.Mark));
    });

    const processed = Object.values(groups).map(group => {
      const itemsWithGaps = Array.from(group.items).map(num => ({
          val: num,
          gap: markWaits[num] !== undefined ? markWaits[num] : 999 
      })).sort((a,b) => a.val - b.val);

      const totalPressure = itemsWithGaps.reduce((sum, item) => sum + (item.gap === 999 ? 0 : item.gap), 0);
      
      return {
        id: group.id,
        name: mode === 'mark' ? (nameMap[group.id] || '-') : group.id,
        wait: group.lastSeenIndex,
        items: itemsWithGaps,
        pressure: totalPressure
      };
    });

    processed.sort((a, b) => {
        if (sortMode === 'pressure' && mode !== 'mark') {
            return b.pressure - a.pressure; 
        }
        return b.wait - a.wait; 
    });

    setStats(processed);
  };

  // --- STYLES ---
  const getMeterColor = (wait, mode) => {
      const lateThreshold = mode === 'mark' ? 60 : (mode === 'line' ? 20 : 12);
      if (wait > lateThreshold) return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]';
      if (wait > (lateThreshold / 2)) return 'bg-orange-500';
      return 'bg-cyan-500';
  };

  const getRowStyle = (wait, mode) => {
      const lateThreshold = mode === 'mark' ? 60 : (mode === 'line' ? 20 : 12);
      if (wait > lateThreshold) return 'bg-red-900/10 border-red-500/30';
      return 'border-gray-700/50 hover:bg-gray-700/30';
  };

  return (
    <div className="min-h-screen pb-20 flex flex-col font-sans text-gray-100">
      
      {/* --- STICKY HEADER --- */}
      <div className="sticky top-[60px] z-40 bg-[#050505] pb-2 pt-4 px-4 shadow-xl border-b border-gray-800">
          
          <div className="bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-700 max-w-5xl mx-auto">
            
            {/* ROW 1: Title, Sort, & View Toggles */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-4">
                <div className="flex items-center gap-4 w-full lg:w-auto justify-between">
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>Gap Table</span>
                        <button 
                            onClick={() => {
                                const next = sortMode === 'wait' ? 'pressure' : 'wait';
                                setSortMode(next);
                                updateView(rawData, historyOffset, viewMode);
                            }}
                            className="px-2 py-0.5 text-[10px] uppercase bg-cyan-900 text-cyan-300 rounded border border-cyan-700 hover:bg-cyan-800 transition-colors"
                        >
                            Sorted by: {sortMode === 'wait' ? 'MISSING' : 'PRESSURE 🔥'}
                        </button>
                    </h1>
                </div>

                <div className="bg-gray-700 p-1 rounded-lg flex shrink-0">
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

            {/* ROW 2: FILTERS & TIME MACHINE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                {/* FILTER CONTROLS (NEW) */}
                <div className="flex gap-2 bg-gray-900/50 p-2 rounded-lg border border-gray-700">
                     <select 
                        value={timeFilter} 
                        onChange={(e) => setTimeFilter(e.target.value)}
                        className="bg-gray-800 text-white text-xs font-bold rounded px-2 py-1 border border-gray-600 focus:border-cyan-500 outline-none w-full"
                     >
                        <option value="All">All Times</option>
                        <option value="Morning">Morning</option>
                        <option value="Midday">Midday</option>
                        <option value="Afternoon">Afternoon</option>
                        <option value="Evening">Evening</option>
                     </select>

                     <select 
                        value={dayFilter} 
                        onChange={(e) => setDayFilter(e.target.value)}
                        className="bg-gray-800 text-white text-xs font-bold rounded px-2 py-1 border border-gray-600 focus:border-cyan-500 outline-none w-full"
                     >
                        <option value="All">All Days</option>
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                        <option value="Sunday">Sunday</option>
                     </select>
                </div>

                {/* TIME MACHINE CONTROLS */}
                <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded-lg border border-gray-700">
                    <button onClick={() => changeOffset(historyOffset + 1)} className="px-2 text-gray-400 hover:text-white">◀</button>
                    
                    <div className="text-center">
                        <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">
                            {historyOffset === 0 ? <span className="text-green-400">● LIVE</span> : 'HISTORY'}
                        </div>
                        <input 
                            type="range" min="0" max="100" value={historyOffset} 
                            onChange={(e) => changeOffset(parseInt(e.target.value))}
                            className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>

                    <button onClick={() => changeOffset(historyOffset - 1)} disabled={historyOffset===0} className="px-2 text-gray-400 hover:text-white disabled:opacity-30">▶</button>
                    
                    <div className="text-right border-l border-gray-700 pl-2 ml-1">
                        <div className="text-[9px] text-cyan-500 font-bold uppercase">Draw</div>
                        <div className="text-xs font-bold text-white">#{lastDrawStats?.DrawNo}</div>
                    </div>
                </div>

            </div>
          </div>
      </div>

      {/* TABLE CONTAINER */}
      <div className="px-4 max-w-5xl mx-auto w-full mt-4">
        <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
            
            {/* TABLE HEADER */}
            <div className="grid grid-cols-12 bg-gray-900/50 text-[11px] font-bold text-gray-500 uppercase tracking-widest py-3 px-4 border-b border-gray-700">
                <div className="col-span-2">Mark #</div>
                <div className="col-span-4">{viewMode === 'mark' ? 'Mark Name' : 'Composition (Gap)'}</div>
                <div className="col-span-4">Wait Meter</div>
                <div className="col-span-2 text-right">Missing</div>
            </div>

            {/* TABLE BODY */}
            <div className="divide-y divide-gray-700/50">
                {stats.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 col-span-12">No draws found for this filter.</div>
                ) : (
                    stats.map((item, index) => {
                        const threshold = viewMode === 'mark' ? 60 : (viewMode === 'line' ? 20 : 12);
                        // Scale meter if filtered? Optional. For now keeping raw scale.
                        const percentage = Math.min((item.wait / (threshold * 1.5)) * 100, 100);
                        
                        return (
                            <div 
                                key={item.id} 
                                className={`grid grid-cols-12 items-center py-3 px-4 transition-colors ${getRowStyle(item.wait, viewMode)}`}
                            >
                                {/* COL 1: RANK & ID */}
                                <div className="col-span-2 flex items-center gap-2">
                                    <span className="text-xs text-gray-500 font-mono">#{index + 1}</span>
                                    <span className={`text-lg font-bold ${item.wait > threshold ? 'text-red-400' : 'text-white'}`}>
                                        {item.id}
                                    </span>
                                </div>

                                {/* COL 2: DETAILS */}
                                <div className="col-span-4 pr-4">
                                    {viewMode === 'mark' ? (
                                        <span className="text-sm text-gray-300 font-medium">{item.name}</span>
                                    ) : (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] uppercase font-bold text-gray-500">Pressure:</span>
                                                <span className={`text-xs font-black px-1.5 rounded ${item.pressure > 100 ? 'bg-red-900/50 text-red-400' : 'bg-gray-900 text-gray-300'}`}>
                                                    🔥 {item.pressure}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {item.items.map(n => (
                                                    <div key={n.val} className="flex items-center bg-gray-900 rounded border border-gray-700 px-1.5 py-0.5" title={`${n.val} hasn't played in ${n.gap} draws`}>
                                                        <span className="text-[10px] text-gray-300 font-bold mr-1">{n.val}</span>
                                                        <span className={`text-[9px] ${n.gap > 40 ? 'text-red-400' : 'text-gray-500'}`}>({n.gap})</span>
                                                    </div>
                                                ))}
                                            </div>
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
                    })
                )}
            </div>
        </div>
        
        <div className="text-center mt-4 text-xs text-gray-500">
            Analysis based on {lastDrawStats?.MarkName} ({lastDrawStats?.Mark}) being the most recent draw.
        </div>

      </div>
    </div>
  );
};

export default Statistics;