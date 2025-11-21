/* This is src/pages/DreamBook.jsx (Spirit Status Lookup) */

import React, { useState, useEffect, useMemo } from 'react';
import { MARKS_LIST } from '../data/marks'; 

function DreamBook() {
    const [isLoading, setIsLoading] = useState(true);
    const [allResults, setAllResults] = useState([]); // Stored NEWEST-FIRST
    const [search, setSearch] = useState('');

    // --- 1. Fetch Data ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`/play_whe_results.json?v=${new Date().getTime()}`);
                const data = await response.json(); 
                
                // Ensure data is NEWEST FIRST for easy "Last Seen" lookup
                const newestFirstData = data.slice().reverse(); 
                setAllResults(newestFirstData);

            } catch (error) {
                console.error("Failed to fetch results:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- 2. Calculate Stats for ALL Marks (Overdue/Last Seen) ---
    const marksWithStats = useMemo(() => {
        if (allResults.length === 0) return MARKS_LIST;
        
        return MARKS_LIST.map(mark => {
            const lastIndex = allResults.findIndex(r => r.Mark === mark.num);
            
            // Current Draw Index is 0, so the gap is just the index of the last play.
            const currentGap = lastIndex === -1 ? Infinity : lastIndex;
            const lastPlayedDraw = lastIndex === -1 ? null : allResults[lastIndex];

            return {
                ...mark,
                gap: currentGap,
                lastPlayed: lastPlayedDraw,
            };
        });
    }, [allResults]);


    // --- 3. Filter Marks for Display ---
    const filteredMarks = useMemo(() => {
        const searchTerm = search.toLowerCase();
        return marksWithStats.filter(item => {
            const mark = item.mark.toLowerCase();
            const num = item.num.toString();

            return mark.includes(searchTerm) || num.includes(searchTerm);
        }).sort((a, b) => a.num - b.num); // Always sort by number
    }, [search, marksWithStats]);


    // --- Helper function for coloring the Gap ---
    const getGapColor = (gap) => {
        if (gap === Infinity) return 'text-red-500';
        if (gap > 30) return 'text-yellow-500';
        if (gap < 5) return 'text-green-500';
        return 'text-white';
    };

    // --- Render ---
    if (isLoading) {
        return <div className="p-10 text-center text-xl font-bold text-cyan-500 animate-pulse">Consulting the Spirits...</div>;
    }

    return (
        <div>
            <h2 className="text-3xl font-bold text-white mb-6">Spirit Status Lookup</h2>
            
            {/* Search Bar */}
            <div className="mb-8">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by number or mark (e.g., 'Sick Woman', '15')..."
                    className="w-full max-w-lg p-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
            </div>

            {/* Grid of Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMarks.map(item => (
                    <div 
                        key={item.num} 
                        className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex flex-col justify-between h-full"
                    >
                        {/* Top: Mark and Name */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="text-sm font-medium text-gray-400">Mark #{item.num}</div>
                            <div className="text-xs font-bold text-cyan-400 bg-cyan-900/30 px-3 py-1 rounded-full">
                                Spirit
                            </div>
                        </div>

                        <div className="text-4xl font-black text-white mb-6 truncate">{item.mark}</div>

                        {/* Bottom: Live Status Data */}
                        <div className="space-y-3 pt-4 border-t border-gray-700/50">
                            
                            {/* Current Gap */}
                            <div>
                                <div className="text-xs text-gray-400">Current Overdue Gap:</div>
                                <div className={`text-xl font-bold ${getGapColor(item.gap)}`}>
                                    {item.gap === Infinity 
                                        ? 'NEVER PLAYED' 
                                        : `${item.gap} Draws`}
                                </div>
                            </div>
                            
                            {/* Last Played */}
                            <div>
                                <div className="text-xs text-gray-400">Last Seen:</div>
                                <div className="text-sm text-gray-300">
                                    {item.lastPlayed
                                        ? `${item.lastPlayed.Date} @ ${item.lastPlayed.Time}`
                                        : 'N/A'}
                                </div>
                            </div>

                        </div>
                    </div>
                ))}
            </div>
            
             {/* If No Results */}
            {filteredMarks.length === 0 && (
                 <div className="text-center text-gray-500 p-10">
                     No Mark matches "{search}".
                 </div>
             )}
        </div>
    );
}

export default DreamBook;