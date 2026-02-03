import React from 'react';
import { PalaceData, StarInfo } from '../types';

interface PalaceBoxProps {
  data: PalaceData;
  index: number; // 宫位地支索引
  gridIndex: number; // 在 4x4 网格中的位置索引
  isLiuNian?: boolean;
  currentAge?: number; // 当前流年岁数
  onClick?: () => void; // 点击事件
}

const PalaceBox: React.FC<PalaceBoxProps> = ({ data, gridIndex, isLiuNian, currentAge, onClick }) => {
  const { name, originalName, stem, stars, isMing, isShen, daXianRange, boShi, changSheng } = data;

  const starMap = new Map<string, StarInfo>();
  const skipStars = ['博士', '力士', '青龙', '小耗', '将军', '奏书', '飞廉', '喜神', '病符', '大耗', '伏兵', '官府', 
                     '长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
  
  stars.forEach(s => {
    if (skipStars.includes(s.name)) return;
    const existing = starMap.get(s.name);
    if (!existing || (!existing.siHua && s.siHua) || (!existing.liuNianSiHua && s.liuNianSiHua) || (!existing.daXianSiHua && s.daXianSiHua)) {
      starMap.set(s.name, { ...(existing || {}), ...s });
    }
  });
  
  const allStars = Array.from(starMap.values());
  const majorStars = allStars.filter(s => s.type === 'major');
  const otherStars = allStars.filter(s => s.type !== 'major');

  const getStarTextColor = (starName: string) => {
    if (starName === '紫微') return 'text-purple-700';
    if (starName === '天府') return 'text-amber-600';
    if (['太阳', '廉贞', '贪狼', '七杀', '破军'].includes(starName)) return 'text-red-600';
    if (['武曲', '太阴', '巨门', '天机'].includes(starName)) return 'text-blue-900';
    if (['左辅', '右弼', '文昌', '文曲', '天魁', '天钺'].includes(starName)) return 'text-sky-600';
    return 'text-black';
  };

  const getStarNature = (starName: string) => {
    const lucky = ['左辅', '右弼', '天魁', '天钺', '文昌', '文曲', '工作', '禄存'];
    const unlucky = ['擎羊', '陀罗', '地空', '地劫', '火星', '铃星'];
    if (lucky.includes(starName)) return { type: '吉', color: 'bg-red-50 text-red-600' };
    if (unlucky.includes(starName)) return { type: '凶', color: 'bg-slate-200 text-black' };
    return null;
  };

  const renderStar = (star: StarInfo, size: 'large' | 'small') => {
    const isMajor = size === 'large';
    const hasLiuNian = !!star.liuNianSiHua;
    const nature = getStarNature(star.name);

    const getBrightnessColor = (b: string) => {
      switch (b) {
        case '庙': return 'text-amber-500 font-black';
        case '旺': return 'text-red-600 font-bold';
        case '得': return 'text-emerald-600 font-bold';
        case '利': return 'text-blue-600 font-bold';
        case '平': return 'text-slate-400';
        case '不': return 'text-purple-900 font-medium';
        case '陷': return 'text-black font-medium';
        default: return 'text-slate-700';
      }
    };

    const getSiHuaStyles = (type: '禄' | '权' | '科' | '忌') => {
      return {
        '禄': 'bg-blue-600 text-white',
        '权': 'bg-red-600 text-white',
        '科': 'bg-yellow-400 text-white font-black',
        '忌': 'bg-black text-white'
      }[type];
    };

    const getLiuNianSiHuaStyles = (type: '禄' | '权' | '科' | '忌') => {
      return {
        '禄': 'bg-blue-600 text-white ring-1 ring-blue-300',
        '权': 'bg-red-600 text-white ring-1 ring-red-300',
        '科': 'bg-yellow-500 text-white ring-1 ring-yellow-200',
        '忌': 'bg-slate-900 text-white ring-1 ring-slate-400'
      }[type];
    };

    const textColorClass = getStarTextColor(star.name);

    return (
      <div 
        key={star.name} 
        className={`flex flex-col items-center flex-shrink-0 group relative rounded-lg px-px md:px-0.5 transition-all duration-500 ${hasLiuNian ? 'z-40' : 'z-10'}`}
      >
        <span className={`text-[6px] md:text-[8px] h-2 md:h-2.5 font-bold leading-none mb-0.5 relative z-10 ${getBrightnessColor(star.brightness)}`}>
          {star.brightness}
        </span>

        <div className="flex flex-col items-center gap-0.5">
          <div className={`
            writing-vertical-rl font-calligraphy leading-none tracking-tight transition-all
            ${textColorClass}
            ${isMajor ? 'font-bold text-[9px] md:text-lg' : 
              star.type === 'secondary' ? 'text-[8px] md:text-xs' : 
              'text-[7px] md:text-[10px]'}
            ${hasLiuNian ? 'font-black drop-shadow-sm' : ''}
            ${star.brightness === '陷' ? 'opacity-50' : ''}
          `} style={{ writingMode: 'vertical-rl' }}>
            {star.name}
          </div>
          
          {nature && (
            <div className={`px-0.5 py-0 text-[5px] md:text-[7px] leading-none rounded-sm font-bold scale-90 ${nature.color} shadow-sm`}>
              {nature.type}
            </div>
          )}

          <div className="flex flex-col items-center gap-0.5 mt-0.5">
            {star.siHua && (
              <div className={`w-3 h-3 md:w-4.5 md:h-4.5 rounded-full flex items-center justify-center text-[7px] md:text-[10px] font-bold shadow-sm flex-shrink-0 ${getSiHuaStyles(star.siHua)}`}>
                {star.siHua}
              </div>
            )}
            {star.daXianSiHua && (
              <div className={`px-0.5 py-0.5 rounded-sm flex items-center justify-center text-[6px] md:text-[9px] bg-white border border-slate-300 text-slate-800 font-bold shadow-sm whitespace-nowrap min-w-[16px] md:min-w-[28px]`}>
                <span className="opacity-60 hidden md:inline mr-0.5">大</span>
                <span>{star.daXianSiHua}</span>
              </div>
            )}
            {star.liuNianSiHua && (
              <div className={`px-0.5 py-0.5 rounded-sm flex items-center justify-center text-[6px] md:text-[9px] font-black animate-bounce-subtle shadow-md whitespace-nowrap min-w-[16px] md:min-w-[28px] ${getLiuNianSiHuaStyles(star.liuNianSiHua)}`}>
                <span className="opacity-80 hidden md:inline mr-0.5">流</span>
                <span>{star.liuNianSiHua}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const palaceDisplayName = name === '命宫' ? name : `${name}宫`;

  return (
    <div 
      onClick={onClick}
      className={`
      relative min-h-[110px] md:h-64 flex flex-col bg-white border border-slate-200
      transition-all duration-300 hover:shadow-inner p-1 md:p-4 overflow-hidden cursor-pointer
      ${isMing ? 'bg-blue-50/70 ring-inset ring-1 md:ring-2 ring-blue-500 z-50 shadow-lg !border-transparent' : ''}
      ${isLiuNian ? 'bg-rose-50/70 ring-inset ring-1 md:ring-2 ring-rose-500 z-50 shadow-xl !border-transparent' : ''}
      ${!isMing && !isLiuNian ? 'z-0 hover:bg-blue-50/30' : ''}
    `}>
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none select-none overflow-hidden">
        <span className={`text-2xl md:text-8xl font-calligraphy ${isLiuNian ? 'text-rose-900' : 'text-blue-900'}`}>{originalName}</span>
      </div>

      <div className="absolute top-1 left-1 md:top-3 md:left-3 flex flex-col text-[6px] md:text-[10px] text-slate-900 font-black leading-tight z-20">
        <span>{boShi}</span>
        <span>{changSheng}</span>
      </div>

      <div className="absolute bottom-1 right-1 md:bottom-3 md:right-3 flex flex-col items-end z-30 pointer-events-none">
         <div className="flex gap-0.5 mb-0.5">
           {isLiuNian && (
             <div className="px-0.5 py-0 bg-rose-500 text-white text-[5px] md:text-[8px] rounded-full font-bold shadow-sm border border-rose-600 animate-pulse">流</div>
           )}
           {isShen && (
             <div className="px-0.5 py-0 bg-sky-500 text-white text-[5px] md:text-[8px] rounded-full font-bold shadow-sm border border-sky-600">身</div>
           )}
         </div>
         <div className="flex items-baseline gap-0.5 md:gap-2">
            <span className="text-[6px] md:text-[9px] font-mono text-slate-500 font-bold tracking-tighter">
              {stem}{originalName}
            </span>
            <span className={`font-bold text-[8px] md:text-base tracking-normal ${isMing ? 'text-blue-900 font-black' : isLiuNian ? 'text-rose-900 font-black' : 'text-slate-900'}`}>
              {palaceDisplayName}
            </span>
         </div>
      </div>

      <div className="absolute bottom-1 left-1 md:bottom-3 md:left-3 flex flex-col items-start z-30">
        <div className="text-[6px] md:text-[9px] font-mono text-slate-500 font-bold">
          {daXianRange[0]}-{daXianRange[1]}
        </div>
        {isLiuNian && currentAge && (
          <div className="mt-0.5 px-0.5 bg-rose-200 text-rose-900 text-[6px] md:text-[10px] font-black rounded-sm shadow-sm border border-rose-300">
            {currentAge}岁
          </div>
        )}
      </div>

      <div className="flex flex-row-reverse h-full pt-1 md:pt-10 pb-4 md:pb-12 px-0.5 md:px-1 gap-1 md:gap-2 overflow-hidden">
        <div className="flex flex-row-reverse gap-0.5 md:gap-2 h-full flex-shrink-0">
          {majorStars.map(s => renderStar(s, 'large'))}
        </div>
        <div className="flex flex-row-reverse flex-wrap content-start gap-x-0.5 md:gap-x-2 gap-y-0.5 flex-grow min-w-0 h-full overflow-y-auto no-scrollbar">
          {otherStars.map(s => renderStar(s, 'small'))}
        </div>
      </div>
    </div>
  );
};

export default PalaceBox;