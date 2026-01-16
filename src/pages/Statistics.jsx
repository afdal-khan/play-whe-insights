import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';

const Statistics = () => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // VIEW STATE: Default is now 'marks'
  const [activeView, setActiveView] = useState('marks'); 
  const [selectedDay, setSelectedDay] = useState('All');

  // TIME MACHINE STATE
  const [historyOffset, setHistoryOffset] = useState(0); 

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('draws')
        .select('*')
        .order('id', { ascending: false }) 
        .limit(2000);

      if (error) throw error;

      const sortedData = data.sort((a, b) => b.id - a.id);

      const processed = sortedData.map(d => {
        const dateObj = new Date(d.Date);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
        return { ...d, dayName };
      });

      setRawData(processed);
    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- 1. THE MATRIX & PREDICTION ENGINE ---
  const matrixData = useMemo(() => {
    if (rawData.length === 0) return { history: [], currentGroups: {}, predictions: null };

    const replayDraws = [...rawData].reverse(); 
    let lastSeen = {};
    for (let i = 1; i <= 36; i++) lastSeen[i] = -1;

    const calculatedHistory = [];

    replayDraws.forEach((draw, index) => {
        let currentSnapshot = [];
        for (let m = 1; m <= 36; m++) {
            const lastIndex = lastSeen[m];
            const gap = lastIndex === -1 ? 9999 : index - lastIndex;
            currentSnapshot.push({ mark: m, gap: gap });
        }

        currentSnapshot.sort((a, b) => {
            if (b.gap !== a.gap) return b.gap - a.gap;
            return a.mark - b.mark;
        });

        const winnerIndex = currentSnapshot.findIndex(x => x.mark === draw.Mark);
        const row = Math.floor(winnerIndex / 9) + 1; 
        const col = (winnerIndex % 9) + 1;           

        calculatedHistory.push({
            ...draw,
            matrixRow: `R${row}`,
            matrixCol: `C${col}`,
            rankIndex: winnerIndex
        });

        lastSeen[draw.Mark] = index;
    });

    const historyNewestFirst = calculatedHistory.reverse();

    // Prediction Engine
    const visibleHistory = historyNewestFirst.slice(historyOffset);
    const lastDraw = visibleHistory[0]; 
    let predictions = null;

    if (lastDraw) {
        const triggerRow = lastDraw.matrixRow;
        const stats = { R1: 0, R2: 0, R3: 0, R4: 0, total: 0 };
        const colStats = {}; 

        for (let i = 1; i < visibleHistory.length - 1; i++) {
            const current = visibleHistory[i];
            if (current.matrixRow === triggerRow) {
                const result = visibleHistory[i - 1];
                if (stats[result.matrixRow] !== undefined) {
                    stats[result.matrixRow]++;
                    stats.total++;
                }
                if (!colStats[result.matrixCol]) colStats[result.matrixCol] = 0;
                colStats[result.matrixCol]++;
            }
        }

        const rowProbs = [
            { id: 'R1', val: stats.total ? Math.round((stats.R1 / stats.total) * 100) : 0, color: 'text-blue-500', bar: 'bg-blue-500' },
            { id: 'R2', val: stats.total ? Math.round((stats.R2 / stats.total) * 100) : 0, color: 'text-cyan-500', bar: 'bg-cyan-500' },
            { id: 'R3', val: stats.total ? Math.round((stats.R3 / stats.total) * 100) : 0, color: 'text-orange-500', bar: 'bg-orange-500' },
            { id: 'R4', val: stats.total ? Math.round((stats.R4 / stats.total) * 100) : 0, color: 'text-red-500', bar: 'bg-red-500' },
        ].sort((a,b) => b.val - a.val);

        const topCols = Object.keys(colStats)
            .map(k => ({ id: k, count: colStats[k] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        predictions = { 
            trigger: triggerRow, 
            sampleSize: stats.total, 
            rowProbs, 
            topCols 
        };
    }

    // Current Groups Display
    const currentTotalDraws = replayDraws.length - historyOffset;
    let finalSnapshot = [];
    let timeMachineLastSeen = {};
    for (let m = 1; m <= 36; m++) timeMachineLastSeen[m] = -1;
    
    for (let i = 0; i < visibleHistory.length; i++) {
        const d = visibleHistory[i];
        if (timeMachineLastSeen[d.Mark] === -1) {
            timeMachineLastSeen[d.Mark] = i; 
        }
    }
    
    for (let m = 1; m <= 36; m++) {
        const lastIndex = timeMachineLastSeen[m];
        const gap = lastIndex === -1 ? 999 : lastIndex;
        finalSnapshot.push({ mark: m, gap: gap });
    }
    
    finalSnapshot.sort((a, b) => {
        if (b.gap !== a.gap) return b.gap - a.gap;
        return a.mark - b.mark;
    });

    const groups = {
        R1: finalSnapshot.slice(0, 9),
        R2: finalSnapshot.slice(9, 18),
        R3: finalSnapshot.slice(18, 27),
        R4: finalSnapshot.slice(27, 36)
    };

    return { 
        history: visibleHistory, 
        currentGroups: groups,
        predictions
    };
  }, [rawData, historyOffset]);


  // --- 2. STANDARD CALCULATION ---
  const { list: activeList, highlights } = useMemo(() => {
    const simulatedHistory = rawData.slice(historyOffset);
    const history = selectedDay === 'All' ? simulatedHistory : simulatedHistory.filter(d => d.dayName === selectedDay);
    const totalDraws = history.length;
    const markGaps = {};
    const lineGaps = {}; const suitGaps = {}; const markMeta = {};
    history.forEach((draw, index) => {
        if (markGaps[draw.Mark] === undefined) { markGaps[draw.Mark] = index; markMeta[draw.Mark] = { name: draw.MarkName }; }
        if (draw.Line && lineGaps[draw.Line] === undefined) lineGaps[draw.Line] = index;
        if (draw.Suit && suitGaps[draw.Suit] === undefined) suitGaps[draw.Suit] = index;
    });
    const createList = (type) => {
        if(type==='marks') {
             for (let i = 1; i <= 36; i++) if (markGaps[i] === undefined) markGaps[i] = totalDraws;
             return Object.keys(markGaps).map(m=>({id:m, label:m, sub:markMeta[m]?.name, gap:markGaps[m]}));
        }
        if(type==='lines') return Object.keys(lineGaps).map(l=>({id:l, label:l, sub:'Line', gap:lineGaps[l]}));
        return Object.keys(suitGaps).map(s=>({id:s, label:s, sub:'Suit', gap:suitGaps[s]}));
    }
    const marks = createList('marks').sort((a, b) => b.gap - a.gap);
    const lines = createList('lines').sort((a, b) => b.gap - a.gap);
    const suits = createList('suits').sort((a, b) => b.gap - a.gap);
    let currentList = [];
    if (activeView === 'marks') currentList = marks;
    else if (activeView === 'lines') currentList = lines;
    else currentList = suits;
    return { list: currentList, highlights: { cold: marks[0], coldLine: lines[0] } };
  }, [rawData, selectedDay, activeView, historyOffset]);


  const RowGroupCard = ({ title, desc, data, color, accent }) => (
    <div className={`rounded-xl border ${color} p-4 relative overflow-hidden transition-all hover:scale-[1.02]`}>
        <div className={`absolute top-0 right-0 w-24 h-24 ${accent} opacity-10 rounded-full -mr-10 -mt-10 blur-xl`}></div>
        <div className="flex justify-between items-end mb-3 relative z-10">
            <div>
                <h3 className={`text-xl font-black ${accent.replace('bg-', 'text-')}`}>{title}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{desc}</p>
            </div>
            <div className="text-xs font-mono text-slate-500">9 Marks</div>
        </div>
        <div className="grid grid-cols-3 gap-2 relative z-10">
            {data.map((item, i) => (
                <div key={i} className="bg-slate-900/80 border border-slate-700 rounded p-1 flex flex-col items-center">
                    <span className="text-lg font-bold text-white">{item.mark}</span>
                    <span className="text-[8px] text-slate-500">{item.gap} ago</span>
                </div>
            ))}
        </div>
    </div>
  );

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 p-4 font-sans pb-20">
      <div className="max-w-6xl mx-auto">
        
        {/* TIME MACHINE WITH EXTREME BUTTONS */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl mb-6 sticky top-20 z-20 backdrop-blur-md shadow-2xl">
             <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center gap-2 w-full md:w-32 justify-between md:justify-start">
                    <span className="text-xl">⏱️</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 whitespace-nowrap">
                        {historyOffset === 0 ? 'Live' : `Back ${historyOffset}`}
                    </span>
                </div>
                
                {/* SLIDER CONTROLS */}
                <div className="flex-1 flex items-center gap-3 w-full">
                    <button 
                        onClick={() => setHistoryOffset(Math.min(historyOffset + 1, 100))}
                        className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xl font-bold hover:bg-slate-700 active:scale-95 transition-all"
                    >
                        +
                    </button>

                    <input 
                        type="range" min="0" max="100" value={historyOffset}
                        onChange={(e) => setHistoryOffset(parseInt(e.target.value))}
                        className="flex-1 h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />

                    <button 
                        onClick={() => setHistoryOffset(Math.max(historyOffset - 1, 0))}
                        className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xl font-bold hover:bg-slate-700 active:scale-95 transition-all"
                    >
                        -
                    </button>
                </div>
            </div>
        </div>

        {/* CONTROLS - MATRIX MOVED TO END */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6">
            <div className="bg-slate-900 p-1 rounded-lg flex w-full md:w-auto overflow-x-auto">
                {/* Changed Order: Marks first, Matrix last */}
                {['marks', 'lines', 'suits', 'matrix'].map(view => (
                    <button
                        key={view}
                        onClick={() => setActiveView(view)}
                        className={`flex-1 md:flex-none px-6 py-2 text-xs font-bold uppercase rounded-md transition-all ${
                            activeView === view ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-white'
                        }`}
                    >
                        {view}
                    </button>
                ))}
            </div>
             <div className="flex overflow-x-auto w-full md:w-auto gap-2 pb-1 custom-scrollbar">
                <button onClick={() => setSelectedDay('All')} className={`px-4 py-2 text-[10px] font-bold rounded border ${selectedDay === 'All' ? 'bg-white text-black' : 'border-slate-800'}`}>ALL</button>
                {daysOfWeek.map(day => (
                    <button key={day} onClick={() => setSelectedDay(day)} className={`px-4 py-2 text-[10px] font-bold rounded border ${selectedDay === day ? 'bg-blue-600 text-white' : 'border-slate-800 text-slate-500'}`}>
                        {day.toUpperCase().slice(0,3)}
                    </button>
                ))}
            </div>
        </div>

        {/* --- VIEW: MATRIX ANALYSIS --- */}
        {activeView === 'matrix' && !loading && matrixData.history.length > 0 && (
            <div className="animate-fade-in space-y-8">
                
                {matrixData.predictions && (
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-2xl">
                        <div className="flex flex-col md:flex-row gap-6">
                            
                            <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-700 pb-4 md:pb-0 md:pr-6">
                                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Last Draw State</h3>
                                <div className="text-4xl font-black text-white mb-2">{matrixData.predictions.trigger}</div>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Based on <strong className="text-white">{matrixData.predictions.sampleSize}</strong> similar situations in the past, here is how the market usually reacts next.
                                </p>
                            </div>

                            <div className="w-full md:w-1/3">
                                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Next Row Probability</h3>
                                <div className="space-y-3">
                                    {matrixData.predictions.rowProbs.map((p) => (
                                        <div key={p.id}>
                                            <div className="flex justify-between text-xs font-bold mb-1">
                                                <span className={p.color}>{p.id}</span>
                                                <span className="text-white">{p.val}%</span>
                                            </div>
                                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                <div className={`h-full ${p.bar}`} style={{ width: `${p.val}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="w-full md:w-1/3 md:pl-6 md:border-l border-slate-700">
                                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Top Next Columns</h3>
                                <div className="flex gap-3">
                                    {matrixData.predictions.topCols.map((col, i) => (
                                        <div key={i} className="flex-1 bg-slate-800 rounded p-2 text-center border border-slate-700">
                                            <div className="text-xs text-slate-400 font-mono mb-1">#{i+1}</div>
                                            <div className="text-lg font-black text-white">{col.id}</div>
                                            <div className="text-[9px] text-emerald-500 font-bold">{col.count} hits</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                <div>
                    <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">State History (Newest Left)</h2>
                    <div className="flex gap-1 overflow-x-auto pb-2 custom-scrollbar">
                        {matrixData.history.slice(historyOffset, historyOffset + 30).map((draw, i) => {
                            let color = "bg-slate-800 text-slate-500";
                            if (draw.matrixRow === 'R1') color = "bg-blue-900 text-blue-300 border-blue-700"; 
                            if (draw.matrixRow === 'R2') color = "bg-cyan-900 text-cyan-300 border-cyan-700"; 
                            if (draw.matrixRow === 'R3') color = "bg-orange-900 text-orange-300 border-orange-700"; 
                            if (draw.matrixRow === 'R4') color = "bg-red-900 text-red-300 border-red-700"; 

                            return (
                                <div key={i} className={`flex-shrink-0 w-8 h-12 rounded border flex flex-col items-center justify-center ${color} opacity-90`}>
                                    <span className="text-[8px] font-bold">{draw.matrixRow}</span>
                                    <span className="text-[10px] font-black">{draw.Mark}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div>
                     <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Target Groups (Based on Current State)</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <RowGroupCard 
                            title="Row 1" desc="Deep Freeze" 
                            data={matrixData.currentGroups.R1} 
                            color="border-blue-900/50 bg-blue-950/20" accent="bg-blue-500" 
                        />
                        <RowGroupCard 
                            title="Row 2" desc="Cold / Warm" 
                            data={matrixData.currentGroups.R2} 
                            color="border-cyan-900/50 bg-cyan-950/20" accent="bg-cyan-500" 
                        />
                        <RowGroupCard 
                            title="Row 3" desc="Warm / Recent" 
                            data={matrixData.currentGroups.R3} 
                            color="border-orange-900/50 bg-orange-950/20" accent="bg-orange-500" 
                        />
                        <RowGroupCard 
                            title="Row 4" desc="The Furnace" 
                            data={matrixData.currentGroups.R4} 
                            color="border-red-900/50 bg-red-950/20" accent="bg-red-500" 
                        />
                    </div>
                </div>
            </div>
        )}


        {/* --- VIEW: STANDARD GRID --- */}
        {activeView !== 'matrix' && !loading && (
             <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-9 gap-3">
                {activeList.map(item => (
                     <div key={item.id} className={`relative p-2 rounded-lg border ${item.gap > 35 ? 'border-red-500/40 text-red-500' : item.gap < 5 ? 'border-emerald-500/40 text-emerald-500' : 'border-slate-800 text-slate-500'} bg-slate-900/40 aspect-[4/3] flex flex-col justify-between`}>
                        <div className="text-[9px] font-bold uppercase truncate px-1">{item.sub}</div>
                        <div className="text-center text-4xl font-black tracking-tighter leading-none">{item.label.replace('Line', '').replace('Suit', '')}</div>
                        <div className="flex justify-center mt-1">
                            <div className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400">{item.gap} <span className="opacity-50">AGO</span></div>
                        </div>
                    </div>
                ))}
             </div>
        )}

      </div>
    </div>
  );
};

export default Statistics;