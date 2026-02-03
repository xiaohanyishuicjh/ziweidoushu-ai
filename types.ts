
export type Gender = 'male' | 'female';

export interface StarInfo {
  name: string;
  type: 'major' | 'secondary' | 'helper' | 'adverbial' | 'minor';
  brightness: string; // 庙旺利陷
  siHua?: '禄' | '权' | '科' | '忌'; // 生年四化
  liuNianSiHua?: '禄' | '权' | '科' | '忌'; // 流年四化
  daXianSiHua?: '禄' | '权' | '科' | '忌'; // 大限四化
}

export interface PalaceData {
  name: string; // 宫位名 (命宫, 兄弟等)
  originalName: string; // 固定地支 (子, 丑等)
  stem: string; // 天干
  stars: StarInfo[];
  isMing: boolean;
  isShen: boolean;
  shierShen: string; // 十二神
  boShi: string; // 博士十二神
  changSheng: string; // 五行长生
  daXianRange: [number, number]; // 大限区间
}

export interface ZWDSChart {
  palaces: PalaceData[];
  lunarDate: string;
  solarDate: string;
  weekDay: string; // 星期
  zodiac: string; // 星座
  targetYear: string; // 流年年份
  targetYearStem: string; // 流年天干
  targetYearBranch: string; // 流年地支
  baZi: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };
  fiveElements: string; // 五行局
  mingZhu: string; // 命主
  shenZhu: string; // 身主
}
