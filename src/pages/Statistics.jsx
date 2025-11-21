/* This is src/pages/Statistics.jsx (FINAL VERSION with Robust Power Line Logic) */

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MARKS_LIST } from '../data/marks'; 

// ========================================================================
// SECTION 1: GLOBAL CONSTANTS & HELPER FUNCTIONS
// ========================================================================

const MONTH_NAMES = {
  '01': 'January', '02': 'February', '03': 'March', '04': 'April',
  '05': 'May', '06': 'June', '07': 'July', '08': 'August',
  '09': 'September', '10': 'October', '11': 'November', '12': 'December',
};

const numericalSort = (a, b) => {
   if (a === null || a === undefined) return 1;
   if (b === null || b === undefined) return -1;
   const numA = parseInt(String(a).match(/\d+/)?.[0] || 0, 10);
   const numB = parseInt(String(b).match(/\d+/)?.[0] || 0, 10);
   return numA - numB;
};

const RECENT_DRAWS_LIMIT = 100;
const BAR_COLORS = ['#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa']; // Cyan to Purple gradient

const getPressureColor = (value) => {
  if (isNaN(value)) value = 0;
  const hue = (1 - value) * 240 + value * 0; // 240 (blue) to 0 (red)
  const saturation = 70 + (value * 30); // 70% to 100%
  const lightness = 50;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};


// ========================================================================
// SECTION 2: SUB-COMPONENTS (MarketWatchCard, PressureBoard)
// ========================================================================

// A. The "Market Watch" Hero Card
const MarketWatchCard = ({ title, icon, data, colorClass }) => (
  <div className="bg-gray-800 rounded-xl p-6 shadow-lg border-t-4 border-cyan-500 flex items-center justify-between relative overflow-hidden">
    <div className="z-10">
      <div className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">{title}</div>
      {data ? (
        <>
          <div className={`text-4xl font-black ${colorClass}`}>{data.main}</div>
          <div className="text-white font-medium text-lg">{data.sub}</div>
          <div className="text-xs text-gray-400 mt-2">{data.detail}</div>
        </>
      ) : (
        <div className="text-gray-500 text-lg italic">Calculating...</div>
      )}
    </div>
    <div className="absolute right-[-20px] bottom-[-20px] text-gray-700 opacity-20 transform rotate-12 z-0">
       {/* Background Icon Effect */}
       <span className="text-9xl font-bold">{icon}</span>
    </div>
  </div>
);

// B. The Refined Pressure Board (Kept from previous refactor)
const PressureBoard = ({ gapData }) => {
  const [view, setView] = useState('marks');
  const [showAll, setShowAll] = useState(false);

  let dataToShow = [];
  let label = "";

  if (view === 'marks') { dataToShow = gapData.marks; label = "Mark"; }
  else if (view === 'lines') { dataToShow = gapData.lines; label = "Line"; }
  else { dataToShow = gapData.suits; label = "Suit"; }

  const displayList = showAll ? dataToShow : dataToShow.slice(0, 10);

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-white">The Pressure Board</h3>
          <p className="text-xs text-gray-400">Who is overdue? (Highest gap since last play)</p>
        </div>
        <div className="flex bg-gray-700 rounded-lg p-1">
          {['marks', 'lines', 'suits'].map((v) => (
            <button
              key={v}
              onClick={() => { setView(v); setShowAll(false); }}
              className={`px-4 py-1.5 text-xs font-bold uppercase rounded-md transition-colors ${
                view === v ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 space-y-3">
        {displayList.map((item, index) => {
           const isTop3 = index < 3;
           const barColor = isTop3 ? 'bg-red-500' : 'bg-orange-500';
           
           return (
            <div key={item.name} className="flex items-center gap-3">
              <div className={`w-8 text-center font-bold text-sm ${isTop3 ? 'text-red-400' : 'text-gray-500'}`}>#{index + 1}</div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-white font-bold text-sm">{item.name}</span>
                  <span className="text-cyan-400 font-mono text-sm font-bold">{item.gap === Infinity ? 'N/A' : `${item.gap} Draws`}</span>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-2">
                   <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${Math.min(100, (item.gap / (dataToShow[0]?.gap || 1)) * 100)}%` }}></div>
                </div>
              </div>
            </div>
           );
        })}
      </div>
      <button 
        onClick={() => setShowAll(!showAll)}
        className="w-full py-3 text-center text-sm text-gray-400 hover:text-white hover:bg-gray-700 border-t border-gray-700 transition-colors"
      >
        {showAll ? "Show Top 10 Only" : `Show All ${dataToShow.length} ${label}s`}
      </button>
    </div>
  );
};


// ========================================================================
// SECTION 3: MAIN STATISTICS COMPONENT
// ========================================================================

function Statistics() {
  const [isLoading, setIsLoading] = useState(true);
  const [allResults, setAllResults] = useState([]); // Newest first
  
  const [filters, setFilters] = useState({ time: 'All', year: 'All', month: 'All' });
  const [uniqueValues, setUniqueValues] = useState({ times: [], lines: [], suits: [], years: [], months: [] });

  const [freqView, setFreqView] = useState('marks'); 

  // 1. Fetch data... (Logic kept the same)
  useEffect(() => {
     const fetchData = async () => {
         // ... (data fetching logic)
          setIsLoading(true);
          try {
              const response = await fetch(`/play_whe_results.json?v=${new Date().getTime()}`);
              if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
              const data = await response.json();
              const newestFirstData = data.slice().reverse();
              setAllResults(newestFirstData);

              const validResults = newestFirstData.filter(item => item && item.Time && item.Date && item.Line && item.Suit !== undefined && item.Suit !== null);
              const times = [...new Set(validResults.map(item => item.Time))].sort((a, b) => { const order={'Morning':1,'Midday':2,'Afternoon':3,'Evening':4}; return (order[a]||99)-(order[b]||99); });
              const lines = [...new Set(validResults.map(item => item.Line))].sort(numericalSort);
              const suits = [...new Set(validResults.map(item => String(item.Suit)))].sort(numericalSort);
              const dates = validResults.map(item => item.Date);
              const years = [...new Set(dates.map(d => d.split('-')[0]))].sort().reverse();
              const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];

              setUniqueValues({ times, lines, suits, years, months });

          } catch (error) { console.error("Failed fetch/process:", error); }
          finally { setIsLoading(false); }
     };
     fetchData();
  }, []);

  // 2. Calculate GLOBAL Draw Gaps (for Pressure Board) (Logic kept the same)
  const globalDrawGapData = useMemo(() => {
     // ... (gap calculation logic)
      const results = allResults; 
      if (!Array.isArray(results) || results.length === 0 || uniqueValues.lines.length === 0) {
          return { marks: [], lines: [], suits: [], maxMarkGap: 1, maxLineGap: 1, maxSuitGap: 1 };
      }
      
      let maxMarkGap = 0, maxLineGap = 0, maxSuitGap = 0;
      
      const markGaps = MARKS_LIST.map(markInfo => {
        const index = results.findIndex(r => r?.Mark === markInfo.num);
        const gap = index === -1 ? Infinity : index;
        if (gap !== Infinity && gap > maxMarkGap) maxMarkGap = gap;
        return { name: `${markInfo.num} (${markInfo.mark})`, gap: gap, lastPlayed: index === -1 ? null : results[index] };
      });
      
      const lineGaps = uniqueValues.lines.map(line => {
        const index = results.findIndex(r => r?.Line === line);
        const gap = index === -1 ? Infinity : index;
        if (gap !== Infinity && gap > maxLineGap) maxLineGap = gap;
        return { name: line, gap: gap, lastPlayed: index === -1 ? null : results[index] };
      });
      
      const suitGaps = uniqueValues.suits.map(suit => {
          const index = results.findIndex(r => String(r?.Suit) === suit);
          const gap = index === -1 ? Infinity : index;
          if (gap !== Infinity && gap > maxSuitGap) maxSuitGap = gap;
          return { name: `${suit} Suit`, gap: gap, lastPlayed: index === -1 ? null : results[index] };
      });
      
      return { 
        marks: markGaps.sort((a,b) => b.gap - a.gap),
        lines: lineGaps.sort((a,b) => b.gap - a.gap),
        suits: suitGaps.sort((a,b) => b.gap - a.gap),
        maxMarkGap: maxMarkGap || 1,
        maxLineGap: maxLineGap || 1,
        maxSuitGap: maxSuitGap || 1,
      };
  }, [allResults, uniqueValues.lines, uniqueValues.suits]);

  // 3. Filter results (for Frequency Analyzer) (Logic kept the same)
  const filteredResults = useMemo(() => {
     // ... (filtering logic)
      if (!Array.isArray(allResults)) return [];
      return allResults.filter(result => {
          if (!result || !result.Date || !result.Time) return false;
           const matchesYear = filters.year === 'All' || result.Date.startsWith(filters.year);
           const matchesMonth = filters.month === 'All' || result.Date.split('-')[1] === filters.month;
           const matchesTime = filters.time === 'All' || result.Time === filters.time;
           return matchesYear && matchesMonth && matchesTime;
      });
  }, [allResults, filters]);

  // 4. Calculate Frequency data (Dynamic Toggle) (Logic kept the same)
  const frequencyData = useMemo(() => {
     // ... (frequency calculation logic)
      const recentResults = filteredResults.slice(0, RECENT_DRAWS_LIMIT);
      
      let freqMap = new Map();
      
      switch (freqView) {
          case 'lines':
              (uniqueValues.lines || []).forEach(line => freqMap.set(line, { name: line, subName: '', count: 0 }));
              (recentResults || []).forEach(result => {
                  if (result && result.Line && freqMap.has(result.Line)) {
                      freqMap.get(result.Line).count++;
                  }
              });
              break;
              
          case 'suits':
              (uniqueValues.suits || []).forEach(suit => {
                  freqMap.set(suit, { name: `${suit} Suit`, subName: '', count: 0 })
              });
              (recentResults || []).forEach(result => {
                  const suitStr = String(result.Suit);
                  if (result && suitStr !== undefined && freqMap.has(suitStr)) {
                      freqMap.get(suitStr).count++;
                  }
              });
              break;

          case 'marks':
          default:
              MARKS_LIST.forEach(mark => freqMap.set(mark.num, { name: String(mark.num), subName: mark.mark, count: 0 }));
              (recentResults || []).forEach(result => {
                  if (result && result.Mark && freqMap.has(result.Mark)) {
                      freqMap.get(result.Mark).count++;
                  }
              });
              break;
      }

      const dataArray = [...freqMap.values()].sort((a, b) => b.count - a.count);
      const hot = dataArray.slice(0, 5).filter(h => h.count > 0);
      const coldNonZero = dataArray.filter(d => d.count > 0);
      const cold = coldNonZero.slice(Math.max(0, coldNonZero.length - 5)).reverse();
      
      return { all: dataArray, hot: hot, cold: cold };
  }, [filteredResults, freqView, uniqueValues.lines, uniqueValues.suits]);
  // --- END CALCULATIONS ---

  // --- 5. New Logic: Calculate Hottest Line (for Hero Section) ---
  const powerLineData = useMemo(() => {
      const recentResults = filteredResults.slice(0, RECENT_DRAWS_LIMIT);
      
      let lineFreqMap = new Map();
      (uniqueValues.lines || []).forEach(line => lineFreqMap.set(line, { name: line, count: 0 }));

      (recentResults || []).forEach(result => {
          if (result && result.Line && lineFreqMap.has(result.Line)) {
              lineFreqMap.get(result.Line).count++;
          }
      });

      const dataArray = [...lineFreqMap.values()].sort((a, b) => b.count - a.count);
      
      // Return the top line (highest frequency)
      return dataArray.length > 0 ? dataArray[0] : null;

  }, [filteredResults, uniqueValues.lines]);
  // --- END New Power Line Logic ---
  
  // --- 6. Hero Data Helpers (Based on existing logic structure)
  const topSleeper = globalDrawGapData.marks[0];
  const topHot = frequencyData.hot[0];


  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // --- Render ---
  if (isLoading) { return <div className="text-center text-2xl font-bold p-10">Loading Statistics...</div>; }

  return (
    <div className="pb-20">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white">Market Watch</h2>
          <p className="text-gray-400 text-sm mt-1">Overview of the last {RECENT_DRAWS_LIMIT} draws</p>
        </div>
      </div>

      {/* --- HERO SECTION: The Stickiness Factor --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* 1. The Sleeper */}
        <MarketWatchCard 
          title="The Sleeper" 
          colorClass="text-red-400"
          icon="?"
          data={topSleeper ? {
             main: topSleeper.name.split(' - ')[0], 
             sub: topSleeper.name.split(' - ')[1],  
             detail: `Absent for ${topSleeper.gap} draws`
          } : null}
        />
        {/* 2. The Hot Pick */}
        <MarketWatchCard 
          title={`Hot Pick (${freqView})`} 
          colorClass="text-cyan-400"
          icon="🔥"
          data={topHot ? {
             main: topHot.name.includes('Suit') ? topHot.name.split(' ')[0] : topHot.name,
             sub: topHot.name.includes('Suit') ? 'Suit' : (freqView === 'marks' ? MARKS_LIST.find(m=>String(m.num) === topHot.name)?.mark : 'Line'),
             detail: `Played ${topHot.count} times recently`
          } : null}
        />
        {/* 3. The Power Line (UPDATED LOGIC) */}
        <MarketWatchCard 
          title="Current Power Line" 
          colorClass="text-green-400"
          icon="⚡"
          data={powerLineData ? {
             main: powerLineData.name.replace(' Line', ''),
             sub: 'Line',
             detail: `Played ${powerLineData.count} times in ${RECENT_DRAWS_LIMIT} draws`
          } : null}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- LEFT COL: Pressure Board --- */}
        <div className="lg:col-span-1">
           <PressureBoard gapData={globalDrawGapData} />
        </div>

        {/* --- RIGHT COL: Frequency Chart --- */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-xl shadow-lg p-6">
             
             <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h3 className="text-xl font-bold text-white">Frequency Analysis</h3>
                
                {/* Toggle View */}
                <div className="flex bg-gray-700 rounded-lg p-1">
                  {['marks', 'lines', 'suits'].map((v) => (
                    <button
                      key={v}
                      onClick={() => setFreqView(v)}
                      className={`px-4 py-1.5 text-xs font-bold uppercase rounded-md transition-colors ${
                        freqView === v ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
             </div>

             {/* Filters Area */}
             <div className="grid grid-cols-3 gap-4 mb-6">
                <select name="year" value={filters.year} onChange={(e) => setFilters({...filters, year: e.target.value})} className="p-2 bg-gray-900 border border-gray-600 rounded text-white text-sm">
                    <option value="All">All Years</option>
                    {uniqueValues.years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select name="month" value={filters.month} onChange={(e) => setFilters({...filters, month: e.target.value})} className="p-2 bg-gray-900 border border-gray-600 rounded text-white text-sm">
                    <option value="All">All Months</option>
                    {uniqueValues.months.map(m => <option key={m} value={m}>{MONTH_NAMES[m]}</option>)}
                </select>
                <select name="time" value={filters.time} onChange={(e) => setFilters({...filters, time: e.target.value})} className="p-2 bg-gray-900 border border-gray-600 rounded text-white text-sm">
                    <option value="All">All Times</option>
                    {uniqueValues.times.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
             </div>

             {/* The Chart */}
             <div className="h-80 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={frequencyData.all.slice(0, 15)} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} />
                    <YAxis stroke="#9ca3af" allowDecimals={false} fontSize={12} tickLine={false} />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} 
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {frequencyData.all.slice(0, 15).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
             <p className="text-center text-xs text-gray-500 mt-4">
               Showing Top 15 most frequent {freqView} from the last {RECENT_DRAWS_LIMIT} matching draws.
             </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Statistics;