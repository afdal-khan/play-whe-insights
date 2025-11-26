/* This is src/pages/DreamBook.jsx (Replaced Time Bias with Current Momentum) */

import React, { useState, useEffect, useMemo } from 'react';
import { MARKS_LIST } from '../data/marks'; 

// --- Configuration ---
const RECENT_DRAWS_CHECK = 10; // We will check the last 10 draws for momentum

function DreamBook() {
    const [isLoading, setIsLoading] = useState(true);
    const [allResults, setAllResults] = useState([]); // Stored NEWEST-FIRST
    const [search, setSearch] = useState('');

    // --- 1. Fetch Data (Logic retained) ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`/play_whe_results.json?v=${new Date().getTime()}`);
                const data = await response.json(); 
                
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

    // --- 2. Calculate Stats for ALL Marks (Gap and NEW Momentum) ---
    const marksWithStats = useMemo(() => {
        if (allResults.length === 0) return MARKS_LIST;
        
        const lastDrawNo = allResults[0]?.DrawNo || 0;
        const recentDraws = allResults.slice(0, RECENT_DRAWS_CHECK); // The pool for momentum

        return MARKS_LIST.map(mark => {
            const lastIndex = allResults.findIndex(r => r.Mark === mark.num);
            
            const currentGap = lastIndex === -1 
                ? Infinity 
                : lastDrawNo - allResults[lastIndex].DrawNo;

            const lastPlayedDraw = lastIndex === -1 ? null : allResults[lastIndex];

            // --- NEW: Current Momentum Calculation ---
            const lastTenDrawsCount = recentDraws.filter(r => r.Mark === mark.num).length;
            
            let momentumStatus = { name: 'Neutral', color: 'text-gray-400', count: lastTenDrawsCount };
            
            if (lastTenDrawsCount >= 3) {
                momentumStatus = { name: 'HOT STREAK!', color: 'text-red-400', count: lastTenDrawsCount };
            } else if (lastTenDrawsCount >= 1) {
                momentumStatus = { name: 'Warming Up', color: 'text-yellow-400', count: lastTenDrawsCount };
            }
            // --- END Current Momentum Calculation ---


            return {
                ...mark,
                gap: currentGap,
                lastPlayed: lastPlayedDraw,
                momentumStatus: momentumStatus, // New Metric
            };
        });
    }, [allResults]);


    // --- 3. Filter Marks for Display (Logic retained) ---
    const filteredMarks = useMemo(() => {
        const searchTerm = search.toLowerCase();
        return marksWithStats.filter(item => {
            const mark = item.mark.toLowerCase();
            const num = item.num.toString();

            return mark.includes(searchTerm) || num.includes(searchTerm);
        }).sort((a, b) => a.num - b.num); 
    }, [search, marksWithStats]);


    // --- Helper function for coloring the Gap (Logic retained) ---
    const getGapColor = (gap) => {
        if (gap === Infinity) return 'text-red-400';
        if (gap > 50) return 'text-red-400'; 
        if (gap > 20) return 'text-yellow-400'; 
        if (gap < 5) return 'text-green-400'; 
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
                        className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex flex-col justify-between h-full hover:border-cyan-500 transition-all"
                    >
                        {/* 1. IMAGE & NUMBER BLOCK */}
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700/50">
                            {/* Mark Name & Number */}
                            <div>
                                <div className="text-sm font-medium text-gray-400">Mark #{item.num}</div>
                                <div className="text-3xl font-black text-cyan-400 truncate">{item.mark}</div>
                            </div>
                            
                            {/* Image Placeholder */}
                            <div className="w-16 h-16 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                                <img 
                                    src={`/marks/${item.num}.png`} 
                                    alt={item.mark}
                                    className="object-cover w-full h-full p-1"
                                    onError={(e) => { e.target.onerror = null; e.target.src = '/marks/default.png' }} 
                                />
                            </div>
                        </div>

                        {/* 2. LIVE STATUS DATA */}
                        <div className="space-y-3">
                            
                            {/* Current Momentum (New Metric) */}
                            <div>
                                <div className="text-xs text-gray-400">Current Momentum ({RECENT_DRAWS_CHECK} Draws):</div>
                                <div className={`text-lg font-bold ${item.momentumStatus.color}`}>
                                    {item.momentumStatus.name} ({item.momentumStatus.count} Plays)
                                </div>
                            </div>

                            {/* Current Gap */}
                            <div>
                                <div className="text-xs text-gray-400">Current Gap:</div>
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