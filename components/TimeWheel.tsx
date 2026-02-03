
import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';

interface YearData {
  age: number;
  year: number;
  dateStr: string;
}

interface DecadeData {
  idx: number;
  name: string;
  range: [number, number];
  stem: string;
  branch: string;
  years: YearData[];
}

interface TimeWheelProps {
  decades: DecadeData[];
  selectedIdx: number | null;
  onSelectDecade: (idx: number) => void;
  targetYear: string;
  onSelectYear: (dateStr: string) => void;
}

const PalaceLabel: React.FC<{
  name: string;
  range: string;
  angle: number; 
  isActive: boolean;
}> = ({ name, range, angle, isActive }) => {
  const nameR = 41.5;
  const rangeR = 32.5;
  const nx = 50 + nameR * Math.cos((Math.PI * angle) / 180);
  const ny = 50 + nameR * Math.sin((Math.PI * angle) / 180);
  const rx = 50 + rangeR * Math.cos((Math.PI * angle) / 180);
  const ry = 50 + rangeR * Math.sin((Math.PI * angle) / 180);
  const rotation = angle + 90;

  return (
    <g className="pointer-events-none select-none">
      <text
        x={nx}
        y={ny}
        fontSize="3.8"
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(${rotation}, ${nx}, ${ny})`}
        className={`font-black transition-all duration-300 ${isActive ? 'fill-white' : 'fill-slate-700'}`}
      >
        {name}
      </text>
      <text
        x={rx}
        y={ry}
        fontSize="2.4"
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(${rotation}, ${rx}, ${ry})`}
        className={`font-mono transition-all duration-300 ${isActive ? 'fill-sky-100' : 'fill-slate-400'}`}
      >
        {range}
      </text>
    </g>
  );
};

const TimeWheel: React.FC<TimeWheelProps> = ({ decades, selectedIdx, onSelectDecade, targetYear, onSelectYear }) => {
  const [localActiveIdx, setLocalActiveIdx] = useState<number | null>(null);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const currentYear = new Date(targetYear).getFullYear();

  const decadeMap = useMemo(() => {
    const map: Record<number, DecadeData> = {};
    decades.forEach(d => { map[d.idx] = d; });
    return map;
  }, [decades]);

  const getAngle = (branchIdx: number) => (branchIdx - 9) * 30;

  const activeDecade = useMemo(() => {
    const idx = localActiveIdx !== null ? localActiveIdx : selectedIdx;
    return decades.find(d => d.idx === idx);
  }, [decades, selectedIdx, localActiveIdx]);

  const innerR = 26;
  const outerR = 49;

  const handleSegmentClick = (idx: number) => {
    setLocalActiveIdx(idx);
    onSelectDecade(idx);
    setShowYearPicker(true);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-visible">
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl overflow-visible">
        <defs>
          <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#312e81" />
          </linearGradient>
          <filter id="activeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {Array.from({ length: 12 }).map((_, i) => {
          const d = decadeMap[i];
          if (!d) return null;

          const midAngle = getAngle(i);
          const startAngle = midAngle - 14.8;
          const endAngle = midAngle + 14.8;
          const isActive = (localActiveIdx !== null ? localActiveIdx === i : selectedIdx === i);

          const x1 = 50 + outerR * Math.cos((Math.PI * startAngle) / 180);
          const y1 = 50 + outerR * Math.sin((Math.PI * startAngle) / 180);
          const x2 = 50 + outerR * Math.cos((Math.PI * endAngle) / 180);
          const y2 = 50 + outerR * Math.sin((Math.PI * endAngle) / 180);
          const x3 = 50 + innerR * Math.cos((Math.PI * endAngle) / 180);
          const y3 = 50 + innerR * Math.sin((Math.PI * endAngle) / 180);
          const x4 = 50 + innerR * Math.cos((Math.PI * startAngle) / 180);
          const y4 = 50 + innerR * Math.sin((Math.PI * startAngle) / 180);

          const path = `M ${x1} ${y1} A ${outerR} ${outerR} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 0 0 ${x4} ${y4} Z`;

          return (
            <g 
              key={i} 
              onClick={() => handleSegmentClick(i)} 
              className="cursor-pointer group outline-none"
            >
              <path
                d={path}
                fill={isActive ? 'url(#activeGrad)' : '#ffffff'}
                stroke={isActive ? '#60a5fa' : '#e2e8f0'}
                strokeWidth={isActive ? '0.6' : '0.15'}
                filter={isActive ? 'url(#activeGlow)' : ''}
                className="transition-all duration-500 hover:fill-slate-50"
              />
              <PalaceLabel 
                name={d.name} 
                range={`${d.range[0]}-${d.range[1]}`} 
                angle={midAngle} 
                isActive={isActive} 
              />
            </g>
          );
        })}

        <g className="animate-spin-slow-reverse" style={{ transformOrigin: 'center', transformBox: 'fill-box' }}>
          <circle cx="50" cy="50" r="14" fill="#000000" stroke="#cbd5e1" strokeWidth="0.5" />
          <path d="M 50 36 A 14 14 0 0 1 50 64 Z" fill="#ffffff" />
          <circle cx="50" cy="43" r="7" fill="#ffffff" />
          <circle cx="50" cy="57" r="7" fill="#000000" />
          <circle cx="50" cy="43" r="2.5" fill="#000000" />
          <circle cx="50" cy="57" r="2.5" fill="#ffffff" />
        </g>
      </svg>

      {showYearPicker && activeDecade && (
        <div className="absolute inset-0 z-[120] flex items-center justify-center animate-in zoom-in duration-300">
          <div className="absolute -inset-10 bg-slate-900/60 backdrop-blur-sm rounded-[3rem]" onClick={() => setShowYearPicker(false)}></div>
          <div className="relative z-10 w-[95%] max-w-[200px] md:max-w-[240px] p-4 md:p-5 bg-white rounded-[2rem] shadow-2xl border border-white flex flex-col items-center">
             <button onClick={() => setShowYearPicker(false)} className="absolute top-2 right-2 md:top-3 md:right-3 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-all"><X className="w-4 h-4"/></button>
             
             <div className="text-center mb-3 md:mb-4">
               <span className="text-[8px] md:text-[10px] text-slate-400 font-bold tracking-widest uppercase block mb-0.5">大运流年</span>
               <h3 className="text-indigo-950 font-black text-sm md:text-base flex items-center justify-center gap-1.5">
                  <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-lg">{activeDecade.name}</span>
               </h3>
               <p className="text-[9px] md:text-[10px] text-slate-500 mt-0.5 font-mono">{activeDecade.range[0]}-{activeDecade.range[1]}岁</p>
             </div>

             <div className="grid grid-cols-2 gap-2 md:gap-2.5 w-full max-h-[140px] md:max-h-[180px] overflow-y-auto no-scrollbar pb-1">
                {activeDecade.years.map((y) => (
                  <button
                    key={y.year}
                    onClick={() => { 
                      onSelectYear(y.dateStr); 
                      setShowYearPicker(false);
                      setLocalActiveIdx(null);
                    }}
                    className={`py-2 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold transition-all flex flex-col items-center ${currentYear === y.year ? 'bg-indigo-600 text-white shadow-lg ring-2 md:ring-4 ring-indigo-100 scale-[1.02]' : 'bg-slate-50 text-slate-600 hover:bg-indigo-50 border border-slate-100'}`}
                  >
                    <span className="text-[11px] md:text-sm">{y.year}年</span>
                    <span className={`text-[8px] md:text-[9px] ${currentYear === y.year ? 'text-indigo-200' : 'text-slate-400'}`}>{y.age}岁</span>
                  </button>
                ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeWheel;
