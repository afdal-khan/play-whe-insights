/* src/components/ObeahManCard.jsx (The Mystical Pick) */
import React from 'react';

// You can pass these as props or hardcode them for now
const ObeahManCard = ({ mark, markName, reason, drawTime }) => {
  return (
    <div className="relative overflow-hidden rounded-xl shadow-2xl border-2 border-purple-500/50 bg-gradient-to-br from-indigo-900 via-purple-900 to-black p-6 mb-8 transform hover:scale-[1.02] transition-transform duration-300">
      
      {/* Mystical Background Effect (Optional CSS glow) */}
      <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-purple-500 rounded-full blur-3xl opacity-20"></div>
      <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Left: The Persona */}
        <div className="text-center md:text-left">
          <h3 className="text-purple-300 font-bold tracking-widest uppercase text-xs mb-1">
            ✨ The Obeah Man Sees...
          </h3>
          <div className="text-white text-3xl font-black font-serif tracking-tight">
            {markName || "Hidden"}
          </div>
          <div className="text-purple-200/70 text-sm mt-1 italic">
            "{reason || "The spirits are silent..."}"
          </div>
        </div>

        {/* Center: The Mark */}
        <div className="flex-shrink-0">
          <div className="w-24 h-24 rounded-full border-4 border-purple-400/50 bg-black/50 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            <span className="text-5xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {mark || "?"}
            </span>
          </div>
        </div>

        {/* Right: The Call to Action */}
        <div className="text-center md:text-right">
          <div className="inline-block px-3 py-1 bg-purple-500/20 rounded-full border border-purple-500/50 text-purple-200 text-xs font-bold uppercase mb-2">
            Target: {drawTime || "Next Draw"}
          </div>
          <p className="text-gray-400 text-xs max-w-[150px]">
            High vibrations detected. Play with caution.
          </p>
        </div>

      </div>
    </div>
  );
};

export default ObeahManCard;