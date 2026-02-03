import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { calculateChart, calculateIntegratedScore } from '../services/zwdsLogic';
import { Gender } from '../types';
import { BarChart3, MoveHorizontal, Clock, TrendingUp } from 'lucide-react';
import { Lunar } from 'lunar-javascript';

interface FortunePoint {
  year: number;
  age: number;
  score: number;
}

interface KLineData {
  label: string;
  open: number;
  close: number;
  high: number;
  low: number;
  avg: number;
  yearRange: [number, number];
}

interface FortuneChartProps {
  birthDate: Date;
  gender: Gender;
}

const FortuneChart: React.FC<FortuneChartProps> = ({ birthDate, gender }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollBarRef = useRef<HTMLDivElement>(null);
  
  const [resolution, setResolution] = useState<1 | 5 | 10>(1);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1.5); 
  const [offset, setOffset] = useState(0);

  const rawData = useMemo(() => {
    const points: FortunePoint[] = [];
    if (!birthDate || isNaN(birthDate.getTime())) return [];
    const birthYear = birthDate.getFullYear();
    
    for (let age = 1; age <= 100; age++) {
      const targetYear = birthYear + age - 1;
      try {
        const lunarNewYear = Lunar.fromYmd(targetYear, 1, 1);
        const date = lunarNewYear.getSolar().toDate();
        
        const chart = calculateChart(birthDate, gender, date);
        const score = calculateIntegratedScore(chart, chart.targetYearBranch);
        points.push({ year: targetYear, age, score: isNaN(score) ? 60 : score });
      } catch (e) { continue; }
    }
    return points;
  }, [birthDate, gender]);

  const kLineData = useMemo(() => {
    if (rawData.length === 0) return [];
    const results: KLineData[] = [];
    for (let i = 0; i < rawData.length; i += resolution) {
      const chunk = rawData.slice(i, i + resolution);
      if (chunk.length === 0) continue;
      
      const scores = chunk.map(p => p.score);
      results.push({
        label: resolution === 1 ? `${chunk[0].year}` : `${chunk[0].year}-${chunk[chunk.length-1].year}`,
        open: chunk[0].score,
        close: chunk[chunk.length - 1].score,
        high: Math.max(...scores),
        low: Math.min(...scores),
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        yearRange: [chunk[0].year, chunk[chunk.length-1].year]
      });
    }
    return results;
  }, [rawData, resolution]);

  const visibleCount = useMemo(() => Math.max(8, Math.floor(kLineData.length / zoom)), [kLineData.length, zoom]);
  const safeOffset = useMemo(() => {
    if (kLineData.length === 0) return 0;
    const maxOffset = Math.max(0, kLineData.length - visibleCount);
    return Math.min(maxOffset, Math.max(0, offset));
  }, [kLineData.length, visibleCount, offset]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || kLineData.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 40, bottom: 40, left: 45, right: 15 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const totalStep = chartWidth / visibleCount;
    const barWidth = totalStep * 0.7;
    const spacing = totalStep * 0.3;

    const getY = (val: number) => padding.top + chartHeight - (val / 100) * chartHeight;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(width - padding.right, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = '9px monospace';
      ctx.fillText((100 - i * 25).toString(), 10, y + 3);
    }

    if (resolution <= 5) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 2;
      let first = true;
      kLineData.forEach((d, i) => {
        if (i < safeOffset || i > safeOffset + visibleCount) return;
        const x = padding.left + (i - safeOffset) * totalStep + spacing / 2 + barWidth / 2;
        const y = getY(d.close);
        if (first) { ctx.moveTo(x, y); first = false; }
        else { ctx.lineTo(x, y); }
      });
      ctx.stroke();
    }

    kLineData.forEach((d, i) => {
      if (i < safeOffset || i > safeOffset + visibleCount) return;
      const x = padding.left + (i - safeOffset) * totalStep + spacing / 2;
      const yHigh = getY(d.high), yLow = getY(d.low), yOpen = getY(d.open), yClose = getY(d.close);
      const isUp = d.close >= d.open;
      const color = isUp ? '#38bdf8' : '#1e40af';

      ctx.strokeStyle = color; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x + barWidth / 2, yHigh); ctx.lineTo(x + barWidth / 2, yLow); ctx.stroke();

      ctx.fillStyle = color;
      const bodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));
      if (isUp) {
        ctx.strokeRect(x, Math.min(yOpen, yClose), barWidth, bodyHeight);
        ctx.globalAlpha = 0.15; ctx.fillRect(x, Math.min(yOpen, yClose), barWidth, bodyHeight); ctx.globalAlpha = 1.0;
      } else {
        ctx.fillRect(x, Math.min(yOpen, yClose), barWidth, bodyHeight);
      }

      if (i % Math.ceil(visibleCount / 6) === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; ctx.font = '9px sans-serif';
        const label = resolution === 1 ? d.label : d.label.split('-')[0];
        ctx.fillText(label, x, height - 12);
      }

      if (hoverIdx === i) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(x + barWidth / 2, padding.top); ctx.lineTo(x + barWidth / 2, height - padding.bottom); ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  }, [kLineData, zoom, safeOffset, resolution, hoverIdx, visibleCount]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current, container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth * window.devicePixelRatio;
        canvas.height = container.clientHeight * window.devicePixelRatio;
        canvas.getContext('2d')?.scale(window.devicePixelRatio, window.devicePixelRatio);
        draw();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  const handleScrollBarMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!scrollBarRef.current || kLineData.length === 0) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const rect = scrollBarRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newOffset = percent * (kLineData.length - visibleCount);
    setOffset(newOffset);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom(prev => Math.min(4, prev + 0.15));
    } else {
      setZoom(prev => Math.max(0.8, prev - 0.15));
    }
  };

  const maxScore = useMemo(() => {
    if (rawData.length === 0) return 0;
    return Math.max(...rawData.map(p => p.score));
  }, [rawData]);

  const avgScore = useMemo(() => {
    if (rawData.length === 0) return 0;
    return rawData.reduce((a, b) => a + b.score, 0) / rawData.length;
  }, [rawData]);

  return (
    <div className="bg-slate-950 rounded-[2rem] p-5 md:p-8 shadow-2xl border border-slate-800 mt-8 overflow-hidden relative select-none">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
            <BarChart3 className="text-sky-500 w-6 h-6 md:w-8 md:h-8" />
            <span className="font-calligraphy tracking-widest">气运集成量化曲线</span>
          </h3>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
              <Clock className="w-2.5 h-2.5" />
              {resolution === 1 ? '逐年' : resolution === 5 ? '五载' : '十世'}维度
            </span>
            <span className="text-[8px] text-slate-500 italic opacity-60">源自专利 CN101556628A 量化集成算法</span>
          </div>
        </div>

        <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl">
          {[1, 5, 10].map(r => (
            <button
              key={r}
              onClick={() => { setResolution(r as any); setZoom(1.5); setOffset(0); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${resolution === r ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              {r === 1 ? '1Y' : r === 5 ? '5Y' : '10Y'}
            </button>
          ))}
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative h-60 md:h-72 w-full cursor-crosshair touch-none"
        onWheel={handleWheel}
        onMouseMove={(e) => {
          if (kLineData.length === 0) return;
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const x = e.clientX - rect.left - 45;
            const step = (rect.width - 60) / visibleCount;
            const idx = Math.floor(x / step) + Math.floor(safeOffset);
            if (idx >= 0 && idx < kLineData.length) setHoverIdx(idx);
          }
        }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
        
        {hoverIdx !== null && kLineData[hoverIdx] && (
          <div className="absolute top-0 left-[45px] right-4 flex gap-2 pointer-events-none animate-in fade-in duration-200">
            <div className="bg-slate-900/90 backdrop-blur-md border border-sky-500/30 px-3 py-1.5 rounded-xl flex flex-col md:flex-row md:items-center gap-1 md:gap-4 shadow-xl">
              <span className="text-sky-400 font-black text-[11px]">{kLineData[hoverIdx].label}</span>
              <div className="flex gap-3 text-[9px]">
                <span className="text-slate-400">高: <b className="text-white">{Math.round(kLineData[hoverIdx].high)}</b></span>
                <span className="text-slate-400">低: <b className="text-white">{Math.round(kLineData[hoverIdx].low)}</b></span>
                <span className="text-slate-400">收: <b className="text-sky-300">{Math.round(kLineData[hoverIdx].close)}</b></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 px-2">
        <div 
          ref={scrollBarRef}
          className="h-2 w-full bg-slate-800/50 rounded-full relative cursor-pointer group"
          onClick={handleScrollBarMove}
          onMouseMove={(e) => e.buttons === 1 && handleScrollBarMove(e)}
          onTouchMove={handleScrollBarMove}
        >
          {kLineData.length > 0 && (
            <div 
              className="absolute h-full bg-sky-500/40 rounded-full border border-sky-500/30 shadow-[0_0_8px_rgba(56,189,248,0.2)]"
              style={{ 
                left: `${(safeOffset / kLineData.length) * 100}%`,
                width: `${(visibleCount / kLineData.length) * 100}%`
              }}
            />
          )}
        </div>
        <div className="flex justify-between mt-1 text-[8px] text-slate-500 font-bold font-mono tracking-widest">
           <span>{rawData[0]?.year}</span>
           <span className="flex items-center gap-1"><MoveHorizontal className="w-2 h-2" /> 左右滑动平移时间轴 (严格按农历正月初一起算)</span>
           <span>{rawData[rawData.length-1]?.year}</span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
           <div>
             <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">一生气运峰值</p>
             <p className="text-xl font-black text-white">{Math.round(maxScore)}<span className="text-xs text-sky-500 ml-1">分</span></p>
           </div>
           <TrendingUp className="text-emerald-500/20 w-8 h-8" />
        </div>
        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
           <div>
             <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">全周期平均值</p>
             <p className="text-xl font-black text-white">{Math.round(avgScore)}<span className="text-xs text-sky-500 ml-1">分</span></p>
           </div>
           <div className="w-8 h-8 rounded-full border-2 border-sky-500/20 flex items-center justify-center">
             <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse" />
           </div>
        </div>
      </div>
    </div>
  );
};

export default FortuneChart;