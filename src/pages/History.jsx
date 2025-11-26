/* This is src/pages/History.jsx (Draw Auditor - Full Build Fix) */

import React, { useState, useEffect, useMemo } from 'react';
import { MARKS_LIST } from '../data/marks'; 

// --- FIX: Import necessary functions directly ---
import { app } from '../firebase'; 
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore'; 
// --- END FIX ---

const RESULTS_PER_PAGE = 50; // Show 50 results at a time

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


function History() {
  const [isLoading, setIsLoading] = useState(true);
  // NOTE: allResults is stored OLDEST-FIRST here to simplify sequential analysis
  const [allResults, setAllResults] = useState([]); 
  const [currentPage, setCurrentPage] = useState(1);
  
  const [filters, setFilters] = useState({
    search: '', time: 'All', line: 'All', suit: 'All', year: 'All', month: 'All',
  });

  const [uniqueValues, setUniqueValues] = useState({
    times: [], lines: [], suits: [], years: [], months: [],
  });

  // --- CORRELATION STATE ---
  const [markA, setMarkA] = useState(''); // Mark Number (e.g., 4)
  const [markB, setMarkB] = useState(''); // Mark Number (e.g., 14)
  const [proximity, setProximity] = useState(5); // Proximity (N draws)

  // 1. Fetch the data from FIREBASE
  useEffect(() => {
    const fetchData = async () => {
      try {
        const db = getFirestore(app);
        
        // Fetch all draws, ordered by DrawNo ASC (OLDEST FIRST) for correlation calculation
        const drawsCollectionRef = collection(db, 'draws');
        const q = query(drawsCollectionRef, orderBy('DrawNo', 'asc')); 
        
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Data is OLDEST-FIRST, perfect for sequential analysis
        setAllResults(data);

        // --- Calculate unique values for filters ---
        const newestFirstData = data.slice().reverse(); // Use reversed data for unique value finding
        const times = [...new Set(newestFirstData.map(item => item.Time))].sort();
        const lines = [...new Set(newestFirstData.map(item => item.Line))].sort(numericalSort);
        const suits = [...new Set(newestFirstData.map(item => String(item.Suit)))].sort(numericalSort);
        
        const dates = newestFirstData.map(item => item.Date);
        const years = [...new Set(dates.map(d => d.split('-')[0]))].sort().reverse();
        const months = [...new Set(dates.map(d => d.split('-')[1]))].sort();
        
        setUniqueValues({ times, lines, suits, years, months });
      } catch (error) {
        console.error("Firebase Fetch Error in History:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. Correlation Calculation Logic (Logic retained)
  const correlationData = useMemo(() => {
    const A = parseInt(markA);
    const B = parseInt(markB);
    const N = parseInt(proximity);

    if (isNaN(A) || isNaN(B) || A === B || isNaN(N) || N < 1 || allResults.length === 0) {
        return { count: 0, percentage: 0, totalA: 0 };
    }
    
    let hitCount = 0;
    let totalOccurrencesA = 0;

    // Use the full historical, chronologically sorted data (oldest first)
    for (let i = 0; i < allResults.length; i++) {
        const currentMark = allResults[i].Mark;
        
        if (currentMark === A) {
            totalOccurrencesA++;
            // Check the next N draws for Mark B
            for (let j = 1; j <= N; j++) {
                const checkIndex = i + j;
                if (checkIndex < allResults.length) {
                    const checkMark = allResults[checkIndex].Mark;
                    if (checkMark === B) {
                        hitCount++;
                        // Found the hit, break the inner loop and move to the next A
                        break; 
                    }
                }
            }
        }
    }

    const percentage = totalOccurrencesA > 0 
        ? ((hitCount / totalOccurrencesA) * 100).toFixed(2)
        : 0;

    return { 
        count: hitCount, 
        percentage: percentage, 
        totalA: totalOccurrencesA 
    };
  }, [allResults, markA, markB, proximity]);

  // 3. Memoized filtering (for the table)
  const filteredResults = useMemo(() => {
    const searchLower = filters.search.toLowerCase();
    // Use newestFirstData (reversed copy of allResults) for filtering
    const newestFirstData = allResults.slice().reverse(); 
    
    return newestFirstData.filter(result => {
      const matchesSearch = filters.search === '' ||
        result.Mark.toString().includes(searchLower) ||
        result.MarkName.toLowerCase().includes(searchLower);
      const matchesTime = filters.time === 'All' || result.Time === filters.time;
      const matchesLine = filters.line === 'All' || result.Line === filters.line;
      const matchesSuit = filters.suit === 'All' || result.Suit === filters.suit;
      const matchesYear = filters.year === 'All' || result.Date.startsWith(filters.year);
      const matchesMonth = filters.month === 'All' || result.Date.split('-')[1] === filters.month;

      return matchesSearch && matchesTime && matchesLine && matchesSuit && matchesYear && matchesMonth;
    });
  }, [allResults, filters]);

  // 4. Memoized pagination
  const totalPages = Math.ceil(filteredResults.length / RESULTS_PER_PAGE);

  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * RESULTS_PER_PAGE;
    const endIndex = startIndex + RESULTS_PER_PAGE;
    return filteredResults.slice(startIndex, endIndex);
  }, [filteredResults, currentPage]);
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1); // Reset to first page
  };

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const markNames = useMemo(() => {
      return MARKS_LIST.reduce((acc, curr) => {
          acc[curr.num] = curr.mark;
          return acc;
      }, {});
  }, []);


  // --- Render ---
  if (isLoading) {
    return <div className="p-10 text-center text-xl font-bold text-cyan-500 animate-pulse">Loading Draw History...</div>;
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-6">The Draw Auditor</h2>

      {/* --- Correlation Finder Panel --- */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-6 border-t-4 border-cyan-500">
        <h3 className="text-xl font-bold text-white mb-4">Mark Correlation Finder (The "Rakeman")</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          
          {/* Input A */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Mark A (Trigger)</label>
            <input
              type="number"
              value={markA}
              onChange={(e) => setMarkA(e.target.value)}
              placeholder="e.g., 4"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:border-cyan-500"
              min="1" max="36"
            />
          </div>

          {/* Input B */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Mark B (Follower)</label>
            <input
              type="number"
              value={markB}
              onChange={(e) => setMarkB(e.target.value)}
              placeholder="e.g., 14"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:border-cyan-500"
              min="1" max="36"
            />
          </div>

          {/* Proximity N */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Proximity (N draws)</label>
            <input
              type="number"
              value={proximity}
              onChange={(e) => setProximity(e.target.value)}
              placeholder="e.g., 5"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:border-cyan-500"
              min="1" max="50"
            />
          </div>

          {/* Correlation Result */}
          <div className="p-2 border border-cyan-600/50 rounded-lg text-center bg-cyan-900/20">
            {correlationData.totalA > 0 ? (
                <div className="text-white">
                    <div className="text-2xl font-black text-cyan-400">
                        {correlationData.count} Hits
                    </div>
                    <div className="text-xs text-gray-400">
                        ({correlationData.percentage}% probability)
                    </div>
                </div>
            ) : (
                <div className="text-gray-500">
                    <div className="text-lg font-bold">A → B</div>
                    <div className="text-xs">Enter Marks to calculate</div>
                </div>
            )}
          </div>
        </div>
        
        {/* Helper Text */}
        <p className="mt-4 text-xs text-gray-500">
            Calculates the historical probability that Mark **{markNames[markB] || 'B'}** ({markB || '?'}) plays within **{proximity}** draws after Mark **{markNames[markA] || 'A'}** ({markA || '?'}). Based on {correlationData.totalA.toLocaleString()} occurrences of Mark A.
        </p>
      </div>

      {/* --- Existing Filter Controls --- */}
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-6 grid grid-cols-1 md:grid-cols-6 gap-4">
        <input type="text" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Search mark..." className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white" />
        <select name="year" value={filters.year} onChange={handleFilterChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"> <option value="All">All Years</option> {uniqueValues.years.map(y => <option key={y} value={y}>{y}</option>)} </select>
        <select name="month" value={filters.month} onChange={handleFilterChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"> <option value="All">All Months</option> {uniqueValues.months.map(m => <option key={m} value={m}>{MONTH_NAMES[m] || m}</option>)} </select>
        <select name="time" value={filters.time} onChange={handleFilterChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"> <option value="All">All Times</option> {uniqueValues.times.map(t => <option key={t} value={t}>{t}</option>)} </select>
        <select name="line" value={filters.line} onChange={handleFilterChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"> <option value="All">All Lines</option> {uniqueValues.lines.map(l => <option key={l} value={l}>{l}</option>)} </select>
        <select name="suit" value={filters.suit} onChange={handleFilterChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"> <option value="All">All Suits</option> {uniqueValues.suits.map(s => <option key={s} value={s}>{s}</option>)} </select>
      </div>


      {/* --- Results Table --- */}
      <div className="overflow-x-auto bg-gray-800 rounded-lg shadow">
        <table className="w-full min-w-max text-gray-300">
          <thead>
            <tr className="bg-gray-700">
              <th className="p-3 text-left text-sm font-semibold">Date</th>
              <th className="p-3 text-left text-sm font-semibold">Time</th>
              <th className="p-3 text-center text-sm font-semibold">Draw</th>
              <th className="p-3 text-left text-sm font-semibold">Mark</th>
              <th className="p-3 text-left text-sm font-semibold">Line</th>
              <th className="p-3 text-left text-sm font-semibold">Suit</th>
            </tr>
          </thead>
          <tbody>
            {paginatedResults.map((draw) => (
              <tr key={draw.DrawNo} className="border-b border-gray-700 hover:bg-gray-700/50">
                <td className="p-3 text-sm">{draw.Date}</td>
                <td className="p-3 text-sm">{draw.Time}</td>
                <td className="p-3 text-center">
                  <span className="bg-cyan-600 text-white font-bold px-3 py-1 rounded-full text-xs">{draw.Mark}</span>
                </td>
                <td className="p-3 text-sm">{draw.MarkName}</td>
                <td className="p-3 text-sm">{draw.Line}</td>
                <td className="p-3 text-sm">{draw.Suit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- Pagination Controls --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mt-6 space-y-4 md:space-y-0 text-gray-400">
        <div className="flex space-x-2">
          <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="px-4 py-2 bg-gray-700 rounded-md hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"> First </button>
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="px-4 py-2 bg-gray-700 rounded-md hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"> Previous </button>
        </div>
        <span className="text-gray-400">
          Page {currentPage} of {totalPages} ({filteredResults.length.toLocaleString()} total filtered results)
        </span>
          <div className="flex space-x-2">
          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="px-4 py-2 bg-gray-700 rounded-md hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"> Next </button>
          <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="px-4 py-2 bg-gray-700 rounded-md hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"> Last </button>
        </div>
      </div>
    </div>
  );
}

export default History;