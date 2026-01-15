import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';


const LaneAnalytics = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRotateHint, setShowRotateHint] = useState(true);
  
  // FILTERS & SETTINGS
  const [selectedDay, setSelectedDay] = useState('All');
  const [selectedMark, setSelectedMark] = useState(null);
  const [cycleWindow, setCycleWindow] = useState(50); 

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
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
    
    let filtered = rawData;
    if (selectedDay !== 'All') {
      filtered = filtered.filter(d => d.dayName === selectedDay);
    }

    for (let i = 0; i < filtered.length; i++) {
      const draw = filtered[i];
      const timeKey = draw.Time; 
      if (lanes[timeKey]) {
        lanes[timeKey].unshift(draw.Mark);
      }
    }
    
    Object.keys(lanes).forEach(key => {
        lanes[key] = lanes[key].slice(-cycleWindow);
    });
    
    return lanes;
  }, [rawData, selectedDay, cycleWindow]);


  // --- 2. CALCULATE IZI TARGETS (LIVE) ---
  const targets = useMemo(() => {
    if (loading) return [];
    const calculatedTargets = [];
    const getSet = (laneData) => new Set(laneData);

    const sets = {
        'Morning': getSet(filteredLanes['Morning']),
        'Midday': getSet(filteredLanes['Midday']),
        'Afternoon': getSet(filteredLanes['Afternoon']),
        'Evening': getSet(filteredLanes['Evening'])
    };

    const candidates1 = [...sets['Midday']].filter(x => sets['Afternoon'].has(x) && sets['Evening'].has(x));
    candidates1.forEach(mark => {
        if (!sets['Morning'].has(mark)) calculatedTargets.push({ mark, missing_lane: 'Morning' });
    });

    const candidates2 = [...sets['Morning']].filter(x => sets['Afternoon'].has(x) && sets['Evening'].has(x));
    candidates2.forEach(mark => {
        if (!sets['Midday'].has(mark)) calculatedTargets.push({ mark, missing_lane: 'Midday' });
    });

    const candidates3 = [...sets['Morning']].filter(x => sets['Midday'].has(x) && sets['Evening'].has(x));
    candidates3.forEach(mark => {
        if (!sets['Afternoon'].has(mark)) calculatedTargets.push({ mark, missing_lane: 'Afternoon' });
    });

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
          flex items-center justify-center font-bold text-sm rounded-full cursor-pointer transition-all duration-200 select-none shadow-sm flex-shrink-0
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
        // FIXED: Force flex-row (never stack vertically) and set min-width
        <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700 mb-6 flex flex-row min-h-[160px] relative">
        
        {/* 1. LABEL (Fixed width, shrinks slightly on mobile) */}
        <div className={`
            w-24 md:w-32 flex-shrink-0 flex flex-col justify-center items-center ${colorClass} bg-opacity-20 border-r border-slate-700
        `}>
            <h2 className={`text-lg md:text-xl font-bold uppercase tracking-wider ${colorClass.replace('bg-', 'text-')} text-center leading-tight`}>
            {laneTitle}
            </h2>
            <span className="text-[10px] text-slate-400 mt-1 uppercase font-mono">
            Count: {data.length}
            </span>
        </div>

        {/* 2. HISTORY GRID (Scrolls Horizontally inside) */}
        <div className="flex-1 p-2 md:p-4 overflow-x-auto custom-scrollbar bg-slate-900/50">
            <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                    {selectedDay === 'All' ? 'Recent' : selectedDay} Cycle
                </span>
                <span className="text-[10px] text-slate-600">Newest ➔</span>
            </div>
            {/* Grid Flowing Right - Adjusted Gap for mobile */}
            <div className="grid grid-rows-5 grid-flow-col gap-1.5 md:gap-2 min-w-max">
                {data.map((mark, i) => (
                    <DrawBall key={i} mark={mark} isTarget={false} />
                ))}
            </div>
        </div>

        {/* 3. TARGETS (Stacked on far right, hidden on very small screens unless scrolled?) 
           Actually, let's keep it attached but allow scrolling container if needed. 
           We'll give it a fixed width. */}
        <div className="w-20 md:w-64 bg-slate-950 flex flex-col border-l border-slate-800 flex-shrink-0">
            <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2 mb-2 p-2 border-b border-slate-800">
                <span className="text-emerald-500 text-lg">🎯</span>
                <span className="text-[9px] md:text-xs font-bold text-slate-300 uppercase tracking-widest text-center md:text-left">
                    <span className="hidden md:inline">Marks </span>Due
                </span>
            </div>

            <div className="flex-1 p-1 md:p-2 overflow-y-auto">
            {laneTargets.length > 0 ? (
                <div className="flex flex-wrap justify-center md:justify-start gap-1 md:gap-3">
                {laneTargets.map((t, i) => (
                    <div key={i} className="flex flex-col items-center">
                        <DrawBall mark={t.mark} isTarget={true} />
                        <span className="text-[8px] md:text-[9px] text-slate-500 mt-1 uppercase font-bold">#{t.mark}</span>
                    </div>
                ))}
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-1 opacity-50">
                <span className="text-xl md:text-2xl">✓</span>
                <span className="text-[8px] md:text-xs italic text-center">Clear</span>
                </div>
            )}
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
    <div className="min-h-screen bg-slate-950 text-slate-200 p-2 md:p-4 font-sans pb-20">
      
      {/* HEADER & FILTER */}
      <div className="max-w-7xl mx-auto mb-4 sticky top-0 bg-slate-950/95 backdrop-blur z-30 py-3 border-b border-slate-800">
        <div className="flex flex-col gap-3">
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">WAJUL ANALYTICS</h1>
              <p className="text-[10px] text-slate-500 font-mono">POWERED BY THE WAJUL</p>
            </div>
            
            <div className="flex gap-2">
                 <button 
                  onClick={() => setCycleWindow(prev => prev + 50)}
                  className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase rounded border border-emerald-500/30"
                >
                  + Load {cycleWindow}
                </button>
                <button 
                  onClick={() => setCycleWindow(50)}
                  className="px-2 py-1 bg-slate-800 text-slate-400 text-[10px] font-bold uppercase rounded border border-slate-700"
                >
                  Reset
                </button>
            </div>
          </div>
          
          <div className="flex overflow-x-auto max-w-full gap-2 pb-2 custom-scrollbar">
            <button 
              onClick={() => setSelectedDay('All')}
              className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${selectedDay === 'All' ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400'}`}
            >
              All Days
            </button>
            {daysOfWeek.map(day => (
              <button 
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${selectedDay === day ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-400'}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* ROTATE HINT (Visible on Mobile Portrait) */}
      {showRotateHint && (
        <div className="md:hidden mb-4 bg-blue-900/30 border border-blue-500/30 p-3 rounded-lg flex justify-between items-center">
            <div className="flex items-center gap-2">
                <span className="text-lg">📱</span>
                <span className="text-xs text-blue-200 font-bold">Tip: Rotate phone for wider view</span>
            </div>
            <button onClick={() => setShowRotateHint(false)} className="text-blue-300 font-bold px-2">X</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center pt-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-cyan-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto overflow-x-hidden"> 
           {/* overflow-x-hidden on parent prevents page scrolling, forces internal card scrolling */}
          
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