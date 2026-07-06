/* ============================================================
   SINGLE SOURCE OF TRUTH for the site's tools.
   Consumed by:
     - app.js          → homepage "Our Tools" cards (renderTools)
     - footer-tools.js → footer quick-links on every page
   Load this BEFORE app.js and footer-tools.js.
   Add / edit a tool here ONLY.
   ============================================================ */
window.SITE_TOOLS = [
  { id: "quiz", href: "career-quiz.html", group: "studytools", icon: "🎯", gated: false,
    name: { en: "Career Interest Quiz", zh: "職業興趣測驗" }, aud: { en: "All forms", zh: "各級適用" },
    desc: { en: "Discover your interest types (RIASEC) and matching study and career directions.", zh: "了解你的興趣類型（RIASEC），找出合適的升學及職業方向。" } },
  { id: "pathways", href: "pathways.html", group: "studytools", icon: "🧭", gated: false,
    name: { en: "Multiple Pathways Explorer", zh: "升學出路探索" }, aud: { en: "F.3–F.6", zh: "中三至中六" },
    desc: { en: "Explore the routes after the HKDSE — degrees, sub-degrees, vocational, Mainland and overseas — and find ones that fit.", zh: "探索文憑試後的出路——學位、副學位、職專、內地及海外升學，找出適合你的途徑。" } },
  { id: "pomodoro", href: "pomodoro.html", group: "studytools", icon: "⏱️", gated: false,
    name: { en: "Pomodoro Timer", zh: "番茄鐘" }, aud: { en: "All forms", zh: "各級適用" },
    desc: { en: "Focus in timed bursts with short breaks.", zh: "以計時專注配短休息，提升溫習效率。" } },
  { id: "studyplan", href: "study-plan.html", group: "studytools", icon: "🗓️", gated: false,
    name: { en: "Study Plan", zh: "溫習計劃" }, aud: { en: "All forms", zh: "各級適用" },
    desc: { en: "Turn your exam dates into a revision timetable.", zh: "按考試日期生成溫習時間表。" } },
  { id: "dse", href: "dse-portfolio.html", group: "studytools", icon: "📊", gated: true,
    name: { en: "DSE Portfolio", zh: "DSE 試卷組合" }, aud: { en: "F.4–F.6", zh: "中四至中六" },
    desc: { en: "Record past-paper marks and see an estimated grade.", zh: "記錄歷屆試卷分數，估算等級。" } },
  { id: "streaming", href: "streaming-tool.html", group: "studytools", icon: "🧭", gated: true,
    name: { en: "Subject Streaming", zh: "選科工具" }, aud: { en: "F.3", zh: "中三" },
    desc: { en: "Rank your F.4 electives into a full priority order.", zh: "為中四選修科排出完整志願次序。" } },
  { id: "jupas", href: "jupas-finder.html", group: "jupastools", icon: "🔍", gated: true,
    name: { en: "JUPAS Finder", zh: "JUPAS 搜尋器" }, aud: { en: "F.5–F.6", zh: "中五至中六" },
    desc: { en: "Search university programmes by subject, school or keyword.", zh: "按學科、院校或關鍵字搜尋大學課程。" } },
  { id: "jupaschoices", href: "jupas-choices.html", group: "jupastools", icon: "📋", gated: true,
    name: { en: "JUPAS Choices", zh: "JUPAS 選科" }, aud: { en: "F.6", zh: "中六" },
    desc: { en: "Organise and review your 20 JUPAS choices with your teacher.", zh: "整理並與老師檢視你的 20 個 JUPAS 志願。" } },
  { id: "planner", href: "jupas-planner.html", group: "jupastools", icon: "🗺️", gated: true,
    name: { en: "JUPAS Planner", zh: "放榜行動計劃" }, aud: { en: "F.6", zh: "中六" },
    desc: { en: "Plan your Band A & B choices for three results-day scenarios — as expected, better, or worse.", zh: "為放榜三種情境（如預期、比預期好、比預期差）規劃 Band A 及 B 志願。" } }
];
