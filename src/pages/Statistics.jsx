/* This is src/pages/Statistics.jsx (Refactored for "Stickiness" and Visual Impact) */

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MARKS_LIST } from '../data/marks';

// --- 1. Helper Functions & Constants ---

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

// Color helpers for the charts
const BAR_COLORS = ['#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa']; // Cyan to Purple gradient

// --- 2. Sub-Components ---

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

// B. The Refined Pressure Board
const PressureBoard = ({ gapData }) => {
  const [view, setView] = useState('marks'); // 'marks', 'lines', 'suits'
  const [showAll, setShowAll] = useState(false);

  let dataToShow = [];
  let label = "";

  if (view === 'marks') { dataToShow = gapData.marks; label = "Mark"; }
  else if (view === 'lines') { dataToShow = gapData.lines; label = "Line"; }
  else { dataToShow = gapData.suits; label = "Suit"; }

  // Only show Top 10 unless "Show All" is clicked
  const displayList = showAll ? dataToShow : dataToShow.slice(0, 10);

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header with Toggles */}
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

      {/* The List */}
      <div className="p-4 space-y-3">
        {displayList.map((item, index) => {
           // Calculate "Heat" (Visual only)
           const isTop3 = index < 3;
           const barColor = isTop3 ? 'bg-red-500' : 'bg-orange-500';
           
           return (
            <div key={item.name} className="flex items-center gap-3">
              <div className={`w-8 text-center font-bold text-sm ${isTop3 ? 'text-red-400' : 'text-gray-500'}`}>#{index + 1}</div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-white font-bold text-sm">{item.name}</span>
                  <span className="text-cyan-400 font-mono text-sm font-bold">{item.gap === Infinity ? 'NEVER' : item.gap} Draws</span>
                </div>
                <div className="w-full bg-gray-900 rounded-full h-2">
                  {/* Visual bar just to show relative pressure */}
                   <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${Math.min(100, (item.gap / (dataToShow[0]?.gap || 1)) * 100)}%` }}></div>
                </div>
              </div>
            </div>
           );
        })}
      </div>
      
      {/* Footer Toggle */}
      <button 
        onClick={() => setShowAll(!showAll)}
        className="w-full py-3 text-center text-sm text-gray-400 hover:text-white hover:bg-gray-700 border-t border-gray-700 transition-colors"
      >
        {showAll ? "Show Top 10 Only" : `Show All ${dataToShow.length} ${label}s`}
      </button>
    </div>
  );
};

// --- 3. Main Component ---

function Statistics() {
  const [isLoading, setIsLoading] = useState(true);
  const [allResults, setAllResults] = useState([]);
  const [filters, setFilters] = useState({ time: 'All', year: 'All', month: 'All' });
  const [uniqueValues, setUniqueValues] = useState({ times: [], lines: [], suits: [], years: [], months: [] });
  const [freqView, setFreqView] = useState('marks'); // For the Bar Chart

  // 1. Fetch Data
  useEffect(() => {
     const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/play_whe_results.json?v=${new Date().getTime()}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            const newestFirstData = data.slice().reverse();
            setAllResults(newestFirstData);

            const validResults = newestFirstData.filter(i => i.Time && i.Date);
            const times = [...new Set(validResults.map(i => i.Time))].sort((a, b) => { const o={'Morning':1,'Midday':2,'Afternoon':3,'Evening':4}; return (o[a]||99)-(o[b]||99); });
            const lines = [...new Set(validResults.map(i => i.Line))].sort(numericalSort);
            const suits = [...new Set(validResults.map(i => String(i.Suit)))].sort(numericalSort);
            const dates = validResults.map(i => i.Date);
            const years = [...new Set(dates.map(d => d.split('-')[0]))].sort().reverse();
            const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
            
            setUniqueValues({ times, lines, suits, years, months });
        } catch (err) { console.error(err); } 
        finally { setIsLoading(false); }
     };
     fetchData();
  }, []);

  // 2. Calculate GLOBAL Gaps (Pressure)
  const globalGapData = useMemo(() => {
    if (!allResults.length) return { marks: [], lines: [], suits: [] };
    
    const calcGap = (arr, compareFn) => {
       return arr.map(item => {
          const index = allResults.findIndex(r => compareFn(r, item));
          return { name: item.label || item, gap: index === -1 ? Infinity : index };
       }).sort((a, b) => b.gap - a.gap);
    };

    const markItems = MARKS_LIST.map(m => ({ label: `${m.num} - ${m.mark}`, val: m.num }));
    const lineItems = uniqueValues.lines;
    const suitItems = uniqueValues.suits.map(s => ({ label: `${s} Suit`, val: String(s) }));

    return {
      marks: calcGap(markItems, (r, i) => r.Mark === i.val),
      lines: calcGap(lineItems, (r, i) => r.Line === i),
      suits: calcGap(suitItems, (r, i) => String(r.Suit) === i.val)
    };
  }, [allResults, uniqueValues]);

  // 3. Calculate FREQUENCY (With Filters)
  const frequencyData = useMemo(() => {
     const filtered = allResults.filter(r => {
         if(!r.Date) return false;
         const y = filters.year === 'All' || r.Date.startsWith(filters.year);
         const m = filters.month === 'All' || r.Date.split('-')[1] === filters.month;
         const t = filters.time === 'All' || r.Time === filters.time;
         return y && m && t;
     }).slice(0, RECENT_DRAWS_LIMIT); // Limit to recent AFTER filtering

     const map = new Map();
     const initMap = (items, keyFn, nameFn) => items.forEach(i => map.set(keyFn(i), { name: nameFn(i), count: 0 }));

     if(freqView === 'marks') initMap(MARKS_LIST, m=>m.num, m=>String(m.num));
     else if(freqView === 'lines') initMap(uniqueValues.lines, l=>l, l=>l);
     else initMap(uniqueValues.suits, s=>String(s), s=>`${s} Suit`);

     filtered.forEach(r => {
        let key;
        if(freqView === 'marks') key = r.Mark;
        else if(freqView === 'lines') key = r.Line;
        else key = String(r.Suit);
        
        if(map.has(key)) map.get(key).count++;
     });

     return [...map.values()].sort((a,b) => b.count - a.count);
  }, [allResults, filters, freqView, uniqueValues]);

  // 4. "Hero" Data Helpers
  const topSleeper = globalGapData.marks[0];
  const topHot = frequencyData[0];
  const topLine = globalGapData.lines.length > 0 ? [...globalGapData.lines].sort((a,b) => a.gap - b.gap)[0] : null; // Shortest gap = playing most often recently (roughly)

  if (isLoading) return <div className="p-10 text-center text-xl font-bold text-cyan-500 animate-pulse">Analyzing Charts...</div>;

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
             main: topSleeper.name.split(' - ')[0], // Just the number
             sub: topSleeper.name.split(' - ')[1],  // The Name
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
        {/* 3. The Power Line */}
        <MarketWatchCard 
          title="Current Power Line" 
          colorClass="text-green-400"
          icon="⚡"
          data={topLine ? {
             main: topLine.name.replace('Line', ''),
             sub: 'Line',
             detail: `Last played ${topLine.gap} draws ago`
          } : null}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- LEFT COL: Pressure Board (Takes up 1 col) --- */}
        <div className="lg:col-span-1">
           <PressureBoard gapData={globalGapData} />
        </div>

        {/* --- RIGHT COL: Frequency Chart (Takes up 2 cols) --- */}
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
                 <BarChart data={frequencyData.slice(0, 15)} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} />
                    <YAxis stroke="#9ca3af" allowDecimals={false} fontSize={12} tickLine={false} />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} 
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {frequencyData.slice(0, 15).map((entry, index) => (
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