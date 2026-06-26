/* ============================================================
   Pomodoro Study Timer — PLK No.1 Career Team
   Self-contained: timer logic + bilingual (EN/中) header/footer.
   Shares the language choice (localStorage "clp_lang") with the
   main page. No third-party calls; beep uses the Web Audio API.
   ============================================================ */
(function () {
  "use strict";

  var P = {
    en: {
      school: "PLK No.1 W.H. Cheung College", dept: "Career Team", motto: "Dream high and fly high",
      nav_news: "Latest News", nav_info: "Info", nav_res: "Useful Links", nav_faq: "FAQ & Glossary", nav_parents: "For Parents", nav_studytools: "Study Tools", nav_jupastools: "JUPAS Tools", nav_quiz: "Career Quiz", nav_pathways: "Pathways Explorer", nav_pomodoro: "Pomodoro", nav_studyplan: "Study Plan", nav_dse: "DSE Portfolio", nav_streaming: "Streaming Tool", nav_jupas: "JUPAS Finder", nav_finder: "Programme Finder+", nav_jupaschoices: "JUPAS Choices", lang: "中文",
      title: "Pomodoro Study Timer",
      sub: "Study in focused bursts with short breaks — a simple way to revise more effectively.",
      mode_focus: "Focus", mode_short: "Short Break", mode_long: "Long Break",
      start: "Start", pause: "Pause", reset: "Reset",
      settings: "Settings", focus_min: "Focus (min)", short_min: "Short break (min)", long_min: "Long break (min)",
      howto_title: "How it works",
      howto_steps: [
        "Pick one task or topic to focus on.",
        "Start a 25-minute Focus session and work without distractions.",
        "When the timer rings, take a 5-minute short break — stand up and rest your eyes.",
        "After every 4 focus sessions, take a longer 15-minute break.",
        "Repeat. Each completed focus session earns you a 🍅!"
      ],
      music_title: "Focus music & scenery",
      music_caption: "Like a little background music while you study? If you enjoy calm melodies and beautiful scenery, the videos on this YouTube channel make a relaxing backdrop for your focus sessions — just play one while the timer runs, then come back here to start your Pomodoro.",
      music_btn: "Open the channel · @abaointokyo",
      footer_about: "We help students explore their interests, plan their academic pathways, and prepare for university and future careers through guidance, workshops, and information sharing."
    },
    zh: {
      school: "保良局第一張永慶中學", dept: "升學輔導及生涯規劃組", motto: "展翅高飛・逐夢前行",
      nav_news: "最新消息", nav_info: "資訊", nav_res: "實用連結", nav_faq: "常見問題", nav_parents: "家長園地", nav_studytools: "學習工具", nav_jupastools: "JUPAS 工具", nav_quiz: "興趣測驗", nav_pathways: "升學出路", nav_pomodoro: "番茄鐘", nav_studyplan: "溫習計劃", nav_dse: "DSE 試卷組合", nav_streaming: "選科工具", nav_jupas: "JUPAS 搜尋器", nav_finder: "課程搜尋器＋", nav_jupaschoices: "JUPAS 選科", lang: "EN",
      title: "番茄鐘・專注計時",
      sub: "用「番茄工作法」分段專注、適時休息，讓溫習更有效率。",
      mode_focus: "專注", mode_short: "小休", mode_long: "大休",
      start: "開始", pause: "暫停", reset: "重設",
      settings: "設定", focus_min: "專注（分鐘）", short_min: "小休（分鐘）", long_min: "大休（分鐘）",
      howto_title: "使用方法",
      howto_steps: [
        "選定一項要專注完成的任務或課題。",
        "開始 25 分鐘的「專注」時段，全程不分心。",
        "計時響起後，休息 5 分鐘——起身走動、讓眼睛放鬆。",
        "每完成 4 個專注時段，給自己 15 分鐘較長的休息。",
        "重複以上步驟。每完成一節專注，就獲得一個 🍅！"
      ],
      music_title: "專注音樂與風景",
      music_caption: "想在溫習時播點背景音樂嗎？如果你喜歡恬靜的旋律與優美的風景，這個 YouTube 頻道的影片能為你的專注時段帶來輕鬆舒適的氛圍——計時期間播放一段，再回到這裡開始你的番茄鐘。",
      music_btn: "前往頻道 · @abaointokyo",
      footer_about: "我們透過輔導、工作坊及資訊分享，協助學生探索興趣、規劃學業路徑，為升學及未來事業作好準備。"
    }
  };

  var lang = localStorage.getItem("clp_lang") || "en";
  var settings = loadSettings();
  var mode = "focus";
  var remaining = settings.focus * 60;
  var running = false;
  var timerId = null;
  var completed = 0;
  var audioCtx = null;
  var R = 108, C = 2 * Math.PI * R;

  function loadSettings() {
    try { var s = JSON.parse(localStorage.getItem("pomo_settings")); if (s && s.focus) return s; } catch (e) {}
    return { focus: 25, short: 5, long: 15 };
  }
  function saveSettings() { localStorage.setItem("pomo_settings", JSON.stringify(settings)); }
  function dur(m) { return m === "focus" ? settings.focus : m === "short" ? settings.short : settings.long; }
  function t(k) { return P[lang][k]; }
  function $(id) { return document.getElementById(id); }
  function setText(id, v) { var e = $(id); if (e) e.textContent = v; }
  function modeKey(m) { return m === "focus" ? "mode_focus" : m === "short" ? "mode_short" : "mode_long"; }
  function fmt(sec) { var m = Math.floor(sec / 60), s = sec % 60; return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s; }

  function applyLang() {
    document.documentElement.lang = lang === "zh" ? "zh-HK" : "en";
    setText("brand-school", t("school"));
    setText("brand-dept", t("dept"));
    setText("brand-motto", t("motto"));
    setText("nav-news", t("nav_news"));
    setText("nav-res", t("nav_res")); setText("nav-info", t("nav_info")); setText("nav-faq", t("nav_faq")); setText("nav-parents", t("nav_parents"));
    setText("nav-quiz", t("nav_quiz")); setText("nav-pathways", t("nav_pathways"));
    setText("nav-pomodoro", t("nav_pomodoro"));
    setText("nav-studyplan", t("nav_studyplan"));
    setText("nav-dse", t("nav_dse"));
    setText("nav-streaming", t("nav_streaming"));
    setText("nav-studytools", t("nav_studytools"));
    setText("nav-jupastools", t("nav_jupastools"));
    setText("nav-jupas", t("nav_jupas")); setText("nav-finder", t("nav_finder"));
    setText("nav-jupaschoices", t("nav_jupaschoices"));
    document.querySelector(".langbtn").textContent = t("lang");
    setText("pg-title", t("title"));
    setText("pg-sub", t("sub"));
    setText("m-focus", t("mode_focus"));
    setText("m-short", t("mode_short"));
    setText("m-long", t("mode_long"));
    setText("resetBtn", t("reset"));
    $("startBtn").textContent = running ? t("pause") : t("start");
    setText("settings-label", t("settings"));
    setText("lbl-focus", t("focus_min"));
    setText("lbl-short", t("short_min"));
    setText("lbl-long", t("long_min"));
    setText("howto-title", t("howto_title"));
    setText("music-title", t("music_title"));
    setText("music-caption", t("music_caption"));
    setText("music-btn", t("music_btn"));
    setText("footer-about", t("footer_about"));
    var ol = $("howto-list"); ol.innerHTML = "";
    t("howto_steps").forEach(function (s) { var li = document.createElement("li"); li.textContent = s; ol.appendChild(li); });
    setText("ring-label", t(modeKey(mode)));
    updateDisplay();
  }

  function updateRing(fr) {
    var fg = document.querySelector(".ring-fg");
    fg.style.strokeDasharray = C;
    fg.style.strokeDashoffset = C * (1 - fr);
    fg.style.stroke = mode === "focus" ? "#c9a24b" : "#8ba888";
  }
  function updateDisplay() {
    $("time").textContent = fmt(remaining);
    var total = dur(mode) * 60;
    updateRing(total ? remaining / total : 0);
    document.title = running
      ? fmt(remaining) + " · " + t(modeKey(mode)) + " — Career Team"
      : t("title") + " — Career Team";
  }

  function setMode(m) {
    mode = m; running = false; clearInterval(timerId);
    remaining = dur(m) * 60;
    document.querySelectorAll(".mode-btn").forEach(function (b) { b.classList.toggle("active", b.dataset.mode === m); });
    $("startBtn").textContent = t("start");
    setText("ring-label", t(modeKey(mode)));
    updateDisplay();
  }

  function tick() {
    remaining--;
    if (remaining <= 0) { remaining = 0; updateDisplay(); finishSession(); return; }
    updateDisplay();
  }
  function start() { if (running) return; running = true; ensureAudio(); $("startBtn").textContent = t("pause"); timerId = setInterval(tick, 1000); updateDisplay(); }
  function pause() { running = false; clearInterval(timerId); $("startBtn").textContent = t("start"); updateDisplay(); }
  function toggle() { running ? pause() : start(); }
  function reset() { running = false; clearInterval(timerId); remaining = dur(mode) * 60; $("startBtn").textContent = t("start"); updateDisplay(); }

  function finishSession() {
    running = false; clearInterval(timerId); beep(); flash();
    if (mode === "focus") {
      completed++; renderTomatoes();
      setMode(completed % 4 === 0 ? "long" : "short");
    } else {
      setMode("focus");
    }
  }
  function renderTomatoes() { $("tomatoes").textContent = "🍅".repeat(completed); }

  function ensureAudio() { if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } }
  function beep() {
    if (!audioCtx) return;
    try {
      var now = audioCtx.currentTime;
      [0, 0.26, 0.52].forEach(function (off) {
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = "sine"; o.frequency.value = 680; o.connect(g); g.connect(audioCtx.destination);
        g.gain.setValueAtTime(0.0001, now + off);
        g.gain.exponentialRampToValueAtTime(0.25, now + off + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + off + 0.22);
        o.start(now + off); o.stop(now + off + 0.24);
      });
    } catch (e) {}
  }
  function flash() {
    var c = document.querySelector(".pomo-card");
    if (c && c.animate) {
      c.animate(
        [{ boxShadow: "0 0 0 0 rgba(201,162,75,.55)" }, { boxShadow: "0 0 0 20px rgba(201,162,75,0)" }],
        { duration: 800 }
      );
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var logo = $("logo-img");
    if (logo) logo.onerror = function () {
      var fb = document.createElement("div"); fb.className = "logo-fallback"; fb.textContent = "PLK①"; logo.replaceWith(fb);
    };
    $("startBtn").onclick = toggle;
    $("resetBtn").onclick = reset;
    document.querySelectorAll(".mode-btn").forEach(function (b) { b.onclick = function () { setMode(b.dataset.mode); }; });

    $("set-focus").value = settings.focus; $("set-short").value = settings.short; $("set-long").value = settings.long;
    ["focus", "short", "long"].forEach(function (key) {
      $("set-" + key).addEventListener("change", function () {
        var v = parseInt(this.value, 10); if (isNaN(v) || v < 1) v = 1; if (v > 120) v = 120; this.value = v;
        settings[key] = v; saveSettings();
        if (!running && mode === key) { remaining = v * 60; updateDisplay(); }
      });
    });

    document.querySelector(".langbtn").onclick = function () {
      lang = lang === "en" ? "zh" : "en";
      localStorage.setItem("clp_lang", lang);
      applyLang();
    };

    applyLang();
    setMode("focus");
    renderTomatoes();
  });
})();
