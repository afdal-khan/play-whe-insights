/* This is src/pages/BetPlanner.jsx (The "10-Win Roadmap" Strategy) */

import React, { useState, useMemo } from 'react';
import { MARKS_LIST } from '../data/marks'; 

// --- Configuration ---
const CURRENCY_SYMBOL = '$'; 
const NLCB_RATIO = 26;
const CHINESE_RATIO = 35;
const TAX_THRESHOLD = 1000;
const TAX_RATE = 0.10;

function BetPlanner() {
    // --- Global State ---
    const [activeTab, setActiveTab] = useState('roadmap'); // Default to the new Roadmap
    const [gameType, setGameType] = useState('Chinese'); 

    // --- SLIP STATE ---
    const [slipInput, setSlipInput] = useState('5 20\n10 5\n1 5');
    const [drawDuration, setDrawDuration] = useState('1'); 

    // --- ROADMAP STATE ---
    const [targetProfit, setTargetProfit] = useState('2000');
    const [marksCount, setMarksCount] = useState('1'); 
    const [winsTarget, setWinsTarget] = useState('10'); // Aiming for 10 wins in the cycle

    // ==================================================================================
    // LOGIC 1: SLIP PARSER (Standard)
    // ==================================================================================
    const slipData = useMemo(() => {
        const lines = slipInput.split('\n');
        const parsedRows = [];
        let totalBetCost = 0;

        lines.forEach(line => {
            const cleanLine = line.replace('$', '').trim();
            if (!cleanLine) return;
            const parts = cleanLine.split(/[\s,]+/);
            if (parts.length >= 2) {
                const mark = parseInt(parts[0], 10);
                const amount = parseFloat(parts[1]);
                if (!isNaN(mark) && !isNaN(amount) && mark >= 1 && mark <= 36) {
                    parsedRows.push({ mark, amount });
                    totalBetCost += amount;
                }
            }
        });

        const ratio = gameType === 'NLCB' ? NLCB_RATIO : CHINESE_RATIO;
        const duration = parseInt(drawDuration) || 1;
        const totalInvestment = totalBetCost * duration;

        const scenarios = parsedRows.map(row => {
            const rawWin = row.amount * ratio;
            let tax = 0;
            if (gameType === 'NLCB' && rawWin > TAX_THRESHOLD) {
                tax = rawWin * TAX_RATE;
            }
            const netWin = rawWin - tax;
            const singleDrawProfit = netWin - totalBetCost;
            const markInfo = MARKS_LIST.find(m => m.num === row.mark);

            return {
                ...row,
                name: markInfo ? markInfo.mark : 'Unknown',
                netWin,
                singleDrawProfit,
                isTaxed: tax > 0
            };
        });

        return { rows: scenarios, totalCost: totalBetCost, totalInvestment, duration };
    }, [slipInput, gameType, drawDuration]);


    // ==================================================================================
    // LOGIC 2: THE 10-WIN ROADMAP
    // ==================================================================================
    const roadmapSchedule = useMemo(() => {
        const target = parseFloat(targetProfit);
        const count = parseInt(marksCount); 
        const winsNeeded = parseInt(winsTarget) || 10;
        
        if (isNaN(target) || target <= 0 || isNaN(count) || count < 1) return [];

        const ratio = gameType === 'NLCB' ? NLCB_RATIO : CHINESE_RATIO;
        
        // Strategy: Divide the target profit by the number of wins we expect.
        // We want to make $2000 total profit over 10 wins.
        // That means each WIN needs to contribute roughly $200 to the profit pot,
        // PLUS recover any losses from non-winning draws.
        
        const profitPerWin = target / winsNeeded;
        
        let plan = [];
        let totalSpent = 0;
        let totalWins = 0;
        let accumulatedProfit = 0;
        
        // We simulate a "worst case" distribution where wins are spaced out
        // to calculate the bet sizing needed to maintain the trajectory.
        // BUT for the roadmap, we show a static plan: "On Draw X, Bet Y".
        
        const DRAWS_IN_WEEK = 24; 

        for (let i = 1; i <= DRAWS_IN_WEEK; i++) {
            
            // Formula: We need this bet to potentially be a winning one.
            // If it wins, it must cover (TotalSpent) + (ProfitPerWin * (WinsSoFar + 1)).
            // Bet * (Ratio - Count) >= TotalSpent + (ProfitPerWin)
            
            // Note: This creates a "Recovery" style ramp. If you lose draw 1, draw 2 bet is higher.
            
            const divisor = ratio - count;
            if (divisor <= 0) break; 

            // We calculate bet based on the idea: "If I win THIS draw, I want to bank my chunk of profit."
            let requiredBetPerMark = Math.ceil((totalSpent + profitPerWin) / divisor);
            
            if (requiredBetPerMark < 1) requiredBetPerMark = 1;

            const drawCost = requiredBetPerMark * count;
            totalSpent += drawCost;
            
            // Potential Outcome
            const rawWin = requiredBetPerMark * ratio;
            let tax = 0;
            if (gameType === 'NLCB' && rawWin > TAX_THRESHOLD) {
                tax = rawWin * TAX_RATE;
            }
            const netWin = rawWin - tax;
            const netProfit = netWin - totalSpent;

            plan.push({
                draw: i,
                betPerMark: requiredBetPerMark,
                drawCost: drawCost,
                totalSpent: totalSpent,
                profitIfWin: netProfit, // This shows the "Banked" amount if this draw hits
                isTaxed: tax > 0
            });
        }
        return plan;
    }, [targetProfit, gameType, marksCount, winsTarget]);

    // Calculate totals for summary
    const maxInvestment = roadmapSchedule.length > 0 ? roadmapSchedule[roadmapSchedule.length - 1].totalSpent : 0;


    return (
        <div className="pb-20">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white">Bet Manager</h2>
                
                <div className="bg-gray-800 p-1 rounded-lg flex shadow-lg border border-gray-700 mt-4 md:mt-0">
                    <button onClick={() => setGameType('NLCB')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${gameType === 'NLCB' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                        NLCB (26:1)
                    </button>
                    <button onClick={() => setGameType('Chinese')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${gameType === 'Chinese' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}>
                        Chinese (35:1)
                    </button>
                </div>
            </div>

            <div className="flex border-b border-gray-700 mb-6">
                <button onClick={() => setActiveTab('slip')} className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider border-b-4 transition-all ${activeTab === 'slip' ? 'border-cyan-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>📝 Check My Slip</button>
                <button onClick={() => setActiveTab('roadmap')} className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider border-b-4 transition-all ${activeTab === 'roadmap' ? 'border-purple-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>🗺️ The {winsTarget}-Win Roadmap</button>
            </div>

            {/* TAB 1: SLIP (Same logic) */}
            {activeTab === 'slip' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-gray-800 p-6 rounded-xl shadow-lg border-t-4 border-cyan-500 flex flex-col h-full">
                        <h3 className="text-xl font-bold text-white mb-2">Write Your Slip</h3>
                        <p className="text-xs text-gray-400 mb-4">Format: <b>Mark</b> space <b>$$$</b> (One per line)</p>
                        <textarea value={slipInput} onChange={(e) => setSlipInput(e.target.value)} className="w-full h-64 p-4 bg-gray-900 border-2 border-gray-700 rounded-xl text-white font-mono text-lg focus:border-cyan-500 outline-none resize-none leading-loose mb-4" />
                        <div className="bg-gray-900 p-3 rounded-lg border border-gray-700 flex items-center justify-between">
                            <span className="text-sm text-gray-400">Play this for:</span>
                            <div className="flex items-center gap-2">
                                <input type="number" value={drawDuration} onChange={(e) => setDrawDuration(e.target.value)} className="w-16 bg-gray-800 text-white text-center font-bold p-1 rounded border border-gray-600 focus:border-cyan-500 outline-none" min="1" max="100" />
                                <span className="text-sm text-white font-bold">Draws</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-800 rounded-xl shadow-lg border-t-4 border-cyan-500 flex flex-col h-full">
                        <div className="p-6 border-b border-gray-700 bg-gray-900/50">
                            <div className="flex justify-between items-end mb-2"><span className="text-gray-400 text-sm">Cost Per Draw</span><span className="text-2xl font-bold text-white">{CURRENCY_SYMBOL}{slipData.totalCost}</span></div>
                            {slipData.duration > 1 && (<div className="flex justify-between items-end pt-2 border-t border-gray-700/50"><span className="text-cyan-400 text-sm font-bold">Total Investment ({slipData.duration} draws)</span><span className="text-3xl font-black text-cyan-400">{CURRENCY_SYMBOL}{slipData.totalInvestment.toLocaleString()}</span></div>)}
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar p-0">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-900 text-gray-500 text-[10px] uppercase sticky top-0 z-10"><tr><th className="p-3">If Mark Plays...</th><th className="p-3 text-right">You Collect</th><th className="p-3 text-right">Profit</th></tr></thead>
                                <tbody className="text-sm divide-y divide-gray-700/50">
                                    {slipData.rows.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-gray-700/30">
                                            <td className="p-3"><span className="font-bold text-cyan-400 text-lg mr-2">{row.mark}</span><span className="text-gray-400 text-xs">(${row.amount})</span></td>
                                            <td className="p-3 text-right font-bold text-white">${row.netWin.toFixed(0)}</td>
                                            <td className="p-3 text-right"><span className={`font-bold ${row.singleDrawProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>{row.singleDrawProfit > 0 ? '+' : ''}${row.singleDrawProfit.toFixed(0)}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================= TAB 2: THE 10-WIN ROADMAP ======================= */}
            {activeTab === 'roadmap' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                    
                    {/* CONTROLS */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-6 rounded-xl shadow-lg border-t-4 border-purple-500">
                            <h3 className="text-xl font-bold text-white mb-2">Build My Roadmap</h3>
                            <p className="text-xs text-gray-400 mb-4">
                                Don't chase one win. Chase a salary. 
                                <br/>We design a plan to hit your target by winning just a few times a week.
                            </p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-green-400 mb-1">Target Profit ($):</label>
                                    <input
                                        type="number"
                                        value={targetProfit}
                                        onChange={(e) => setTargetProfit(e.target.value)}
                                        className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-green-500 outline-none text-xl font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-purple-400 mb-1">Target Wins (out of 24):</label>
                                    <select 
                                        value={winsTarget} 
                                        onChange={(e) => setWinsTarget(e.target.value)}
                                        className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 outline-none"
                                    >
                                        <option value="5">5 Wins (Hard)</option>
                                        <option value="10">10 Wins (Medium)</option>
                                        <option value="15">15 Wins (Easy)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-1">Playing how many marks?</label>
                                    <input
                                        type="number"
                                        value={marksCount}
                                        onChange={(e) => setMarksCount(e.target.value)}
                                        min="1" max="10"
                                        className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-gray-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700 text-center">
                                <div className="text-xs text-gray-500 font-bold uppercase mb-1">Max Capital Required</div>
                                <div className="text-3xl font-black text-white">${maxInvestment.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    {/* ROADMAP TABLE */}
                    <div className="lg:col-span-2">
                        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden flex flex-col h-[600px]">
                            <div className="p-4 bg-gray-900 border-b border-gray-700">
                                <h3 className="font-bold text-white">Your Weekly Roadmap</h3>
                                <p className="text-xs text-gray-400 mt-1">
                                    If you win on <b>Draw #X</b>, you profit exactly what you need to stay on track.
                                </p>
                            </div>
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-900 text-gray-500 text-[10px] uppercase sticky top-0 z-10">
                                        <tr>
                                            <th className="p-3">Draw</th>
                                            <th className="p-3 text-yellow-400">Bet Per Mark</th>
                                            <th className="p-3">Total Spent</th>
                                            <th className="p-3 text-right text-green-400">If You Win</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y divide-gray-700/50">
                                        {roadmapSchedule.map((row) => (
                                            <tr key={row.draw} className="hover:bg-gray-700/30 transition-colors">
                                                <td className="p-3 text-gray-400">#{row.draw}</td>
                                                <td className="p-3 font-bold text-white">
                                                    ${row.betPerMark}
                                                </td>
                                                <td className="p-3 text-gray-500">${row.totalSpent}</td>
                                                <td className="p-3 text-right font-bold text-green-400">
                                                    +${row.profitIfWin.toFixed(0)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}

export default BetPlanner;