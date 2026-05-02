(() => {
  "use strict";

  const STORAGE_KEY = "edgeTracker.v3";
  const LEGACY_STORAGE_KEYS = ["studyTracker.v2", "studyTracker.v1"];
  const THEME_KEY = "studyTracker.theme";
  const SOUND_KEY = "studyTracker.soundEnabled";
  const ACTIVE_TIMER_KEY = "edgeTracker.activeTimer.v1";
  const DEFAULT_WEEKLY_GOAL_HOURS = 15;
  const DEFAULT_DAILY_GOAL_HOURS = 4;
  const MILESTONES_HOURS = [15, 25, 75, 100, 150, 200, 250, 300, 500, 600, 750, 1000];
  const MIN_SAVEABLE_STUDY_SEC = 5 * 60;
  const GLASS_FILL_SEC = 10 * 60;
  const MAX_CUSTOM_TIMER_MINUTES = 180;
  const SPECTRUM_BANDS = [
    {
      name: "Violet",
      wavelength: "380-450 nm",
      top: "rgba(168, 85, 247, 0.96)",
      bottom: "rgba(124, 58, 237, 0.84)",
      glow: "rgba(139, 92, 246, 0.44)",
      drop: "rgba(139, 92, 246, 0.92)",
      shadow: "rgba(139, 92, 246, 0.2)",
    },
    {
      name: "Indigo",
      wavelength: "445-470 nm",
      top: "rgba(99, 102, 241, 0.96)",
      bottom: "rgba(67, 56, 202, 0.84)",
      glow: "rgba(99, 102, 241, 0.42)",
      drop: "rgba(99, 102, 241, 0.92)",
      shadow: "rgba(99, 102, 241, 0.2)",
    },
    {
      name: "Blue",
      wavelength: "470-495 nm",
      top: "rgba(59, 130, 246, 0.96)",
      bottom: "rgba(37, 99, 235, 0.84)",
      glow: "rgba(59, 130, 246, 0.42)",
      drop: "rgba(59, 130, 246, 0.92)",
      shadow: "rgba(59, 130, 246, 0.2)",
    },
    {
      name: "Green",
      wavelength: "495-570 nm",
      top: "rgba(34, 197, 94, 0.96)",
      bottom: "rgba(22, 163, 74, 0.84)",
      glow: "rgba(34, 197, 94, 0.42)",
      drop: "rgba(34, 197, 94, 0.92)",
      shadow: "rgba(34, 197, 94, 0.2)",
    },
    {
      name: "Yellow",
      wavelength: "570-590 nm",
      top: "rgba(250, 204, 21, 0.96)",
      bottom: "rgba(234, 179, 8, 0.84)",
      glow: "rgba(250, 204, 21, 0.42)",
      drop: "rgba(250, 204, 21, 0.92)",
      shadow: "rgba(250, 204, 21, 0.2)",
    },
    {
      name: "Orange",
      wavelength: "590-620 nm",
      top: "rgba(251, 146, 60, 0.96)",
      bottom: "rgba(249, 115, 22, 0.84)",
      glow: "rgba(251, 146, 60, 0.42)",
      drop: "rgba(251, 146, 60, 0.92)",
      shadow: "rgba(251, 146, 60, 0.2)",
    },
    {
      name: "Red",
      wavelength: "620-750 nm",
      top: "rgba(248, 113, 113, 0.96)",
      bottom: "rgba(239, 68, 68, 0.84)",
      glow: "rgba(248, 113, 113, 0.42)",
      drop: "rgba(248, 113, 113, 0.92)",
      shadow: "rgba(248, 113, 113, 0.2)",
    },
  ];
  const DEDICATION_OPTIONS = [
    { key: "birds", label: "Bird", minutes: 10, blurb: "A short focused session can keep a bird cared for." },
    { key: "plant", label: "Plant", minutes: 30, blurb: "A steady half hour is enough to water one plant." },
    { key: "cow", label: "Cow", minutes: 35, blurb: "A longer session can support one cow." },
    { key: "elephant", label: "Elephant", minutes: 50, blurb: "A deep focus block can be dedicated to one elephant." },
  ];

  const Pomodoro = {
    focusSec: 25 * 60,
    breakSec: 5 * 60,
  };

  let sharedAudioContext = null;
  let cachedNoiseBuffer = null;
  let activeAlarm = null;

  const $ = (id) => document.getElementById(id);

  const els = {
    timerDisplay: $("timerDisplay"),
    startBtn: $("startBtn"),
    pauseBtn: $("pauseBtn"),
    resetBtn: $("resetBtn"),
    stopAlarmBtn: $("stopAlarmBtn"),
    focusPauseBtn: $("focusPauseBtn"),
    focusSoundBtn: $("focusSoundBtn"),
    focusStopAlarmBtn: $("focusStopAlarmBtn"),
    focusExitBtn: $("focusExitBtn"),
    timerProgressText: $("timerProgressText"),
    timerModeLabel: $("timerModeLabel"),
    timerTargetLabel: $("timerTargetLabel"),
    glassShelf: $("glassShelf"),
    glassLegend: $("glassLegend"),
    droplets: $("droplets"),

    modePomodoroBtn: $("modePomodoroBtn"),
    modeCustomBtn: $("modeCustomBtn"),
    pomodoroPane: $("pomodoroPane"),
    customPane: $("customPane"),
    pomoPhasePill: $("pomoPhasePill"),
    pomoAutoSwitch: $("pomoAutoSwitch"),

    customHours: $("customHours"),
    customMinutes: $("customMinutes"),
    customSeconds: $("customSeconds"),
    customStoreMode: $("customStoreMode"),
    sessionNameInput: $("sessionNameInput"),
    presetBtns: [...document.querySelectorAll(".presetBtn")],

    soundToggle: $("soundToggle"),

    totalTimeValue: $("totalTimeValue"),
    totalTimeSub: $("totalTimeSub"),
    todayValue: $("todayValue"),
    todaySub: $("todaySub"),
    streakValue: $("streakValue"),
    bestStreakValue: $("bestStreakValue"),
    averageSessionValue: $("averageSessionValue"),
    averageSessionSub: $("averageSessionSub"),
    waterBankValue: $("waterBankValue"),
    waterBankSub: $("waterBankSub"),
    plantsValue: $("plantsValue"),
    plantsSub: $("plantsSub"),
    birdsValue: $("birdsValue"),
    birdsSub: $("birdsSub"),
    elephantValue: $("elephantValue"),
    elephantSub: $("elephantSub"),
    cowValue: $("cowValue"),
    cowSub: $("cowSub"),

    weeklyGoalInput: $("weeklyGoalInput"),
    weeklyGoalValue: $("weeklyGoalValue"),
    weeklyGoalWeek: $("weeklyGoalWeek"),
    weeklyGoalFill: $("weeklyGoalFill"),
    weeklyGoalMeta: $("weeklyGoalMeta"),
    dailyGoalInput: $("dailyGoalInput"),
    dailyGoalValue: $("dailyGoalValue"),
    dailyGoalFill: $("dailyGoalFill"),
    dailyGoalMeta: $("dailyGoalMeta"),

    bestDayValue: $("bestDayValue"),
    bestDaySub: $("bestDaySub"),
    topModeValue: $("topModeValue"),
    topModeSub: $("topModeSub"),
    focusTipText: $("focusTipText"),
    lastDedicationText: $("lastDedicationText"),

    heroWeekValue: $("heroWeekValue"),
    heroWeekSub: $("heroWeekSub"),
    heroBestDayValue: $("heroBestDayValue"),
    heroBestDaySub: $("heroBestDaySub"),
    heroFocusScore: $("heroFocusScore"),
    heroFocusSub: $("heroFocusSub"),

    milestoneLabel: $("milestoneLabel"),
    milestonePct: $("milestonePct"),
    milestoneFill: $("milestoneFill"),
    milestoneMeta: $("milestoneMeta"),
    milestoneList: $("milestoneList"),

    badgesGrid: $("badgesGrid"),
    activityMonths: $("activityMonths"),
    activityHeatmap: $("activityHeatmap"),
    activitySummary: $("activitySummary"),
    activityHint: $("activityHint"),

    dailyChart: $("dailyChart"),
    weeklyChart: $("weeklyChart"),

    sessionList: $("sessionList"),
    exportBtn: $("exportBtn"),
    importInput: $("importInput"),
    clearSessionsBtn: $("clearSessionsBtn"),
    filterBtns: [...document.querySelectorAll(".filterBtn")],

    openAnalyticsBtn: $("openAnalyticsBtn"),
    analyticsOverlay: $("analyticsOverlay"),
    closeAnalyticsBtn: $("closeAnalyticsBtn"),
    dedicationOverlay: $("dedicationOverlay"),
    dedicationChoices: $("dedicationChoices"),
    dedicationHint: $("dedicationHint"),
    closeDedicationBtn: $("closeDedicationBtn"),

    darkModeToggle: $("darkModeToggle"),
    resetAllBtn: $("resetAllBtn"),
  };

  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatHMS(totalSec) {
    const s = Math.max(0, Math.floor(totalSec));
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
  }

  function formatHMFromSeconds(totalSec) {
    const s = Math.max(0, Math.floor(totalSec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  }

  function formatDurationShort(totalSec) {
    const s = Math.max(0, Math.round(totalSec));
    if (s >= 3600) {
      const h = Math.floor(s / 3600);
      const m = Math.round((s % 3600) / 60);
      return `${h}h ${m}m`;
    }
    return `${Math.round(s / 60)} min`;
  }

  function minutesFromSeconds(totalSec) {
    return Math.round(Math.max(0, totalSec) / 60);
  }

  function toLocalDateKey(d) {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
  }

  function startOfLocalDay(d) {
    const dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  function startOfLocalWeek(d) {
    const dt = startOfLocalDay(d);
    const diffToMonday = (dt.getDay() + 6) % 7;
    dt.setDate(dt.getDate() - diffToMonday);
    return dt;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function getWeekKeyLocal(d) {
    const monday = startOfLocalWeek(d);
    const year = monday.getFullYear();
    const jan1 = startOfLocalDay(new Date(year, 0, 1));
    const firstMonday = startOfLocalWeek(jan1);
    const weekIndex = Math.floor((monday - firstMonday) / (7 * 24 * 3600 * 1000)) + 1;
    return `${year}-W${pad2(weekIndex)}`;
  }


  function getWeekNumberLocal(d) {
    const weekKey = getWeekKeyLocal(d);
    return Number(weekKey.split("-W")[1] ?? 0);
  }
  function safeJsonParse(text, fallback) {
    try {
      return JSON.parse(text);
    } catch {
      return fallback;
    }
  }

  function normalizeSessionInput(session) {
    return {
      id: String(session.id ?? uid()),
      endedAt: String(session.endedAt ?? new Date().toISOString()),
      durationSec: clamp(Number(session.durationSec ?? 0), 0, 365 * 24 * 3600),
      type: session.type === "break" ? "break" : "study",
      mode: typeof session.mode === "string" ? session.mode : "unknown",
      title: typeof session.title === "string" ? session.title.trim().slice(0, 48) : "",
    };
  }

  function getRequiredDedicationSeconds(optionKey) {
    const option = DEDICATION_OPTIONS.find((item) => item.key === optionKey);
    return option ? option.minutes * 60 : 0;
  }

  function deriveDedicatedStudySeconds(dedicationCounts) {
    return Object.entries(dedicationCounts ?? {}).reduce((total, [key, count]) => {
      return total + getRequiredDedicationSeconds(key) * clamp(Number(count ?? 0), 0, 100000);
    }, 0);
  }

  function loadState() {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find((value) => value !== null) ??
      null;
    const parsed = safeJsonParse(raw, null);
    const base = {
      sessions: [],
      unlockedMilestones: [],
      bestStreak: 0,
      weeklyGoalHours: DEFAULT_WEEKLY_GOAL_HOURS,
      dailyGoalHours: DEFAULT_DAILY_GOAL_HOURS,
      sessionFilter: "all",
      dedicationCounts: {
        plant: 0,
        birds: 0,
        elephant: 0,
        cow: 0,
      },
      dedicatedStudySeconds: 0,
      lastDedication: null,
    };

    if (!parsed || typeof parsed !== "object") return base;

    return {
      sessions: Array.isArray(parsed.sessions)
        ? parsed.sessions.map(normalizeSessionInput).sort((a, b) => new Date(b.endedAt) - new Date(a.endedAt))
        : [],
      unlockedMilestones: Array.isArray(parsed.unlockedMilestones)
        ? parsed.unlockedMilestones.map(Number).filter(Number.isFinite).sort((a, b) => a - b)
        : [],
      bestStreak: clamp(Number(parsed.bestStreak ?? 0), 0, 100000),
      weeklyGoalHours: clamp(Number(parsed.weeklyGoalHours ?? DEFAULT_WEEKLY_GOAL_HOURS), 1, 80),
      dailyGoalHours: clamp(Number(parsed.dailyGoalHours ?? DEFAULT_DAILY_GOAL_HOURS), 1, 24),
      sessionFilter: ["all", "study", "break"].includes(parsed.sessionFilter) ? parsed.sessionFilter : "all",
      dedicationCounts: {
        plant: clamp(Number(parsed.dedicationCounts?.plant ?? 0), 0, 100000),
        birds: clamp(Number(parsed.dedicationCounts?.birds ?? 0), 0, 100000),
        elephant: clamp(Number(parsed.dedicationCounts?.elephant ?? 0), 0, 100000),
        cow: clamp(Number(parsed.dedicationCounts?.cow ?? 0), 0, 100000),
      },
      dedicatedStudySeconds: clamp(
        Number(parsed.dedicatedStudySeconds ?? deriveDedicatedStudySeconds(parsed.dedicationCounts)),
        0,
        365 * 24 * 3600,
      ),
      lastDedication:
        parsed.lastDedication && typeof parsed.lastDedication === "object"
          ? {
              key: String(parsed.lastDedication.key ?? ""),
              label: String(parsed.lastDedication.label ?? ""),
              durationSec: clamp(Number(parsed.lastDedication.durationSec ?? 0), 0, 365 * 24 * 3600),
              completedAt: String(parsed.lastDedication.completedAt ?? new Date().toISOString()),
            }
          : null,
    };
  }

  function saveState(state) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sessions: state.sessions,
        unlockedMilestones: state.unlockedMilestones,
        bestStreak: state.bestStreak,
        weeklyGoalHours: state.weeklyGoalHours,
        dailyGoalHours: state.dailyGoalHours,
        sessionFilter: state.sessionFilter,
        dedicationCounts: state.dedicationCounts,
        dedicatedStudySeconds: state.dedicatedStudySeconds,
        lastDedication: state.lastDedication,
      }),
    );
  }

  function loadTheme() {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  }

  function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
  }

  function loadSoundEnabled() {
    const stored = localStorage.getItem(SOUND_KEY);
    return stored === null ? true : stored === "true";
  }

  function saveSoundEnabled(enabled) {
    localStorage.setItem(SOUND_KEY, String(Boolean(enabled)));
  }

  function totalStudySeconds(state) {
    return state.sessions.reduce((acc, s) => (s.type === "study" ? acc + s.durationSec : acc), 0);
  }

  function availableDedicationSeconds(state) {
    return Math.max(0, totalStudySeconds(state) - clamp(Number(state.dedicatedStudySeconds ?? 0), 0, 365 * 24 * 3600));
  }

  function computeDailyTotals(state) {
    const map = new Map();
    for (const s of state.sessions) {
      if (s.type !== "study") continue;
      const key = toLocalDateKey(s.endedAt);
      map.set(key, (map.get(key) ?? 0) + s.durationSec);
    }
    return map;
  }

  function computeWeeklyTotals(state) {
    const map = new Map();
    for (const s of state.sessions) {
      if (s.type !== "study") continue;
      const key = getWeekKeyLocal(new Date(s.endedAt));
      map.set(key, (map.get(key) ?? 0) + s.durationSec);
    }
    return map;
  }

  function computeStreaksFromDailyMap(dailyMap) {
    const studiedDays = new Set([...dailyMap.entries()].filter(([, sec]) => sec > 0).map(([k]) => k));
    if (studiedDays.size === 0) return { current: 0, best: 0 };

    const keys = [...studiedDays].sort();
    let best = 1;
    let run = 1;
    for (let i = 1; i < keys.length; i++) {
      const prev = new Date(`${keys[i - 1]}T00:00:00`);
      const cur = new Date(`${keys[i]}T00:00:00`);
      const diffDays = Math.round((cur - prev) / (24 * 3600 * 1000));
      run = diffDays === 1 ? run + 1 : 1;
      best = Math.max(best, run);
    }

    const todayKey = toLocalDateKey(new Date());
    const yesterdayKey = toLocalDateKey(addDays(new Date(), -1));
    let current = 0;

    if (studiedDays.has(todayKey) || studiedDays.has(yesterdayKey)) {
      current = 1;
      let cursor = studiedDays.has(todayKey) ? addDays(new Date(), -1) : addDays(new Date(), -2);
      while (studiedDays.has(toLocalDateKey(cursor))) {
        current += 1;
        cursor = addDays(cursor, -1);
      }
    }

    return { current, best };
  }

  function getMilestoneStatus(totalHours) {
    const unlocked = new Set(MILESTONES_HOURS.filter((h) => totalHours >= h));
    const next = MILESTONES_HOURS.find((h) => totalHours < h) ?? null;
    return { unlocked, next };
  }

  function getChartColors(theme) {
    const dark = theme === "dark";
    return {
      grid: dark ? "rgba(229,237,249,0.1)" : "rgba(16,32,58,0.1)",
      tick: dark ? "rgba(229,237,249,0.72)" : "rgba(16,32,58,0.62)",
      bar: dark ? "rgba(122,162,255,0.85)" : "rgba(69,116,255,0.85)",
      line: dark ? "rgba(52,211,153,0.9)" : "rgba(38,199,111,0.9)",
      fill: dark ? "rgba(52,211,153,0.18)" : "rgba(38,199,111,0.16)",
    };
  }

  function getSharedAudioContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    if (!sharedAudioContext) {
      sharedAudioContext = new AudioCtx();
    }

    if (sharedAudioContext.state === "suspended") {
      sharedAudioContext.resume().catch(() => {});
    }

    return sharedAudioContext;
  }

  function scheduleAlarmPulse(ctx) {
    if (!activeAlarm) return;
    const now = ctx.currentTime;
    const notes = [880, 660, 980, 740];

    notes.forEach((frequency, index) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        const startAt = now + index * 0.18;
        const endAt = startAt + 0.15;

        osc.type = "square";
        osc.frequency.setValueAtTime(frequency, startAt);
        filter.type = "lowpass";
        filter.frequency.value = 1800;
        filter.Q.value = 0.8;
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(0.18, startAt + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        activeAlarm.nodes.add(osc);
        osc.onended = () => activeAlarm?.nodes.delete(osc);
        osc.start(startAt);
        osc.stop(endAt + 0.02);
      } catch {
        // ignore individual alarm pulse failures
      }
    });
  }

  function stopDoneSound() {
    if (!activeAlarm) return;
    clearInterval(activeAlarm.intervalId);
    for (const node of activeAlarm.nodes) {
      try {
        node.stop();
      } catch {
        // already stopped
      }
    }
    activeAlarm = null;
    setButtons();
  }

  function playDoneSound() {
    try {
      const ctx = getSharedAudioContext();
      if (!ctx) return;

      stopDoneSound();
      activeAlarm = {
        intervalId: window.setInterval(() => scheduleAlarmPulse(ctx), 1050),
        nodes: new Set(),
      };
      scheduleAlarmPulse(ctx);
      setButtons();
    } catch {
      // ignore audio failures
    }
  }

  function playDropSound() {
    try {
      const ctx = getSharedAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const toneFilter = ctx.createBiquadFilter();
      const toneGain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.16);

      toneFilter.type = "lowpass";
      toneFilter.frequency.value = 900;
      toneFilter.Q.value = 0.7;

      toneGain.gain.setValueAtTime(0.0001, now);
      toneGain.gain.exponentialRampToValueAtTime(0.05, now + 0.012);
      toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(toneFilter);
      toneFilter.connect(toneGain);
      toneGain.connect(ctx.destination);

      const noiseBuffer = getNoiseBuffer(ctx);
      if (noiseBuffer) {
        const noise = ctx.createBufferSource();
        const noiseFilter = ctx.createBiquadFilter();
        const noiseGain = ctx.createGain();

        noise.buffer = noiseBuffer;
        noiseFilter.type = "bandpass";
        noiseFilter.frequency.value = 1400;
        noiseFilter.Q.value = 1.1;

        noiseGain.gain.setValueAtTime(0.0001, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.022, now + 0.006);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.08);
      }

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // ignore audio failures
    }
  }

  function getNoiseBuffer(ctx) {
    if (cachedNoiseBuffer && cachedNoiseBuffer.sampleRate === ctx.sampleRate) return cachedNoiseBuffer;

    try {
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.18), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }
      cachedNoiseBuffer = buffer;
      return buffer;
    } catch {
      return null;
    }
  }

  function addSession(state, session) {
    const normalized = normalizeSessionInput({ ...session, id: uid(), endedAt: new Date().toISOString() });
    state.sessions.unshift(normalized);
    saveState(state);
    return normalized;
  }

  function getDedicationOptionsForDuration(durationSec) {
    const availableMinutes = Math.floor(durationSec / 60);
    return DEDICATION_OPTIONS.filter((option) => availableMinutes >= option.minutes);
  }

  function saveDedication(state, option) {
    state.dedicationCounts[option.key] = (state.dedicationCounts[option.key] ?? 0) + 1;
    state.dedicatedStudySeconds = (state.dedicatedStudySeconds ?? 0) + option.minutes * 60;
    state.lastDedication = {
      key: option.key,
      label: option.label,
      durationSec: option.minutes * 60,
      completedAt: new Date().toISOString(),
    };
    saveState(state);
  }

  function getSessionTitle() {
    return (els.sessionNameInput?.value ?? "").trim().slice(0, 48);
  }

  function prettifyMode(mode) {
    if (mode === "pomodoro-focus") return "Pomodoro focus";
    if (mode === "pomodoro-break") return "Pomodoro break";
    if (mode === "custom") return "Custom timer";
    return mode.replace(/-/g, " ");
  }

  function computeInsights(state) {
    const studySessions = state.sessions.filter((s) => s.type === "study");
    const daily = computeDailyTotals(state);
    const weekly = computeWeeklyTotals(state);
    const totalSec = totalStudySeconds(state);

    let bestDayKey = null;
    let bestDaySeconds = 0;
    for (const [dayKey, sec] of daily.entries()) {
      if (sec > bestDaySeconds) {
        bestDaySeconds = sec;
        bestDayKey = dayKey;
      }
    }

    const weekKey = getWeekKeyLocal(new Date());
    const weekSeconds = weekly.get(weekKey) ?? 0;
    const weeklyGoalSeconds = state.weeklyGoalHours * 3600;
    const weeklyGoalPct = weeklyGoalSeconds > 0 ? clamp((weekSeconds / weeklyGoalSeconds) * 100, 0, 100) : 0;

    const averageSessionSec =
      studySessions.length > 0 ? studySessions.reduce((sum, s) => sum + s.durationSec, 0) / studySessions.length : 0;

    const modeCounts = new Map();
    for (const session of studySessions) {
      modeCounts.set(session.mode, (modeCounts.get(session.mode) ?? 0) + 1);
    }
    const topModeEntry = [...modeCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

    const { current: currentStreak } = computeStreaksFromDailyMap(daily);
    const todaySeconds = daily.get(toLocalDateKey(new Date())) ?? 0;
    const focusScore = clamp(
      Math.round(
        Math.min(40, currentStreak * 10) +
          Math.min(35, studySessions.length * 4) +
          Math.min(25, (todaySeconds / 60) / 4),
      ),
      0,
      100,
    );

    let coachTip = "Start with one solid session today. Momentum matters more than perfect duration.";
    if (currentStreak >= 5) coachTip = "Your streak is strong. Protect it with a shorter session instead of skipping.";
    else if (weeklyGoalPct >= 100) coachTip = "Weekly goal complete. Use lighter sessions now to stay consistent without burning out.";
    else if (todaySeconds === 0 && studySessions.length > 0) coachTip = "A quick 15 minute session today keeps the habit alive and protects your progress.";
    else if (averageSessionSec >= 45 * 60) coachTip = "Your sessions run long. Add breaks on purpose so focus stays sharp.";

    return {
      totalSec,
      daily,
      weekSeconds,
      weeklyGoalPct,
      averageSessionSec,
      bestDayKey,
      bestDaySeconds,
      topMode: topModeEntry ? prettifyMode(topModeEntry[0]) : "-",
      topModeCount: topModeEntry ? topModeEntry[1] : 0,
      focusScore,
      coachTip,
    };
  }


  function getActivityLevel(seconds, dailyGoalHours) {
    if (seconds <= 0) return 0;
    const dailyGoalSeconds = Math.max(30 * 60, Number(dailyGoalHours || DEFAULT_DAILY_GOAL_HOURS) * 3600);
    const ratio = seconds / dailyGoalSeconds;
    if (ratio >= 1) return 4;
    if (ratio >= 0.66) return 3;
    if (ratio >= 0.33) return 2;
    return 1;
  }

  function renderActivityHeatmap(state, dailyMap) {
    if (!els.activityHeatmap || !els.activityMonths) return;

    const today = startOfLocalDay(new Date());
    const weekStart = addDays(startOfLocalWeek(today), -52 * 7);
    const weeks = 53;
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "short" });
    const dateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

    els.activityMonths.innerHTML = "";
    els.activityHeatmap.innerHTML = "";
    els.activityMonths.style.gridTemplateColumns = `repeat(${weeks}, 14px)`;
    els.activityHeatmap.style.gridTemplateColumns = `repeat(${weeks}, 14px)`;

    let activeDays = 0;
    let totalSeconds = 0;
    let strongestDay = { key: null, seconds: 0 };
    let previousMonth = null;

    for (let week = 0; week < weeks; week++) {
      const monday = addDays(weekStart, week * 7);
      const weekDates = Array.from({ length: 7 }, (_, day) => addDays(monday, day));
      const labelDate = weekDates.find((date) => date.getDate() === 1 && date <= today) ??
        (week === 0 ? weekDates.find((date) => date <= today) : null);
      const month = labelDate?.getMonth() ?? previousMonth;
      if (labelDate && month !== previousMonth) {
        const label = document.createElement("span");
        label.textContent = monthFormatter.format(labelDate);
        label.style.gridColumn = `${week + 1} / span 4`;
        els.activityMonths.appendChild(label);
        previousMonth = month;
      }

      for (let day = 0; day < 7; day++) {
        const date = weekDates[day];
        const key = toLocalDateKey(date);
        const seconds = date > today ? 0 : dailyMap.get(key) ?? 0;
        const cell = document.createElement("div");
        const level = date > today ? 0 : getActivityLevel(seconds, state.dailyGoalHours);
        cell.className = `activityCell level${level}`;
        cell.style.gridColumn = String(week + 1);
        cell.style.gridRow = String(day + 1);
        cell.setAttribute("role", "img");

        if (date > today) {
          cell.classList.add("isFuture");
          cell.setAttribute("aria-label", `${dayNames[day]}, ${dateFormatter.format(date)} has not happened yet`);
        } else {
          if (seconds > 0) {
            activeDays += 1;
            totalSeconds += seconds;
            if (seconds > strongestDay.seconds) strongestDay = { key, seconds };
          }
          const duration = seconds > 0 ? formatDurationShort(seconds) : "No study time";
          cell.title = `${duration} on ${dateFormatter.format(date)}`;
          cell.setAttribute("aria-label", `${duration} on ${dayNames[day]}, ${dateFormatter.format(date)}`);
        }

        els.activityHeatmap.appendChild(cell);
      }
    }

    const totalLabel = totalSeconds > 0 ? formatHMFromSeconds(totalSeconds) : "0m";
    els.activitySummary.textContent = `${activeDays} active day${activeDays === 1 ? "" : "s"} in the last 12 months`;
    if (strongestDay.key) {
      const strongestDate = new Date(`${strongestDay.key}T00:00:00`);
      els.activityHint.textContent = `${totalLabel} studied across the map. Best square: ${formatDurationShort(
        strongestDay.seconds,
      )} on ${dateFormatter.format(strongestDate)}.`;
    } else {
      els.activityHint.textContent = "Save study sessions to fill your activity map.";
    }
  }

  function renderMilestones(totalHours) {
    const { unlocked, next } = getMilestoneStatus(totalHours);

    els.milestoneList.innerHTML = "";
    for (const h of MILESTONES_HOURS) {
      const done = unlocked.has(h);
      const item = document.createElement("div");
      item.className = `milestoneItem${done ? " done" : ""}`;
      item.innerHTML = `
        <div class="milestoneLeft">
          <div class="checkDot" aria-hidden="true"></div>
          <div class="milestoneName">${h} hours</div>
        </div>
        <div class="milestonePct">${done ? "Unlocked" : "Locked"}</div>
      `;
      els.milestoneList.appendChild(item);
    }

    if (next === null) {
      els.milestoneLabel.textContent = "All milestones completed";
      els.milestonePct.textContent = "100%";
      els.milestoneFill.style.width = "100%";
      els.milestoneMeta.textContent = `${Math.floor(totalHours)}h+ total`;
      return;
    }

    const progress = clamp((totalHours / next) * 100, 0, 100);
    els.milestoneLabel.textContent = `Next: ${next} hours`;
    els.milestonePct.textContent = `${Math.floor(progress)}%`;
    els.milestoneFill.style.width = `${progress}%`;
    els.milestoneMeta.textContent = `${totalHours.toFixed(1)}h of ${next}h`;
  }

  function renderBadges(state, totalHours) {
    const unlockedNow = new Set(MILESTONES_HOURS.filter((h) => totalHours >= h));
    const formatBadgeIcon = (hours) => (hours >= 1000 ? `${hours / 1000}K` : `${hours}H`);

    els.badgesGrid.innerHTML = "";

    for (const h of MILESTONES_HOURS) {
      const isUnlocked = unlockedNow.has(h);
      const card = document.createElement("div");
      card.className = `badge${isUnlocked ? "" : " locked"}`;
      card.innerHTML = `
        <div class="badgeTag">${isUnlocked ? "Unlocked" : "Locked"}</div>
        <div class="badgeIcon" aria-hidden="true">${formatBadgeIcon(h)}</div>
        <div class="badgeTitle">${h} Hours Completed</div>
        <div class="badgeSub">${
          isUnlocked ? "Nice work. Keep reinforcing the habit." : `Progress: ${Math.min(100, Math.floor((totalHours / h) * 100))}%`
        }</div>
      `;
      els.badgesGrid.appendChild(card);
    }

    const allUnlocked = new Set(state.unlockedMilestones);
    let changed = false;
    for (const hour of MILESTONES_HOURS) {
      if (unlockedNow.has(hour) && !allUnlocked.has(hour)) {
        allUnlocked.add(hour);
        changed = true;
      }
    }
    if (changed) {
      state.unlockedMilestones = [...allUnlocked].sort((a, b) => a - b);
      saveState(state);
    }
  }

  function renderSessionFilter(state) {
    for (const btn of els.filterBtns) {
      btn.classList.toggle("active", btn.dataset.filter === state.sessionFilter);
    }
  }

  function renderSessions(state) {
    els.sessionList.innerHTML = "";

    const filtered =
      state.sessionFilter === "all"
        ? state.sessions
        : state.sessions.filter((session) => session.type === state.sessionFilter);

    const sessions = filtered.slice(0, 10);
    if (sessions.length === 0) {
      const empty = document.createElement("div");
      empty.className = "miniNote";
      empty.textContent =
        state.sessionFilter === "all"
          ? "No sessions yet. Finish a timer to save your first study session."
          : `No ${state.sessionFilter} sessions yet.`;
      els.sessionList.appendChild(empty);
      return;
    }

    for (const session of sessions) {
      const dt = new Date(session.endedAt);
      const nice = dt.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      const item = document.createElement("div");
      item.className = "sessionItem";
      const sessionTitle = session.title || (session.type === "study" ? "Untitled study session" : "Break");
      item.innerHTML = `
        <div class="sessionMeta">
          <div class="sessionPrimary">${sessionTitle}</div>
          <div class="sessionSecondary">${formatHMS(session.durationSec)} | ${nice} | ${prettifyMode(session.mode)}</div>
        </div>
        <div class="sessionPill ${session.type === "break" ? "break" : ""}">${session.type === "break" ? "Break" : "Study"}</div>
      `;
      els.sessionList.appendChild(item);
    }
  }

  let dailyChart = null;
  let weeklyChart = null;
  let analyticsVisible = false;

  function ensureCharts(theme) {
    if (!window.Chart || !els.dailyChart || !els.weeklyChart) return;
    const colors = getChartColors(theme);

    const commonOpts = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 260 },
      plugins: {
        legend: { display: false },
        tooltip: { intersect: false, mode: "index" },
      },
      scales: {
        x: {
          grid: { color: colors.grid },
          ticks: { color: colors.tick, maxRotation: 0, autoSkip: true },
          border: { display: false },
        },
        y: {
          grid: { color: colors.grid },
          ticks: { color: colors.tick },
          border: { display: false },
        },
      },
    };

    if (!dailyChart) {
      dailyChart = new Chart(els.dailyChart, {
        type: "bar",
        data: {
          labels: [],
          datasets: [
            {
              label: "Minutes",
              data: [],
              backgroundColor: colors.bar,
              borderRadius: 10,
              maxBarThickness: 28,
            },
          ],
        },
        options: {
          ...commonOpts,
          scales: {
            ...commonOpts.scales,
            y: {
              ...commonOpts.scales.y,
              ticks: {
                ...commonOpts.scales.y.ticks,
                callback: (v) => `${v}m`,
              },
            },
          },
        },
      });
    }

    if (!weeklyChart) {
      weeklyChart = new Chart(els.weeklyChart, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            {
              label: "Hours",
              data: [],
              borderColor: colors.line,
              backgroundColor: colors.fill,
              tension: 0.35,
              fill: true,
              pointRadius: 3,
              pointHoverRadius: 5,
            },
          ],
        },
        options: {
          ...commonOpts,
          scales: {
            ...commonOpts.scales,
            y: {
              ...commonOpts.scales.y,
              ticks: {
                ...commonOpts.scales.y.ticks,
                callback: (v) => `${v}h`,
              },
            },
          },
        },
      });
    }

    dailyChart.options.scales.x.grid.color = colors.grid;
    dailyChart.options.scales.y.grid.color = colors.grid;
    dailyChart.options.scales.x.ticks.color = colors.tick;
    dailyChart.options.scales.y.ticks.color = colors.tick;
    dailyChart.data.datasets[0].backgroundColor = colors.bar;
    dailyChart.update();

    weeklyChart.options.scales.x.grid.color = colors.grid;
    weeklyChart.options.scales.y.grid.color = colors.grid;
    weeklyChart.options.scales.x.ticks.color = colors.tick;
    weeklyChart.options.scales.y.ticks.color = colors.tick;
    weeklyChart.data.datasets[0].borderColor = colors.line;
    weeklyChart.data.datasets[0].backgroundColor = colors.fill;
    weeklyChart.update();
  }

  function updateChartsFromState(state) {
    if (!analyticsVisible && !dailyChart && !weeklyChart) return;
    const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    ensureCharts(theme);
    if (!dailyChart || !weeklyChart) return;

    const daily = computeDailyTotals(state);
    const today = startOfLocalDay(new Date());

    const dayLabels = [];
    const dayData = [];
    for (let i = 13; i >= 0; i--) {
      const d = addDays(today, -i);
      const key = toLocalDateKey(d);
      dayLabels.push(d.toLocaleDateString(undefined, { month: "short", day: "2-digit" }));
      dayData.push(minutesFromSeconds(daily.get(key) ?? 0));
    }
    dailyChart.data.labels = dayLabels;
    dailyChart.data.datasets[0].data = dayData;
    dailyChart.update();

    const weekly = computeWeeklyTotals(state);
    const weekLabels = [];
    const weekData = [];
    let cursor = startOfLocalDay(new Date());
    const weekKeys = [getWeekKeyLocal(cursor)];
    for (let i = 1; i < 8; i++) {
      cursor = addDays(cursor, -7);
      weekKeys.push(getWeekKeyLocal(cursor));
    }
    weekKeys.reverse();

    for (const weekKey of weekKeys) {
      weekLabels.push(weekKey);
      weekData.push(Number(((weekly.get(weekKey) ?? 0) / 3600).toFixed(2)));
    }

    weeklyChart.data.labels = weekLabels;
    weeklyChart.data.datasets[0].data = weekData;
    weeklyChart.update();
  }

  function openAnalytics() {
    analyticsVisible = true;
    els.analyticsOverlay.classList.add("open");
    els.analyticsOverlay.setAttribute("aria-hidden", "false");
    updateChartsFromState(appState);
    try {
      dailyChart?.resize();
      weeklyChart?.resize();
    } catch {
      // ignore
    }
  }

  function closeAnalytics() {
    analyticsVisible = false;
    els.analyticsOverlay.classList.remove("open");
    els.analyticsOverlay.setAttribute("aria-hidden", "true");
  }

  function closeDedication() {
    els.dedicationOverlay.classList.remove("open");
    els.dedicationOverlay.setAttribute("aria-hidden", "true");
    els.dedicationChoices.innerHTML = "";
  }

  function openDedication(durationSec) {
    const bankedSec = availableDedicationSeconds(appState);
    const eligible = getDedicationOptionsForDuration(bankedSec);
    if (eligible.length === 0) return;

    els.dedicationHint.textContent = `Your latest ${formatDurationShort(
      durationSec,
    )} session added to your water bank. You now have ${formatDurationShort(bankedSec)} available to dedicate.`;
    els.dedicationChoices.innerHTML = "";

    for (const option of eligible) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dedicationBtn";
      button.innerHTML = `
        <div class="dedicationKicker">${option.minutes} min required</div>
        <div class="dedicationTitle">${option.label}</div>
        <div class="dedicationMeta">${option.blurb}</div>
      `;
      button.addEventListener("click", () => {
        saveDedication(appState, option);
        appState = loadState();
        renderStatsAndSystems(appState);
        closeDedication();
      });
      els.dedicationChoices.appendChild(button);
    }

    els.dedicationOverlay.classList.add("open");
    els.dedicationOverlay.setAttribute("aria-hidden", "false");
  }

  function renderGoalAndInsights(state, insights) {
    const weekHours = insights.weekSeconds / 3600;
    const todaySec = insights.daily.get(toLocalDateKey(new Date())) ?? 0;
    const dailyGoalSeconds = state.dailyGoalHours * 3600;
    const dailyGoalPct = dailyGoalSeconds > 0 ? clamp((todaySec / dailyGoalSeconds) * 100, 0, 100) : 0;
    els.weeklyGoalInput.value = String(state.weeklyGoalHours);
    els.weeklyGoalValue.textContent = String(state.weeklyGoalHours);
    if (els.weeklyGoalWeek) els.weeklyGoalWeek.textContent = `Week ${getWeekNumberLocal(new Date())}`;
    els.weeklyGoalFill.style.width = `${insights.weeklyGoalPct}%`;
    els.weeklyGoalMeta.textContent = `${weekHours.toFixed(1)}h of ${state.weeklyGoalHours}h this week`;
    els.dailyGoalInput.value = String(state.dailyGoalHours);
    els.dailyGoalValue.textContent = String(state.dailyGoalHours);
    els.dailyGoalFill.style.width = `${dailyGoalPct}%`;
    els.dailyGoalMeta.textContent = `${(todaySec / 3600).toFixed(1)}h of ${state.dailyGoalHours}h today`;

    if (insights.bestDayKey) {
      const date = new Date(`${insights.bestDayKey}T00:00:00`);
      const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const duration = formatDurationShort(insights.bestDaySeconds);
      els.bestDayValue.textContent = label;
      els.bestDaySub.textContent = `${duration} studied`;
      els.heroBestDayValue.textContent = label;
      els.heroBestDaySub.textContent = duration;
    } else {
      els.bestDayValue.textContent = "-";
      els.bestDaySub.textContent = "No study days yet";
      els.heroBestDayValue.textContent = "-";
      els.heroBestDaySub.textContent = "No sessions yet";
    }

    els.topModeValue.textContent = insights.topMode;
    els.topModeSub.textContent =
      insights.topModeCount > 0 ? `${insights.topModeCount} saved study sessions` : "Use the timer to learn your rhythm";
    els.focusTipText.textContent = insights.coachTip;

    if (state.lastDedication?.label) {
      const dedicationDate = new Date(state.lastDedication.completedAt);
      const dedicationWhen = dedicationDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      els.lastDedicationText.textContent = `${state.lastDedication.label} received water from a ${formatDurationShort(
        state.lastDedication.durationSec,
      )} study-time dedication on ${dedicationWhen}.`;
    } else {
      els.lastDedicationText.textContent =
        "Finish an eligible study session to dedicate water to a plant, bird, elephant, or cow.";
    }

    els.heroWeekValue.textContent = `${weekHours.toFixed(1)}h`;
    els.heroWeekSub.textContent = `${Math.round(insights.weeklyGoalPct)}% of weekly goal`;
    els.heroFocusScore.textContent = String(insights.focusScore);
    els.heroFocusSub.textContent =
      insights.focusScore >= 80 ? "Locked in" : insights.focusScore >= 50 ? "Good momentum" : "Needs a small win";
  }

  function renderStatsAndSystems(state) {
    const totalSec = totalStudySeconds(state);
    const totalHours = totalSec / 3600;
    const availableSec = availableDedicationSeconds(state);
    const availableMin = Math.floor(availableSec / 60);
    const studySessions = state.sessions.filter((s) => s.type === "study");
    const insights = computeInsights(state);

    els.totalTimeValue.textContent = formatHMFromSeconds(totalSec);
    els.totalTimeSub.textContent = `${studySessions.length} session${studySessions.length === 1 ? "" : "s"}`;

    const todaySec = insights.daily.get(toLocalDateKey(new Date())) ?? 0;
    els.todayValue.textContent = `${minutesFromSeconds(todaySec)}m`;
    els.todaySub.textContent = todaySec > 0 ? "Nice - studied today" : "Start with 10 minutes";

    const { current, best } = computeStreaksFromDailyMap(insights.daily);
    els.streakValue.textContent = String(current);
    const newBest = Math.max(best, state.bestStreak || 0);
    els.bestStreakValue.textContent = String(newBest);
    if (newBest !== state.bestStreak) {
      state.bestStreak = newBest;
      saveState(state);
    }

    els.averageSessionValue.textContent = studySessions.length > 0 ? `${Math.round(insights.averageSessionSec / 60)}m` : "0m";
    els.averageSessionSub.textContent =
      studySessions.length > 0
        ? insights.averageSessionSec >= 45 * 60
          ? "Long-form focus"
          : "Steady sessions"
        : "Build consistency";

    els.waterBankValue.textContent = availableSec >= 3600 ? formatHMFromSeconds(availableSec) : `${minutesFromSeconds(availableSec)}m`;
    const nextWaterOption = DEDICATION_OPTIONS.filter((option) => availableSec >= option.minutes * 60).sort(
      (a, b) => b.minutes - a.minutes,
    )[0];
    els.waterBankSub.textContent = nextWaterOption
      ? `Enough fresh water for ${nextWaterOption.label.toLowerCase()} dedication`
      : "Earn fresh study time to dedicate";

    els.plantsValue.textContent = String(state.dedicationCounts.plant ?? 0);
    els.birdsValue.textContent = String(state.dedicationCounts.birds ?? 0);
    els.elephantValue.textContent = String(state.dedicationCounts.elephant ?? 0);
    els.cowValue.textContent = String(state.dedicationCounts.cow ?? 0);

    const cycleRemaining = (minutes) => {
      const remainder = availableMin % minutes;
      return remainder === 0 ? minutes : minutes - remainder;
    };
    const plantRemaining = cycleRemaining(30);
    const birdRemaining = cycleRemaining(10);
    const elephantRemaining = cycleRemaining(50);
    const cowRemaining = cycleRemaining(35);
    els.plantsSub.textContent =
      availableMin < 30 ? `Need ${Math.max(0, 30 - availableMin)} new minutes for your next plant` : `Next plant dedication in ${plantRemaining} fresh min`;
    els.birdsSub.textContent =
      availableMin < 10 ? `Need ${Math.max(0, 10 - availableMin)} new minutes for your next bird` : `Next bird dedication in ${birdRemaining} fresh min`;
    els.elephantSub.textContent =
      availableMin < 50 ? `Need ${Math.max(0, 50 - availableMin)} new minutes for your next elephant` : `Next elephant dedication in ${elephantRemaining} fresh min`;
    els.cowSub.textContent =
      availableMin < 35 ? `Need ${Math.max(0, 35 - availableMin)} new minutes for your next cow` : `Next cow dedication in ${cowRemaining} fresh min`;

    renderGoalAndInsights(state, insights);
    renderActivityHeatmap(state, insights.daily);
    renderMilestones(totalHours);
    renderBadges(state, totalHours);
    renderSessionFilter(state);
    renderSessions(state);
    updateChartsFromState(state);
  }

  const timer = {
    mode: "pomodoro",
    pomodoroPhase: "focus",
    remainingSec: Pomodoro.focusSec,
    targetSec: Pomodoro.focusSec,
    running: false,
    rafId: null,
    dropIntervalId: null,
    lastSecondShown: null,
    lastDropSecondPlayed: null,
    endAtPerfMs: null,
    displayWhole: null,
    savedStudySec: 0,
    sessionStartedAt: null,
    lastPersistedAtMs: 0,
  };

  function getElapsedTimerSeconds() {
    return Math.max(0, Number(timer.targetSec) - Number(timer.remainingSec || 0));
  }

  function isSoundEnabled() {
    return Boolean(els.soundToggle?.checked);
  }

  function renderSoundControls() {
    const enabled = isSoundEnabled();
    if (els.focusSoundBtn) {
      els.focusSoundBtn.textContent = enabled ? "Sound on" : "Sound off";
      els.focusSoundBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
      els.focusSoundBtn.classList.toggle("isActive", enabled);
    }
  }

  function setSoundEnabled(enabled) {
    if (els.soundToggle) els.soundToggle.checked = Boolean(enabled);
    saveSoundEnabled(Boolean(enabled));
    renderSoundControls();
  }

  function toggleSoundEnabled() {
    setSoundEnabled(!isSoundEnabled());
  }

  function getGlassMetrics() {
    const elapsedSec = getElapsedTimerSeconds();
    const completedGlasses = Math.floor(elapsedSec / GLASS_FILL_SEC);
    const partialFillSec = elapsedSec % GLASS_FILL_SEC;
    const partialProgress = partialFillSec / GLASS_FILL_SEC;
    const shouldShowNextGlass = timer.remainingSec > 0 || elapsedSec === 0 || partialProgress > 0;
    const totalGlasses = Math.max(1, completedGlasses + (shouldShowNextGlass ? 1 : 0));
    const activeGlassIndex = shouldShowNextGlass ? totalGlasses - 1 : Math.max(0, totalGlasses - 1);

    return {
      elapsedSec,
      completedGlasses,
      partialProgress,
      totalGlasses,
      activeGlassIndex,
      shouldShowNextGlass,
    };
  }

  function createGlassElement(index) {
    const glass = document.createElement("div");
    glass.className = "glass newGlass";
    glass.dataset.index = String(index);
    glass.innerHTML = `
      <div class="glassShine"></div>
      <div class="water">
        <div class="waterSurface"></div>
      </div>
      <div class="glassLip"></div>
      <div class="glassBase"></div>
    `;
    return glass;
  }

  function syncGlassCount(totalGlasses) {
    while (els.glassShelf.children.length < totalGlasses) {
      els.glassShelf.appendChild(createGlassElement(els.glassShelf.children.length));
    }

    while (els.glassShelf.children.length > totalGlasses) {
      els.glassShelf.lastElementChild?.remove();
    }
  }

  function updateGlassLegend(metrics) {
    const activeBand = SPECTRUM_BANDS[metrics.activeGlassIndex % SPECTRUM_BANDS.length];

    if (timer.remainingSec <= 0 && metrics.completedGlasses > 0) {
      els.glassLegend.textContent = `${metrics.completedGlasses} glass${metrics.completedGlasses === 1 ? "" : "es"} filled. Final color: ${activeBand.name} (${activeBand.wavelength}).`;
      return;
    }

    if (metrics.completedGlasses === 0 && metrics.partialProgress === 0) {
      els.glassLegend.textContent = `Glass 1 fills in 10 minutes. The next glasses follow ${SPECTRUM_BANDS.map((band) => band.name).join(", ")}.`;
      return;
    }

    const fillPct = Math.round(metrics.partialProgress * 100);
    els.glassLegend.textContent = `Glass ${metrics.activeGlassIndex + 1} is ${activeBand.name} (${activeBand.wavelength}) and ${fillPct}% full.`;
  }

  function renderWaterGlasses() {
    const metrics = getGlassMetrics();
    syncGlassCount(metrics.totalGlasses);

    [...els.glassShelf.children].forEach((glass, index) => {
      const band = SPECTRUM_BANDS[index % SPECTRUM_BANDS.length];
      const fill = index < metrics.completedGlasses ? 1 : index === metrics.activeGlassIndex ? metrics.partialProgress : 0;
      const water = glass.querySelector(".water");

      glass.dataset.index = String(index);
      glass.dataset.spectrumIndex = String(index % SPECTRUM_BANDS.length);
      glass.style.setProperty("--water-top", band.top);
      glass.style.setProperty("--water-bottom", band.bottom);
      glass.style.setProperty("--glass-glow", band.glow);
      glass.classList.toggle("isDone", fill >= 0.999);
      glass.classList.toggle("currentGlass", index === metrics.activeGlassIndex && timer.remainingSec > 0);
      water.style.transform = `scaleY(${clamp(fill, 0, 1)})`;
    });

    updateGlassLegend(metrics);
  }

  function spawnDrop() {
    const metrics = getGlassMetrics();
    const activeGlass = els.glassShelf.children[metrics.activeGlassIndex];
    if (!activeGlass) return;

    const band = SPECTRUM_BANDS[metrics.activeGlassIndex % SPECTRUM_BANDS.length];
    const sceneRect = els.droplets.getBoundingClientRect();
    const glassRect = activeGlass.getBoundingClientRect();
    const leftMin = Math.max(0, glassRect.left - sceneRect.left + 18);
    const leftMax = Math.max(leftMin, glassRect.right - sceneRect.left - 24);

    const drop = document.createElement("div");
    drop.className = "drop";
    drop.style.left = `${leftMin + Math.random() * Math.max(1, leftMax - leftMin)}px`;
    drop.style.setProperty("--drop-color", band.drop);
    drop.style.setProperty("--drop-shadow", band.shadow);
    els.droplets.appendChild(drop);
    drop.addEventListener("animationend", () => drop.remove(), { once: true });

    if (isSoundEnabled()) playDropSound();
  }

  function setFocusMode(active) {
    document.body.classList.toggle("focus-mode-active", active);
  }

  function updateTimerLabels() {
    if (timer.mode === "pomodoro") {
      els.timerModeLabel.textContent = timer.pomodoroPhase === "focus" ? "Pomodoro focus" : "Pomodoro break";
    } else {
      els.timerModeLabel.textContent = els.customStoreMode.value === "break" ? "Custom break" : "Custom study";
    }
    els.timerTargetLabel.textContent = formatDurationShort(timer.targetSec);
  }

  function shouldCurrentTimerCountAsStudy() {
    if (timer.mode === "pomodoro") return timer.pomodoroPhase === "focus";
    return els.customStoreMode.value !== "break";
  }

  function getElapsedStudySec() {
    return Math.max(0, Math.round(timer.targetSec - timer.remainingSec));
  }

  function savePartialStudyProgress({ force = false } = {}) {
    if (!shouldCurrentTimerCountAsStudy()) return 0;

    const elapsedSec = getElapsedStudySec();
    const unsavedSec = Math.max(0, elapsedSec - timer.savedStudySec);
    const canSave = force ? elapsedSec >= MIN_SAVEABLE_STUDY_SEC && unsavedSec > 0 : unsavedSec >= MIN_SAVEABLE_STUDY_SEC;
    if (!canSave) return 0;

    const mode = timer.mode === "pomodoro" ? `pomodoro-${timer.pomodoroPhase}` : "custom";
    addSession(appState, { durationSec: unsavedSec, type: "study", mode, title: getSessionTitle() });
    timer.savedStudySec += unsavedSec;
    return unsavedSec;
  }


  function clearActiveTimerSnapshot() {
    localStorage.removeItem(ACTIVE_TIMER_KEY);
  }

  function saveActiveTimerSnapshot({ force = false } = {}) {
    if (!timer.running && !force) return;
    const nowMs = Date.now();
    if (!force && nowMs - (timer.lastPersistedAtMs || 0) < 5000) return;
    timer.lastPersistedAtMs = nowMs;

    localStorage.setItem(
      ACTIVE_TIMER_KEY,
      JSON.stringify({
        mode: timer.mode,
        pomodoroPhase: timer.pomodoroPhase,
        targetSec: timer.targetSec,
        remainingSec: timer.remainingSec,
        savedStudySec: timer.savedStudySec,
        sessionStartedAt: timer.sessionStartedAt,
        updatedAt: new Date(nowMs).toISOString(),
        custom: {
          hours: els.customHours.value,
          minutes: els.customMinutes.value,
          seconds: els.customSeconds.value,
          storeMode: els.customStoreMode.value,
          title: getSessionTitle(),
        },
      }),
    );
  }

  function applyTimerModeUi(mode) {
    timer.mode = mode;
    const isPomo = mode === "pomodoro";
    els.modePomodoroBtn.classList.toggle("active", isPomo);
    els.modeCustomBtn.classList.toggle("active", !isPomo);
    els.modePomodoroBtn.setAttribute("aria-selected", isPomo ? "true" : "false");
    els.modeCustomBtn.setAttribute("aria-selected", !isPomo ? "true" : "false");
    els.pomodoroPane.classList.toggle("hidden", !isPomo);
    els.customPane.classList.toggle("hidden", isPomo);
  }

  function restoreActiveTimerSnapshot() {
    const parsed = safeJsonParse(localStorage.getItem(ACTIVE_TIMER_KEY), null);
    if (!parsed || typeof parsed !== "object") return false;

    const targetSec = clamp(Number(parsed.targetSec ?? 0), 0, MAX_CUSTOM_TIMER_MINUTES * 60);
    const updatedAtMs = new Date(parsed.updatedAt ?? Date.now()).getTime();
    const elapsedAwaySec = Number.isFinite(updatedAtMs) ? Math.max(0, (Date.now() - updatedAtMs) / 1000) : 0;
    const storedRemainingSec = clamp(Number(parsed.remainingSec ?? targetSec), 0, targetSec);
    const remainingSec = Math.max(0, storedRemainingSec - elapsedAwaySec);

    timer.mode = parsed.mode === "custom" ? "custom" : "pomodoro";
    timer.pomodoroPhase = parsed.pomodoroPhase === "break" ? "break" : "focus";
    timer.targetSec = targetSec > 0 ? targetSec : Pomodoro.focusSec;
    timer.remainingSec = remainingSec;
    timer.savedStudySec = clamp(Number(parsed.savedStudySec ?? 0), 0, timer.targetSec);
    timer.sessionStartedAt = parsed.sessionStartedAt || new Date().toISOString();
    timer.lastPersistedAtMs = 0;

    if (parsed.custom && typeof parsed.custom === "object") {
      els.customHours.value = String(clamp(Number(parsed.custom.hours ?? 0), 0, Math.floor(MAX_CUSTOM_TIMER_MINUTES / 60)));
      els.customMinutes.value = String(clamp(Number(parsed.custom.minutes ?? 0), 0, 59));
      els.customSeconds.value = String(clamp(Number(parsed.custom.seconds ?? 0), 0, 59));
      els.customStoreMode.value = parsed.custom.storeMode === "break" ? "break" : "study";
      els.sessionNameInput.value = typeof parsed.custom.title === "string" ? parsed.custom.title.slice(0, 48) : "";
    }

    applyTimerModeUi(timer.mode);
    if (timer.mode === "pomodoro") {
      const phase = timer.pomodoroPhase;
      if (phase === "focus") {
        els.pomoPhasePill.textContent = "Focus (25:00)";
        els.pomoPhasePill.style.background = "rgba(38, 199, 111, 0.14)";
        els.pomoPhasePill.style.borderColor = "rgba(38, 199, 111, 0.18)";
      } else {
        els.pomoPhasePill.textContent = "Break (05:00)";
        els.pomoPhasePill.style.background = "rgba(245, 158, 11, 0.14)";
        els.pomoPhasePill.style.borderColor = "rgba(245, 158, 11, 0.18)";
      }
    }

    if (remainingSec <= 0) {
      timer.running = false;
      timer.remainingSec = 0;
      if (shouldCurrentTimerCountAsStudy()) savePartialStudyProgress({ force: true });
      clearActiveTimerSnapshot();
      timer.savedStudySec = 0;
      renderTimer();
      renderStatsAndSystems(appState);
      return true;
    }

    timer.running = true;
    timer.lastSecondShown = Math.ceil(timer.remainingSec);
    timer.lastDropSecondPlayed = Math.floor(getElapsedTimerSeconds());
    timer.displayWhole = null;
    setFocusMode(true);
    renderTimer();
    setButtons();
    renderStatsAndSystems(appState);
    startTick();
    return true;
  }
  function setMode(mode) {
    applyTimerModeUi(mode);
    resetTimerToSelected();
  }

  function setPomodoroPhase(phase) {
    timer.pomodoroPhase = phase;
    if (phase === "focus") {
      timer.targetSec = Pomodoro.focusSec;
      els.pomoPhasePill.textContent = "Focus (25:00)";
      els.pomoPhasePill.style.background = "rgba(38, 199, 111, 0.14)";
      els.pomoPhasePill.style.borderColor = "rgba(38, 199, 111, 0.18)";
    } else {
      timer.targetSec = Pomodoro.breakSec;
      els.pomoPhasePill.textContent = "Break (05:00)";
      els.pomoPhasePill.style.background = "rgba(245, 158, 11, 0.14)";
      els.pomoPhasePill.style.borderColor = "rgba(245, 158, 11, 0.18)";
    }
    timer.remainingSec = timer.targetSec;
    updateTimerLabels();
    renderTimer();
  }

  function getCustomTargetSeconds() {
    const hours = clamp(Number(els.customHours.value || 0), 0, Math.floor(MAX_CUSTOM_TIMER_MINUTES / 60));
    const minutes = clamp(Number(els.customMinutes.value || 0), 0, 59);
    const seconds = clamp(Number(els.customSeconds.value || 0), 0, 59);
    return clamp(hours * 3600 + minutes * 60 + seconds, 0, MAX_CUSTOM_TIMER_MINUTES * 60);
  }

  function stopTick() {
    if (timer.rafId) cancelAnimationFrame(timer.rafId);
    if (timer.dropIntervalId) clearInterval(timer.dropIntervalId);
    timer.rafId = null;
    timer.dropIntervalId = null;
  }

  function refreshTimerRemaining() {
    const now = performance.now();
    const remainingMs = Math.max(0, (timer.endAtPerfMs ?? now) - now);
    timer.remainingSec = remainingMs / 1000;
  }

  function syncDropEffects() {
    const elapsedWholeSeconds = Math.floor(getElapsedTimerSeconds());

    if (timer.lastDropSecondPlayed === null) {
      timer.lastDropSecondPlayed = elapsedWholeSeconds;
      return;
    }

    const pendingDrops = elapsedWholeSeconds - timer.lastDropSecondPlayed;
    if (pendingDrops <= 0) return;

    const dropsToRender = pendingDrops > 2 ? 1 : pendingDrops;
    for (let i = 0; i < dropsToRender; i++) {
      spawnDrop();
    }

    timer.lastDropSecondPlayed = elapsedWholeSeconds;
  }

  function updateTimerProgressText() {
    const metrics = getGlassMetrics();
    if (activeAlarm) {
      els.timerProgressText.textContent = "Session complete | alarm ringing";
    } else if (timer.running) {
      const completedText =
        metrics.completedGlasses > 0 ? ` | ${metrics.completedGlasses} full glass${metrics.completedGlasses === 1 ? "" : "es"}` : "";
      els.timerProgressText.textContent = `Glass ${metrics.activeGlassIndex + 1} filling${completedText}`;
    } else if (timer.remainingSec <= 0) {
      els.timerProgressText.textContent = `Session complete | ${metrics.completedGlasses} glass${metrics.completedGlasses === 1 ? "" : "es"} filled`;
    } else if (timer.remainingSec < timer.targetSec) {
      els.timerProgressText.textContent = `Paused on glass ${metrics.activeGlassIndex + 1}`;
    } else {
      els.timerProgressText.textContent = "Ready to start";
    }
  }

  function setButtons() {
    els.startBtn.disabled = timer.running;
    els.pauseBtn.disabled = !timer.running;
    if (els.focusPauseBtn) els.focusPauseBtn.disabled = !timer.running;
    const alarmActive = Boolean(activeAlarm);
    if (els.stopAlarmBtn) els.stopAlarmBtn.hidden = !alarmActive;
    if (els.focusStopAlarmBtn) els.focusStopAlarmBtn.hidden = !alarmActive;
    const dot = document.querySelector(".timerPulseDot");
    dot?.classList.toggle("running", timer.running);
    dot?.classList.toggle("paused", !timer.running && timer.remainingSec > 0 && timer.remainingSec < timer.targetSec);
    updateTimerProgressText();
  }

  function renderTimer() {
    els.timerDisplay.textContent = formatHMS(timer.remainingSec);
    renderWaterGlasses();
    updateTimerLabels();
    updateTimerProgressText();
  }

  function resetTimerToSelected() {
    savePartialStudyProgress({ force: true });
    stopDoneSound();
    clearActiveTimerSnapshot();
    stopTick();
    timer.running = false;
    setFocusMode(false);
    timer.lastSecondShown = null;
    timer.lastDropSecondPlayed = null;
    timer.endAtPerfMs = null;
    timer.displayWhole = null;
    timer.savedStudySec = 0;
    timer.sessionStartedAt = null;
    timer.lastPersistedAtMs = 0;

    if (timer.mode === "pomodoro") {
      setPomodoroPhase(timer.pomodoroPhase);
    } else {
      const target = getCustomTargetSeconds();
      timer.targetSec = target > 0 ? target : 25 * 60;
      timer.remainingSec = timer.targetSec;
      renderTimer();
    }

    setButtons();
  }

  function onTimerDone() {
    timer.running = false;
    stopTick();
    setFocusMode(false);
    timer.lastSecondShown = null;
    timer.lastDropSecondPlayed = null;
    timer.endAtPerfMs = null;
    timer.displayWhole = null;
    setButtons();

    if (isSoundEnabled()) playDoneSound();

    const completedDurationSec = Math.round(timer.targetSec);
    const shouldStore = shouldCurrentTimerCountAsStudy();
    if (shouldStore && completedDurationSec > 0) savePartialStudyProgress({ force: true });
    clearActiveTimerSnapshot();

    if (timer.mode === "pomodoro" && els.pomoAutoSwitch.checked) {
      setPomodoroPhase(timer.pomodoroPhase === "focus" ? "break" : "focus");
    } else {
      timer.remainingSec = timer.targetSec;
      renderTimer();
    }

    appState = loadState();
    renderStatsAndSystems(appState);
    if (shouldStore && completedDurationSec > 0) openDedication(completedDurationSec);
    timer.savedStudySec = 0;
    timer.sessionStartedAt = null;
    timer.lastPersistedAtMs = 0;
  }

  function startTick() {
    stopTick();
    timer.endAtPerfMs = performance.now() + Math.max(0, timer.remainingSec) * 1000;
    timer.dropIntervalId = window.setInterval(() => {
      if (!timer.running) return;
      refreshTimerRemaining();
      saveActiveTimerSnapshot();
      syncDropEffects();

      if (timer.remainingSec <= 0) {
        timer.remainingSec = 0;
        onTimerDone();
      }
    }, 300);

    const loop = () => {
      if (!timer.running) return;
      refreshTimerRemaining();

      const whole = Math.ceil(timer.remainingSec);
      if (timer.lastSecondShown === null) timer.lastSecondShown = whole;
      if (whole !== timer.lastSecondShown) timer.lastSecondShown = whole;

      const displayWhole = Math.ceil(timer.remainingSec);
      if (timer.displayWhole !== displayWhole) {
        timer.displayWhole = displayWhole;
        els.timerDisplay.textContent = formatHMS(timer.remainingSec);
      }

      syncDropEffects();
      renderWaterGlasses();
      saveActiveTimerSnapshot();

      if (timer.remainingSec <= 0) {
        timer.remainingSec = 0;
        els.timerDisplay.textContent = formatHMS(0);
        renderWaterGlasses();
        saveActiveTimerSnapshot({ force: true });
        onTimerDone();
        return;
      }

      timer.rafId = requestAnimationFrame(loop);
    };

    timer.rafId = requestAnimationFrame(loop);
  }

  function startTimer() {
    if (timer.running) return;
    stopDoneSound();
    getSharedAudioContext();
    if (timer.mode === "custom") {
      const target = getCustomTargetSeconds();
      timer.targetSec = target > 0 ? target : 25 * 60;
      if (timer.remainingSec > timer.targetSec || timer.remainingSec <= 0) {
        timer.remainingSec = timer.targetSec;
      }
    }
    timer.running = true;
    if (!timer.sessionStartedAt) timer.sessionStartedAt = new Date().toISOString();
    setFocusMode(true);
    timer.lastSecondShown = Math.ceil(timer.remainingSec);
    timer.lastDropSecondPlayed = Math.floor(getElapsedTimerSeconds());
    timer.displayWhole = null;
    setButtons();
    updateTimerLabels();
    saveActiveTimerSnapshot({ force: true });
    startTick();
  }

  function pauseTimer() {
    if (!timer.running) return;
    timer.running = false;
    stopTick();
    savePartialStudyProgress({ force: true });
    clearActiveTimerSnapshot();
    timer.sessionStartedAt = null;
    timer.lastPersistedAtMs = 0;
    setFocusMode(false);
    appState = loadState();
    renderStatsAndSystems(appState);
    setButtons();
  }

  function exitFocusMode() {
    pauseTimer();
  }

  function exportData(state) {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 3,
      data: state,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `edge-export-${toLocalDateKey(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function importDataFromFile(file) {
    const text = await file.text();
    const parsed = safeJsonParse(text, null);
    if (!parsed) throw new Error("Invalid JSON.");

    const incoming = parsed.data && typeof parsed.data === "object" ? parsed.data : parsed;
    const merged = loadState();

    const sessions = Array.isArray(incoming.sessions) ? incoming.sessions.map(normalizeSessionInput) : [];
    const byId = new Map(merged.sessions.map((session) => [session.id, session]));
    for (const session of sessions) byId.set(session.id, session);
    merged.sessions = [...byId.values()].sort((a, b) => new Date(b.endedAt) - new Date(a.endedAt));
    merged.unlockedMilestones = Array.isArray(incoming.unlockedMilestones)
      ? incoming.unlockedMilestones.map(Number).filter(Number.isFinite).sort((a, b) => a - b)
      : merged.unlockedMilestones;
    merged.bestStreak = clamp(Number(incoming.bestStreak ?? merged.bestStreak ?? 0), 0, 100000);
    merged.weeklyGoalHours = clamp(Number(incoming.weeklyGoalHours ?? merged.weeklyGoalHours), 1, 80);
    merged.dailyGoalHours = clamp(Number(incoming.dailyGoalHours ?? merged.dailyGoalHours ?? DEFAULT_DAILY_GOAL_HOURS), 1, 24);
    merged.dedicationCounts = {
      plant: clamp(Number(incoming.dedicationCounts?.plant ?? merged.dedicationCounts.plant ?? 0), 0, 100000),
      birds: clamp(Number(incoming.dedicationCounts?.birds ?? merged.dedicationCounts.birds ?? 0), 0, 100000),
      elephant: clamp(Number(incoming.dedicationCounts?.elephant ?? merged.dedicationCounts.elephant ?? 0), 0, 100000),
      cow: clamp(Number(incoming.dedicationCounts?.cow ?? merged.dedicationCounts.cow ?? 0), 0, 100000),
    };
    merged.dedicatedStudySeconds = clamp(
      Number(incoming.dedicatedStudySeconds ?? deriveDedicatedStudySeconds(merged.dedicationCounts)),
      0,
      365 * 24 * 3600,
    );
    merged.lastDedication =
      incoming.lastDedication && typeof incoming.lastDedication === "object"
        ? {
            key: String(incoming.lastDedication.key ?? ""),
            label: String(incoming.lastDedication.label ?? ""),
            durationSec: clamp(Number(incoming.lastDedication.durationSec ?? 0), 0, 365 * 24 * 3600),
            completedAt: String(incoming.lastDedication.completedAt ?? new Date().toISOString()),
          }
        : merged.lastDedication;

    saveState(merged);
    return merged;
  }

  function clearSessions(state) {
    state.sessions = [];
    state.unlockedMilestones = [];
    state.bestStreak = 0;
    state.dedicationCounts = { plant: 0, birds: 0, elephant: 0, cow: 0 };
    state.dedicatedStudySeconds = 0;
    state.lastDedication = null;
    saveState(state);
  }

  function resetAll() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    els.darkModeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    saveTheme(theme);
    if (dailyChart || weeklyChart) ensureCharts(theme);
  }

  function toggleTheme() {
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  }

  function setCustomPreset(minutes) {
    const totalMinutes = clamp(Number(minutes || 25), 1, MAX_CUSTOM_TIMER_MINUTES);
    els.customHours.value = String(Math.floor(totalMinutes / 60));
    els.customMinutes.value = String(totalMinutes % 60);
    els.customSeconds.value = "0";
    if (timer.mode === "custom" && !timer.running) resetTimerToSelected();
  }

  let appState = loadState();

  function wireEvents() {
    els.startBtn.addEventListener("click", startTimer);
    els.pauseBtn.addEventListener("click", pauseTimer);
    els.resetBtn.addEventListener("click", resetTimerToSelected);
    els.stopAlarmBtn?.addEventListener("click", stopDoneSound);
    els.focusPauseBtn.addEventListener("click", pauseTimer);
    els.focusSoundBtn.addEventListener("click", toggleSoundEnabled);
    els.focusStopAlarmBtn?.addEventListener("click", stopDoneSound);
    els.focusExitBtn.addEventListener("click", exitFocusMode);

    els.modePomodoroBtn.addEventListener("click", () => setMode("pomodoro"));
    els.modeCustomBtn.addEventListener("click", () => setMode("custom"));

    const onCustomChange = () => {
      if (timer.mode !== "custom" || timer.running) return;
      resetTimerToSelected();
    };
    els.customHours.addEventListener("input", onCustomChange);
    els.customMinutes.addEventListener("input", onCustomChange);
    els.customSeconds.addEventListener("input", onCustomChange);
    els.customStoreMode.addEventListener("change", updateTimerLabels);
    els.soundToggle.addEventListener("change", () => setSoundEnabled(els.soundToggle.checked));

    for (const btn of els.presetBtns) {
      btn.addEventListener("click", () => {
        setMode("custom");
        setCustomPreset(clamp(Number(btn.dataset.minutes || 25), 1, MAX_CUSTOM_TIMER_MINUTES));
      });
    }

    els.weeklyGoalInput.addEventListener("change", () => {
      appState.weeklyGoalHours = clamp(Number(els.weeklyGoalInput.value || DEFAULT_WEEKLY_GOAL_HOURS), 1, 80);
      saveState(appState);
      renderStatsAndSystems(appState);
    });
    els.dailyGoalInput.addEventListener("change", () => {
      appState.dailyGoalHours = clamp(Number(els.dailyGoalInput.value || DEFAULT_DAILY_GOAL_HOURS), 1, 24);
      saveState(appState);
      renderStatsAndSystems(appState);
    });

    els.exportBtn.addEventListener("click", () => exportData(appState));
    els.importInput.addEventListener("change", async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        appState = await importDataFromFile(file);
        renderStatsAndSystems(appState);
      } catch (error) {
        alert(error?.message ?? "Import failed.");
      } finally {
        event.target.value = "";
      }
    });

    els.clearSessionsBtn.addEventListener("click", () => {
      if (!confirm("Clear all saved sessions? This cannot be undone.")) return;
      clearSessions(appState);
      appState = loadState();
      renderStatsAndSystems(appState);
    });

    els.resetAllBtn.addEventListener("click", () => {
      if (!confirm("Reset all data (sessions, milestones, streaks, goals, dedications)? This cannot be undone.")) return;
      resetAll();
      appState = loadState();
      renderStatsAndSystems(appState);
      resetTimerToSelected();
    });

    for (const btn of els.filterBtns) {
      btn.addEventListener("click", () => {
        appState.sessionFilter = btn.dataset.filter;
        saveState(appState);
        renderSessionFilter(appState);
        renderSessions(appState);
      });
    }

    els.darkModeToggle.addEventListener("click", toggleTheme);
    els.openAnalyticsBtn.addEventListener("click", openAnalytics);
    els.closeAnalyticsBtn.addEventListener("click", closeAnalytics);
    els.analyticsOverlay.addEventListener("click", (event) => {
      if (event.target === els.analyticsOverlay) closeAnalytics();
    });
    els.closeDedicationBtn.addEventListener("click", closeDedication);
    els.dedicationOverlay.addEventListener("click", (event) => {
      if (event.target === els.dedicationOverlay) closeDedication();
    });

    window.addEventListener("beforeunload", () => {
      if (timer.running) saveActiveTimerSnapshot({ force: true });
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && timer.running) saveActiveTimerSnapshot({ force: true });
    });

    window.addEventListener("keydown", (event) => {
      if (event.target && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
      if (event.key === "Escape") {
        closeAnalytics();
        closeDedication();
      }
      if (event.code === "Space") {
        event.preventDefault();
        timer.running ? pauseTimer() : startTimer();
      }
      if (event.key.toLowerCase() === "r") resetTimerToSelected();
    });
  }

  function init() {
    applyTheme(loadTheme());
    setSoundEnabled(loadSoundEnabled());
    setPomodoroPhase("focus");
    applyTimerModeUi("pomodoro");
    renderSoundControls();
    wireEvents();
    if (!restoreActiveTimerSnapshot()) {
      renderTimer();
      setButtons();
      renderStatsAndSystems(appState);
    }
  }

  init();
})();

