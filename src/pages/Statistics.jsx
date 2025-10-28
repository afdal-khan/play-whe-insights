/* This is src/pages/Statistics.jsx (FULL VERSION RESTORED - Really Final) */

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MARKS_LIST, PLAY_WHE_MARKS } from '../data/marks';

// ========================================================================
// SECTION 1: GLOBAL CONSTANTS & HELPER FUNCTIONS (Defined OUTSIDE Components)
// ========================================================================

const MONTH_NAMES = {
  '01': 'January', '02': 'February', '03': 'March', '04': 'April',
  '05': 'May', '06': 'June', '07': 'July', '08': 'August',
  '09': 'September', '10': 'October', '11': 'November', '12': 'December',
};

const numericalSort = (a, b) => {
  try {
    // Attempt to extract the first sequence of digits from the start of the string
    const numA_match = a?.match(/^\d+/);
    const numB_match = b?.match(/^\d+/);

    // Parse integers only if matches are found
    const numA = numA_match ? parseInt(numA_match[0], 10) : NaN;
    const numB = numB_match ? parseInt(numB_match[0], 10) : NaN;

    // Check if both are valid numbers before comparing numerically
    if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
    }
  } catch (e) {
      console.error("Error during numerical sort:", e, "Inputs:", a, b);
  }
   // Fallback: treat null/undefined consistently or use localeCompare
   // Ensure comparison is between strings to avoid errors with localeCompare
   const strA = String(a ?? ''); // Convert null/undefined to empty string
   const strB = String(b ?? ''); // Convert null/undefined to empty string
   if (strA === '' && strB === '') return 0;
   if (strA === '') return 1; // Put empty strings/nulls last
   if (strB === '') return -1;
   return strA.localeCompare(strB);
};


// ========================================================================
// SECTION 2: HELPER COMPONENTS (Defined OUTSIDE Statistics Component)
// ========================================================================

// --- Sortable Gap Table Component (Fixed Scrolling) ---
const SortableGapTable = ({ title, data, initialSort = 'gap' }) => {
  const [sortConfig, setSortConfig] = useState({ key: initialSort, direction: 'descending' });

  const sortedData = useMemo(() => {
    let sortableItems = data ? [...data] : [];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (!a || !b) return 0; // Basic null check for items

        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Specific handling for 'gap' key with Infinity
        if (sortConfig.key === 'gap') {
           if (aValue === Infinity && bValue === Infinity) return 0;
           // Infinity is considered the largest gap
           if (aValue === Infinity) return sortConfig.direction === 'ascending' ? 1 : -1;
           if (bValue === Infinity) return sortConfig.direction === 'ascending' ? -1 : 1;
        }

        // General handling for null/undefined values - place them at the end
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        // Perform comparison for non-null, non-Infinity values
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0; // Values are equal
      });
    }
    return sortableItems;
  }, [data, sortConfig]);


  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') { direction = 'descending'; }
    else if (sortConfig.key === key && sortConfig.direction === 'descending'){ direction = 'ascending'; }
    else if (key === 'gap') { direction = 'descending'; } // Default gap sort
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) { return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼'; }
    return '';
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col"> {/* Flex column */}
      <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
      {/* Vertical scroll applied here, overflow-x still possible if content wider than container */}
      <div className="overflow-x-auto max-h-96 overflow-y-auto flex-grow"> {/* Flex grow takes available space */}
        <table className="w-full"> {/* Removed min-w-max */}
          <thead className="sticky top-0 bg-gray-700 z-10">
            <tr>
              <th className="p-2 text-left text-sm font-semibold cursor-pointer hover:bg-gray-600 w-[40%]" onClick={() => requestSort('item')}>Item{getSortIndicator('item')}</th>
              <th className="p-2 text-left text-sm font-semibold w-[40%]">Last Played</th>
              <th className="p-2 text-right text-sm font-semibold cursor-pointer hover:bg-gray-600 w-[20%]" onClick={() => requestSort('gap')}>Gap{getSortIndicator('gap')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {(!sortedData || sortedData.length === 0) ? (
                 <tr><td colSpan="3" className="p-4 text-center text-gray-500">No data available.</td></tr>
             ) : (
                sortedData.map((item, index) => (
                  <tr key={item?.item || index} className="hover:bg-gray-700/50 text-sm">
                    {/* Allow wrapping */}
                    <td className="p-2 font-medium break-words">{item?.item || 'N/A'}</td>
                    <td className="p-2 text-gray-400 break-words">{item?.lastPlayed ? `${item.lastPlayed.Date} @ ${item.lastPlayed.Time}` : 'Never'}</td>
                    <td className="p-2 text-right font-bold whitespace-nowrap">{item?.gap === Infinity ? 'N/A' : item?.gap ?? 'N/A'}</td> {/* Keep Gap non-wrapping */}
                  </tr>
                ))
             )}
          </tbody>
        </table>
      </div>
    </div>
  );
}; // End SortableGapTable

// --- StatCard Component ---
const StatCard = ({ title, numbers }) => (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2">
         {!numbers || numbers.length === 0 ? (
             <span className="text-gray-400">N/A</span>
         ) : (
            numbers.map(item => (
              // Use a more robust key if possible, ensure item exists
              <div key={item?.number ?? item?.item ?? Math.random()} className="text-center bg-gray-700 p-2 rounded-md w-20 flex flex-col justify-between min-h-[90px]">
                <div className="text-2xl font-bold text-cyan-400">{item?.number ?? '?'}</div>
                <div className="text-xs text-gray-300 mt-1 break-words">{item?.name || item?.item || '?'}</div>
                <div className="text-sm font-bold text-white mt-1">{item?.count ?? '?'}</div>
              </div>
            ))
         )}
      </div>
    </div>
); // End StatCard


// ========================================================================
// SECTION 3: MAIN STATISTICS COMPONENT
// ========================================================================

function Statistics() {
  const [isLoading, setIsLoading] = useState(true);
  const [allResults, setAllResults] = useState([]); // Newest first
  const [filters, setFilters] = useState({ time: 'All', line: 'All', suit: 'All', year: 'All', month: 'All' });
  const [uniqueValues, setUniqueValues] = useState({ times: [], lines: [], suits: [], years: [], months: [] });

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

            // Calculate unique values (ensure suits are handled as strings)
            const validResults = newestFirstData.filter(item => item && item.Time && item.Date && item.Line && item.Suit !== undefined && item.Suit !== null);
            const times = [...new Set(validResults.map(item => item.Time))].sort((a, b) => { const order={'Morning':1,'Midday':2,'Afternoon':3,'Evening':4}; return (order[a]||99)-(order[b]||99); });
            const lines = [...new Set(validResults.map(item => item.Line))].sort(numericalSort);
            const suits = [...new Set(validResults.map(item => String(item.Suit)))].sort(numericalSort); // Convert to string before Set
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

  // 2. Filter results...
   const filteredResults = useMemo(() => {
       // Ensure allResults is an array before filtering
       if (!Array.isArray(allResults)) return [];
       return allResults.filter(result => {
             // Add null check for result itself
             if (!result || !result.Date || !result.Time || !result.Line || result.Suit === undefined || result.Suit === null) return false;
            const matchesYear = filters.year === 'All' || result.Date.startsWith(filters.year);
            const matchesMonth = filters.month === 'All' || result.Date.split('-')[1] === filters.month;
            const matchesTime = filters.time === 'All' || result.Time === filters.time;
            const matchesLine = filters.line === 'All' || result.Line === filters.line;
             const matchesSuit = filters.suit === 'All' || String(result.Suit) === filters.suit;
            return matchesYear && matchesMonth && matchesTime && matchesLine && matchesSuit;
        });
    }, [allResults, filters]);

  // --- CALCULATIONS ARE ACTIVE ---
  // 3. Calculate Draw Gaps...
  const drawGapData = useMemo(() => {
    // console.log("Memo: Calculating Draw Gaps...");
    const results = filteredResults;
    // Add check here
    if (!Array.isArray(results) || results.length === 0) {
        // console.log("Memo: No filtered results for gap calculation.");
        return { marks: [], lines: [], suits: [] };
    }

    const markGaps = MARKS_LIST.map(markInfo => {
      const index = results.findIndex(r => r?.Mark === markInfo.num);
      return { item: `${markInfo.num} (${markInfo.mark})`, gap: index === -1 ? Infinity : index, lastPlayed: index === -1 ? null : results[index], number: markInfo.num };
    });

    // Add checks for uniqueValues arrays
    const lineGaps = (uniqueValues.lines || []).map(line => {
      const index = results.findIndex(r => r?.Line === line);
      return { item: line, gap: index === -1 ? Infinity : index, lastPlayed: index === -1 ? null : results[index] };
    });

    const suitGaps = (uniqueValues.suits || []).map(suit => {
        const index = results.findIndex(r => String(r?.Suit) === suit);
        return { item: `${suit} Suit`, gap: index === -1 ? Infinity : index, lastPlayed: index === -1 ? null : results[index], number: parseInt(suit, 10) };
    });
    // console.log("Memo: Draw Gaps Calculation Complete.");
    return { marks: markGaps, lines: lineGaps, suits: suitGaps };
  }, [filteredResults, uniqueValues.lines, uniqueValues.suits]);

  // 4. Calculate Frequency data...
   const frequencyData = useMemo(() => {
        // console.log("Memo: Calculating Frequency Data...");
        const freqMap = new Map();
        MARKS_LIST.forEach(mark => { freqMap.set(mark.num, { number: mark.num, name: mark.mark, count: 0 }); });
        // Add check for filteredResults before looping
        (filteredResults || []).forEach(result => {
            if (result && freqMap.has(result.Mark)) { freqMap.get(result.Mark).count++; }
        });
        const dataArray = [...freqMap.values()].sort((a, b) => b.count - a.count);
        const hot = dataArray.slice(0, 5);
        const coldNonZero = dataArray.filter(d => d.count > 0);
        // Ensure slice doesn't go negative if coldNonZero is short
        const cold = coldNonZero.slice(Math.max(0, coldNonZero.length - 5)).reverse();
        const coldest = dataArray.filter(d => d.count === 0);
        // console.log("Memo: Frequency Data Calculation Complete.");
        return { all: dataArray, hot, cold, coldest };
    }, [filteredResults]);
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
      {/* --- Filter Controls --- */}
       <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <select name="line" value={filters.line} onChange={handleFilterChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white">
                <option value="All">All Lines</option>
                {(uniqueValues.lines || []).map(line => <option key={line} value={line}>{line}</option>)}
            </select>
            <select name="suit" value={filters.suit} onChange={handleFilterChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white">
                <option value="All">All Suits</option>
                {(uniqueValues.suits || []).map(suit => <option key={suit} value={suit}>{suit}</option>)}
            </select>
        </div>
      <div className="text-sm text-gray-400 mb-4 text-center">Showing stats for {(filteredResults || []).length.toLocaleString()} results.</div>

      {/* --- Draw Gap Reports Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <SortableGapTable title="Mark Gaps (Draws Since)" data={drawGapData.marks || []} initialSort="gap" />
        <SortableGapTable title="Line Gaps (Draws Since)" data={drawGapData.lines || []} initialSort="gap" />
        <SortableGapTable title="Suit Gaps (Draws Since)" data={drawGapData.suits || []} initialSort="gap" />
      </div>

      {/* --- Existing Reports Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <StatCard title="Hottest 5 Numbers" numbers={frequencyData.hot || []} />
        <StatCard title="Coldest 5 Numbers (Appeared)" numbers={frequencyData.cold || []} />
      </div>

      {/* --- Frequency Chart --- */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold text-white mb-3">Number Frequency</h3>
         <div className="bg-gray-800 p-4 rounded-lg shadow-lg" style={{ height: '400px' }}>
             <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={frequencyData.all || []} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                     <XAxis dataKey="number" stroke="#9ca3af" interval={0} fontSize={10}/> {/* Smaller font */}
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