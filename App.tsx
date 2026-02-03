
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, User, Clock, Sparkles, BrainCircuit, X, Copy, Compass, ClipboardCheck, Keyboard, ChevronDown, Check, GraduationCap, Eye, EyeOff, Loader2, Wand2, FileText, Share2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Solar, Lunar } from 'lunar-javascript';
import { calculateChart } from './services/zwdsLogic';
import PalaceBox from './components/PalaceBox';
import TimeWheel from './components/TimeWheel';
import FortuneChart from './components/FortuneChart';
import { Gender, ZWDSChart } from './types';
import { BRANCHES, STEMS, SI_HUA_TABLE } from './constants';

const BigDipperBackground: React.FC<{ side: 'left' | 'right' }> = ({ side }) => (
  <div className={`fixed top-0 ${side === 'left' ? 'left-0' : 'right-0'} w-1/4 h-full pointer-events-none opacity-5 hidden 2xl:flex items-center justify-center z-0`}>
    <svg viewBox="0 0 200 600" className="w-full h-3/4">
      <defs>
        <filter id={`star-glow-${side}`}>
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g filter={`url(#star-glow-${side})`} transform={side === 'right' ? 'scale(-1, 1) translate(-200, 0)' : ''}>
        <path d="M160,100 L140,160 L100,190 L70,160 L40,210 L30,280 L20,360" fill="none" stroke="rgba(186, 230, 253, 0.4)" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="160" cy="100" r="3" className="fill-sky-300 animate-pulse" />
        <circle cx="140" cy="160" r="3" className="fill-sky-300 animate-pulse" style={{ animationDelay: '0.4s' }} />
        <circle cx="100" cy="190" r="3" className="fill-sky-300 animate-pulse" style={{ animationDelay: '0.8s' }} />
        <circle cx="70" cy="160" r="2.5" className="fill-sky-300 animate-pulse" style={{ animationDelay: '1.2s' }} />
        <circle cx="40" cy="210" r="3" className="fill-sky-300 animate-pulse" style={{ animationDelay: '1.6s' }} />
        <circle cx="30" cy="280" r="3" className="fill-sky-300 animate-pulse" style={{ animationDelay: '2s' }} />
        <circle cx="20" cy="360" r="3" className="fill-sky-300 animate-pulse" style={{ animationDelay: '2.4s' }} />
      </g>
    </svg>
  </div>
);

const RelationshipLines: React.FC<{ targetBranch: string, gridOrder: number[] }> = ({ targetBranch, gridOrder }) => {
  const points = useMemo(() => {
    const bIdx = BRANCHES.indexOf(targetBranch);
    if (bIdx === -1) return null;
    const relatedPalaces = [bIdx, (bIdx + 4) % 12, (bIdx + 8) % 12, (bIdx + 6) % 12];
    return relatedPalaces.map(palaceIdx => {
      const gridPos = gridOrder.indexOf(palaceIdx);
      if (gridPos === -1) return null;
      const col = gridPos % 4;
      const row = Math.floor(gridPos / 4);
      return { x: col * 25 + 12.5, y: row * 25 + 12.5 };
    }).filter(p => p !== null) as {x: number, y: number}[];
  }, [targetBranch, gridOrder]);

  if (!points || points.length < 4) return null;

  const lineColor = "rgba(14, 165, 233, 0.25)";

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-[20] overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path
        d={`M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} Z`}
        fill="none"
        stroke={lineColor}
        strokeWidth="0.3"
        strokeDasharray="2,1"
      />
      <line
        x1={points[0].x} y1={points[0].y} x2={points[3].x} y2={points[3].y}
        stroke={lineColor} strokeWidth="0.4" strokeDasharray="3,1"
      />
    </svg>
  );
};

const App: React.FC = () => {
  const now = new Date();
  const currentRealYear = now.getFullYear();
  
  // 辅助函数：获取某公历年份对应的农历大年初一的公历日期字符串 (YYYY-MM-DD)
  const getLunarNewYearSolarDate = (year: number) => {
    return Lunar.fromYmd(year, 1, 1).getSolar().toYmd();
  };

  const defaultBirthDate = now.toISOString().split('T')[0];
  const defaultBirthTime = now.toTimeString().split(' ')[0].substring(0, 5);

  const [birthDate, setBirthDate] = useState(defaultBirthDate);
  const [birthTime, setBirthTime] = useState(defaultBirthTime);
  const [gender, setGender] = useState<Gender>('male');
  
  // 初始流年设为当前年份的大年初一，确保进入正确的流年地支宫位
  const [targetYear, setTargetYear] = useState(getLunarNewYearSolarDate(currentRealYear));
  
  const [showLines, setShowLines] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedDaXianIdx, setSelectedDaXianIdx] = useState<number | null>(null);
  const [isPromptCopied, setIsPromptCopied] = useState(false);
  
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');

  const chartData = useMemo(() => {
    const birth = new Date(`${birthDate}T${birthTime}`);
    const target = new Date(targetYear);
    if (isNaN(birth.getTime()) || isNaN(target.getTime())) {
      const initialBirth = new Date(`${defaultBirthDate}T${defaultBirthTime}`);
      return calculateChart(initialBirth, gender, new Date(), selectedDaXianIdx);
    }
    return calculateChart(birth, gender, target, selectedDaXianIdx);
  }, [birthDate, birthTime, gender, targetYear, selectedDaXianIdx]);

  const currentAge = useMemo(() => {
    const bDate = new Date(birthDate);
    if (isNaN(bDate.getTime())) return undefined;
    const targetY = new Date(targetYear).getFullYear();
    // 紫微斗数以虚岁计，虚岁 = 流年年份 - 出生年份 + 1
    return targetY - bDate.getFullYear() + 1;
  }, [birthDate, targetYear]);

  const daXianList = useMemo(() => {
    const bDate = new Date(birthDate);
    const birthYear = isNaN(bDate.getTime()) ? 1990 : bDate.getFullYear();
    const list = [];
    for (let i = 0; i < 12; i++) {
      const palace = chartData.palaces[i];
      const yearsInDecade = [];
      for (let age = palace.daXianRange[0]; age <= palace.daXianRange[1]; age++) {
        const calYear = birthYear + age - 1;
        // 这里的流年定位点统一使用大年初一
        const solarDateOfNewYear = getLunarNewYearSolarDate(calYear);
        const l = Lunar.fromYmd(calYear, 1, 1);
        const yearZhi = l.getYearZhi();
        yearsInDecade.push({ age, year: calYear, dateStr: solarDateOfNewYear, branch: yearZhi });
      }
      list.push({ idx: i, name: palace.name, range: palace.daXianRange, stem: palace.stem, branch: palace.originalName, years: yearsInDecade });
    }
    return list.sort((a, b) => a.range[0] - b.range[0]);
  }, [chartData, birthDate]);

  useEffect(() => {
    if (!currentAge) return;
    const matchingDecade = daXianList.find(d => currentAge >= d.range[0] && currentAge <= d.range[1]);
    if (matchingDecade && (selectedDaXianIdx === null)) {
      setSelectedDaXianIdx(matchingDecade.idx);
    }
  }, [currentAge, daXianList, selectedDaXianIdx]);

  const gridOrder = [5, 6, 7, 8, 4, -1, -1, 9, 3, -1, -1, 10, 2, 1, 0, 11];

  const handleExportPrompt = async () => {
    const startYear = new Date(targetYear).getFullYear();
    const futureYearsInfo = [];
    
    for(let i=0; i<10; i++) {
      const year = startYear + i;
      const lunar = Lunar.fromYmd(year, 1, 1);
      const stem = lunar.getYearGan();
      const branch = lunar.getYearZhi();
      const siHua = SI_HUA_TABLE[stem] || [];
      futureYearsInfo.push(`${year}年(${stem}${branch}流年): 化禄-${siHua[0]}, 化权-${siHua[1]}, 化科-${siHua[2]}, 化忌-${siHua[3]}`);
    }

    const palaceDetails = chartData.palaces.map(p => {
      const starList = p.stars.map(s => {
        let info = `${s.name}(${s.brightness})`;
        if (s.siHua) info += `[生年化${s.siHua}]`;
        if (s.daXianSiHua) info += `[大运化${s.daXianSiHua}]`;
        if (s.liuNianSiHua) info += `[流年化${s.liuNianSiHua}]`;
        return info;
      }).join('、');
      return `【${p.name}】(宫位:${p.stem}${p.originalName}): ${starList || '无主星'}`;
    }).join('\n');

    const fullPrompt = `你现在是资深的国学易经术数领域专家，精通陈希夷的《紫微斗数全书》《三命通会》《滴天髓》等命理书籍，请详细分析以下紫微斗数命盘，综合使用三合紫微、飞星紫微、河洛紫微、钦天四化等各流派紫微斗数的分析技法，对命盘十二宫星曜分布、限流叠宫和各宫位间的飞宫四化进行细致分析，进而对命主的健康、学业、事业、财运、人际关系、婚姻和感情等各个方面进行全面分析和总结，关键事件须给出发生时间范围、吉凶属性、事件对命主的影响程度等信息，并结合命主的自身特点给出针对性的解决方案和建议。最后分析紫微斗数并结合八字对命主当前选中的流年以及未来10年的大运走势进行分析总结。

### 命主基础信息
- 性别：${gender === 'male' ? '男命' : '女命'}
- 公历：${chartData.solarDate}
- 农历：${chartData.lunarDate}
- 八字：${chartData.baZi.year} ${chartData.baZi.month} ${chartData.baZi.day} ${chartData.baZi.hour}
- 五行局：${chartData.fiveElements}
- 命主/身主：${chartData.mingZhu} / ${chartData.shenZhu}
- 当前分析流年：${chartData.targetYear}年 (正月初一启动, 岁数: ${currentAge}岁)

### 十二宫位星曜及四化详情
${palaceDetails}

### 未来10年流年数据推演 (按农历年核算)
${futureYearsInfo.join('\n')}

### 分析要求
1. **格局辨析**：分析三方四正的星曜组合，定出一生格调高低。
2. **六亲关系**：分析父母、兄弟、夫妻、子女宫的相互牵引与吉凶。
3. **财官运势**：分析一生财富量级与职业适配度。
4. **流年专项**：重点分析当前 ${chartData.targetYear} 流年的变动，给出具体的避坑指南。
5. **未来十年展望**：结合以上流年四化数据，对未来十年的大势进行定性描述。

请以专业、严谨且富有传统文化底蕴的语言输出分析报告。`;

    try {
      await navigator.clipboard.writeText(fullPrompt);
      setIsPromptCopied(true);
      setTimeout(() => setIsPromptCopied(false), 2000);
    } catch (err) {
      alert("复制失败，请手动选择内容复制");
    }
  };

  const handlePalaceClick = (palaceBranch: string) => {
    if (selectedDaXianIdx === null) return;
    const activeDecade = daXianList.find(d => d.idx === selectedDaXianIdx);
    if (!activeDecade) return;
    const foundYear = activeDecade.years.find(y => y.branch === palaceBranch);
    if (foundYear) setTargetYear(foundYear.dateStr);
  };

  const handleAiAnalysis = async () => {
    setAiLoading(true);
    setShowAiModal(true);
    setAiResult('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: "请根据用户命盘数据进行深度分析，特别是针对当前选中的流年...", 
      });
      setAiResult(response.text || '解析失败');
    } catch (error) {
      setAiResult('AI 解析错误');
    } finally {
      setAiLoading(false);
    }
  };

  const birthDateValue = useMemo(() => {
    const d = new Date(`${birthDate}T${birthTime}`);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [birthDate, birthTime]);

  const displayTargetYear = useMemo(() => new Date(targetYear).getFullYear(), [targetYear]);

  return (
    <div className="min-h-screen pb-12 bg-slate-50 relative overflow-x-hidden">
      <BigDipperBackground side="left" />
      <BigDipperBackground side="right" />

      <header className="bg-slate-900 text-white p-6 shadow-2xl mb-8 relative z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <Compass className="w-10 h-10 text-sky-400 animate-spin-slow" />
            <h1 className="text-3xl font-calligraphy tracking-widest">专业紫微斗数系统</h1>
          </div>
          <div className="flex flex-wrap items-center gap-4 bg-white/5 p-4 rounded-2xl backdrop-blur-md border border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">出生日期</span>
              <CalendarIcon className="w-4 h-4 text-slate-400" />
              <input type="date" value={birthDate} onChange={(e)=>setBirthDate(e.target.value)} className="bg-slate-800 border-none rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 ring-sky-500" />
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <input type="time" value={birthTime} onChange={(e)=>setBirthTime(e.target.value)} className="bg-slate-800 border-none rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 ring-sky-500" />
            </div>
            <select value={gender} onChange={(e)=>setGender(e.target.value as Gender)} className="bg-slate-800 border-none rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 ring-sky-500">
              <option value="male">男命</option>
              <option value="female">女命</option>
            </select>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">流年选择</span>
              <select 
                value={displayTargetYear} 
                onChange={(e) => setTargetYear(getLunarNewYearSolarDate(parseInt(e.target.value)))} 
                className="bg-slate-800 border-none rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 ring-sky-500"
              >
                {Array.from({length:100},(_,i)=>currentRealYear-10+i).map(y=><option key={y} value={y}>{y}农历年</option>)}
              </select>
            </div>
            
            <div className="flex items-center gap-2 ml-2">
              <button 
                onClick={handleAiAnalysis}
                className="hidden md:flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-900 font-black px-4 py-2 rounded-xl transition-all shadow-lg active:scale-95"
              >
                <BrainCircuit className="w-4 h-4" />
                AI深度解析
              </button>
              <button 
                onClick={handleExportPrompt}
                className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl font-black transition-all shadow-lg active:scale-95 ${isPromptCopied ? 'bg-emerald-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-sky-400 border border-sky-500/30'}`}
              >
                {isPromptCopied ? <ClipboardCheck className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {isPromptCopied ? '已复制提示词' : '导出 AI 提示词'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-4 gap-8 pb-20">
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 sticky top-8 z-40">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Sparkles className="text-indigo-600"/> 命局简析</h2>
            <div className="space-y-4">
               <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <p className="text-sm font-bold text-indigo-900 mb-1">公历：{chartData.solarDate}</p>
                  <p className="text-sm text-slate-600">农历：{chartData.lunarDate}</p>
                  <p className="mt-2 text-sm font-black text-indigo-700">格局：{chartData.fiveElements}</p>
               </div>
               <div className="grid grid-cols-2 gap-2">
                 {Object.entries(chartData.baZi).map(([k,v]) => (
                   <div key={k} className="bg-slate-50 p-2 rounded-lg text-center border">
                     <span className="text-[10px] text-slate-400 block uppercase">{k}</span>
                     <span className="text-sm font-bold text-slate-800">{v}</span>
                   </div>
                 ))}
               </div>
               
               <div className="space-y-2 pt-2">
                 <button 
                  onClick={handleAiAnalysis}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg transition-all active:scale-95 group"
                 >
                   <BrainCircuit className="w-5 h-5 group-hover:animate-pulse" />
                   大师级 AI 解析
                 </button>
                 <button 
                  onClick={handleExportPrompt}
                  className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-2xl transition-all active:scale-95 border ${isPromptCopied ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                 >
                   {isPromptCopied ? <ClipboardCheck className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                   {isPromptCopied ? '提示词复制成功' : '复制 AI 推演提示词'}
                 </button>
               </div>
            </div>
          </div>
        </aside>

        <div className={`lg:col-span-3 transition-opacity ${isUpdating ? 'opacity-50' : 'opacity-100'}`}>
          <div className="grid grid-cols-4 gap-0 border-[6px] md:border-[12px] border-slate-900 bg-white shadow-2xl relative min-h-[440px] md:min-h-[800px]">
            {showLines && <RelationshipLines targetBranch={chartData.targetYearBranch} gridOrder={gridOrder} />}
            {gridOrder.map((pos, idx) => {
              if (pos === -1) {
                if (idx === 5) {
                   return (
                     <div key={idx} className="col-span-2 row-span-2 flex flex-col items-center justify-center relative p-2 md:p-6 z-30 min-h-[220px] md:min-h-[300px]">
                        <div className="w-full h-full max-w-[200px] md:max-w-[280px] max-h-[200px] md:max-h-[280px]">
                           <TimeWheel decades={daXianList} selectedIdx={selectedDaXianIdx} onSelectDecade={setSelectedDaXianIdx} targetYear={targetYear} onSelectYear={setTargetYear} />
                        </div>
                        <div className="mt-2 md:mt-4 bg-indigo-950 text-white px-3 md:px-4 py-1 md:py-1.5 rounded-full font-black text-[10px] md:text-xs shadow-lg animate-pulse text-center">
                           {displayTargetYear} {chartData.targetYearStem}{chartData.targetYearBranch}年 <br/>
                           {currentAge || '?'}岁 (以农历正月初一起)
                        </div>
                     </div>
                   );
                }
                return null;
              }
              const isLiuNian = chartData.targetYearBranch === chartData.palaces[pos].originalName;
              return (
                <PalaceBox key={idx} gridIndex={idx} index={pos} data={chartData.palaces[pos]} isLiuNian={isLiuNian} currentAge={currentAge} onClick={() => handlePalaceClick(chartData.palaces[pos].originalName)} />
              );
            })}
          </div>
          {!isNaN(birthDateValue.getTime()) && <FortuneChart birthDate={birthDateValue} gender={gender} />}
        </div>
      </main>
      
      <div className="md:hidden fixed bottom-6 right-6 z-[60] flex flex-col gap-3">
        <button 
          onClick={handleExportPrompt}
          className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-90 ${isPromptCopied ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-sky-400'}`}
        >
          {isPromptCopied ? <ClipboardCheck className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
        </button>
        <button 
          onClick={handleAiAnalysis}
          className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-sky-500 text-white rounded-full shadow-2xl flex items-center justify-center animate-bounce-subtle active:scale-90 transition-transform"
        >
          <div className="flex flex-col items-center">
            <BrainCircuit className="w-6 h-6 mb-0.5" />
            <span className="text-[10px] font-black leading-none">AI分析</span>
          </div>
        </button>
      </div>

      {showAiModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowAiModal(false)}></div>
          <div className="relative w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 md:p-8 flex flex-col h-[80vh] md:h-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-100 rounded-2xl">
                    <Wand2 className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h2 className="text-2xl font-black text-indigo-950 font-calligraphy">大师级命盘深度解析</h2>
                </div>
                <button onClick={() => setShowAiModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-indigo-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto pr-2 no-scrollbar">
                {aiLoading ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                    <p className="text-slate-500 font-medium animate-pulse">正在调动易学大模型，解析三方四正与四化飞星，请稍候...</p>
                  </div>
                ) : (
                  <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed font-serif">
                    <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 mb-6 italic text-sm text-indigo-800">
                      声明：AI 推算结果仅供娱乐与参考，命运掌握在自己手中。
                    </div>
                    {aiResult.split('\n').map((line, i) => (
                      <p key={i} className="mb-4">{line}</p>
                    ))}
                  </div>
                )}
              </div>

              {!aiLoading && (
                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                   <p className="text-[10px] text-slate-400">基于 Gemini-3-Pro 命理大模型推演</p>
                   <div className="flex gap-3">
                     <button onClick={handleExportPrompt} className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-all flex items-center gap-2">
                       {isPromptCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                       复制提示词
                     </button>
                     <button onClick={() => setShowAiModal(false)} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95">
                       了解天机
                     </button>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
