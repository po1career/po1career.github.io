/* ============================================================================
   DSE 人生模擬器 — cited public statistics (Phase 2). Every figure here comes from an
   official source; the source, year and link are shown on the in-game 資料來源 page.
   Refresh yearly (owner's SOP calendar: Aug–Sep, with the JUPAS data update).
   Anything NOT in this file is an illustrative assumption and is labelled as such in the game.
   Exposes window.LifePathsStats.
   ========================================================================== */
(function () {
  'use strict';

  window.LifePathsStats = {
    // UGC: average ANNUAL salary (HK$'000) of graduates of full-time UGC-funded UNDERGRADUATE programmes in
    // full-time employment, by broad academic programme category — academic year 2024/25. (An average, not a median.)
    ugcUndergradAnnualK: {
      year: '2024/25',
      values: {
        'Medicine, Dentistry and Health': 554, 'Sciences': 299, 'Engineering and Technology': 287,
        'Business and Management': 292, 'Social Sciences': 294, 'Arts and Humanities': 279, 'Education': 363
      },
      zh: {
        'Medicine, Dentistry and Health': '醫科、牙科及健康', 'Sciences': '理學', 'Engineering and Technology': '工程及科技',
        'Business and Management': '商業及管理', 'Social Sciences': '社會科學', 'Arts and Humanities': '文學及人文學科', 'Education': '教育'
      },
      source: '大學教育資助委員會（教資會）：教資會資助全日制課程畢業生的平均年薪（按修讀程度及學科類別劃分）',
      url: 'https://data.gov.hk/en-data/dataset/hk-ugc-ugc-average-annual-salaries-graduates'
    },
    // the game's subject fields (JUPAS DB categories) → UGC broad academic programme category
    fieldToUgc: {
      Medicine: 'Medicine, Dentistry and Health', Health: 'Medicine, Dentistry and Health',
      Science: 'Sciences', Engineering: 'Engineering and Technology', Computing: 'Engineering and Technology',
      Business: 'Business and Management', SocialSciences: 'Social Sciences', Law: 'Social Sciences',
      Arts: 'Arts and Humanities', Design: 'Arts and Humanities', Education: 'Education'
    },
    // C&SD: median MONTHLY employment earnings of employed persons, 2025 (annual figures)
    csdByEducation: {
      year: 2025,
      values: { total: 20400, upperSecondary: 17200, diplomaCert: 20800, subDegree: 23000, degree: 36900 },
      source: '政府統計處：表 210-06315 按教育程度劃分的就業人士每月主要職業收入中位數',
      url: 'https://data.gov.hk/en-data/dataset/hk-censtatd-tablechart-210-06315'
    },
    csdByAge: {
      year: 2025,
      values: { '15-24': 15300, '25-34': 22500, '35-44': 24000, total: 20400 },
      source: '政府統計處：表 210-06314 按年齡劃分的就業人士每月主要職業收入中位數',
      url: 'https://www.censtatd.gov.hk/en/web_table.html?id=210-06314'
    },
    // HKEAA: 2025 HKDSE — day-school candidates meeting 332A (figures before results review)
    hkeaa332A: {
      year: 2025, percentDaySchool: 38.5, count: 16393,
      source: '香港考試及評核局：2025 年香港中學文憑考試成績統計（2025 年 8 月 26 日澄清稿）',
      url: 'https://www.hkeaa.edu.hk/DocLibrary/Media/2025_08_26_clarifications_2025_dse_results.pdf'
    },
    // UGC-funded senior-year (Year 3) places for sub-degree graduates — about 5,000 a year
    seniorYearPlaces: {
      approx: 5000,
      source: '立法會秘書處資料研究組：公帑資助高等教育（研究簡報）；各院校銜接資料',
      url: 'https://www.legco.gov.hk/research-publications/english/1819issh16-publicly-funded-higher-education-20190123-e.pdf'
    }
  };
})();
