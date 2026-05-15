'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white gap-6 px-4">

      {/* Title banner */}
      <div className="rounded-2xl border-2 border-cyan-400 px-24 py-8 text-7xl sm:text-[6rem] font-extrabold tracking-widest text-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.6),inset_0_0_20px_rgba(34,211,238,0.5)] [text-shadow:0_0_15px_#22d3ee,0_0_30px_#06b6d4]">
        Th3 Scheduler
      </div>

      {/* Subtitle */}
      <p className="text-sm text-slate-300 text-center max-w-xs">
        Manage jobs, customers, and appointments from phone or computer.
      </p>

      {/* SVG Clock button */}
      <Link
        href="/login"
        className="group mt-2 flex flex-col items-center gap-3 transition duration-300 hover:scale-110"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          className="h-24 w-24 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] group-hover:drop-shadow-[0_0_25px_rgba(34,211,238,1)] transition-all duration-300"
        >
          {/* Clock face */}
          <circle cx="50" cy="50" r="44" fill="black" stroke="#22d3ee" strokeWidth="4" />
          {/* Hour markers */}
          {[0,30,60,90,120,150,180,210,240,270,300,330].map((angle, i) => {
            const rad = (angle - 90) * (Math.PI / 180);
            const inner = i % 3 === 0 ? 34 : 38;
            const outer = 42;
            return (
              <line
                key={angle}
                x1={50 + inner * Math.cos(rad)}
                y1={50 + inner * Math.sin(rad)}
                x2={50 + outer * Math.cos(rad)}
                y2={50 + outer * Math.sin(rad)}
                stroke="#22d3ee"
                strokeWidth={i % 3 === 0 ? 2.5 : 1.5}
                strokeLinecap="round"
              />
            );
          })}
          {/* Hour hand pointing to ~10 */}
          <line x1="50" y1="50" x2="28" y2="28" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" />
          {/* Minute hand pointing to ~12 */}
          <line x1="50" y1="50" x2="50" y2="16" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
          {/* Center dot */}
          <circle cx="50" cy="50" r="4" fill="#22d3ee" />
        </svg>

        <p className="text-xs text-cyan-400 group-hover:text-cyan-300 transition-colors group-hover:[text-shadow:0_0_10px_#22d3ee]">
          Tap the clock to log in
        </p>
      </Link>

    </main>
  );
}