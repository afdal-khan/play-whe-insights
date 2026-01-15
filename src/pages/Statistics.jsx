import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';

const Statistics = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // VIEW STATE
  const [activeView, setActiveView] = useState('marks'); 
  const [selectedDay, setSelectedDay] = useState('All');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('draws')
        .select('*')
        .order('Date', { ascending: false }) 
        .limit(2000);

      if (error) throw error;

      const processed = data.map(d => {
        const dateObj = new Date(d.Date);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
        return { ...d, dayName };
      });

      setRawData(processed);
    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- CALCULATION ENGINE ---
  const { list: activeList, highlights, hotList } = useMemo(() => {
    if (rawData.length === 0) return { list: [], highlights: null, hotList: [] };

    // 1. Filter History
    const history = selectedDay === 'All' 
      ? rawData 
      : rawData.filter(d => d.dayName === selectedDay);

    const totalDraws = history.length;
    
    // Trackers
    const markGaps = {};
    const lineGaps = {};
    const suitGaps = {};
    
    const markMeta = {};
    const markFrequency = {};

    // Init Frequency for Marks (1-36)
    for (let i = 1; i <= 36; i++) markFrequency[i] = 0;

    // --- SCAN HISTORY (DIRECT COLUMN ACCESS) ---
    history.forEach((draw, index) => {
        // A. MARK GAP
        if (markGaps[draw.Mark] === undefined) {
            markGaps[draw.Mark] = index;
            // Store Metadata for display
            markMeta[draw.Mark] = { name: draw.MarkName };
        }

        // B. LINE GAP (Directly from DB Column)
        if (draw.Line && lineGaps[draw.Line] === undefined) {
            lineGaps[draw.Line] = index;
        }

        // C. SUIT GAP (Directly from DB Column)
        if (draw.Suit && suitGaps[draw.Suit] === undefined) {
            suitGaps[draw.Suit] = index;
        }

        // D. Frequency (Last 50 draws)
        if (index < 50) markFrequency[draw.Mark]++;
    });

    // Helper to format the list for the Grid
    const createList = (type) => {
        if (type === 'marks') {
            // Fill in missing marks with "Total Draws" (Never played in filter)
            for (let i = 1; i <= 36; i++) {
                if (markGaps[i] === undefined) markGaps[i] = totalDraws;
            }
            return Object.keys(markGaps).map(m => ({
                id: m, 
                label: m, 
                sub: markMeta[m]?.name, 
                gap: markGaps[m]
            }));
        } 
        else if (type === 'lines') {
            return Object.keys(lineGaps).map(l => ({
                id: l, 
                label: l, // e.g., "8 Line"
                sub: 'Line Group', 
                gap: lineGaps[l]
            }));
        } 
        else { // Suits
            return Object.keys(suitGaps).map(s => ({
                id: s, 
                label: s, // e.g., "7 Suit"
                sub: 'Suit Group', 
                gap: suitGaps[s]
            }));
        }
    };

    // Generate Lists
    const marks = createList('marks').sort((a, b) => b.gap - a.gap); // Coldest First
    const lines = createList('lines').sort((a, b) => b.gap - a.gap);
    const suits = createList('suits').sort((a, b) => b.gap - a.gap);

    // Get Highlights
    const topCold = marks[0];
    const coldLine = lines[0];

    // Calculate Hot List
    const hotSorted = Object.keys(markFrequency)
        .map(m => ({ id: m, hits: markFrequency[m] }))
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 5); 

    // Determine active list
    let currentList = [];
    if (activeView === 'marks') currentList = marks;
    else if (activeView === 'lines') currentList = lines;
    else currentList = suits;

    return { 
        list: currentList, 
        highlights: { cold: topCold, coldLine: coldLine },
        hotList: hotSorted
    };

  }, [rawData, selectedDay, activeView]);


  // --- COMPONENT: GRID TILE ---
  const GridTile = ({ item }) => {
    let borderClass = "border-slate-800 bg-slate-900/40 hover:border-slate-600";
    let textClass = "text-slate-500";
    let gapClass = "bg-slate-800 text-slate-400";
    
    const isHigh = item.gap > 35; // Cold
    const isLow = item.gap < 5;   // Recent

    if (isHigh) {
        borderClass = "border-red-500/40 bg-red-900/10 hover:bg-red-900/20";
        textClass = "text-red-500";
        gapClass = "bg-red-500 text-white animate-pulse";
    } else if (isLow) {
        borderClass = "border-emerald-500/40 bg-emerald-900/10 hover:bg-emerald-900/20";
        textClass = "text-emerald-500";
        gapClass = "bg-emerald-500 text-black";
    }

    return (
      <div className={`relative p-2 rounded-lg border ${borderClass} transition-all cursor-default aspect-[4/3] flex flex-col justify-between`}>
         <div className="text-[9px] font-bold text-slate-500 uppercase truncate px-1">
             {item.sub}
         </div>
         <div className={`text-center text-4xl font-black tracking-tighter leading-none ${textClass}`}>
             {item.label.replace('Line', '').replace('Suit', '')}
         </div>
         <div className="flex justify-center mt-1">
             <div className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap ${gapClass}`}>
                 {item.gap} <span className="opacity-70 text-[8px]">DRAWS</span>
             </div>
         </div>
      </div>
    );
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 p-4 font-sans pb-20">
      
      <div className="max-w-6xl mx-auto">
        
        {/* 1. HUD ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-red-500 opacity-10 rounded-full -mr-6 -mt-6 blur-xl"></div>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Iceberg</div>
                        <div className="text-3xl font-black text-white">Mark {highlights?.cold?.label}</div>
                        <div className="text-xs font-bold text-slate-500 mt-1">{highlights?.cold?.gap} Draws Gap</div>
                    </div>
                    <div className="text-2xl">❄️</div>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500 opacity-10 rounded-full -mr-6 -mt-6 blur-xl"></div>
                <div className="flex justify-between items-start mb-2">
                     <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Furnace (Last 50)</div>
                     <div className="text-lg">🔥</div>
                </div>
                <div className="flex gap-2">
                    {hotList.map((h) => (
                        <div key={h.id} className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded bg-slate-800 border border-orange-500/30 flex items-center justify-center font-bold text-white text-sm">
                                {h.id}
                            </div>
                            <span className="text-[8px] text-orange-400 font-bold mt-1">{h.hits}x</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500 opacity-10 rounded-full -mr-6 -mt-6 blur-xl"></div>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Sector Watch</div>
                        <div className="text-2xl font-black text-white">{highlights?.coldLine?.label}</div>
                        <div className="text-xs font-bold text-slate-500 mt-1">{highlights?.coldLine?.gap} Group Gap</div>
                    </div>
                    <div className="text-2xl">⚠️</div>
                </div>
            </div>
        </div>

        {/* 2. CONTROLS */}
        <div className="sticky top-0 z-30 bg-[#050505]/95 backdrop-blur pt-2 pb-4 border-b border-white/5 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div className="bg-slate-900 p-1 rounded-lg flex w-full md:w-auto">
                    {['marks', 'lines', 'suits'].map(view => (
                        <button
                            key={view}
                            onClick={() => setActiveView(view)}
                            className={`flex-1 md:flex-none px-6 py-2 text-xs font-bold uppercase rounded-md transition-all ${
                                activeView === view 
                                ? 'bg-slate-700 text-white shadow-md' 
                                : 'text-slate-500 hover:text-white'
                            }`}
                        >
                            {view}
                        </button>
                    ))}
                </div>

                <div className="flex overflow-x-auto w-full md:w-auto gap-2 pb-1 custom-scrollbar">
                    <button 
                        onClick={() => setSelectedDay('All')} 
                        className={`px-4 py-2 text-[10px] font-bold rounded border ${selectedDay === 'All' ? 'bg-white text-black border-white' : 'bg-transparent border-slate-800 text-slate-500 hover:border-slate-600'}`}
                    >
                        ALL
                    </button>
                    {daysOfWeek.map(day => (
                        <button 
                            key={day} 
                            onClick={() => setSelectedDay(day)} 
                            className={`px-4 py-2 text-[10px] font-bold rounded border ${selectedDay === day ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-slate-800 text-slate-500 hover:border-slate-600'}`}
                        >
                            {day.toUpperCase().slice(0,3)}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* 3. GRID TILES */}
        {loading ? (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-800 border-t-blue-500"></div>
            </div>
        ) : (
            <div>
                <div className="flex justify-end gap-4 mb-3 text-[10px] font-bold uppercase text-slate-600">
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Cold (&gt;35)</span>
                    <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Hot (&lt;5)</span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-9 gap-3">
                    {activeList.map(item => (
                        <GridTile key={item.id} item={item} />
                    ))}
                </div>
                
                {activeList.length === 0 && (
                    <div className="py-20 text-center text-slate-600 border border-dashed border-slate-800 rounded-xl">
                        No data available for {selectedDay}
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
};

export default Statistics;