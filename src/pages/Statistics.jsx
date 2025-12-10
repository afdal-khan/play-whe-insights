/* This is src/pages/Statistics.jsx (Fixed Shelf Watch Record Logic & Full Width Layout) */

import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { MARKS_LIST } from '../data/marks'; 

// ========================================================================
// SECTION 1: CONFIG & HELPERS
// ========================================================================

const MONTH_NAMES = { '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec' };
const RECENT_DRAWS_LIMIT = 100;
const BAR_COLORS = ['#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa']; 
const TIME_COLORS = { 'Morning': '#fbbf24', 'Midday': '#f97316', 'Afternoon': '#ef4444', 'Evening': '#6366f1' };

const numericalSort = (a, b) => {
   if (a === null || a === undefined) return 1;
   if (b === null || b === undefined) return -1;
   const numA = parseInt(String(a).match(/\d+/)?.[0] || 0, 10);
   const numB = parseInt(String(b).match(/\d+/)?.[0] || 0, 10);
   return numA - numB;
};

// ========================================================================
// SECTION 2: VISUAL COMPONENTS
// ========================================================================

// A. Integrated Shelf Deep Dive (Meter + Time List + Toggle)
const ShelfAnalysis = ({ globalDrawGapData, historyData }) => {
    // Local state for the card's internal toggle
    const [view, setView] = useState('mark'); // 'mark', 'line', 'suit'

    // Determine WHICH item is the shelf item based on view
    const shelfItem = useMemo(() => {
        if (!globalDrawGapData) return null;
        if (view === 'mark') return globalDrawGapData.marks[0];
        if (view === 'line') return globalDrawGapData.lines[0];
        if (view === 'suit') return globalDrawGapData.suits[0];
        return null;
    }, [globalDrawGapData, view]);

    if (!shelfItem) return <div className="text-gray-500 text-sm p-4">Loading Shelf Data...</div>;

    // 1. Calculate Gap Stats (Current vs Thresholds)
    const gapStats = useMemo(() => {
        let gaps = [];
        let lastIndex = -1;
        
        // Scan the ENTIRE loaded history for this calculation
        const reversedData = [...historyData].reverse(); 
        
        reversedData.forEach((r, idx) => {
            // Check based on view type
            let isMatch = false;
            if (view === 'mark') isMatch = r.Mark === shelfItem.num;
            else if (view === 'line') isMatch = r.Line === shelfItem.name; 
            else if (view === 'suit') isMatch = String(r.Suit) === shelfItem.name.replace(' Suit', '');

            if (isMatch) {
                if (lastIndex !== -1) {
                    const gap = idx - lastIndex;
                    gaps.push(gap);
                }
                lastIndex = idx;
            }
        });

        // Find the absolute max gap in the loaded dataset
        const localMax = gaps.length > 0 ? Math.max(...gaps) : 0;
        
        // --- CUSTOM THRESHOLD LOGIC ---
        let gaugeMax = localMax;
        let criticalThreshold = 0;
        let recordLabel = "Recent Record"; // Changed label to be accurate if data is limited

        if (view === 'mark') {
             // Marks: 
             // If local max is small (e.g. < 40), it's likely just because we haven't loaded enough history.
             // We use a "Benchmark Record" of at least 80 to make the gauge look realistic for marks,
             // or the actual local max if it's higher.
             const benchmarkRecord = 80; 
             gaugeMax = Math.max(localMax, benchmarkRecord, shelfItem.gap + 10);
             
             // Critical if it passes 80% of this benchmark
             criticalThreshold = gaugeMax * 0.8; 
             recordLabel = "Benchmark Max"; 
        } else if (view === 'line') {
             // Lines: Critical at 26
             criticalThreshold = 26;
             // Gauge max needs to be visible enough above the critical point
             gaugeMax = Math.max(35, shelfItem.gap + 5); 
             recordLabel = "Critical Level";
        } else if (view === 'suit') {
             // Suits: Critical at 29
             criticalThreshold = 29;
             gaugeMax = Math.max(40, shelfItem.gap + 5);
             recordLabel = "Critical Level";
        }

        return { max: gaugeMax, record: localMax, critical: criticalThreshold, label: recordLabel };
    }, [shelfItem, historyData, view]);

    // 2. Calculate Time Stats (List Style)
    const timeData = useMemo(() => {
        const counts = { Morning: 0, Midday: 0, Afternoon: 0, Evening: 0 };
        let total = 0;
        historyData.forEach(r => {
             let isMatch = false;
             if (view === 'mark') isMatch = r.Mark === shelfItem.num;
             else if (view === 'line') isMatch = r.Line === shelfItem.name;
             else if (view === 'suit') isMatch = String(r.Suit) === shelfItem.name.replace(' Suit', '');

            if (isMatch && counts[r.Time] !== undefined) {
                counts[r.Time]++;
                total++;
            }
        });
        return Object.keys(counts).map(key => ({
            name: key,
            value: counts[key],
            percent: total > 0 ? Math.round((counts[key] / total) * 100) : 0,
            fill: TIME_COLORS[key]
        })).sort((a,b) => b.value - a.value);
    }, [shelfItem, historyData, view]);

    // Visual Logic for Meter
    const percentage = Math.min(100, Math.round((shelfItem.gap / gapStats.max) * 100));
    
    let status = "Cold";
    let colorClass = "bg-green-500";
    
    if (view === 'mark') {
        if (percentage > 50) { status = "Warming Up"; colorClass = "bg-yellow-400"; }
        if (percentage > 80) { status = "CRITICAL / DROP ZONE"; colorClass = "bg-red-600 animate-pulse"; }
    } else {
        if (shelfItem.gap >= gapStats.critical) {
            status = "CRITICAL / DROP ZONE"; colorClass = "bg-red-600 animate-pulse";
        } else if (shelfItem.gap >= gapStats.critical * 0.7) { // Warn a bit earlier
            status = "Warming Up"; colorClass = "bg-yellow-400";
        }
    }

    // Helper for display name
    const displayName = view === 'mark' ? shelfItem.name.split(' ')[0] : shelfItem.name;
    const subName = view === 'mark' ? shelfItem.name.split(' ').slice(1).join(' ') : (view === 'line' ? 'Line' : 'Suit');

    return (
        <div className="bg-gray-800 rounded-xl p-6 border-t-4 border-red-500 shadow-lg mb-8 w-full col-span-1 lg:col-span-3">
            
            {/* TOGGLE HEADER */}
            <div className="flex justify-end mb-4">
                 <div className="bg-gray-900 rounded-lg p-1 flex gap-1">
                    <button onClick={() => setView('mark')} className={`px-4 py-1.5 text-xs font-bold uppercase rounded transition-colors ${view === 'mark' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}>Mark</button>
                    <button onClick={() => setView('line')} className={`px-4 py-1.5 text-xs font-bold uppercase rounded transition-colors ${view === 'line' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}>Line</button>
                    <button onClick={() => setView('suit')} className={`px-4 py-1.5 text-xs font-bold uppercase rounded transition-colors ${view === 'suit' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}>Suit</button>
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                
                {/* LEFT: Identity & Meter */}
                <div className="w-full">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-red-400 font-bold text-xs uppercase tracking-widest mb-1">🔥 Shelf Watch</h3>
                            <div className="text-5xl font-black text-white">{displayName}</div>
                            <div className="text-lg text-gray-400">{subName}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase font-bold">Current Wait</div>
                            <div className="text-4xl font-black text-white">{shelfItem.gap} <span className="text-sm font-normal text-gray-500">Draws</span></div>
                        </div>
                    </div>

                    {/* The Meter */}
                    <div className="relative pt-2 pb-2">
                        <div className="flex justify-between text-xs text-gray-400 font-bold uppercase mb-2">
                            <span>Last Played</span>
                            <span className="text-white">Current: {shelfItem.gap}</span>
                            <span>{view === 'mark' ? 'Benchmark' : 'Critical'}: {view === 'mark' ? gapStats.max : gapStats.critical}</span>
                        </div>
                        <div className="w-full h-6 bg-gray-900 rounded-full overflow-hidden border border-gray-700 relative shadow-inner">
                            <div className={`h-full ${colorClass} transition-all duration-1000 ease-out`} style={{ width: `${percentage}%` }}></div>
                            
                            {/* Critical Marker for Lines/Suits */}
                            {view !== 'mark' && (
                                <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: `${(gapStats.critical / gapStats.max) * 100}%` }} title="Critical Level"></div>
                            )}
                        </div>
                        <div className={`text-center text-sm font-black mt-3 uppercase tracking-widest ${status.includes('CRITICAL') ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}>
                            {status}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Best Time to Catch (Integrated List) */}
                <div className="w-full border-t md:border-t-0 md:border-l-2 border-gray-700 md:pl-10 pt-8 md:pt-0">
                    <h3 className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-4">🕒 Best Time To Catch</h3>
                    <div className="space-y-4">
                        {timeData.slice(0, 2).map(t => (
                            <div key={t.name} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: t.fill, color: t.fill }}></div>
                                    <span className="text-sm font-bold text-gray-200">{t.name}</span>
                                </div>
                                <div className="flex items-center gap-3 w-2/3">
                                    <div className="flex-1 bg-gray-900 h-3 rounded-full overflow-hidden border border-gray-700">
                                        <div className="h-full group-hover:opacity-100 opacity-80 transition-opacity" style={{ width: `${t.percent}%`, backgroundColor: t.fill }}></div>
                                    </div>
                                    <span className="text-sm font-bold text-white w-8 text-right">{t.percent}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-4 italic text-right">Based on historical win rate.</p>
                </div>
            </div>
        </div>
    );
};

// C. Pressure Board (Standard)
const PressureBoard = ({ gapData, activeView, onViewChange }) => {
  const [showAll, setShowAll] = useState(false);
  if (!gapData || !gapData.marks) return <div className="text-gray-500 p-4">Loading Board...</div>;
  
  let dataToShow = [];
  if (activeView === 'marks') { dataToShow = gapData.marks; }
  else if (activeView === 'lines') { dataToShow = gapData.lines; }
  else { dataToShow = gapData.suits; }

  const displayList = showAll ? dataToShow : dataToShow.slice(0, 10);

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden h-full border border-gray-700">
      <div className="p-4 border-b border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
        <div><h3 className="text-xl font-bold text-white">The Pressure Board</h3><p className="text-xs text-gray-400">Who is overdue?</p></div>
        <div className="flex bg-gray-900 rounded-lg p-1"> {['marks', 'lines', 'suits'].map((v) => ( <button key={v} onClick={() => { onViewChange(v); setShowAll(false); }} className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-colors ${ activeView === v ? 'bg-cyan-600 text-white shadow' : 'text-gray-500 hover:text-white' }`}> {v} </button> ))} </div>
      </div>
      <div className="p-4 space-y-3 overflow-y-auto max-h-[500px] custom-scrollbar">
        {displayList.map((item, index) => {
           const isTop3 = index < 3; const barColor = isTop3 ? 'bg-red-500' : 'bg-orange-500';
           return ( <div key={item.name} className="flex items-center gap-3"> <div className={`w-8 text-center font-bold text-sm ${isTop3 ? 'text-red-400' : 'text-gray-500'}`}>#{index + 1}</div> <div className="flex-1"> <div className="flex justify-between mb-1"> <span className="text-white font-bold text-sm">{item.name}</span> <span className="text-cyan-400 font-mono text-sm font-bold">{item.gap === Infinity ? 'N/A' : `${item.gap} Draws`}</span> </div> <div className="w-full bg-gray-900 rounded-full h-1.5"> <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${Math.min(100, (item.gap / (dataToShow[0]?.gap || 1)) * 100)}%` }}></div> </div> </div> </div> );
        })}
      </div>
      <button onClick={() => setShowAll(!showAll)} className="w-full py-3 text-center text-sm text-gray-400 hover:text-white hover:bg-gray-700 border-t border-gray-700 transition-colors"> {showAll ? "Show Top 10 Only" : `Show All ${dataToShow.length} ${activeView}`} </button>
    </div>
  );
};


// ========================================================================
// SECTION 3: MAIN COMPONENT
// ========================================================================

function Statistics({ data = [], loading }) { 
  
  const [filters, setFilters] = useState({ time: 'All', year: 'All', month: 'All' });
  const [activeView, setActiveView] = useState('marks'); 

  // --- 1. Calculate unique values ---
  const uniqueValues = useMemo(() => {
        if (!data || data.length === 0) return { times: [], lines: [], suits: [], years: [], months: [] };
        
        const validResults = data.filter(item => item && item.Time && item.Date && item.Line);
        const times = [...new Set(validResults.map(item => item.Time))].sort((a, b) => { const o={'Morning':1,'Midday':2,'Afternoon':3,'Evening':4}; return (o[a]||99)-(o[b]||99); });
        const lines = [...new Set(validResults.map(item => item.Line))].sort(numericalSort);
        const suits = [...new Set(validResults.map(item => String(item.Suit)))].sort(numericalSort);
        const dates = validResults.map(item => item.Date);
        const years = [...new Set(dates.map(d => d.split('-')[0]))].sort().reverse();
        const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];

        return { times, lines, suits, years, months };
  }, [data]);

  // --- 2. Calculate GLOBAL Draw Gaps ---
  const globalDrawGapData = useMemo(() => {
      const results = data; 
      if (!Array.isArray(results) || results.length === 0 || !uniqueValues.lines || uniqueValues.lines.length === 0) {
          return { marks: [], lines: [], suits: [], maxMarkGap: 1, maxLineGap: 1, maxSuitGap: 1 };
      }
      
      let maxMarkGap = 0, maxLineGap = 0, maxSuitGap = 0;
      
      const markGaps = MARKS_LIST.map(markInfo => {
        const index = results.findIndex(r => r?.Mark === markInfo.num);
        const gap = index === -1 ? Infinity : index;
        
        const maxGapEver = 150; 
        if (gap !== Infinity && gap > maxMarkGap) maxMarkGap = gap;
        
        return { 
            num: markInfo.num,
            mark: markInfo.mark,
            name: `${markInfo.num} (${markInfo.mark})`, 
            gap: gap, 
            lastPlayed: index === -1 ? null : results[index],
            maxGap: maxGapEver 
        };
      });
      
      const lineGaps = uniqueValues.lines.map(line => {
        const index = results.findIndex(r => r?.Line === line);
        const gap = index === -1 ? Infinity : index;
        const maxGapEver = 50; 
        if (gap !== Infinity && gap > maxLineGap) maxLineGap = gap;
        return { name: line, gap: gap, lastPlayed: index === -1 ? null : results[index], maxGap: maxGapEver };
      });
      
      const suitGaps = uniqueValues.suits.map(suit => {
          const index = results.findIndex(r => String(r?.Suit) === suit);
          const gap = index === -1 ? Infinity : index;
          const maxGapEver = 50; 
          if (gap !== Infinity && gap > maxSuitGap) maxSuitGap = gap;
          return { name: `${suit} Suit`, gap: gap, lastPlayed: index === -1 ? null : results[index], maxGap: maxGapEver };
      });
      
      return { 
        marks: markGaps.sort((a,b) => b.gap - a.gap),
        lines: lineGaps.sort((a,b) => b.gap - a.gap),
        suits: suitGaps.sort((a,b) => b.gap - a.gap),
        maxMarkGap: maxMarkGap || 1,
        maxLineGap: maxLineGap || 1,
        maxSuitGap: maxSuitGap || 1,
      };
  }, [data, uniqueValues.lines, uniqueValues.suits]);

  // --- 3. Filter results ---
  const filteredResults = useMemo(() => {
      if (!Array.isArray(data)) return [];
      return data.filter(result => {
          if (!result || !result.Date || !result.Time) return false;
           const matchesYear = filters.year === 'All' || result.Date.startsWith(filters.year);
           const matchesMonth = filters.month === 'All' || result.Date.split('-')[1] === filters.month;
           const matchesTime = filters.time === 'All' || result.Time === filters.time;
           return matchesYear && matchesMonth && matchesTime;
      });
  }, [data, filters]);

  // --- 4. Calculate Frequency data ---
  const frequencyData = useMemo(() => {
      const recentResults = filteredResults.slice(0, RECENT_DRAWS_LIMIT);
      let freqMap = new Map();
      switch (activeView) {
          case 'lines':
              (uniqueValues.lines || []).forEach(line => freqMap.set(line, { name: line, count: 0 }));
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
      return { all: dataArray };
  }, [filteredResults, activeView, uniqueValues.lines, uniqueValues.suits]);

  // --- 6. Hero Data Helpers ---
  const shelfMark = useMemo(() => {
      if (activeView === 'lines') return globalDrawGapData.lines[0];
      if (activeView === 'suits') return globalDrawGapData.suits[0];
      return globalDrawGapData.marks[0];
  }, [globalDrawGapData, activeView]);


  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  if (loading) { return <div className="text-center text-2xl font-bold p-10">Loading Stats...</div>; }

  return (
    <div className="pb-20">
      
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white">Market Watch</h2>
          <p className="text-gray-400 text-sm mt-1">Deep analysis of the Play Whe market.</p>
        </div>
      </div>

      {/* --- NEW VISUAL SECTION: Shelf Analysis (Merged Meter + List + Toggle) --- */}
      {/* Container now spans FULL width of its grid area */}
      <div className="w-full">
         <ShelfAnalysis 
            globalDrawGapData={globalDrawGapData} 
            historyData={data} 
        />
      </div>

      {/* --- BOTTOM SECTION: Pressure Board & Chart --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Pressure Board */}
        <div className="lg:col-span-1">
           <PressureBoard 
                gapData={globalDrawGapData} 
                activeView={activeView} 
                onViewChange={setActiveView} 
            />
        </div>

        {/* Frequency Chart */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-xl shadow-lg p-6 border-t-4 border-purple-500">
             <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h3 className="text-xl font-bold text-white">Frequency Heatmap</h3>
                <div className="flex bg-gray-700 rounded-lg p-1">
                  {['marks', 'lines', 'suits'].map((v) => (
                    <button
                      key={v}
                      onClick={() => setActiveView(v)}
                      className={`px-4 py-1.5 text-xs font-bold uppercase rounded-md transition-colors ${
                        activeView === v ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
             </div>
             
             {/* Filters Area */}
             <div className="grid grid-cols-3 gap-4 mb-6">
                <select name="year" value={filters.year} onChange={(e) => setFilters({...filters, year: e.target.value})} className="p-2 bg-gray-900 border border-gray-600 rounded text-white text-sm"> <option value="All">All Years</option> {uniqueValues.years.map(y => <option key={y} value={y}>{y}</option>)} </select>
                <select name="month" value={filters.month} onChange={(e) => setFilters({...filters, month: e.target.value})} className="p-2 bg-gray-900 border border-gray-600 rounded text-white text-sm"> <option value="All">All Months</option> {uniqueValues.months.map(m => <option key={m} value={m}>{MONTH_NAMES[m]}</option>)} </select>
                <select name="time" value={filters.time} onChange={(e) => setFilters({...filters, time: e.target.value})} className="p-2 bg-gray-900 border border-gray-600 rounded text-white text-sm"> <option value="All">All Times</option> {uniqueValues.times.map(t => <option key={t} value={t}>{t}</option>)} </select>
             </div>

             <div className="h-80 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={frequencyData.all.slice(0, 20)} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} />
                    <YAxis stroke="#9ca3af" allowDecimals={false} fontSize={12} tickLine={false} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {frequencyData.all.slice(0, 20).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
             <p className="text-center text-xs text-gray-500 mt-4">Showing Top 20 Hottest Marks</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Statistics;