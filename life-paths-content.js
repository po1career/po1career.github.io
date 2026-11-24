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
    // Safety notice (owner, 2026-11-24): it stresses that the game's JUPAS offers are simulated. It never names the school
    // or the team, and no screen shows research figures, their sources, exact chance numbers or the teachers' rules.
    disclaimer: '模擬遊戲，不是預測。遊戲中的聯招取錄是按往年收生資料和簡化假設抽籤得出的結果，不是 JUPAS 的真實取錄，也不代表你的取錄機會；真實取錄由各院校決定。課程、入學要求及收生資料一切以 JUPAS 網站（www.jupas.edu.hk）及各院校最新公布為準；填報志願前，請與家人及升學輔導老師商量。',
    // the full notice: folded under the banner, and on the one-time tick-box screen
    // (bump NOTICE_V in life-paths-ui.js whenever its meaning changes, so every device is asked again)
    notice: {
      title: '使用須知及免責聲明',
      intro: '開始之前，請先細閱以下使用須知。',
      items: [
        ['教育用途', '本遊戲只供生涯規劃教育和反思之用，並非 JUPAS 官方工具，與大學聯合招生辦法（JUPAS）、香港考試及評核局和各院校並無關連，亦未獲它們認可。'],
        ['取錄是模擬', '遊戲中的放榜成績和聯招取錄，是按往年收生資料和遊戲的簡化假設抽籤得出，每局不同。這不是 JUPAS 的取錄，不是預測，也不代表你真實的取錄機會；真實取錄由各院校按當年的申請人、入學要求、面試及其他準則決定。'],
        ['資料限制', '課程資料、入學要求及收生分數參考（上四分位、中位數、下四分位）來自往年資料，可能不完整、有誤或已過時，亦不代表本年度的結果。一切以 JUPAS 網站（www.jupas.edu.hk）及各院校最新公布為準。'],
        ['不是建議', '遊戲內容不構成升學、就業、財務或任何專業意見。填報聯招志願或作其他重要決定前，請與家人及升學輔導老師商量。'],
        ['純屬虛構', '遊戲中的人物、同學、公司、收入、小故事和人生事件，均屬虛構或簡化假設；如有雷同，純屬巧合。'],
        ['私隱', '遊戲只在你的裝置上運行。你輸入的成績、志願和遊戲紀錄只儲存在這部裝置的瀏覽器內，不會上傳；在公用電腦上玩的話，玩完後請清除瀏覽器紀錄。'],
        ['責任', '本網站已盡力令內容合理，但不保證資料準確、完整或適時，亦不會就任何人因使用本遊戲或依賴其結果而作出的決定，或因此引致的任何損失，承擔任何責任。']
      ],
      ack: '我已閱讀並明白以上使用須知',
      go: '繼續'
    },
    howItWorks: [
      '揀一個角色和夢想，再輸入你預計的成績（或用「快速開始」揀一個學生）。',
      '揀選最多 20 個大學聯招志願，或讓遊戲按你的成績建議。',
      '七月放榜：實際成績或會與預計不同。',
      '八月聯招取錄（模擬）：看看這一局你獲哪個志願取錄，再決定下一步的出路。'
    ],
    phase1Note: '第一章：由預計成績到八月的出路。第二章：之後的升學或工作日子，模擬至 25 歲（短篇）或 30 歲（長篇）。',

    steps: [
      { id: 'me', label: '角色' }, { id: 'grades', label: '成績' }, { id: 'interests', label: '興趣' }, { id: 'list', label: '志願' },
      { id: 'results', label: '放榜' }, { id: 'offers', label: '取錄' }, { id: 'routes', label: '出路' },
      { id: 'life', label: '人生' }, { id: 'end', label: '總結' }
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
      hint: '聯招的志願分為 Band A（1–3）、B（4–6）、C（7–10）、D（11–15）、E（16–20）。往年大部分課程主要取錄放在 Band A 的申請人。',
      suggest: '幫我建議志願', clear: '清空', full: '已填滿 20 個志願',
      // the programme picker (grouped like the Finder+)
      pick: '🔎 揀選課程',
      pickHint: '課程按你「預計」的分數分組：與往年收生分數參考（上四分位、中位數、下四分位）比較，只供參考。按「＋ 加入」放進志願表。',
      searchPh: '搜尋課程編號、名稱、院校或關鍵字', catLabel: '學科範疇', instLabel: '院校', groupLabel: '按你的分數分組',
      groups: { uq: '≥ 上四分位', median: '≥ 中位數', lq: '≥ 下四分位', belowlq: '< 下四分位', nodata: '沒有收生分數', inelig: '未達要求' },
      groupHint: {
        uq: '你的分數達到或高於往年收生的上四分位——在這些課程的取錄者之中屬較高分。',
        median: '你的分數達到或高於往年收生的中位數，但低於上四分位。',
        lq: '你的分數達到或高於往年收生的下四分位，但低於中位數。',
        belowlq: '你符合入學要求，但分數低於往年收生的下四分位——獲取錄的機會較微。',
        nodata: '沒有完整的往年收生分數可比較（多為新開辦或重組的課程），結果較難預計。',
        inelig: '以你預計的成績，未達這些課程的入學要求——按本站資料，遊戲中不會獲取錄；入學要求以院校最新公布為準。'
      },
      clearFilters: '清除篩選', noneFit: '這一組沒有符合篩選的課程。可試試其他分組，或清除篩選。',
      more: function (n) { return '再顯示 ' + n + ' 個'; },
      yourScore: '你的分數', median: '中位數',
      add: '＋ 加入', fullBtn: '已滿',
      addAria: function (name) { return '把「' + name + '」加入志願表'; },
      removeAria: function (name, slot) { return '「' + name + '」在第 ' + slot + ' 志願，按此移除'; },
      // short names for the institution chips (keys = the database's institution codes)
      instShort: { HKU: '港大', CUHK: '中大', HKUST: '科大', PolyU: '理大', CityUHK: '城大', HKBU: '浸大', LingnanU: '嶺大',
        EdUHK: '教大', HKMU: '都大', HSUHK: '恒大', HKSYU: '樹仁', SFU: '聖方濟各', TWC: '東華', 'VTC-THEi': 'THEi',
        UOWCHK: '伍倫貢', HKCHC: '珠海' },
      // my list (20 slots, banded like the real form)
      mine: '⭐ 我的志願表', count: function (n) { return n + ' / 20'; },
      dragHint: '拖曳 ⠿ 或用 ▲▼ 調整次序，✕ 移除。',
      dragTitle: '拖曳調整次序',
      bandSep: { A: 'Band A · 第 1–3 志願', B: 'Band B · 第 4–6 志願', C: 'Band C · 第 7–10 志願',
        D: 'Band D · 第 11–15 志願', E: 'Band E · 第 16–20 志願' },
      up: function (slot) { return '上移（現為 ' + slot + '）'; }, down: function (slot) { return '下移（現為 ' + slot + '）'; },
      del: function (slot) { return '移除 ' + slot; },
      moved: function (name, slot) { return '已把「' + name + '」移到 ' + slot + '。'; },
      // the teacher JUPAS Evaluator's own labels (its Chance and Band columns)
      ev: { likely: '較有把握', moderate: '較為進取', risky: '風險較高', ineligible: '未達入學要求', nodata: '沒有資料' },
      band: { wrong: '組別錯誤', caution: '建議置 Band A' },
      tagNote: '標籤用你「預計」的成績和遊戲的簡化評估：「機會」看你的分數與往年收生分數參考的距離和志願的排位；「組別錯誤」表示這課程近年絕大部分取錄給了放在 Band A 的申請人，遊戲假設放在 Band B 至 E 不會取錄（遊戲規則，不是聯招的正式規定）。標籤只供參考，不代表真實的取錄機會；放榜後會用你的實際成績再評估一次。',
      noneEligible: '以你預計的成績，暫時未達任何課程的入學要求。你仍可繼續，看看放榜後的其他出路。',
      suggested: '已按你的成績和興趣建議志願，你可以再修改。',
      empty: '未有志願。可按「幫我建議志願」，或在上面揀選課程加入。',
      next: '完成志願，前往放榜日', nextEmpty: '不填志願，直接前往放榜日'
    },
    results: {
      heading: '七月放榜日',
      intro: '成績公布了。實際成績有時會和預計不同——有人超水準，也有人失手。',
      th: ['科目', '預計', '實際', ''],
      same: '與預計相同', up: '比預計高', down: '比預計低',
      ruleTitle: '遊戲怎樣決定放榜成績？',
      rule: '每一科各自抽籤：多數與預計相同，也可能低一級、高一級，或低兩級（公民與社會發展維持不變）。這是遊戲的簡化假設，並刻意稍為保守，以免過分樂觀；不是預測。',
      met332A: '你的實際成績達到大學一般入學要求「332A」。',
      not332A: '你的實際成績未達大學一般入學要求「332A」（中、英第 3 級，數學第 2 級，公民與社會發展達標）。不用灰心——還有很多出路。',
      next: '等候八月聯招取錄'
    },
    offers: {
      heading: '八月：大學聯招第一輪取錄',
      simNote: '以下是這一局的模擬結果，不是 JUPAS 取錄，也不是預測——再玩一次，結果可以不同。',
      got: function (slot, name, inst) { return '這一局，你獲得 ' + slot + ' 志願「' + name + '」（' + inst + '）取錄！'; },
      none: '這一局未獲聯招第一輪取錄。',
      noneHint: '這很常見。每年都有不少同學經自資學位、副學位、職業專才教育、內地或海外升學，又或先工作再進修，一樣走出自己的路。',
      noList: '你沒有填寫聯招志願，所以沒有聯招取錄。',
      detail: '每個志願的結果', th: ['志願', '課程', '你的分數', '評估', '結果'],
      st: {
        offer: '取錄', clearedLower: '亦會取錄，但聯招只會給你最高的一個志願', notCleared: '這次未獲取錄',
        wrongBand: '組別錯誤（遊戲規則）：這課程近年絕大部分取錄給了 Band A 申請人，遊戲假設放在 Band A 以外不會取錄——這不是聯招的正式規定',
        ineligible: '未符合入學要求', notfound: '找不到課程'
      },
      howTitle: '遊戲怎樣模擬取錄？',
      how: [
        '你的分數用本站 JUPAS 工具的同一計分方法和你這一局的「實際」成績計算。',
        '遊戲按你的分數與往年收生分數參考（下四分位、中位數、上四分位）的距離和志願的排位，為每個志願定一個機會，再抽籤決定。這些機會是遊戲的假設，不是真實的取錄機率。',
        '「組別錯誤」（遊戲規則）：近年絕大部分取錄都給了放在 Band A 的申請人的課程，如果放在 B4 至 E20，遊戲不會取錄——這不是聯招的正式規定。',
        '真實的聯招大致是：在願意取錄你的課程之中，給你排得最前的一個。遊戲沿用這個原則，但真實取錄由各院校按自己的準則和當年的申請人決定。',
        '這是簡化的模擬：結果不是 JUPAS 取錄，不是預測，也不代表你真實的取錄機會。'
      ],
      noData: '（沒有往年收生分數資料）',
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
      degree: { icon: '🎓', name: '接受聯招取錄，入讀大學', summary: '入讀你獲聯招取錄的課程（絕大部分是本地學士課程）。',
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
    common: { back: '上一步', lvlUnit: '級' },

    /* ---------- Phase 2 ---------- */
    modes: {
      heading: '揀選模式',
      short: { name: '短篇（約 10 分鐘）', desc: '每一回合代表兩年，模擬至 25 歲。' },
      long: { name: '長篇（約 25 分鐘）', desc: '每一回合代表一年，模擬至 30 歲，事件更多。' }
    },
    clearing: {
      button: '參加八月尾「補選」',
      heading: '八月尾：補選',
      intro: '第一輪沒有取錄的話，部分課程仍可能有餘額。下面是你符合入學要求、而且分數接近本局競爭水平的課程。揀一個試試看。',
      note: '遊戲假設：你揀的課程有機會仍有學位，由抽籤決定（簡化的假設，不代表真實情況）。',
      none: '這一局沒有適合補選的課程。',
      pick: '揀這個', yourScore: '你的分數',
      success: function (name, inst) { return '補選成功！這一局你獲「' + name + '」（' + inst + '）取錄。'; },
      fail: '可惜這個課程已經額滿。不要緊，還有很多出路。',
      toRoutes: '看看我的出路'
    },
    retake: {
      heading: '重考文憑試',
      intro: '揀最多兩科重考。明年七月放榜時，每科以兩次考試中較好的成績計算。',
      rule: '遊戲假設：每科重考可能與上次相同、進步一至兩級，或退步一級，取較好的一次（所以不會比上次差）。有重考生規則的課程，遊戲會把分數打個折扣（簡化：真實規則因院校而異，以院校公布為準）。',
      pickMax: '最多揀兩科。',
      next: '一年後……七月放榜',
      resultsHeading: '第二次放榜',
      resultsIntro: '一年過去了。你重考的科目，以兩次考試中較好的成績計算。',
      th: ['科目', '上次成績', '今次考試', '計算的成績'],
      up: '進步了', same: '維持上次成績',
      tally: function (n, up) { return '重考 ' + n + ' 科，其中 ' + up + ' 科進步。'; },
      roundHeading: '第二年：大學聯招第一輪取錄',
      listNote: '你沿用去年的志願。',
      done: '已重考過一次', after: '（重考後）'
    },
    field: {
      heading: '你會讀哪個範疇？',
      hint: '這會影響之後的課程內容和畢業後的工作。',
      start: '開始這段旅程'
    },
    meters: { study: '學業', skills: '能力經驗', wellbeing: '身心', connections: '人脈', money: '財政' },
    meterIcons: { study: '📚', skills: '🛠', wellbeing: '💚', connections: '🤝', money: '💰' },
    creds: { dse: '中學文憑', dae: '應用教育文憑', subdegree: '副學位', degree: '學士學位', masters: '碩士學位' },
    tracks: {
      ugc: '學士課程', selffin: '自資學士課程', mainland: '內地學士課程', overseas: '海外學士課程',
      subdeg: '副學位課程', vtc: '高級文憑（職業專才教育）', dae: '應用教育文憑', senior: '學士課程（高年級入學）',
      topup: '自資銜接學士課程', masters: '碩士課程', work: '全職工作', jobsearch: '找工作中', whs: '工作假期'
    },
    life: {
      heading: '人生旅程',
      age: function (a) { return a + ' 歲'; },
      yearOf: function (y) { return '第 ' + y + ' 年'; },
      focusHeading: function (a, step) { return step === 2 ? '這兩年（' + a + '–' + (a + 1) + ' 歲），你會專注甚麼？' : '這一年（' + a + ' 歲），你會專注甚麼？'; },
      timeline: '人生時間線',
      income: '月薪', changed: '變化：',
      focusDone: function (name, step) { return (step === 2 ? '這兩年' : '這一年') + '你選擇了「' + name + '」。'; },
      chose: '選擇：',
      eventTag: '發生了一件事',
      support: '如果你在現實中也有這種感覺，請找你信任的人傾談，或聯絡學校的社工／輔導老師。',
      toEnd: '看看我的人生總結'
    },
    focus: {
      study: { name: '用功讀書', desc: '專心讀書，爭取好成績。（學業↑，身心稍↓）' },
      experience: { name: '實習／累積經驗', desc: '找實習、做項目，累積實戰經驗。（能力經驗↑）' },
      parttime: { name: '兼職賺錢', desc: '做兼職幫補開支。（財政↑，學業、身心稍↓）' },
      balance: { name: '休息平衡', desc: '好好照顧自己，作息有度。（身心↑）' },
      explore: { name: '參加活動、認識朋友', desc: '參加學會、比賽和活動。（人脈↑，能力經驗稍↑）' },
      perform: { name: '全力投入工作', desc: '爭取表現，加薪機會較高。（能力經驗、財政↑，身心↓）' },
      learn: { name: '業餘進修', desc: '下班後讀兼讀課程，日後可提升學歷。（學業↑，財政、身心稍↓）' },
      network: { name: '擴闊人脈、留意機會', desc: '多認識行內朋友，或會遇到新工作機會。（人脈↑）' },
      wbalance: { name: '平衡生活', desc: '工作以外，也照顧身心和家人。（身心↑）' },
      save: { name: '努力儲蓄', desc: '控制開支，為將來打算。（財政↑）' }
    },
    events: {
      scholarship: { title: '獲得獎學金', body: '你的努力被看見了——你獲頒一筆獎學金。', choices: ['太好了！'], results: ['獎學金幫補了學費，也給你很大鼓勵。'] },
      exchange: { title: '交流機會', body: '學校有一個學期的交流名額，你想去嗎？', choices: ['去交流', '留在本地讀書', '去非英語國家交流，順道學一種新語言'],
        results: ['你在交流期間認識了很多新朋友，眼界大開，但開支也不少。', '你留在本地，專心完成課程。',
          '你在當地上語言課、和本地同學交朋友，回來時多了一種語言和一班外國朋友。'] },
      internship: { title: '實習機會', body: '一間機構願意給你暑期實習。', choices: ['接受實習', '婉拒，專心讀書', '全力以赴，爭取畢業後獲留用'],
        results: ['實習很辛苦，但你學到很多，也多了一位推薦人。', '你把暑假用來溫習和休息。',
          '你主動承擔項目，表現亮眼——公司答應你畢業後可以回來上班。'] },
      award: { title: '項目獲獎', body: '你參與的項目／比賽獲得獎項！', choices: ['繼續努力'], results: ['這次經驗令你更有自信，也認識了志同道合的人。'] },
      mentor: { title: '遇上師友', body: '一位行內前輩願意定期和你傾談，分享經驗。', choices: ['接受指導', '暫時不用', '請前輩介紹實習機會'],
        results: ['前輩的建議令你少走了不少冤枉路。', '你決定先靠自己摸索。', '前輩替你寫了推薦信，你得到一份實習，履歷也豐富了。'] },
      volunteer: { title: '義工服務', body: '朋友邀請你一起參加長期義工服務。', choices: ['參加', '太忙了，下次吧'],
        results: ['服務別人令你很有滿足感，也擴闊了圈子。', '你把時間留給其他事情。'] },
      switchField: { title: '想轉讀其他範疇？', body: '你發覺現在讀的科目和自己的興趣不太合。', choices: ['轉讀其他範疇（要多讀一年）', '堅持完成'],
        results: ['轉科後你讀得開心得多，只是要多花一年。', '你決定堅持下去，雖然有時讀得辛苦。'] },
      familyMoney: { title: '家庭經濟緊張', body: '家中最近開支大，經濟比較緊。', choices: ['多做兼職幫補家計', '申請資助或學生貸款', '重新編排開支，再申請資助'],
        results: ['你多做了兼職，手頭鬆一點，但人也累了。', '你申請了資助，暫時渡過難關。（政府和院校設有學費資助及貸款計劃）',
          '你和家人一起列出開支、刪減不必要的支出，再申請資助，比預期更快渡過難關。'] },
      familyCare: { title: '家人需要照顧', body: '家中長輩身體欠佳，需要家人輪流照顧。', choices: ['抽時間幫忙照顧', '與家人商量分工'],
        results: ['你花了不少時間照顧家人，雖然辛苦，一家人更親近了。', '大家分工合作，你也能兼顧自己的事。'] },
      moveHome: { title: '搬屋', body: '家人決定搬到較遠的地區，路程長了。', choices: ['調整作息'], results: ['你花了一段時間適應新的生活節奏。'] },
      friendPath: { title: '好友各有路向', body: '中學好友選了一條和你很不同的路。', choices: ['保持聯絡', '各自忙碌'],
        results: ['你們常常分享近況，互相打氣。', '你們慢慢少了聯絡。'] },
      overwhelmed: { title: '感到很累', body: '最近事情太多，你覺得很累、有點喘不過氣。', choices: ['停一停，好好休息', '找信任的人傾訴', '約見輔導員，一起訂下休息計劃'],
        results: ['休息過後，你重新有了動力。', '說出來之後，你感覺輕鬆了不少。', '輔導員幫你把事情排好先後，也提醒你留時間休息；你重新找回節奏。'],
        support: true },
      promotion: { title: '升職加薪', body: '你的表現獲得肯定，升職了！', choices: ['太好了'], results: ['月薪增加了約一成。'] },
      jobOffer: { title: '新的工作機會', body: '朋友介紹了一份待遇較好的新工作。', choices: ['轉工', '留在原公司'],
        results: ['你轉了新工作，月薪提高了。', '你選擇留在熟悉的環境，繼續累積經驗。'] },
      crunch: { title: '項目趕工', body: '公司有一個大項目要趕在限期前完成。', choices: ['加班完成', '和上司商量分工'],
        results: ['項目順利完成，你學到很多，但累壞了。', '你和上司商量好安排，壓力減輕了。'] },
      masters: { title: '進修碩士？', body: '你考慮兼讀一個碩士課程，提升自己。', choices: ['報讀兼讀碩士', '暫時不讀'],
        results: ['你開始兼讀碩士，大約兩年後完成。', '你決定先專注工作。'] },
      // more decisions (2026-11-19)
      hall: { title: '宿舍生活', body: '大學有宿位給你，要搬進宿舍嗎？', choices: ['住宿舍', '留在家住'],
        results: ['宿舍生活熱鬧，你認識了一班好朋友，只是住宿費不便宜。', '你留在家住，省下住宿費，溫習也較專心。'] },
      society: { title: '學會幹事', body: '學會正在招募新一屆幹事，朋友叫你一起參選。', choices: ['參選幹事', '專心讀書', '參選主席，帶領整個學會'],
        results: ['籌辦活動很忙，但你學會了合作和解難，也認識了很多人。', '你把時間留給學業。',
          '你當選主席，帶領團隊辦了幾個大型活動——很累，但成長了很多。'] },
      minor: { title: '副修？', body: '你可以在主修以外，再副修一個科目。', choices: ['副修另一科', '專注主修', '挑戰雙主修'],
        results: ['副修令你的知識面更廣，只是功課多了。', '你專注主修，讀得比較從容。', '雙主修很吃力，但你兩科都讀得不錯，履歷也更突出。'] },
      sports: { title: '加入校隊／運動', body: '朋友邀請你一起參加運動隊伍。', choices: ['加入', '遲些再算'],
        results: ['定期運動令你精神好了，還多了一班隊友。', '你把時間留給溫習。'] },
      moveOut: { title: '搬出去住？', body: '工作穩定了，你考慮租屋自己住。', choices: ['搬出去住', '住在家，繼續儲錢'],
        results: ['自己住更自由，也學會照顧自己——不過每個月都要交租。', '你留在家住，儲蓄增加得更快。'] },
      certificate: { title: '夜校進修證書', body: '公司鼓勵員工報讀相關的專業證書課程。', choices: ['報讀', '暫時不讀'],
        results: ['下班後上課很累，但你考到證書，月薪也加了一點。', '你把下班時間留給休息。'] },
      careerSwitch: { title: '想轉行？', body: '工作了一段時間，你開始想：這是我真正想做的事嗎？', choices: ['轉去自己有興趣的行業', '留在現在的行業'],
        results: ['你轉了行，由新手做起，月薪少了一點，但做得開心得多。', '你決定留下，繼續累積經驗。'] },
      sideBiz: { title: '副業／小生意', body: '你有一個小生意的點子，想利用工餘時間試一試。', choices: ['試一試', '不冒險', '開網店，賣自己設計的產品'],
        results: ['你開始經營副業，結果如何，要看市場反應。', '你決定先專注正職。', '你把自己的設計放上網店，結果如何，要看顧客反應。'] },
      posting: { title: '外派機會', body: '公司想派你到海外分部工作一段時間。', choices: ['接受外派', '留在香港'],
        results: ['外派期間你獨當一面，眼界和人脈都擴闊了，月薪也提高了。', '你留在香港，生活比較穩定。'] },
      // mini-stories (2026-11-24)
      startup1: { title: '朋友的初創', body: '中學好友正在做一個幫學生配對補習老師的 App，邀請你一起幫手。', choices: ['加入，用課餘或下班時間幫手', '婉拒，專心做好現在的事'],
        results: ['你們一班人邊做邊學，App 慢慢有了雛形。', '你決定先專心自己的路，但仍然支持朋友。'] },
      startup2: { title: '全力投入初創？', body: 'App 有了第一批用戶，好友問你要不要投放更多時間和一點積蓄。', choices: ['全力投入', '保持兼顧'],
        results: ['你投入了更多時間和金錢——結果如何，要看市場反應。', '你保持兼顧，從中學到不少做產品和營運的知識。'] },
      startupGrew: { title: '初創有好消息', body: 'App 用戶愈來愈多，一間公司提出收購，你分到一筆錢。', choices: ['用這筆錢進修', '先儲起來'],
        results: ['你報讀了課程，想把實戰經驗變成學問。', '你把錢儲起來，為將來打算。'] },
      startupClosed: { title: '初創結束了', body: '用戶增長不及預期，團隊決定結束 App。', choices: ['把經驗寫進履歷，找相關工作', '先好好休息一下'],
        results: ['面試時，大家都對你的初創經驗很有興趣。', '休息過後，你重新出發。'] },
      shop1: { title: '家庭小店', body: '家人經營的小店生意轉淡，想你週末幫手。', choices: ['每個週末去幫手', '有空才幫手'],
        results: ['週末在店裏幫手，你更明白做生意的辛苦，和家人也更親近。', '你有空才去幫手，家人也體諒。'] },
      shop2: { title: '小店搬上網？', body: '你提議為小店開網店，接受網上訂購。', choices: ['動手做網店', '保持原狀'],
        results: ['你設計網頁、拍產品相——結果如何，要看顧客反應。', '小店維持原來的方式，你繼續在週末幫手。'] },
      shop3: { title: '小店的將來', body: '網店愈做愈好，家人問你將來會不會考慮接手。', choices: ['考慮接手，先學好經營', '支持家人，自己走自己的路'],
        results: ['你開始學習記帳和入貨，為將來做準備。', '家人支持你走自己的路，小店也有了新方向。'] }
    },
    // the mini-stories' names (an event card shows 「📖 朋友的初創（2/3）」)
    stories: { startup: '朋友的初創', shop: '家庭小店', step: function (name, n, of) { return '📖 小故事：' + name + '（' + n + '/' + of + '）'; } },
    branches: {
      afterDegree: { title: '畢業了！下一步？', short: '畢業後', options: { work: '開始找工作', masters: '先讀一年碩士（自費）', whs: '去一年工作假期，回來再找工作' },
        note: '香港與多個國家和地區設有工作假期計劃，讓年輕人一邊旅遊、一邊短期工作（各地的名額和申請資格不同，詳情見勞工處網頁）。' },
      afterSub: { title: '完成副學位，下一步？', short: '完成副學位後', options: { senior: '申請教資會資助學士（高年級入學）', topup: '讀自資銜接學士（兩年）', work: '開始工作' },
        note: '遊戲假設你有機會獲得資助學士高年級學額，按你的「學業」上落（簡化假設）。' },
      afterSeniorNo: { title: '這次未獲高年級學額，下一步？', short: '未獲高年級學額後', options: { topup: '讀自資銜接學士（兩年）', work: '開始工作' } },
      afterDae: { title: '完成應用教育文憑，下一步？', short: '完成應用教育文憑後', options: { subdeg: '讀副學位', vtc: '讀高級文憑（職業專才教育）', work: '開始工作' } }
    },
    logs: {
      startDegree: function (name, inst, yrs) { return '入讀「' + name + '」（' + inst + '），' + yrs + ' 年制。'; },
      startTrack: function (track, field) { return '開始' + track + (field ? '（' + field + '）' : '') + '。'; },
      startWork: '中學畢業後，開始找工作。',
      graduated: function (cred) { return '畢業，取得' + cred + '！'; },
      gotJob: function (field, monthly) { return '找到全職工作' + (field ? '（' + field + '相關）' : '') + '，月薪約 HK$' + monthly.toLocaleString('en-US') + '。'; },
      noJobYet: '暫時未找到全職工作，先做兼職，繼續尋找。',
      seniorYes: '成功獲得教資會資助學士高年級學額！',
      seniorNo: '這次未獲高年級學額。',
      partTimeDone: function (cred) { return '完成兼讀課程，學歷提升至' + cred + '，月薪也提高了。'; },
      mastersDone: '完成兼讀碩士，月薪提高了。',
      keptOn: function (field, monthly) { return '實習公司兌現承諾，你一畢業就回去上班' + (field ? '（' + field + '相關）' : '') + '，月薪約 HK$' + monthly.toLocaleString('en-US') + '。'; },
      whsStart: '出發去一年工作假期！一邊旅遊，一邊打工。',
      whsDone: '工作假期結束，帶着新的見識回港找工作。',
      bizWin: '副業做得不錯，賺到一筆錢，也多了一班客人和合作夥伴。',
      bizLoss: '副業最後蝕了一點錢，但你學會了很多做生意的實戰經驗。',
      switchedField: function (field) { return '正式轉行到' + field + '相關的工作。'; },
      startupGrew: '初創拿到第一筆投資，App 用戶大增！',
      startupClosed: '初創的資金用完了，團隊考慮下一步——但你學到很多實戰經驗。',
      shopOnlineWin: '網店反應很好，小店的生意回升了！',
      shopOnlineSlow: '網店起步較慢，但你學會了網上推廣。'
    },
    lifeEnd: {
      heading: function (age) { return '你的人生路（至 ' + age + ' 歲）'; },
      now: '現在', cred: '最高學歷', monthly: '月薪', status: '狀態',
      keyChoices: '這一路上的選擇', meters: '最後的狀態', chapter1: '第一章：由預計成績到八月',
      topFocus: '最常專注', times: function (n) { return n + ' 次'; }, strengths: '強項'
    },
    data: {
      // plain words only: no figures, no sources, no teachers' rules (owner, 2026-11-24); the numbers live in the engines
      title: '遊戲的簡化假設',
      intro: '遊戲裏的數字和機會都是示意設定，不是真實統計，也不是預測。',
      assumptions: [
        '放榜成績：每科各自抽籤，多數與預計相同，也可能高一級，或低一至兩級。',
        '聯招取錄：遊戲按你的分數與往年收生分數參考的距離和志願的排位，為每個志願定一個機會，再抽籤決定；未符合入學要求或「組別錯誤」的志願不會取錄。這些是遊戲的規則，不是聯招的正式規定，也不是真實的取錄機率。',
        '補選和重考：結果由遊戲抽籤決定；重考取較好的一次成績。',
        '升學、找工作和收入：按遊戲的示意設定，再加上你的選擇、五項指標和運氣計算，不代表真實的收入或前途。',
        '課程年期：聯招資料沒有課程年期，遊戲按課程名稱和簡介推算，只作示意。',
        '人生事件、強項、副業和小故事：都是遊戲的示意設定；強項不影響文憑試成績和聯招取錄。',
        '「如果當初」用同一份運氣重新模擬，其他決定沿用你的習慣；「同屆 100 人」為 100 位虛擬同學各自模擬。兩者都只在你的裝置上計算，只是其中一些可能，不代表必然的結果。'
      ]
    },

    /* ---------- Phase 3 ---------- */
    classMode: {
      heading: '班級模式（選用）',
      hint: '老師在課堂上公佈一個代碼，全班輸入同一個代碼：大家的運氣（放榜、取錄、人生事件）都一樣，結果只會因各人的成績、志願和選擇而不同。代碼只在你的裝置上用來產生運氣，不會傳送到任何地方。',
      label: '班級代碼', ph: '例如 6A2026', generate: '老師：產生代碼',
      invalid: '班級代碼只可用 2–12 個英文字母或數字。',
      pill: function (code) { return '班級模式 ' + code + ' · 全班運氣相同'; },
      big: '放大字體（適合投影）',
      againClass: '同一份運氣，修改成績或志願'
    },
    reflect: {
      label: '停一停', classLabel: '課堂討論',
      results: { q: '放榜成績和你預計的有沒有差距？如果真的發生，你第一件會做的事是甚麼？',
        c: '全班的運氣一樣——比較一下，誰的結果和預計最接近？為甚麼？' },
      year1: { q: '回想這段日子的選擇：你最重視的是甚麼？這和你現在的習慣相似嗎？',
        c: '同一份運氣下，大家在第一段日子專注的事有甚麼不同？' },
      graduation: { q: '畢業了！這張證書對你下一步有甚麼幫助？你還想學甚麼？',
        c: '走不同出路的同學，畢業時的年齡和學歷有甚麼分別？各有甚麼好處？' },
      end: { q: '回想一下：哪一個選擇對你影響最大？如果再來一次，你會怎樣選？',
        c: '大家的運氣一樣，結果卻不同——哪些選擇令差距出現？有沒有「最好」的路，還是各有取捨？' }
    },
    whatIf: {
      heading: '如果當初……？',
      hint: '揀一個你做過的決定，改成另一個選擇。遊戲用同一份運氣（放榜、取錄和人生事件的抽籤都一樣），沿用你的習慣自動模擬另一個人生，再和你的人生並排比較。',
      change: '改為：', none: '這一局沒有可以改變的主要決定。',
      stale: '這一局在遊戲更新之前開始，未能用同一套規則比較。再玩一局，就可以用「如果當初」。',
      yours: '你的人生', alt: '如果改為', pay: '月薪', path: '路線',
      habits: '其他決定沿用你的習慣：同一年齡的專注選擇、同一事件的回應；新出現的情況取第一個選項。這只是其中一個可能，不代表必然的結果。',
      close: '收起比較'
    },
    share: {
      button: '製作分享圖片', heading: '分享圖片',
      hint: '圖片只在你的裝置上製作，不會上載，也沒有你的成績或名字。手機可長按圖片儲存；電腦可按「下載圖片」。',
      download: '下載圖片', making: '製作中……', failed: '這部裝置未能製作圖片。',
      title: function (age) { return '我的人生路（至 ' + age + ' 歲）'; },
      now: '現在：', cred: '最高學歷：',
      foot1: '模擬結果，不代表真實聯招取錄或收入', foot2: 'po1career.net · DSE 人生模擬器',
      file: 'dse-life-paths.png'
    },
    runs: {
      heading: '最近幾局（只存在這部裝置）',
      th: ['日期', '出路', '最高學歷', '最後月薪'], current: '今局', short: '短篇', long: '長篇'
    },
    path: {
      degree: function (name) { return '入讀' + name; }, track: function (t) { return '開始' + t; }, work: '開始找工作',
      graduated: function (cred) { return '畢業（' + cred + '）'; }, senior: '升讀資助學士', job: function (m) { return '全職工作，' + m; },
      partTime: function (cred) { return '兼讀完成（' + cred + '）'; }, masters: '完成兼讀碩士', whs: '工作假期一年'
    },

    /* ---------- fun pack: character, dream, end title, quick start, guesses, reveals ---------- */
    me: {
      heading: '你是誰？',
      avatar: '揀一個角色', avatarHint: '角色會陪你走完這段路（只是造型，不影響結果）。',
      dream: '你的夢想是？', dreamHint: '遊戲最後會看看你離夢想有多近。也可以不揀。', noDream: '暫時未諗到',
      next: '下一步：你的成績'
    },
    avatars: { cat: '小貓', dog: '小狗', panda: '熊貓', rabbit: '兔仔', owl: '貓頭鷹', fox: '狐狸', penguin: '企鵝', chick: '小雞' },
    // "自己設計": the student's own avatar (option names in the order of LifePathsFun.LOOK)
    look: {
      name: '自己設計', pick: '自己設計', heading: '✏️ 設計你的角色',
      hint: '揀臉型、髮型、衣服……隨你配搭。只是造型，不影響結果。',
      parts: { face: '臉型', skin: '膚色', hair: '髮型', hairCol: '髮色', eyes: '眼睛', brows: '眉毛', mouth: '嘴巴',
        glasses: '眼鏡', head: '頭飾', top: '衣服', topCol: '衣服顏色', extra: '小配件', bg: '背景' },
      options: {
        face: ['圓臉', '鵝蛋臉', '方臉', '尖下巴'],
        skin: ['膚色一（最淺）', '膚色二', '膚色三', '膚色四', '膚色五', '膚色六（最深）'],
        hair: ['短髮', '側分', '冬菇頭', '長直髮', '孖辮', '馬尾', '丸子頭', '曲髮', '陸軍裝', '刺蝟頭'],
        hairCol: ['黑色', '深啡色', '啡色', '金色', '紅棕色', '銀灰色', '藍色', '粉紅色'],
        eyes: ['圓眼', '亮晶晶', '笑眼', '單眼皮', '眨眼'],
        brows: ['自然', '粗眉', '彎眉', '無'],
        mouth: ['微笑', '大笑', '抿嘴', '驚訝', '吐舌'],
        glasses: ['無', '圓框眼鏡', '方框眼鏡', '太陽眼鏡'],
        // the items after the first six headwear / six tops / six extras / eight backgrounds are unlocked by badges
        head: ['無', '鴨舌帽', '冷帽', '蝴蝶結', '星星髮夾', '耳機', '畢業帽', '必勝頭帶', '四葉草髮夾', '安全帽', '漁夫帽', '皇冠'],
        top: ['校服', 'T 恤', '衛衣', '冷衫', '西裝外套', '運動衫', '學會外套', '實驗袍', '圍裙'],
        topCol: ['金色', '綠色', '藍色', '紅色', '紫色', '深藍色', '黃色', '橙啡色'],
        extra: ['無', '腮紅', '雀斑', '膠布', '星星貼紙', '耳環', '工作證'],
        bg: ['米色', '淺綠色', '淺藍色', '淺粉紅色', '淺紫色', '淺橙色', '淺黃色', '淺灰藍色', '彩虹', '星空']
      },
      locked: function (badge) { return '🔒 獲得「' + badge + '」徽章後解鎖'; },
      topColNote: '校服的話，這是領呔的顏色。',
      random: '🎲 隨機', reset: '↺ 重設'
    },
    // the comic ending (LifePathsFun.comicPanels; drawn on a canvas on the device)
    comic: {
      heading: '我的人生四格漫畫', title: '我的人生四格漫畫',
      hint: '把你的人生路畫成四格漫畫，主角是你的角色。圖片只在你的裝置上製作，不會上載，也沒有你的成績或名字。',
      button: '🎞️ 製作四格漫畫', making: '製作中……', failed: '這部裝置未能製作漫畫。', download: '下載漫畫', file: 'dse-life-comic.png',
      panels: ['放榜', '起步', '轉捩點', '現在'],
      offer: function (slot, name) { return slot + '「' + name + '」取錄！'; },
      clearing: '補選獲得學位！', noOffer: '主要輪次未獲取錄', retake: '決定重考，再試一次', steady: '一步一步向前走',
      foot: '模擬結果，不代表真實聯招取錄或收入 · po1career.net · DSE 人生模擬器'
    },
    // 每日人生: a shared "student of the day" (LifePathsFun.dailyStudent) and shared luck for everyone playing that day
    daily: {
      heading: '每日人生',
      hint: function (d) { return '每天一位「今日學生」：今天（' + d + '）玩的人都有相同的預計成績和相同的運氣。角色、強項、夢想和志願由你揀——之後和同學比較一下，大家走的路有甚麼不同。'; },
      start: function (d) { return '📅 開始今日人生（' + d + '）'; },
      pill: function (d, g) { return '每日人生 · ' + d + ' · 預計成績：' + g; },
      ready: '今日學生的成績已經填好，直接揀志願吧！',
      gradesNote: '每日人生的成績已經設定。修改的話，這一局就不再算是今日挑戰。',
      end: function (d) { return '每日人生（' + d + '）：今天玩的同學成績和運氣都一樣——比較一下大家的選擇和結果！'; }
    },
    // 同屆 100 人 (LifePathsFun.cohort): computed on the device when asked
    cohort: {
      heading: '同屆 100 人', run: '看看同屆 100 人怎樣走', working: '計算中…',
      hint: '100 位虛擬同學，和你有相同的預計成績、相同的聯招志願，但各有自己的運氣、強項和選擇。同一個起點，可以走出很不同的路。（在你的裝置上計算，只供參考）',
      offers: function (n, you) { return '主要輪次獲取錄：' + n + ' / 100 人' + (you ? '（你也是其中之一）' : '（你這次沒有）'); },
      routes: '大家走的路', creds: '最高學歷', youTag: '你',
      pay: function (age) { return age + ' 歲時的月薪（有全職工作的同學）'; },
      payLine: function (med, lo, hi) { return '中位數 ' + med + '；中間一半的同學在 ' + lo + '–' + hi + ' 之間'; },
      you: function (m, pct) { return '你：' + m + '，高過 ' + pct + '% 有全職工作的同學'; },
      youNoJob: '你暫時未有全職工作。', noJob: function (n) { return '同屆中有 ' + n + ' 人也暫時未有全職工作。'; },
      dream: function (name, n, yours) { return '夢想「' + name + '」得到三粒星：' + n + ' / 100 人（你：' + yours + '）'; },
      note: '簡化：同學只計第一次放榜和主要輪次，不參加補選或重考；沒有取錄的同學按簡單比例選擇其他出路；之後的選擇大致隨機，但畢業後多數同學會先找工作。',
      takeaway: '想一想：你和大部分同學走的路一樣嗎？哪些是運氣，哪些是選擇？'
    },
    // badges: earned across games, saved only on this device; each unlocks one item in 「自己設計」 (LifePathsFun.UNLOCKS)
    badges: {
      heading: '🏅 我的徽章', fresh: '🎉 新徽章！', unlock: '解鎖',
      note: '徽章只儲存在這部裝置上。每個徽章會在「自己設計」解鎖一件角色配件。',
      use: '下一局在「角色」頁選「自己設計」，就可以換上新配件。',
      list: {
        offer: { icon: '🎓', name: '首個取錄', how: '在聯招主要輪次獲得取錄', item: '畢業帽' },
        comeback: { icon: '🔁', name: '捲土重來', how: '選擇重考文憑試', item: '必勝頭帶' },
        clearing: { icon: '🍀', name: '補選逆轉', how: '在補選中獲得學位', item: '四葉草髮夾' },
        vocational: { icon: '🛠️', name: '職專之路', how: '完成副學位、高級文憑或應用教育文憑', item: '安全帽' },
        world: { icon: '🌏', name: '看世界', how: '到外地讀書、交流、外派，或去工作假期', item: '漁夫帽' },
        society: { icon: '🎪', name: '學會幹事', how: '參選學會幹事或主席', item: '學會外套' },
        firstJob: { icon: '💼', name: '第一份全職', how: '找到第一份全職工作', item: '工作證' },
        learner: { icon: '📜', name: '終身學習', how: '兼讀完成一個學歷，或讀碩士', item: '實驗袍' },
        boss: { icon: '💡', name: '小老闆', how: '副業成功賺到錢', item: '圍裙' },
        balanced: { icon: '💚', name: '五項均衡', how: '人生終點時五項指標都達到 55 或以上', item: '彩虹背景' },
        dream: { icon: '⭐', name: '夢想成真', how: '夢想得到三粒星', item: '皇冠' },
        whatIf: { icon: '🔀', name: '如果當初', how: '在總結用「如果當初」比較另一個選擇', item: '星空背景' }
      }
    },
    // strengths: pick 2 on the character screen (the effects are LifePathsLife.STRENGTHS; keep the two in step)
    strengths: {
      heading: '你的強項（揀兩個）',
      hint: '每個人都有自己的強項。強項只影響中學畢業後的人生路，不會改變文憑試成績或聯招取錄。',
      random: '🎲 隨機揀兩個', need: '請先揀兩個強項（或按「🎲 隨機揀兩個」）。', full: '已揀兩個。想換的話，先取消其中一個。',
      unlock: '解鎖', count: function (n) { return n + ' / 2'; },
      list: {
        learner: { icon: '📚', name: '好學不倦', desc: '學業 +5；「用功讀書」「業餘進修」的得益多 25%', unlock: '「副修？」：挑戰雙主修' },
        maker: { icon: '🛠️', name: '動手實幹', desc: '能力經驗 +4；「實習／累積經驗」「全力投入工作」的得益多 15%', unlock: '「實習機會」：爭取畢業後獲留用' },
        people: { icon: '🤝', name: '社交達人', desc: '人脈 +5；「參加活動、認識朋友」「擴闊人脈」的得益多 25%', unlock: '「遇上師友」：請前輩介紹實習' },
        resilient: { icon: '💪', name: '堅毅樂觀', desc: '身心 +5；身心的損失少 30%', unlock: '「感到很累」：約見輔導員，訂下休息計劃' },
        saver: { icon: '💰', name: '精打細算', desc: '財政 +5；「兼職賺錢」「努力儲蓄」的得益多 25%', unlock: '「家庭經濟緊張」：重新編排開支' },
        creative: { icon: '🎨', name: '創意無限', desc: '能力經驗 +2、人脈 +3；「項目獲獎」較常出現', unlock: '「副業」：開網店賣自己的設計' },
        languages: { icon: '🗣️', name: '語言達人', desc: '學業 +2、人脈 +3；「交流」「外派」較常出現，找工作稍為容易', unlock: '「交流機會」：去非英語國家交流' },
        leader: { icon: '🧭', name: '領導才能', desc: '人脈 +3、能力經驗 +1；「學會幹事」較常出現，升職機會稍高', unlock: '「學會幹事」：參選主席' }
      }
    },
    dreams: {
      nurse: { name: '當護士／醫護人員', desc: '照顧病人，守護健康。',
        tip: '護理及專職醫療的學位是成為註冊護士的主要途徑；聯招志願可以多放相關課程，讀副學位的話畢業後也可以銜接。' },
      engineer: { name: '做工程師', desc: '設計和建造，解決實際問題。', tip: '工程學位是成為專業工程師的基礎，畢業後再累積工作經驗。' },
      it: { name: '做程式設計師／IT', desc: '寫程式、做 App、玩數據。', tip: '計算機及資訊科技的副學位或學位都可以入行；多做項目和實習很有幫助。' },
      designer: { name: '做設計師', desc: '用創意令生活更好看、更好用。', tip: '設計、創意媒體或藝術課程（副學位或學位）都可以入行；作品集很重要。' },
      teacher: { name: '做老師', desc: '陪伴學生成長。', tip: '教育學位（或其他學位加教育文憑）是做老師的主要途徑。' },
      business: { name: '在商界發展', desc: '做市場、金融或管理。', tip: '商業及管理的副學位或學位都可以入行；實習和人脈幫助很大。' },
      savings: { name: '儲到第一桶金', desc: '為將來打好財政基礎。', tip: '兼職、儲蓄和控制開支會令「財政」上升；讀書時的學費會令它下降。' },
      world: { name: '去交流，看世界', desc: '到外地學習，擴闊眼界。', tip: '大學的交流機會、內地或海外升學都能看看世界；多參加活動也會擴闊人脈。' },
      balance: { name: '生活平衡、身心健康', desc: '開心生活，照顧好自己。', tip: '「休息平衡」和「平衡生活」能照顧身心；太拼搏會令「身心」下降。' }
    },
    dreamEnd: {
      heading: '你的夢想',
      stars: ['還未開始接近這個夢想。', '已踏出第一步。', '很接近了！', '夢想成真！🎉'],
      tipLabel: '想更接近：', none: '你這一局沒有揀夢想。'
    },
    personas: {
      scholar: { icon: '📖', name: '穩步求學型', desc: '你重視學習，一步一步打好基礎。' },
      doer: { icon: '🔥', name: '實戰拼搏型', desc: '你喜歡動手做，在實戰中成長。' },
      saver: { icon: '🧮', name: '精打細算型', desc: '你懂得為將來打算，每一分錢都用得其所。' },
      balanced: { icon: '🌿', name: '身心平衡型', desc: '你懂得照顧自己，走得穩，也走得遠。' },
      connector: { icon: '🤝', name: '人脈探索型', desc: '你喜歡認識人，探索新機會。' },
      allround: { icon: '🌈', name: '斜槓全能型', desc: '你樣樣都試，每方面都有所成長。' }
    },
    mods: { comeback: '捲土重來的', clearing: '補選逆轉的', parttime: '邊做邊讀的', exchange: '看過世界的', masters: '再上一層樓的' },
    titleHeading: '你的人生稱號',
    quick: {
      heading: '⚡ 快速開始', hint: '唔想逐科填？揀一個學生，遊戲幫你填好成績和興趣，再建議志願。',
      samples: { sci: '🔬 理科生', biz: '📈 商科生', arts: '📜 文科生', maker: '🛠 動手做型' },
      random: '🎲 隨機身份', or: '或者自己逐科填：',
      done: function (name) { return '已用「' + name + '」的成績和興趣，並為你建議了志願。你可以修改，或直接前往放榜日。'; }
    },
    guess: {
      tag: '估一估',
      match: function (n) { return '放榜前估一估：你預計的 ' + n + ' 科之中，有幾多科會和預計一樣？'; },
      band: '開估前估一估：你會在哪個 Band 獲取錄？',
      bands: ['Band A', 'Band B', 'Band C', 'Band D', 'Band E', '沒有取錄'],
      pay: function (age) { return '估一估：你 ' + age + ' 歲時，每月收入大約是多少？'; },
      payBands: ['HK$15,000 以下', 'HK$15,000–20,000', 'HK$20,000–25,000', 'HK$25,000–35,000', 'HK$35,000 以上'],
      skip: '跳過',
      exact: '估中了！', near: '差一點點！', far: '和你估的不一樣——現實常常有意外。',
      matchResult: function (g, m) { return '你估 ' + g + ' 科一樣，實際有 ' + m + ' 科。'; },
      bandResult: function (g, a) { return '你估「' + g + '」，結果是「' + a + '」。'; },
      payResult: function (g, a) { return '你估「' + g + '」，實際是「' + a + '」。'; },
      summary: '估一估成績表', notAsked: '沒有估', noPay: '還未有全職工作'
    },
    reveal: {
      envelope: '📮 你的成績單到了！按每一科的「？」逐科揭曉。', all: '全部揭曉', hidden: '？',
      scan: '遊戲按你的志願次序，由 A1 開始逐個查看……', skip: '略過動畫',
      pass: '取錄！', fail: '未能取錄', wrongBand: '組別錯誤', after: '已不需要再看'
    },
    walk: function (a, end) { return '人生路：' + a + ' 歲（終點 ' + end + ' 歲）'; }
  };
})();
