import { Solar, Lunar } from 'lunar-javascript';
import { STEMS, BRANCHES, PALACE_NAMES, SI_HUA_TABLE, BRIGHTNESS_MAP } from '../constants';
import { ZWDSChart, PalaceData, StarInfo, Gender } from '../types';

/**
 * 专利 CN101556628A 量化评分参考逻辑增强版
 */

const safeMod = (n: number, m: number) => ((n % m) + m) % m;

export const calculatePalaceScore = (palace: PalaceData): number => {
  if (!palace || !palace.stars) return 0;
  
  let score = 0;
  const brightnessMultipliers: Record<string, number> = {
    '庙': 1.25, '旺': 1.15, '得': 1.0, '利': 0.9, '平': 0.75, '不': 0.6, '陷': 0.4
  };

  const getSiHuaVal = (s: string | undefined) => {
    if (s === '禄') return 15;
    if (s === '权') return 10;
    if (s === '科') return 8;
    if (s === '忌') return -28;
    return 0;
  };

  palace.stars.forEach(star => {
    let baseWeight = 0;
    if (star.type === 'major') {
      if (['紫微', '天府', '太阳', '太阴'].includes(star.name)) baseWeight = 18;
      else if (['七杀', '破军', '贪狼'].includes(star.name)) baseWeight = 16;
      else baseWeight = 15;
    } else {
      if (['左辅', '右弼', '天魁', '天钺', '文昌', '文曲', '禄存'].includes(star.name)) baseWeight = 9;
      else if (['擎羊', '陀罗', '火星', '铃星', '地空', '地劫'].includes(star.name)) baseWeight = -14;
      else baseWeight = 3;
    }

    const multiplier = brightnessMultipliers[star.brightness] || 1.0;
    let starScore = baseWeight * multiplier;

    starScore += getSiHuaVal(star.siHua) * 1.0;
    starScore += getSiHuaVal(star.daXianSiHua) * 0.7;
    starScore += getSiHuaVal(star.liuNianSiHua) * 1.1;

    score += starScore;
  });

  return score;
};

export const calculateIntegratedScore = (chart: ZWDSChart, branchName: string): number => {
  try {
    const bIdx = BRANCHES.indexOf(branchName);
    if (bIdx === -1) return 60;

    const targetIdx = bIdx;
    const oppositeIdx = safeMod(bIdx + 6, 12);
    const wealthIdx = safeMod(bIdx + 4, 12);
    const careerIdx = safeMod(bIdx + 8, 12);

    const s1 = calculatePalaceScore(chart.palaces[targetIdx]);
    const s2 = calculatePalaceScore(chart.palaces[oppositeIdx]);
    const s3 = calculatePalaceScore(chart.palaces[wealthIdx]);
    const s4 = calculatePalaceScore(chart.palaces[careerIdx]);

    let total = (s1 * 1.0) + (s2 * 0.8) + (s3 * 0.6) + (s4 * 0.6);
    let normalized = 60 + (total / 4.5); 
    
    const result = Math.min(99, Math.max(1, Math.round(normalized)));
    return isNaN(result) ? 60 : result;
  } catch (e) {
    return 60;
  }
};

export const calculateChart = (
  birthDate: Date,
  gender: Gender,
  targetDate: Date = new Date(),
  selectedDaXianIdx: number | null = null
): ZWDSChart => {
  const solar = Solar.fromDate(birthDate);
  const lunar = solar.getLunar();
  
  const targetSolar = Solar.fromDate(targetDate);
  const targetLunar = targetSolar.getLunar();
  const targetYearStem = targetLunar.getYearGan();
  const targetYearBranch = targetLunar.getYearZhi();
  
  const yearStem = lunar.getYearGan();
  const yearBranch = lunar.getYearZhi();
  const yearBrIdx = BRANCHES.indexOf(yearBranch);
  const yearStemIdx = STEMS.indexOf(yearStem);
  
  const isYang = yearStemIdx % 2 === 0;
  const isForward = (gender === 'male' && isYang) || (gender === 'female' && !isYang);

  let month = Math.abs(lunar.getMonth());
  const day = lunar.getDay();
  if (lunar.getMonth() < 0 && day > 15) {
    month = (month % 12) + 1;
  }

  const hourIdx = safeMod(Math.floor((birthDate.getHours() + 1) / 2), 12);
  const mingIdx = safeMod(2 + (month - 1) - hourIdx, 12);
  const shenIdx = safeMod(2 + (month - 1) + hourIdx, 12);

  const startStemIdx = safeMod(yearStemIdx * 2 + 2, 10);
  const offsetFromYin = safeMod(mingIdx - 2, 12);
  const mingStemIdx = safeMod(startStemIdx + offsetFromYin, 10);
  const mingStem = STEMS[mingStemIdx];
  const mingBranch = BRANCHES[mingIdx];

  const getPhase = (s: string, b: string): { name: string, value: number } => {
    const pair = s + b;
    if ("甲子乙丑壬申癸酉庚辰辛巳甲午乙未壬寅癸卯庚戌辛亥".includes(pair)) return { name: "金四局", value: 4 };
    if ("丙子丁丑甲申乙酉壬辰癸巳丙午丁未甲寅乙卯壬戌癸亥".includes(pair)) return { name: "水二局", value: 2 };
    if ("戊子己丑丙申丁酉甲辰乙巳戊午己未丙寅丁卯甲戌乙亥".includes(pair)) return { name: "火六局", value: 6 };
    if ("庚子辛丑戊申己酉丙辰丁巳庚午辛未戊寅己卯丙戌丁亥".includes(pair)) return { name: "土五局", value: 5 };
    if ("壬子癸丑庚申辛酉戊辰己巳壬午癸未庚寅辛卯戊寅己卯戊戌己亥".includes(pair)) return { name: "木三局", value: 3 };
    return { name: "火六局", value: 6 };
  };
  const { name: fiveElements, value: phase } = getPhase(mingStem, mingBranch);

  let ziweiIdx = 0;
  const remainder = day % phase;
  if (remainder === 0) {
    ziweiIdx = safeMod(2 + (day / phase) - 1, 12);
  } else {
    const offset = phase - remainder;
    const move = offset % 2 === 0 ? offset : -offset;
    ziweiIdx = safeMod(2 + Math.ceil(day / phase) - 1 + move, 12);
  }

  const starPositions: Record<string, {pos: number, type: StarInfo['type']}> = {};
  const addMajor = (name: string, pos: number) => starPositions[name] = { pos: safeMod(pos, 12), type: 'major' };
  const addSecondary = (name: string, pos: number) => starPositions[name] = { pos: safeMod(pos, 12), type: 'secondary' };

  addMajor('紫微', ziweiIdx);
  addMajor('天机', ziweiIdx - 1);
  addMajor('太阳', ziweiIdx - 3);
  addMajor('武曲', ziweiIdx - 4);
  addMajor('天同', ziweiIdx - 5);
  addMajor('廉贞', ziweiIdx - 8);

  const tianfuIdx = safeMod(4 - ziweiIdx, 12);
  addMajor('天府', tianfuIdx);
  addMajor('太阴', tianfuIdx + 1);
  addMajor('贪狼', tianfuIdx + 2);
  addMajor('巨门', tianfuIdx + 3);
  addMajor('天相', tianfuIdx + 4);
  addMajor('天梁', tianfuIdx + 5);
  addMajor('七杀', tianfuIdx + 6);
  addMajor('破军', tianfuIdx + 10);

  addSecondary('文昌', 10 - hourIdx);
  addSecondary('文曲', 4 + hourIdx);
  addSecondary('左辅', 4 + (month - 1));
  addSecondary('右弼', 10 - (month - 1));
  addSecondary('地劫', 11 + hourIdx);
  addSecondary('地空', 11 - hourIdx);

  const luCunMap: Record<string, number> = { '甲': 2, '乙': 3, '丙': 5, '丁': 6, '戊': 5, '己': 6, '庚': 8, '辛': 9, '壬': 11, '癸': 0 };
  const lcPos = luCunMap[yearStem] ?? 0;
  addSecondary('禄存', lcPos);
  addSecondary('擎羊', lcPos + 1);
  addSecondary('陀罗', lcPos - 1);

  let huoStart = 0, lingStart = 0;
  if ("寅午戌".includes(yearBranch)) { huoStart = 1; lingStart = 3; }
  else if ("申子辰".includes(yearBranch)) { huoStart = 2; lingStart = 10; }
  else if ("巳酉丑".includes(yearBranch)) { huoStart = 3; lingStart = 10; }
  else if ("亥卯未".includes(yearBranch)) { huoStart = 9; lingStart = 10; }
  
  addSecondary('火星', huoStart + hourIdx);
  addSecondary('铃星', lingStart + hourIdx);

  const kuiYueMap: Record<string, [number, number]> = {
    '甲': [1, 7], '乙': [0, 8], '丙': [11, 9], '丁': [11, 9], '戊': [1, 7],
    '己': [0, 8], '庚': [1, 7], '辛': [6, 2], '壬': [3, 5], '癸': [3, 5]
  };
  const [kuiPos, yuePos] = kuiYueMap[yearStem] || [1, 7];
  addSecondary('天魁', kuiPos);
  addSecondary('天钺', yuePos);

  const siHuaStars = SI_HUA_TABLE[yearStem] || [];
  const liuNianSiHuaStars = SI_HUA_TABLE[targetYearStem] || [];
  
  let daXianSiHuaStars: string[] = [];
  if (selectedDaXianIdx !== null) {
    const palaceOffset = safeMod(selectedDaXianIdx - 2, 12);
    const daXianStemIdx = safeMod(startStemIdx + palaceOffset, 10);
    daXianSiHuaStars = SI_HUA_TABLE[STEMS[daXianStemIdx]] || [];
  }

  const boShiList = ['博士', '力士', '青龙', '小耗', '将军', '奏书', '飞廉', '喜神', '病符', '大耗', '伏兵', '官府'];
  const changShengList = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
  const csStartMap: Record<string, number> = { "水二局": 8, "木三局": 11, "火六局": 2, "土五局": 8, "金四局": 5 };
  const csStart = csStartMap[fiveElements] || 8;

  const palaces: PalaceData[] = BRANCHES.map((branch, i) => {
    const nameIdx = safeMod(mingIdx - i, 12);
    const palaceName = PALACE_NAMES[nameIdx];
    
    const distFromMing = isForward 
      ? safeMod(i - mingIdx, 12) 
      : safeMod(mingIdx - i, 12);
    
    const palaceStars: StarInfo[] = [];
    Object.entries(starPositions).forEach(([name, data]) => {
      if (data.pos === i) {
        palaceStars.push({
          name,
          type: data.type,
          brightness: BRIGHTNESS_MAP[name]?.[i] || '庙',
          siHua: siHuaStars.indexOf(name) !== -1 ? (['禄', '权', '科', '忌'][siHuaStars.indexOf(name)] as any) : undefined,
          liuNianSiHua: liuNianSiHuaStars.indexOf(name) !== -1 ? (['禄', '权', '科', '忌'][liuNianSiHuaStars.indexOf(name)] as any) : undefined,
          daXianSiHua: daXianSiHuaStars.indexOf(name) !== -1 ? (['禄', '权', '科', '忌'][daXianSiHuaStars.indexOf(name)] as any) : undefined
        });
      }
    });

    const currentStemIdx = safeMod(startStemIdx + safeMod(i - 2, 12), 10);
    const bsIdx = isForward ? safeMod(i - lcPos, 12) : safeMod(lcPos - i, 12);
    const csIdx = isForward ? safeMod(i - csStart, 12) : safeMod(csStart - i, 12);

    return {
      name: palaceName,
      originalName: branch,
      stem: STEMS[currentStemIdx],
      stars: palaceStars,
      isMing: i === mingIdx,
      isShen: i === shenIdx,
      shierShen: '', 
      boShi: boShiList[bsIdx % 12],
      changSheng: changShengList[csIdx % 12],
      daXianRange: [phase + distFromMing * 10, phase + distFromMing * 10 + 9]
    };
  });

  return {
    palaces,
    lunarDate: `农历 ${lunar.getYearInGanZhi()}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()} ${lunar.getTimeZhi()}时`,
    solarDate: solar.toFullString().split(' ')[0] + ' ' + birthDate.getHours().toString().padStart(2, '0') + ':' + birthDate.getMinutes().toString().padStart(2, '0'),
    weekDay: solar.getWeekInChinese(),
    zodiac: solar.getXingZuo(),
    targetYear: targetSolar.getYear().toString(),
    targetYearStem,
    targetYearBranch,
    baZi: {
      year: lunar.getYearInGanZhi(),
      month: lunar.getMonthInGanZhi(),
      day: lunar.getDayInGanZhi(),
      hour: lunar.getTimeInGanZhi()
    },
    fiveElements,
    mingZhu: ['贪狼', '巨门', '禄存', '文曲', '廉贞', '武曲', '破军', '武曲', '廉贞', '文曲', '禄存', '巨门'][yearBrIdx] || '',
    shenZhu: ['天机', '天梁', '天同', '太阴', '天府', '天相', '天机', '天梁', '天同', '太阴', '天府', '天相'][yearBrIdx] || ''
  };
};