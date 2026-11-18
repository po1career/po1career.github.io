/* ============================================================================
   DSE 人生模擬器 — all player-facing text (繁體中文 only: owner decision 2026-11-18,
   an approved exception to the site's bilingual rule). Exposes window.LifePathsText.
   Route texts follow the site's Pathways page (pathways.js) so the two never disagree.
   Wording rule: never "cut-off score"; JUPAS figures are past admission score references.
   ========================================================================== */
(function () {
  'use strict';

  window.LifePathsText = {
    title: 'DSE 人生模擬器',
    subtitle: '輸入你預計的文憑試成績，模擬放榜、聯招取錄和之後的出路。',
    eyebrow: '人生模擬 · 中六生',
    disclaimer: '這是模擬，不是預測。遊戲用本站 JUPAS 工具的同一套計分方法和真實的往年收生資料，但每一局都有運氣成分；結果只供參考和反思，真正的決定請與家人及升學輔導老師商量。',
    howItWorks: [
      '輸入你預計的成績（中、英、數、公民與社會發展及選修科）。',
      '揀選最多 20 個大學聯招志願，或讓遊戲按你的成績建議。',
      '七月放榜：實際成績或會與預計不同。',
      '八月聯招取錄：看看你獲哪個志願取錄，再決定下一步的出路。'
    ],
    phase1Note: '第一章：由預計成績到八月的出路。第二章（升學或工作的日子，模擬至 25–30 歲）即將推出。',

    steps: [
      { id: 'grades', label: '成績' }, { id: 'interests', label: '興趣' }, { id: 'list', label: '志願' },
      { id: 'results', label: '放榜' }, { id: 'offers', label: '取錄' }, { id: 'routes', label: '出路' }, { id: 'end', label: '總結' }
    ],

    categories: [
      { key: 'Science', zh: '理學' }, { key: 'Engineering', zh: '工程' }, { key: 'Computing', zh: '計算機及資訊科技' },
      { key: 'Business', zh: '商業及管理' }, { key: 'Medicine', zh: '醫學及牙醫學' }, { key: 'Health', zh: '護理及專職醫療' },
      { key: 'SocialSciences', zh: '社會科學' }, { key: 'Arts', zh: '文學及人文' }, { key: 'Education', zh: '教育' },
      { key: 'Law', zh: '法律' }, { key: 'Design', zh: '設計及創意媒體' }
    ],

    grades: {
      heading: '你預計的文憑試成績',
      hint: '按你現時的水平如實填寫，不用太樂觀或太悲觀。至少填兩科選修科。',
      core: '必修科', elective: '選修科', level: '等級', addElective: '選修科',
      csdAttained: '達標', csdNot: '未達標', none: '— 選擇 —',
      needCores: '請填寫中文、英文和數學的預計等級。',
      needElect: '請至少填寫兩科選修科（科目和等級）。',
      next: '下一步：你的興趣'
    },
    interests: {
      heading: '你對哪些範疇有興趣？',
      hint: '可選多項，用來幫你建議志願；不選也可以。你也可以先做本站的「職業興趣測驗」。',
      skip: '不選，直接下一步', next: '下一步：揀選志願'
    },
    list: {
      heading: '你的大學聯招志願（最多 20 個）',
      hint: '真實的聯招按 Band A（1–3）、B（4–6）、C（7–10）、D（11–15）、E（16–20）排列。大部分課程主要取錄放在 Band A 的申請人。',
      suggest: '幫我建議志願', clear: '清空', searchPh: '搜尋課程編號、課程或院校名稱',
      noResult: '找不到相符的課程', full: '已填滿 20 個志願',
      tagGood: '位置合適', tagMid: '留意', tagBad: '偏高風險',
      tagNote: '標籤用你「預計」的成績計算，與本站 JUPAS 搜尋器和放榜行動計劃的規則相同：A1 ≥ 下四分位、A2 ≥ 中位數、A3 ≥ 上四分位、B4 至 E20 ≥ 上四分位再高 10%。',
      noneEligible: '以你預計的成績，暫時未達任何課程的入學要求。你仍可繼續，看看放榜後的其他出路。',
      suggested: '已按你的成績和興趣建議志願，你可以再修改。',
      empty: '未有志願。可按「幫我建議志願」，或在上面搜尋加入。',
      next: '完成志願，前往放榜日', nextEmpty: '不填志願，直接前往放榜日'
    },
    results: {
      heading: '七月放榜日',
      intro: '成績公布了。實際成績有時會和預計不同——有人超水準，也有人失手。',
      th: ['科目', '預計', '實際', ''],
      same: '與預計相同', up: '比預計高', down: '比預計低',
      ruleTitle: '遊戲怎樣決定放榜成績？',
      rule: '每一科各自計算：約 55% 機會與預計相同、25% 低一級、15% 高一級、5% 低兩級（公民與社會發展維持不變）。這是遊戲的簡化假設——現時沒有公開的「預計 vs 實際」數據，所以我們在這裏清楚列明，並刻意稍為保守，以免過分樂觀。',
      met332A: '你的實際成績達到大學一般入學要求「332A」。',
      not332A: '你的實際成績未達大學一般入學要求「332A」（中、英第 3 級，數學第 2 級，公民與社會發展達標）。不用灰心——還有很多出路。',
      stat332A: '參考：2025 年約 38.5% 日校考生達到 332A（資料：香港考試及評核局）。',
      next: '等候八月聯招取錄'
    },
    offers: {
      heading: '八月：大學聯招第一輪取錄',
      got: function (slot, name, inst) { return '你獲得 ' + slot + ' 志願「' + name + '」（' + inst + '）取錄！'; },
      none: '這一局未獲聯招第一輪取錄。',
      noneHint: '這很常見。每年都有不少同學經自資學位、副學位、職業專才教育、內地或海外升學，又或先工作再進修，一樣走出自己的路。',
      noList: '你沒有填寫聯招志願，所以沒有聯招取錄。',
      detail: '每個志願的結果', th: ['志願', '課程', '你的分數', '結果'],
      st: {
        offer: '取錄', clearedLower: '亦達到，但聯招只會給你最高的一個志願', notCleared: '未達本局的競爭水平',
        ineligible: '未符合入學要求', notfound: '找不到課程'
      },
      howTitle: '遊戲怎樣模擬取錄？',
      how: [
        '你的分數用本站 JUPAS 工具的同一計分方法和你的「實際」成績計算。',
        '每個課程在這一局有一個模擬的「競爭水平」：以去年的收生分數參考（下四分位、中位數）推算，每年都會上落；學額少的課程上落更大。',
        '真實的聯招按你的志願次序，給你最高的一個能夠取錄你的志願——遊戲也是這樣。',
        '課程放在 B4 或之後，競爭水平會按該課程近年把取錄給予 Band A 申請人的比例提高；近年只取錄 Band A 申請人的課程，放在 Band A 以外幾乎不會取錄。',
        '需要面試的課程，面試表現會令結果多一點上落。',
        '這是簡化的模擬，不代表真實的取錄機會。'
      ],
      noData: '（沒有往年資料，遊戲當作一半機會）',
      interview: '（面試課程）', fewPlaces: '（學額少）',
      accept: '接受取錄', others: '先看看其他出路', toRoutes: '看看我的出路'
    },
    routes: {
      heading: '下一步，你會怎樣走？',
      hint: '每條路都是真實可行的路。部分出路有基本入學要求；這裏按你的實際成績顯示。',
      available: '可選', unavailable: '未符合',
      why: { noOffer: '需要聯招取錄', needs332A: '一般需要 332A', needs22222: '一般需要五科第 2 級（包括中、英）' },
      choose: '選擇這條路', entry: '入學', leadsTo: '出路', more: '了解更多'
    },
    routeInfo: {
      degree: { icon: '🎓', name: '接受聯招取錄，入讀大學', summary: '入讀你獲取錄的本地學士課程。',
        entry: '已獲大學聯招取錄。', leadsTo: '獲認可的學士學位，銜接專業資格或研究生課程。' },
      selffin: { icon: '🏛️', name: '自資學士學位', summary: '本地自資院校的學士課程，部分屬指定專業資助（SSSDP）。',
        entry: '按課程而定的文憑試要求；一般需達 332A。', leadsTo: '獲本地認證的學士學位。', link: 'https://www.cspe.edu.hk/en/' },
      subdeg: { icon: '📗', name: '副學位：副學士／高級文憑', summary: '兩年制課程，之後可銜接學士課程或就業。',
        entry: '一般須五科文憑試達第二級（包括語文科）。', leadsTo: '銜接學士課程（多為高年級入學）或就業。', link: 'https://www.eapp.gov.hk/en/' },
      vtc: { icon: '🔧', name: '職業專才教育（VTC／IVE）', summary: '由基礎課程到高級文憑，著重實用技能。',
        entry: '由基礎課程至高級文憑不等，入學要求各異。', leadsTo: '直接就業，或銜接學士課程。', link: 'https://www.vtc.edu.hk' },
      dae: { icon: '🪜', name: '應用教育文憑（前稱毅進）', summary: '為中六離校生而設，完成後等同五科文憑試第二級。',
        entry: '適合中六離校生；不需文憑試成績。', leadsTo: '可繼續升學（例如副學位）或就業。',
        link: 'https://www.edb.gov.hk/en/edu-system/other-edu-training/vocational-other-edu-program/Diploma%20of%20Applied%20Education/Index.html' },
      mainland: { icon: '🏯', name: '內地升學（文憑試收生計劃）', summary: '以文憑試成績申請內地院校的學士課程。',
        entry: '以文憑試成績為準；各院校自訂要求（遊戲以 332A 為簡化門檻）。', leadsTo: '內地院校頒授的學士學位。',
        link: 'https://www.edb.gov.hk/en/edu-system/postsecondary/policy-doc/pilot-scheme.html' },
      overseas: { icon: '✈️', name: '海外升學', summary: '到海外修讀學士或預科課程。',
        entry: '按國家及院校而定；不少海外大學承認文憑試成績。', leadsTo: '海外學士學位及國際視野；費用一般較高。' },
      retake: { icon: '🔁', name: '重考文憑試', summary: '再讀一年，明年以重考生身份再考。',
        entry: '任何人都可以報考；部分大學對重考生的成績有額外規則（例如扣減重考科目的分數）。', leadsTo: '明年再申請聯招。' },
      work: { icon: '💼', name: '先工作', summary: '先投入職場，累積經驗，日後可兼讀進修。',
        entry: '沒有特定要求。', leadsTo: '工作經驗；日後可經兼讀或持續進修再升學。' }
    },
    end: {
      heading: '第一章總結',
      predicted: '你預計的成績', actual: '你的實際成績', offer: '聯招取錄', path: '你選擇的出路', noOffer: '沒有聯招取錄',
      next: '第二章（升學或工作的日子，模擬至 25–30 歲）即將推出。',
      again: '同一份志願，再玩一次（全新運氣）', edit: '修改預計成績或志願', restart: '由頭開始',
      real: '回到現實：',
      realLinks: [
        { href: 'jupas-finder.html', label: 'JUPAS 搜尋器' }, { href: 'jupas-planner.html', label: '放榜行動計劃' },
        { href: 'pathways.html', label: '多元出路' }
      ],
      teacher: '想認真計劃？帶着你的想法，和家人及升學輔導老師傾談。',
      runCode: '本局代碼'
    },
    intro: { start: '開始', resume: '繼續上一局', restart: '重新開始', how: '玩法' },
    common: { back: '上一步', lvlUnit: '級' }
  };
})();
