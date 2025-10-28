import React, { useState } from 'react';
// Import the data list from our new data file
import { MARKS_LIST } from '../data/marks';

function DreamBook() {
  const [search, setSearch] = useState('');

  // Filter the list based on the search term
  const filteredMarks = MARKS_LIST.filter(item => {
    const searchTerm = search.toLowerCase();
    const mark = item.mark.toLowerCase();
    const num = item.num.toString();

    return mark.includes(searchTerm) || num.includes(searchTerm);
  });

  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-6">Dream Book</h2>
      
      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by number or mark (e.g., 'Cat', '28')..."
          className="w-full max-w-lg p-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Grid of Marks */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredMarks.map(item => (
          <div 
            key={item.num} 
            className="bg-gray-800 p-4 rounded-lg shadow-lg text-center transition-transform transform hover:scale-105"
          >
            <div className="text-4xl font-bold text-cyan-400 mb-2">{item.num}</div>
            <div className="text-lg text-gray-200">{item.mark}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// THIS IS THE FIX!
// This line provides the "default export" that App.jsx is looking for.
export default DreamBook;

