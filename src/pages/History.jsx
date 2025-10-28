/* This is src/pages/History.jsx (FINAL-FIXED Version) */

import React, { useState, useEffect, useMemo } from 'react';

const RESULTS_PER_PAGE = 50; // Show 50 results at a time

// --- THIS IS THE FIX for the Month Dropdown ---
// The helper object now has the full names you wanted.
const MONTH_NAMES = {
  '01': 'January',
  '02': 'February',
  '03': 'March',
  '04': 'April',
  '05': 'May',
  '06': 'June',
  '07': 'July',
  '08': 'August',
  '09': 'September',
  '10': 'October',
  '11': 'November',
  '12': 'December',
};
// --- END FIX ---

// This function sorts strings based on the first number it finds
const numericalSort = (a, b) => {
  try {
    const numA = parseInt(a.match(/^\d+/)[0], 10);
    const numB = parseInt(b.match(/^\d+/)[0], 10);
    return numA - numB;
  } catch (e) {
    return a.localeCompare(b);
  }
};

function History() {
  const [isLoading, setIsLoading] = useState(true);
  const [allResults, setAllResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [filters, setFilters] = useState({
    search: '', time: 'All', line: 'All', suit: 'All', year: 'All', month: 'All',
  });

  const [uniqueValues, setUniqueValues] = useState({
    times: [], lines: [], suits: [], years: [], months: [],
  });

  // 1. Fetch the data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // We add a cache-buster to the URL to force the browser
        // to download the new JSON file we just made.
        const response = await fetch(`/play_whe_results.json?v=${new Date().getTime()}`);
        const data = await response.json(); // Data is sequential (oldest-first)
        
        // We reverse the array here, so the app's state
        // is newest-first, which is better for users.
        const newestFirstData = data.reverse();
        setAllResults(newestFirstData);

        // --- Calculate unique values for filters ---
        const times = [...new Set(newestFirstData.map(item => item.Time))].sort();
        const lines = [...new Set(newestFirstData.map(item => item.Line))].sort(numericalSort);
        const suits = [...new Set(newestFirstData.map(item => item.Suit))].sort(numericalSort);
        
        const dates = newestFirstData.map(item => item.Date);
        const years = [...new Set(dates.map(d => d.split('-')[0]))].sort().reverse();
        const months = [...new Set(dates.map(d => d.split('-')[1]))].sort();
        
        setUniqueValues({ times, lines, suits, years, months });
      } catch (error) {
        console.error("Failed to fetch results:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2. Memoized filtering
  const filteredResults = useMemo(() => {
    const searchLower = filters.search.toLowerCase();
    return allResults.filter(result => {
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

  // 3. Memoized pagination
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

  // --- Render ---
  if (isLoading) {
    return <div className="text-center text-2xl font-bold p-10">Loading all 24,000 results...</div>;
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-6">Draw History</h2>

      {/* --- Filter Controls --- */}
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-6 grid grid-cols-1 md:grid-cols-6 gap-4">
        {/* Search Filter */}
        <input
          type="text"
          name="search"
          value={filters.search}
          onChange={handleFilterChange}
          placeholder="Search by number or mark..."
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
        />
        
        {/* Year Filter */}
        <select name="year" value={filters.year} onChange={handleFilterChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white">
          <option value="All">All Years</option>
          {uniqueValues.years.map(year => <option key={year} value={year}>{year}</option>)}
        </select>
        
        {/* Month Filter (NOW FIXED) */}
        <select name="month" value={filters.month} onChange={handleFilterChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white">
          <option value="All">All Months</option>
          {uniqueValues.months.map(month => <option key={month} value={month}>{MONTH_NAMES[month] || month}</option>)}
        </select>
        
        {/* Time Filter */}
        <select name="time" value={filters.time} onChange={handleFilterChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white">
          <option value="All">All Times</option>
          {uniqueValues.times.map(time => <option key={time} value={time}>{time}</option>)}
        </select>
        
        {/* Line Filter */}
        <select name="line" value={filters.line} onChange={handleFilterChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white">
          <option value="All">All Lines</option>
          {uniqueValues.lines.map(line => <option key={line} value={line}>{line}</option>)}
        </select>
        
        {/* Suit Filter */}
        <select name="suit" value={filters.suit} onChange={handleFilterChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white">
          <option value="All">All Suits</option>
          {uniqueValues.suits.map(suit => <option key={suit} value={suit}>{suit}</option>)}
        </select>
      </div>

      {/* --- Results Table --- */}
      <div className="overflow-x-auto bg-gray-800 rounded-lg shadow">
        <table className="w-full min-w-max">
          <thead>
            <tr className="bg-gray-700">
              <th className="p-3 text-left text-sm font-semibold">Date</th>
              <th className="p-3 text-left text-sm font-semibold">Time</th>
              <th className="p-3 text-center text-sm font-semibold">Number</th>
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
      <div className="flex flex-col md:flex-row justify-between items-center mt-6 space-y-4 md:space-y-0">
        <div className="flex space-x-2">
           <button
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-700 rounded-md hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            First
          </button>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-700 rounded-md hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
        </div>
        <span className="text-gray-400">
          Page {currentPage} of {totalPages} ({filteredResults.length.toLocaleString()} total results)
        </span>
         <div className="flex space-x-2">
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-700 rounded-md hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
           <button
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-700 rounded-md hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}

export default History;