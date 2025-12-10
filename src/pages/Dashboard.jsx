/* This is src/pages/Dashboard.jsx (Supabase Version - Receives Props) */

import React, { useState, useMemo, useEffect, useRef } from 'react';

// --- Color Palettes & Helpers ---
const LINE_COLORS = { '1 Line': 'bg-red-500/20 text-red-200 border border-red-500/30', '2 Line': 'bg-blue-500/20 text-blue-200 border border-blue-500/30', '3 Line': 'bg-green-500/20 text-green-200 border border-green-500/30', '4 Line': 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30', '5 Line': 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30', '6 Line': 'bg-pink-500/20 text-pink-200 border border-pink-500/30', '7 Line': 'bg-purple-500/20 text-purple-200 border border-purple-500/30', '8 Line': 'bg-orange-500/20 text-orange-200 border border-orange-500/30', '9 Line': 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30', 'default': 'bg-gray-700 text-gray-400' };
const SUIT_COLORS = { '0': 'bg-red-500/20 text-red-200 border border-red-500/30', '1': 'bg-blue-500/20 text-blue-200 border border-blue-500/30', '2': 'bg-green-500/20 text-green-200 border border-green-500/30', '3': 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30', '4': 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30', '5': 'bg-pink-500/20 text-pink-200 border border-pink-500/30', '6': 'bg-purple-500/20 text-purple-200 border border-purple-500/30', '7': 'bg-orange-500/20 text-orange-200 border border-orange-500/30', '8': 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30', '9': 'bg-teal-500/20 text-teal-200 border border-teal-500/30', 'default': 'bg-gray-700 text-gray-400' };
const MONTH_NAMES = { '01': 'January', '02': 'February', '03': 'March', '04': 'April', '05': 'May', '06': 'June', '07': 'July', '08': 'August', '09': 'September', '10': 'October', '11': 'November', '12': 'December' };
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatDateHeader = (isoDate) => {
    if (!isoDate || typeof isoDate !== 'string') return 'Invalid Date';
    try { const date = new Date(isoDate + 'T00:00:00Z'); return date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short' }); } catch (e) { return 'Invalid Date'; }
};

const MAX_ROWS_TO_DISPLAY = 100;

// --- COMPONENT NOW ACCEPTS PROPS (No Fetching!) ---
function Dashboard({ data = [], loading }) { 
  const [displayType, setDisplayType] = useState('Mark'); 
  const [filters, setFilters] = useState({ year: 'All', month: 'All', day: 'All' });
  const [selectedValue, setSelectedValue] = useState(null); 
  const [stats, setStats] = useState(null); 
  const scrollContainerRef = useRef(null);

  // 1. Calculate Unique Values (Memoized from props)
  const uniqueValues = useMemo(() => {
        if (!data || data.length === 0) return { times: [], years: [], months: [] };
        
        const validResults = data.filter(item => item && item.Time && item.Date);
        const times = [...new Set(validResults.map(item => item.Time))].sort((a, b) => { const o={'Morning':1,'Midday':2,'Afternoon':3,'Evening':4}; return (o[a]||99)-(o[b]||99); });
        const dates = validResults.map(item => item.Date);
        const years = [...new Set(dates.map(d => d.split('-')[0]))].sort().reverse();
        const allMonthsSet = new Set(dates.map(d => d.split('-')[1]));
        const months = ['01','02','03','04','05','06','07','08','09','10','11','12'].filter(m => allMonthsSet.has(m));

        return { times, years, months };
  }, [data]);

  // 2. Filter Logic
  const filteredResults = useMemo(() => {
    return data.filter(result => { 
        if (!result || !result.Date || !result.DayName) return false;
        const matchesYear = filters.year === 'All' || result.Date.startsWith(filters.year);
        const matchesMonth = filters.month === 'All' || result.Date.split('-')[1] === filters.month;
        const matchesDay = filters.day === 'All' || result.DayName === filters.day;
        return matchesYear && matchesMonth && matchesDay;
    });
  }, [data, filters]);

  const displayResults = useMemo(() => filteredResults.slice(0, MAX_ROWS_TO_DISPLAY), [filteredResults]);

  // 3. Unique Dates
  const uniqueDates = useMemo(() => {
    if (!Array.isArray(displayResults)) return [];
    const validDates = displayResults.map(r => r?.Date).filter(Boolean);
    return [...new Set(validDates)].sort(); 
  }, [displayResults]);

  const drawTimes = uniqueValues.times?.filter(t => t !== 'Unknown') || [];

  // 4. Smart Logic
  useEffect(() => {
    if (selectedValue === null) { setStats(null); return; }
    
    // Reverse for sequential logic (Oldest First)
    const rawData = [...data].reverse(); 
    let totalCount = 0;
    let followingCounts = {};

    rawData.forEach((result, index) => {
        let isMatch = false;
        if (displayType === 'Mark') isMatch = result.Mark === selectedValue;
        else if (displayType === 'Line') isMatch = result.Line === selectedValue;
        else if (displayType === 'Suit') isMatch = String(result.Suit) === String(selectedValue);

        if (isMatch) {
            totalCount++;
            const nextResult = rawData[index + 1];
            if (nextResult) {
                let followerValue = null;
                if (displayType === 'Mark') followerValue = nextResult.Mark;
                else if (displayType === 'Line') followerValue = nextResult.Line;
                else if (displayType === 'Suit') followerValue = String(nextResult.Suit);

                if (followerValue !== null && followerValue !== undefined) {
                    followingCounts[followerValue] = (followingCounts[followerValue] || 0) + 1;
                }
            }
        }
    });

    let bestFollower = null;
    let maxFollowerCount = 0;
    Object.entries(followingCounts).forEach(([val, count]) => {
        if (count > maxFollowerCount) { maxFollowerCount = count; bestFollower = val; }
    });
    
    let formattedFollower = bestFollower;
    if (bestFollower && displayType === 'Suit') formattedFollower = `${bestFollower} Suit`;

    setStats({ count: totalCount, bestFollower: formattedFollower, bestFollowerCount: maxFollowerCount });
  }, [selectedValue, data, displayType]); 

  // Auto-scroll
  useEffect(() => {
    if (scrollContainerRef.current && !loading) {
      setTimeout(() => { if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight; }, 0);
    }
  }, [displayResults, loading]);

  const handleFilterChange = (e) => { const { name, value } = e.target; setFilters(prev => ({ ...prev, [name]: value })); setSelectedValue(null); };
  const handleDisplayTypeChange = (type) => { setDisplayType(type); setSelectedValue(null); };
  
  const handleCellClick = (result) => {
    if (!result) return;
    let valToSelect = null;
    if (displayType === 'Mark') valToSelect = result.Mark;
    else if (displayType === 'Line') valToSelect = result.Line;
    else if (displayType === 'Suit') valToSelect = String(result.Suit);
    if (valToSelect === undefined || valToSelect === null) return;
    if (selectedValue === valToSelect) setSelectedValue(null); 
    else setSelectedValue(valToSelect);
  };

  const getCellStyle = (result) => {
      if (!result) return { base: 'text-gray-700', content: '-' };
      let cellValue = null;
      if (displayType === 'Mark') cellValue = result.Mark;
      else if (displayType === 'Line') cellValue = result.Line;
      else if (displayType === 'Suit') cellValue = String(result.Suit);
      const isMatch = selectedValue !== null && String(cellValue) === String(selectedValue);
      const isDimmed = selectedValue !== null && String(cellValue) !== String(selectedValue);
      let baseClass = "transition-all duration-300 cursor-pointer ";
      let content = "";
      if (displayType === 'Mark') { content = result.Mark; baseClass += "font-bold text-lg "; if (isMatch) baseClass += "text-white bg-cyan-600 rounded-md shadow-[0_0_15px_rgba(8,145,178,0.6)] scale-110 z-10 "; else if (isDimmed) baseClass += "text-gray-600 opacity-30 "; else baseClass += "text-cyan-400 hover:text-cyan-200 "; } 
      else if (displayType === 'Line') { content = result.Line || '-'; const color = LINE_COLORS[result.Line] || LINE_COLORS.default; baseClass += `text-xs rounded px-1 py-0.5 font-medium border `; if (isMatch) baseClass += `bg-cyan-600 text-white border-cyan-400 scale-110 shadow-lg z-10 `; else if (isDimmed) baseClass += "opacity-20 grayscale "; else baseClass += `${color} `; }
      else if (displayType === 'Suit') { content = `${result.Suit} Suit`; const color = SUIT_COLORS[String(result.Suit)] || SUIT_COLORS.default; baseClass += `text-xs rounded px-1 py-0.5 font-medium border `; if (isMatch) baseClass += `bg-cyan-600 text-white border-cyan-400 scale-110 shadow-lg z-10 `; else if (isDimmed) baseClass += "opacity-20 grayscale "; else baseClass += `${color} `; }
      return { className: baseClass, content };
  };

  if (loading) return <div className="p-10 text-center text-xl font-bold text-cyan-500 animate-pulse">Loading Chart...</div>;

  return (
    <div className="pb-10 h-[calc(100vh-100px)] flex flex-col">
      {/* HEADER */}
      <div className="bg-gray-800 rounded-xl shadow-lg p-4 mb-4 border-b border-gray-700 shrink-0 transition-all">
        <div className="flex flex-col xl:flex-row justify-between items-center gap-4">
          <div className="flex-1 w-full xl:w-auto">
            {selectedValue !== null ? (
                <div className="flex items-center justify-between bg-cyan-900/30 border border-cyan-500/50 rounded-lg p-2 px-4 animate-fade-in-down">
                    <div className="flex items-center gap-4">
                        <div className="text-xl md:text-3xl font-black text-cyan-400 whitespace-nowrap">{displayType === 'Suit' ? `${selectedValue} Suit` : selectedValue}</div>
                        <div><div className="text-xs text-cyan-200 uppercase tracking-wider font-bold">{displayType} Stats</div><div className="text-xs md:text-sm text-white">Played <span className="font-bold text-white">{stats?.count || 0}</span> times</div></div>
                    </div>
                    <div className="flex items-center gap-3 border-l border-cyan-700 pl-4 ml-2">
                        <div className="text-right hidden md:block"><div className="text-[10px] text-cyan-300 uppercase">Next {displayType}</div><div className="text-xs text-gray-300">Usually followed by...</div></div>
                        <div className="text-lg md:text-2xl font-bold text-yellow-400 whitespace-nowrap">{stats?.bestFollower ? stats.bestFollower : '-'}</div>
                    </div>
                    <button onClick={() => setSelectedValue(null)} className="ml-4 text-gray-400 hover:text-white text-xl font-bold">✕</button>
                </div>
            ) : (
                <div><h2 className="text-2xl font-bold text-white flex items-center gap-2"><span>Play Chart</span><span className="px-2 py-1 text-xs bg-cyan-900 text-cyan-300 rounded-full border border-cyan-700">Live</span></h2><p className="text-xs text-gray-400 mt-1">Click any cell to trace the {displayType} pattern.</p></div>
            )}
          </div>
          <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto items-center">
            <div className="flex gap-2 flex-1 md:flex-none overflow-x-auto pb-1 md:pb-0">
                <select name="year" value={filters.year} onChange={handleFilterChange} className="bg-gray-900 text-white text-sm rounded-lg border border-gray-600 p-2 focus:border-cyan-500 outline-none"> <option value="All">Year</option> {uniqueValues.years.map(y => <option key={y} value={y}>{y}</option>)} </select>
                <select name="month" value={filters.month} onChange={handleFilterChange} className="bg-gray-900 text-white text-sm rounded-lg border border-gray-600 p-2 focus:border-cyan-500 outline-none"> <option value="All">Month</option> {uniqueValues.months.map(m => <option key={m} value={m}>{MONTH_NAMES[m]}</option>)} </select>
                <select name="day" value={filters.day} onChange={handleFilterChange} className="bg-gray-900 text-white text-sm rounded-lg border border-gray-600 p-2 focus:border-cyan-500 outline-none"> <option value="All">Day</option> {DAY_NAMES.map(d => <option key={d} value={d}>{d}</option>)} </select>
            </div>
            <div className="bg-gray-700 p-1 rounded-lg flex shrink-0">
              {['Mark', 'Line', 'Suit'].map((type) => ( <button key={type} onClick={() => handleDisplayTypeChange(type)} className={`px-4 py-1.5 text-xs font-bold uppercase rounded-md transition-all duration-200 ${ displayType === type ? 'bg-cyan-600 text-white shadow-md transform scale-105' : 'text-gray-400 hover:text-white hover:bg-gray-600' }`}> {type} </button> ))}
            </div>
          </div>
        </div>
      </div>

      {/* GRID */}
      <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 flex-1 overflow-hidden relative flex flex-col">
        <div className="grid grid-cols-[80px_1fr] bg-gray-900 border-b border-gray-700 z-20">
           <div className="p-1 text-left text-xs font-bold text-gray-400 uppercase tracking-wider border-r border-gray-700 pl-2">Date</div>
           <div className="grid" style={{ gridTemplateColumns: `repeat(${drawTimes.length}, 1fr)` }}>
              {drawTimes.map(time => ( <div key={time} className="p-1 text-center text-xs font-bold text-gray-400 uppercase tracking-wider border-r border-gray-800 last:border-none"> {time} </div> ))}
           </div>
        </div>
        <div ref={scrollContainerRef} className="overflow-y-auto flex-1 scroll-smooth custom-scrollbar">
           {data.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-gray-500"><div className="text-4xl mb-2">📂</div><p>No results found.</p></div>
           ) : (
             <div className="divide-y divide-gray-700/50">
                {uniqueDates.map(dateISO => {
                   const resultsForDate = displayResults.filter(r => r && r.Date === dateISO);
                   if (resultsForDate.length === 0) return null;
                   return (
                     <div key={dateISO} className="grid grid-cols-[80px_1fr] hover:bg-gray-700/30 transition-colors group">
                        <div className="p-1 text-left text-xs font-medium text-gray-300 border-r border-gray-700/50 flex items-center pl-2 bg-gray-800/50 group-hover:bg-transparent">{formatDateHeader(dateISO)}</div>
                        <div className="grid" style={{ gridTemplateColumns: `repeat(${drawTimes.length}, 1fr)` }}>
                           {drawTimes.map(time => {
                              const result = resultsForDate.find(r => r && r.Time === time);
                              const { className, content } = getCellStyle(result); 
                              return ( <div key={time} onClick={() => handleCellClick(result)} className="p-1 flex items-center justify-center border-r border-gray-700/20 last:border-none relative"> <span className={className}>{content}</span> </div> );
                           })}
                        </div>
                     </div>
                   );
                })}
             </div>
           )}
        </div>
      </div>
      <div className="text-center mt-2 text-xs text-gray-500"> {filteredResults.length > MAX_ROWS_TO_DISPLAY ? '⚠️ Limited to last 100 results.' : 'End of List'} </div>
    </div>
  );
}

export default Dashboard;