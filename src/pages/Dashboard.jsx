/* This is src/pages/Dashboard.jsx (Replaced Time Filter with Day of Week) */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PLAY_WHE_MARKS } from '../data/marks';

// --- Color Palettes (Defined outside component) ---
const LINE_COLORS = {
  '1 Line': 'bg-red-900/70 text-red-100',
  '2 Line': 'bg-blue-900/70 text-blue-100',
  '3 Line': 'bg-green-900/70 text-green-100',
  '4 Line': 'bg-yellow-900/70 text-yellow-100',
  '5 Line': 'bg-indigo-900/70 text-indigo-100',
  '6 Line': 'bg-pink-900/70 text-pink-100',
  '7 Line': 'bg-purple-900/70 text-purple-100',
  '8 Line': 'bg-orange-900/70 text-orange-100',
  '9 Line': 'bg-cyan-900/70 text-cyan-100',
  'default': 'bg-gray-800 text-gray-400'
};
const SUIT_COLORS = {
  '0': 'bg-red-900/70 text-red-100',
  '1': 'bg-blue-900/70 text-blue-100',
  '2': 'bg-green-900/70 text-green-100',
  '3': 'bg-yellow-900/70 text-yellow-100',
  '4': 'bg-indigo-900/70 text-indigo-100',
  '5': 'bg-pink-900/70 text-pink-100',
  '6': 'bg-purple-900/70 text-purple-100',
  '7': 'bg-orange-900/70 text-orange-100',
  '8': 'bg-cyan-900/70 text-cyan-100',
  '9': 'bg-teal-900/70 text-teal-100',
  'default': 'bg-gray-800 text-gray-400'
};
const MONTH_NAMES = {
  '01': 'January', '02': 'February', '03': 'March', '04': 'April',
  '05': 'May', '06': 'June', '07': 'July', '08': 'August',
  '09': 'September', '10': 'October', '11': 'November', '12': 'December',
};
// --- NEW: Day of Week list ---
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// --- Helper Functions (Defined outside component) ---
const formatDateHeader = (isoDate) => {
    if (!isoDate || typeof isoDate !== 'string') return 'Invalid Date';
    try {
        const date = new Date(isoDate + 'T00:00:00Z'); // Use Z for UTC
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short' });
    } catch (e) { return 'Invalid Date'; }
};

const getISODate = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) { return new Date().toISOString().split('T')[0]; }
    return date.toISOString().split('T')[0];
};

const getCellProps = (result, displayType) => {
    if (!result) return { className: 'text-gray-600 bg-gray-800', content: '-' };
    switch (displayType) {
      case 'Line':
        const lineText = result.Line || '-';
        return { className: `font-semibold text-sm ${LINE_COLORS[result.Line] || LINE_COLORS['default']}`, content: lineText };
      case 'Suit':
         const suitStr = String(result.Suit);
         const suitText = (result.Suit !== undefined && result.Suit !== null) ? `${suitStr} Suit` : '-';
        return { className: `font-semibold text-sm ${SUIT_COLORS[suitStr] || SUIT_COLORS['default']}`, content: suitText };
      case 'Mark': default:
        const markContent = (result.Mark !== undefined && result.Mark !== null) ? result.Mark : '-';
        return { className: 'font-bold text-cyan-400 bg-gray-800', content: markContent };
    }
};
// --- END HELPER FUNCTIONS ---

// --- Limit for testing ---
const MAX_ROWS_TO_DISPLAY = 100;
// --- END LIMIT ---

function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [allResults, setAllResults] = useState([]);
  const [resultsMap, setResultsMap] = useState(new Map());
  const [displayType, setDisplayType] = useState('Mark');
  const [underNumber, setUnderNumber] = useState(null);
  
  // --- UPDATED: Replaced 'time' with 'day' ---
  const [filters, setFilters] = useState({ year: 'All', month: 'All', day: 'All' });
  // --- END UPDATED ---
  
  const [uniqueValues, setUniqueValues] = useState({ times: [], years: [], months: [] });

  const scrollContainerRef = useRef(null);

  // 1. Fetch data...
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/play_whe_results.json?v=${new Date().getTime()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        // --- NEW: Add DayName to each result ---
        const dataWithDay = data.map(result => {
            const date = new Date(result.Date + 'T00:00:00Z');
            return {
                ...result,
                DayName: DAY_NAMES[date.getUTCDay()] // 0 = Sunday, 1 = Monday, etc.
            };
        });
        // --- END NEW ---

        const newestFirstData = dataWithDay.slice().reverse();
        setAllResults(newestFirstData);

        const map = new Map();
        for (const result of data) { // Use original sorted data
           if (result && result.Date && result.Time) {
              const key = `${result.Date}_${result.Time}`;
              map.set(key, result);
           }
        }
        setResultsMap(map);

        const validResults = newestFirstData.filter(item => item && item.Time && item.Date);
        const times = [...new Set(validResults.map(item => item.Time))].sort((a, b) => { const order={'Morning':1,'Midday':2,'Afternoon':3,'Evening':4}; return (order[a]||99)-(order[b]||99); });
        const dates = validResults.map(item => item.Date);
        const years = [...new Set(dates.map(d => d.split('-')[0]))].sort().reverse();
        const allMonthsSet = new Set(dates.map(d => d.split('-')[1]));
        const validMonths = ['01','02','03','04','05','06','07','08','09','10','11','12'];
        const months = validMonths.filter(month => allMonthsSet.has(month));

        setUniqueValues({ times, years, months }); // We still need 'times' for the columns

      } catch (error) {
        console.error("Failed to fetch or process results:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. Filter results...
  const filteredResults = useMemo(() => {
    return allResults.filter(result => {
        if (!result || !result.Date || !result.DayName) return false;
        const matchesYear = filters.year === 'All' || result.Date.startsWith(filters.year);
        const matchesMonth = filters.month === 'All' || result.Date.split('-')[1] === filters.month;
        // --- UPDATED: Use 'day' filter, remove 'time' filter ---
        const matchesDay = filters.day === 'All' || result.DayName === filters.day;
        return matchesYear && matchesMonth && matchesDay;
        // --- END UPDATED ---
    });
  }, [allResults, filters]);

  // Apply the limit
  const displayResults = useMemo(() => {
      return filteredResults.slice(0, MAX_ROWS_TO_DISPLAY);
  }, [filteredResults]);


  // Sort uniqueDates OLDEST FIRST for rendering
  const uniqueDates = useMemo(() => {
    if (!Array.isArray(displayResults)) return [];
    const validDates = displayResults.map(r => r?.Date).filter(Boolean);
    return [...new Set(validDates)].sort();
  }, [displayResults]);

  const drawTimes = uniqueValues.times.filter(t => t !== 'Unknown');

  // "What They Under?" hover logic
  const handleCellHover = (dateISO, time) => {
    try {
        if (!dateISO || !time) return;
        const currentDrawDate = new Date(dateISO + 'T00:00:00Z');
        if (isNaN(currentDrawDate.getTime())) return;
        let priorDate = new Date(currentDrawDate);
        priorDate.setUTCDate(priorDate.getUTCDate() - 7);
        const priorDateISO = getISODate(priorDate);
        const lookupKey = `${priorDateISO}_${time}`;
        setUnderNumber(resultsMap.get(lookupKey) || null);
    } catch (e) {
        console.error("Error in handleCellHover:", e);
        setUnderNumber(null);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // useEffect to scroll to bottom
  useEffect(() => {
    if (scrollContainerRef.current && !isLoading) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [displayResults, isLoading]);

  // --- Render ---
  if (isLoading) {
    return <div className="text-center text-2xl font-bold p-10">Loading Play Chart...</div>;
  }
  if (!isLoading && allResults.length === 0) {
     return <div className="text-center text-xl text-red-400 p-10">Failed to load data. Check console/refresh.</div>;
  }

  return (
    <div>
      {/* --- Header & Controls --- */}
      <div className="md:flex justify-between items-center mb-4">
        <h2 className="text-3xl font-bold text-white mb-4 md:mb-0">
          Interactive Play Chart
        </h2>
        
        {/* --- UPDATED: Filter Bar --- */}
        <div className="flex flex-col md:flex-row gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Year</label>
            <select name="year" value={filters.year} onChange={handleFilterChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white">
                <option value="All">All Years</option>
                {(uniqueValues.years || []).map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Month</label>
            <select name="month" value={filters.month} onChange={handleFilterChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white">
                <option value="All">All Months</option>
                {(uniqueValues.months || []).map(month => <option key={month} value={month}>{MONTH_NAMES[month] || month}</option>)}
            </select>
          </div>
          {/* --- NEW: Day of Week Filter --- */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Day of Week</label>
            <select name="day" value={filters.day} onChange={handleFilterChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white">
                <option value="All">All Days</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                {/* We assume Sunday has no draws based on player feedback */}
            </select>
          </div>
          {/* --- END NEW --- */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Heatmap</label>
            <div className="flex rounded-md shadow-sm">
              <button onClick={() => setDisplayType('Mark')} className={`flex-1 px-3 py-2 text-sm rounded-l-md ${displayType === 'Mark' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Mark</button>
              <button onClick={() => setDisplayType('Line')} className={`flex-1 px-3 py-2 text-sm ${displayType === 'Line' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Line</button>
              <button onClick={() => setDisplayType('Suit')} className={`flex-1 px-3 py-2 text-sm rounded-r-md ${displayType === 'Suit' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Suit</button>
            </div>
          </div>
        </div>
      </div>
      {/* --- END UPDATED FILTERS --- */}

      {/* --- "What They Under?" Display --- */}
      <div className="bg-gray-800 border-l-4 border-cyan-400 p-4 rounded-lg mb-4 shadow-lg min-h-[90px]" onMouseLeave={() => setUnderNumber(null)}>
         <h3 className="text-sm font-semibold text-gray-400 mb-1">WHAT THEY UNDER?</h3>
        {underNumber ? (
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-cyan-400">{underNumber.Mark}</div>
            <div>
              <div className="text-xl font-bold text-white">{underNumber.MarkName}</div>
              <div className="text-sm text-gray-300">{underNumber.Date} @ {underNumber.Time}</div>
            </div>
          </div>
        ) : ( <div className="text-gray-500 italic pt-4">Hover over a cell...</div> )}
      </div>

      {/* --- The Interactive Grid --- */}
      <div className="text-sm text-gray-400 mb-2">
         {/* Updated Text */}
        Showing the {displayResults.length > MAX_ROWS_TO_DISPLAY ? MAX_ROWS_TO_DISPLAY : displayResults.length} most recent results. (Newest at bottom)
      </div>
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto bg-gray-800 rounded-lg shadow max-h-[calc(100vh-450px)] overflow-y-auto"
      >
        <table className="w-full min-w-max text-center table-fixed">
           <thead className="sticky top-0 z-10">
            <tr className="bg-gray-700 ">
              <th className="p-3 text-left text-sm font-semibold sticky left-0 bg-gray-700 z-20 w-32">Date</th>
              {drawTimes.map(time => (
                <th key={time} className="p-3 text-sm font-semibold w-24">{time}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
             {displayResults.length === 0 && (
              <tr><td colSpan={drawTimes.length + 1} className="p-6 text-center text-gray-500">No results found.</td></tr>
            )}
            {uniqueDates.map(dateISO => {
              if (!dateISO) return null;
              const resultsForDate = displayResults.filter(r => r && r.Date === dateISO);
              // --- NEW: If no results for this day (e.g., filtered by Monday), don't render the row ---
              if (resultsForDate.length === 0) return null;
              // --- END NEW ---
              return (
                <tr key={dateISO} className="hover:bg-gray-700/50">
                  <td className="p-2 text-left font-semibold whitespace-nowrap sticky left-0 bg-gray-800 hover:bg-gray-700/50 z-10 w-32">
                    {formatDateHeader(dateISO)}
                  </td>
                  {drawTimes.map(time => {
                    const result = resultsForDate.find(r => r && r.Time === time);
                    const props = getCellProps(result, displayType); // Pass displayType
                    return (
                      <td
                        key={time}
                        className={`p-2 transition-colors ${props.className} w-24`}
                        onMouseEnter={() => handleCellHover(dateISO, time)}
                      >
                        {props.content !== undefined ? props.content : '-'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
       {filteredResults.length > MAX_ROWS_TO_DISPLAY && (
         <div className="text-center text-yellow-400 mt-4 p-2 bg-yellow-900/50 rounded">
           Note: Display limited to {MAX_ROWS_TO_DISPLAY} results for performance.
         </div>
       )}
    </div>
  );
}

export default Dashboard;