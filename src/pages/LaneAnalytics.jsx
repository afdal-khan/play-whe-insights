import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';

const LaneAnalytics = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // FILTERS & SETTINGS
  const [selectedDay, setSelectedDay] = useState('All');
  const [selectedMark, setSelectedMark] = useState(null);
  
  // DYNAMIC CYCLE: Starts at 50, increases/resets on click
  const [cycleWindow, setCycleWindow] = useState(50); 

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch deep history so we have enough data to "Load More"
      const { data: draws, error: drawError } = await supabase
        .from('draws')
        .select('*')
        .order('Date', { ascending: false }) 
        .limit(2000); 

      if (drawError) throw drawError;

      const processedDraws = draws.map(d => {
        const dateObj = new Date(d.Date);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
        return { ...d, dayName };
      });

      setRawData(processedDraws);

    } catch (error) {
      console.error('Error loading data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- 1. FILTER & SORT THE LANES ---
  const filteredLanes = useMemo(() => {
    const lanes = { 'Morning': [], 'Midday': [], 'Afternoon': [], 'Evening': [] };
    
    // Filter by Day FIRST
    let filtered = rawData;
    if (selectedDay !== 'All') {
      filtered = filtered.filter(d => d.dayName === selectedDay);
    }

    // Sort into Lanes & REVERSE (Left = Oldest, Right = Newest)
    for (let i = 0; i < filtered.length; i++) {
      const draw = filtered[i];
      const timeKey = draw.Time; 
      if (lanes[timeKey]) {
        lanes[timeKey].unshift(draw.Mark);
      }
    }
    
    // DYNAMIC LIMIT: Slice based on the 'cycleWindow' state (50, 100, 150...)
    Object.keys(lanes).forEach(key => {
        lanes[key] = lanes[key].slice(-cycleWindow);
    });
    
    return lanes;
  }, [rawData, selectedDay, cycleWindow]); // Re-run when cycleWindow changes


  // --- 2. CALCULATE IZI TARGETS (LIVE) ---
  const targets = useMemo(() => {
    if (loading) return [];

    const calculatedTargets = [];
    
    // Helper: Get unique numbers from the CURRENT displayed data
    const getSet = (laneData) => new Set(laneData);

    const sets = {
        'Morning': getSet(filteredLanes['Morning']),
        'Midday': getSet(filteredLanes['Midday']),
        'Afternoon': getSet(filteredLanes['Afternoon']),
        'Evening': getSet(filteredLanes['Evening'])
    };

    // IZI Logic: Missing from Lane X, but present in ALL other lanes
    
    // 1. Missing from 1st Lane
    const candidates1 = [...sets['Midday']].filter(x => sets['Afternoon'].has(x) && sets['Evening'].has(x));
    candidates1.forEach(mark => {
        if (!sets['Morning'].has(mark)) calculatedTargets.push({ mark, missing_lane: 'Morning' });
    });

    // 2. Missing from 2nd Lane
    const candidates2 = [...sets['Morning']].filter(x => sets['Afternoon'].has(x) && sets['Evening'].has(x));
    candidates2.forEach(mark => {
        if (!sets['Midday'].has(mark)) calculatedTargets.push({ mark, missing_lane: 'Midday' });
    });

    // 3. Missing from 3rd Lane
    const candidates3 = [...sets['Morning']].filter(x => sets['Midday'].has(x) && sets['Evening'].has(x));
    candidates3.forEach(mark => {
        if (!sets['Afternoon'].has(mark)) calculatedTargets.push({ mark, missing_lane: 'Afternoon' });
    });

    // 4. Missing from 4th Lane
    const candidates4 = [...sets['Morning']].filter(x => sets['Midday'].has(x) && sets['Afternoon'].has(x));
    candidates4.forEach(mark => {
        if (!sets['Evening'].has(mark)) calculatedTargets.push({ mark, missing_lane: 'Evening' });
    });

    return calculatedTargets;
  }, [filteredLanes, loading]);


  // --- COMPONENT: The Ball ---
  const DrawBall = ({ mark, isTarget }) => {
    const isSelected = selectedMark === mark;
    const isDimmed = selectedMark !== null && !isSelected;

    return (
      <div
        onClick={() => setSelectedMark(selectedMark === mark ? null : mark)}
        className={`
          flex items-center justify-center font-bold text-sm rounded-full cursor-pointer transition-all duration-200 select-none shadow-sm
          ${isTarget ? 'w-10 h-10 text-base' : 'w-9 h-9'}
          ${isSelected 
            ? 'bg-yellow-400 text-black border-2 border-yellow-200 scale-110 z-10 shadow-lg' 
            : isTarget 
              ? 'bg-emerald-500 text-white border border-emerald-400 hover:bg-emerald-400 animate-pulse'
              : 'bg-slate-100 text-slate-800 border border-slate-300 hover:bg-white'
          }
          ${isDimmed ? 'opacity-30 grayscale' : 'opacity-100'}
        `}
      >
        {mark}
      </div>
    );
  };

  // --- COMPONENT: Lane Card ---
  const LaneCard = ({ laneKey, laneTitle, data, colorClass, laneTargets }) => {
    return (
        <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700 mb-6 flex flex-col lg:flex-row min-h-[180px]">
        
        {/* LABEL */}
        <div className={`p-4 lg:w-32 flex flex-col justify-center items-center ${colorClass} bg-opacity-20 border-b lg:border-b-0 lg:border-r border-slate-700`}>
            <h2 className={`text-xl font-bold uppercase tracking-wider ${colorClass.replace('bg-', 'text-')}`}>
            {laneTitle}
            </h2>
            <span className="text-[10px] text-slate-400 mt-1 uppercase font-mono">
            Count: {data.length}
            </span>
        </div>

        {/* HISTORY GRID */}
        <div className="flex-1 p-4 overflow-x-auto custom-scrollbar bg-slate-900/50 border-b lg:border-b-0 lg:border-r border-slate-700">
            <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                    {selectedDay === 'All' ? 'Recent' : selectedDay} Cycle (Left to Right)
                </span>
                <span className="text-[10px] text-slate-600">Newest ➔</span>
            </div>
            {/* Grid Flowing Right */}
            <div className="grid grid-rows-5 grid-flow-col gap-2 min-w-max">
                {data.map((mark, i) => (
                    <DrawBall key={i} mark={mark} isTarget={false} />
                ))}
            </div>
        </div>

        {/* TARGETS */}
        <div className="p-4 lg:w-64 bg-slate-950 flex flex-col border-l border-slate-800">
            <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
            <span className="text-emerald-500">🎯</span>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">WAJUL Due List</span>
            </div>

            <div className="flex-1">
            {laneTargets.length > 0 ? (
                <div className="flex flex-wrap content-start gap-3">
                {laneTargets.map((t, i) => (
                    <div key={i} className="flex flex-col items-center">
                    <DrawBall mark={t.mark} isTarget={true} />
                    <span className="text-[9px] text-slate-500 mt-1 uppercase font-bold">#{t.mark}</span>
                    </div>
                ))}
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 opacity-50">
                <span className="text-2xl">✓</span>
                <span className="text-xs italic">Cycle Complete</span>
                </div>
            )}
            </div>
            
            <div className="mt-auto pt-2 text-[9px] text-slate-600 text-center font-mono">
                Cycle Depth: {cycleWindow}
            </div>
        </div>

        </div>
    );
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const laneConfig = [
    { key: 'Morning', title: '1st Lane', color: 'bg-blue-500' },
    { key: 'Midday', title: '2nd Lane', color: 'bg-amber-500' },
    { key: 'Afternoon', title: '3rd Lane', color: 'bg-purple-500' },
    { key: 'Evening', title: '4th Lane', color: 'bg-red-500' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 font-sans pb-20">
      
      {/* HEADER & FILTER */}
      <div className="max-w-7xl mx-auto mb-6 sticky top-0 bg-slate-950/95 backdrop-blur z-30 py-4 border-b border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          {/* LEFT SIDE: Title & Action Buttons */}
          <div className="flex flex-col items-start gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight leading-none">WAJUL ANALYTICS</h1>
              <p className="text-xs text-slate-500 font-mono">POWERED BY WAJUL SYSTEM</p>
            </div>
            
            <div className="flex items-center gap-2">
                {/* --- LOAD MORE DATA BUTTON --- */}
                <button 
                  onClick={() => setCycleWindow(prev => prev + 50)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded border border-emerald-500/30 transition-all active:scale-95"
                >
                  <span>+ Load More</span>
                  <span className="bg-emerald-500 text-black text-[10px] px-1.5 rounded-full font-mono">
                    {cycleWindow}
                  </span>
                </button>

                {/* --- RESET BUTTON (New!) --- */}
                <button 
                  onClick={() => setCycleWindow(50)}
                  disabled={cycleWindow === 50}
                  className={`
                    px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded border transition-all active:scale-95
                    ${cycleWindow === 50 
                       ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed' 
                       : 'bg-slate-700 hover:bg-slate-600 text-white border-slate-500'}
                  `}
                >
                  Reset
                </button>
            </div>
          </div>
          
          {/* RIGHT SIDE: Day Filters */}
          <div className="flex overflow-x-auto max-w-full gap-2 pb-2 md:pb-0 custom-scrollbar">
            <button 
              onClick={() => setSelectedDay('All')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedDay === 'All' ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              All Days
            </button>
            {daysOfWeek.map(day => (
              <button 
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedDay === day ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center pt-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-cyan-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto">
          
          {laneConfig.map((lane) => {
            const specificTargets = targets.filter(t => t.missing_lane === lane.key);
            
            return (
              <LaneCard 
                key={lane.key}
                laneKey={lane.key}
                laneTitle={lane.title}
                data={filteredLanes[lane.key]}
                colorClass={lane.color}
                laneTargets={specificTargets}
              />
            );
          })}

        </div>
      )}
    </div>
  );
};

export default LaneAnalytics;