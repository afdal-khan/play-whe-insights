/* This is src/pages/Statistics.jsx (Your two fixes are implemented) */

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MARKS_LIST, PLAY_WHE_MARKS } from '../data/marks';

// ========================================================================
// SECTION 1: GLOBAL CONSTANTS & HELPER FUNCTIONS
// ========================================================================

const MONTH_NAMES = {
  '01': 'January', '02': 'February', '03': 'March', '04': 'April',
  '05': 'May', '06': 'June', '07': 'July', '08': 'August',
  '09': 'September', '10': 'October', '11': 'November', '12': 'December',
};

const numericalSort = (a, b) => {
  try {
    const numA_match = a?.match(/^\d+/);
    const numB_match = b?.match(/^\d+/);
    const numA = numA_match ? parseInt(numA_match[0], 10) : NaN;
    const numB = numB_match ? parseInt(numB_match[0], 10) : NaN;
    if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
    }
  } catch (e) { console.error("Error during numerical sort:", e); }
   if (a === null || a === undefined) return 1;
   if (b === null || b === undefined) return -1;
   return String(a).localeCompare(String(b));
};

const getPressureColor = (value) => {
  if (isNaN(value)) value = 0;
  const hue = (1 - value) * 240 + value * 0; // 240 (blue) to 0 (red)
  const saturation = 70 + (value * 30); // 70% to 100%
  const lightness = 50;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const RECENT_DRAWS_LIMIT = 100;


// ========================================================================
// SECTION 2: "PRESSURE BOARD" COMPONENT
// ========================================================================
const PressureBoard = ({ gapData }) => {
  const [view, setView] = useState('marks'); // 'marks', 'lines', 'suits'
  let dataToShow = [];
  let maxGap = 1;

  if (view === 'marks') {
    dataToShow = gapData.marks;
    maxGap = gapData.maxMarkGap;
  } else if (view === 'lines') {
    dataToShow = gapData.lines;
    maxGap = gapData.maxLineGap;
  } else {
    dataToShow = gapData.suits;
    maxGap = gapData.maxSuitGap;
  }
  
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <div className="md:flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-white mb-3 md:mb-0">
          The Pressure Board (What's Due - All History)
        </h3>
        <div className="flex rounded-md shadow-sm">
          <button onClick={() => setView('marks')} className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md ${view === 'marks' ? 'bg-cyan-600 text-white z-10' : 'bg-gray-700 hover:bg-gray-600'}`}>Marks</button>
          <button onClick={() => setView('lines')} className={`-ml-px flex-1 px-4 py-2 text-sm font-medium ${view === 'lines' ? 'bg-cyan-600 text-white z-10' : 'bg-gray-700 hover:bg-gray-600'}`}>Lines</button>
          <button onClick={() => setView('suits')} className={`-ml-px flex-1 px-4 py-2 text-sm font-medium rounded-r-md ${view === 'suits' ? 'bg-cyan-600 text-white z-10' : 'bg-gray-700 hover:bg-gray-600'}`}>Suits</button>
        </div>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {dataToShow.length === 0 && <p className="text-gray-500 text-center">Loading data...</p>}
        {dataToShow.map(item => {
          if (!item || item.name === undefined) return null; // Safety check
          const gap = item.gap;
          const percentage = (gap === Infinity) ? 1 : (gap / maxGap);
          const color = getPressureColor(percentage);
          const barWidth = (gap === Infinity) ? 100 : Math.min(100, percentage * 100);
          return (
            <div key={item.name} className="grid grid-cols-6 gap-3 items-center">
              <div className="col-span-2 font-medium text-sm text-gray-200 truncate" title={item.name}>{item.name}</div>
              <div className="col-span-3">
                <div className="w-full bg-gray-700 rounded-full h-5">
                  <div className="h-5 rounded-full transition-all duration-300" style={{ width: `${barWidth}%`, backgroundColor: color, minWidth: '2px' }}></div>
                </div>
              </div>
              <div className="col-span-1 text-right text-sm font-bold text-gray-300">{gap === Infinity ? 'N/A' : `${gap} draws`}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


// ========================================================================
// SECTION 3: "STAT CARD" COMPONENT
// ========================================================================
const StatCard = ({ title, numbers }) => (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2">
         {!numbers || numbers.length === 0 ? (
             <span className="text-gray-400">N/A</span>
         ) : (
            numbers.map(item => (
              <div key={item.name} className="text-center bg-gray-700 p-2 rounded-md w-20 flex flex-col justify-between min-h-[90px]">
                {/* --- FIX: Show full name, split ' ' for lines --- */}
                <div className="text-2xl font-bold text-cyan-400 truncate" title={item.name}>{item.name.split(' ')[0]}</div> 
                <div className="text-xs text-gray-300 mt-1 break-words">{item.subName || item.name.split(' ')[1] || ''}</div>
                <div className="text-sm font-bold text-white mt-1">{item.count} plays</div>
              </div>
            ))
         )}
      </div>
    </div>
);


// ========================================================================
// SECTION 4: MAIN STATISTICS COMPONENT
// ========================================================================

function Statistics() {
  const [isLoading, setIsLoading] = useState(true);
  const [allResults, setAllResults] = useState([]); // Newest first
  
  // --- FIX: Removed Line and Suit from filters ---
  const [filters, setFilters] = useState({ time: 'All', year: 'All', month: 'All' });
  // --- END FIX ---
  
  const [uniqueValues, setUniqueValues] = useState({ times: [], lines: [], suits: [], years: [], months: [] });

  const [freqView, setFreqView] = useState('marks'); // 'marks', 'lines', 'suits'

  // 1. Fetch data...
  useEffect(() => {
     const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/play_whe_results.json?v=${new Date().getTime()}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            const newestFirstData = data.slice().reverse();
            setAllResults(newestFirstData);

            // We still need to calculate ALL unique values for the Pressure Board
            const validResults = newestFirstData.filter(item => item && item.Time && item.Date && item.Line && item.Suit !== undefined && item.Suit !== null);
            const times = [...new Set(validResults.map(item => item.Time))].sort((a, b) => { const order={'Morning':1,'Midday':2,'Afternoon':3,'Evening':4}; return (order[a]||99)-(order[b]||99); });
            const lines = [...new Set(validResults.map(item => item.Line))].sort(numericalSort);
            const suits = [...new Set(validResults.map(item => String(item.Suit)))].sort(numericalSort);
            const dates = validResults.map(item => item.Date);
            const years = [...new Set(dates.map(d => d.split('-')[0]))].sort().reverse();
            const allMonthsSet = new Set(dates.map(d => d.split('-')[1]));
            const validMonths = ['01','02','03','04','05','06','07','08','09','10','11','12'];
            const months = validMonths.filter(month => allMonthsSet.has(month));

            setUniqueValues({ times, lines, suits, years, months });

        } catch (error) { console.error("Failed fetch/process:", error); }
        finally { setIsLoading(false); }
     };
     fetchData();
  }, []);

  // --- 2. Calculate GLOBAL Draw Gaps (for Pressure Board) ---
  const globalDrawGapData = useMemo(() => {
    const results = allResults; // Use the full, unfiltered list
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

  // 3. Filter results (for Frequency Analyzer)
   const filteredResults = useMemo(() => {
       if (!Array.isArray(allResults)) return [];
       return allResults.filter(result => {
             // --- FIX: Removed Line and Suit from this filter logic ---
             if (!result || !result.Date || !result.Time) return false;
            const matchesYear = filters.year === 'All' || result.Date.startsWith(filters.year);
            const matchesMonth = filters.month === 'All' || result.Date.split('-')[1] === filters.month;
            const matchesTime = filters.time === 'All' || result.Time === filters.time;
            return matchesYear && matchesMonth && matchesTime;
        });
    }, [allResults, filters]);

  // --- 4. Calculate Frequency data (Dynamic Toggle) ---
   const frequencyData = useMemo(() => {
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
                // --- FIX: Set the name to "7 Suit" here ---
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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // --- Render ---
  if (isLoading) { return <div className="text-center text-2xl font-bold p-10">Loading Statistics...</div>; }

  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-6">Statistics & Analysis</h2>

      {/* --- "Pressure Board" Report (No Filters) --- */}
      <div className="mb-8">
        <PressureBoard 
          gapData={globalDrawGapData} // Pass the GLOBAL gap data
        />
      </div>
      
      {/* --- "Frequency Analyzer" Section (With Filters) --- */}
      <h2 className="text-2xl font-bold text-white mb-4 mt-8 border-b border-gray-700 pb-2">
        Frequency Analyzer (What's Hot?)
      </h2>
      
       {/* --- FILTERS ARE MOVED HERE (3 columns) --- */}
       <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <select name="year" value={filters.year} onChange={handleFilterChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white">
                <option value="All">All Years</option>
                {(uniqueValues.years || []).map(year => <option key={year} value={year}>{year}</option>)}
            </select>
            <select name="month" value={filters.month} onChange={handleFilterChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white">
                <option value="All">All Months</option>
                {(uniqueValues.months || []).map(month => <option key={month} value={month}>{MONTH_NAMES[month] || month}</option>)}
            </select>
             <select name="time" value={filters.time} onChange={handleFilterChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white">
                <option value="All">All Times</option>
                {(uniqueValues.times || []).map(time => <option key={time} value={time}>{time}</option>)}
            </select>
            {/* Line and Suit filters are REMOVED */}
        </div>
      
      {/* --- Frequency View Toggle --- */}
      <div className="flex justify-center mb-4">
        <div className="flex rounded-md shadow-sm">
          <button onClick={() => setFreqView('marks')} className={`px-4 py-2 text-sm font-medium rounded-l-md ${freqView === 'marks' ? 'bg-cyan-600 text-white z-10' : 'bg-gray-700 hover:bg-gray-600'}`}>By Mark</button>
          <button onClick={() => setFreqView('lines')} className={`-ml-px px-4 py-2 text-sm font-medium ${freqView === 'lines' ? 'bg-cyan-600 text-white z-10' : 'bg-gray-700 hover:bg-gray-600'}`}>By Line</button>
          <button onClick={() => setFreqView('suits')} className={`-ml-px px-4 py-2 text-sm font-medium rounded-r-md ${freqView === 'suits' ? 'bg-cyan-600 text-white z-10' : 'bg-gray-700 hover:bg-gray-600'}`}>By Suit</button>
        </div>
      </div>
      
      <div className="text-sm text-gray-400 mb-4 text-center">
        Showing "Hot" stats from the {RECENT_DRAWS_LIMIT} most recent draws that match your filters. ({(filteredResults || []).length.toLocaleString()} total matches)
      </div>

      {/* --- Existing Reports Grid (Hot/Cold) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <StatCard title={`Hottest 5 ${freqView} (Last ${RECENT_DRAWS_LIMIT} Draws)`} numbers={frequencyData.hot || []} />
        <StatCard title={`Coldest 5 ${freqView} (Last ${RECENT_DRAWS_LIMIT} Draws)`} numbers={frequencyData.cold || []} />
      </div>

      {/* --- Frequency Chart --- */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold text-white mb-3">Frequency by {freqView} (Last {RECENT_DRAWS_LIMIT} Draws)</h3>
         <div className="bg-gray-800 p-4 rounded-lg shadow-lg" style={{ height: '400px' }}>
             <ResponsiveContainer width="100%" height="100%">
                 {/* This chart now shows RECENT data, which is much more useful */}
                 <BarChart data={frequencyData.all || []} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                     {/* The XAxis dataKey="name" will now show "12", "1 Line", or "5 Suit" */}
                     <XAxis dataKey="name" stroke="#9ca3af" interval={'preserveStartEnd'} fontSize={10}/>
                     <YAxis stroke="#9ca3af" allowDecimals={false}/>
                     <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} labelStyle={{ color: '#e5e7eb' }}/>
                     <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                 </BarChart>
             </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
}

export default Statistics;