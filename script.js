const SCALE = 40.0;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const PI = Math.PI;
const baseRoot = 110.0; // A2, radice comune di tutte le scale

// Localizzazione completa dell'interfaccia (EN / IT)
const TRANSLATIONS = {
    en: {
        harmony: "Harmony",
        objects: "Objects",
        language: "Language:",
        "btn-clear": "🧹 Clear",
        "btn-pause": "⏸️ Pause",
        "btn-play": "▶️ Play",
        "btn-glitch": "⚡ GLITCH",
        "select-object": "Select Object",
        "btn-theme": "🌓 Theme",
        "block-wall": "Wall",
        "timbre-label": "Timbre / Sound Type:",
        "scale-label": "Musical Scale:",
        "interactive-tools": "Interactive Tools:",
        "tool-rope": "🧵 Rope",
        "tool-chain": "⛓️ Rigid Chain",
        "tool-bar": "🔗 Bar",
        "tool-eraser": "🧹 Eraser",
        "bg-trees": "Background Trees Count",
        "rope-segments": "Rope/Chain Segments",
        "gravity-label": "Physics - Gravity Y",
        "air-drag": "Physics - Air Drag",
        "wind-speed": "Wind - Speed",
        "wind-turb": "Wind - Turbulence",
        "reset-physics": "↩️ Reset Physics",
        "saved-scenes": "Saved Scenes:",
        "btn-save": "💾 Save",
        "btn-load": "📂 Load",
        "btn-delete": "🗑️ Delete Selected",
        "volume-mixer": "Volume Mixer",
        "btn-reset": "Reset",
        "master-vol": "Master Volume",
        "inst-default": "Drag to move. Click on empty space to spawn.",
        "inst-free": "Free Mode: Drag only to move objects.",
        "inst-paused": "Simulation paused.",
        "inst-active": "Simulation active.",
        "inst-wall": "Wall Mode: Click empty space to create a wall. Drag arrows to resize, blue circle to rotate. Click elsewhere to confirm. Double tap an existing wall to edit it again.",
        "inst-wall-edit": "Drag arrows to resize, blue circle to rotate. Click elsewhere to confirm.",
        "inst-bar": "Rigid Bar Mode: Click first point, then second point.",
        "inst-rope": "Rope Mode: Click first point, then second point.",
        "inst-chain": "Rigid Chain Mode: Click first point, then second point.",
        "inst-eraser": "Eraser Mode: Click an object, bar, or rope to delete it.",
        "limit-reached": "⚠️ Limit of {max} objects reached: delete something before continuing",
        "no-scenes": "(no saved scenes)"
    },
    it: {
        harmony: "Armonia",
        objects: "Oggetti",
        language: "Lingua:",
        "btn-clear": "🧹 Pulisci",
        "btn-pause": "⏸️ Pausa",
        "btn-play": "▶️ Play",
        "btn-glitch": "⚡ GLITCH",
        "select-object": "Seleziona Oggetto",
        "btn-theme": "🌓 Tema",
        "block-wall": "Muro",
        "timbre-label": "Timbro / Tipo Suono:",
        "scale-label": "Scala Musicale:",
        "interactive-tools": "Strumenti Interattivi:",
        "tool-rope": "🧵 Corda",
        "tool-chain": "⛓️ Catena Rigida",
        "tool-bar": "🔗 Barra",
        "tool-eraser": "🧹 Gomma",
        "bg-trees": "Conteggio Alberi Sfondo",
        "rope-segments": "Segmenti Corda/Catena",
        "gravity-label": "Fisica - Gravità Y",
        "air-drag": "Fisica - Attrito Aria",
        "wind-speed": "Vento - Velocità",
        "wind-turb": "Vento - Turbolenza",
        "reset-physics": "↩️ Ripristina Fisica",
        "saved-scenes": "Scene Salvate:",
        "btn-save": "💾 Salva",
        "btn-load": "📂 Carica",
        "btn-delete": "🗑️ Elimina Selezionata",
        "volume-mixer": "Mixer Volume",
        "btn-reset": "Reset",
        "master-vol": "Volume Principale",
        "inst-default": "Trascina per muovere. Clicca a vuoto per spawnare.",
        "inst-free": "Modalità Libera: Trascina solo per muovere gli oggetti.",
        "inst-paused": "Simulazione in PAUSA.",
        "inst-active": "Simulazione attiva.",
        "inst-wall": "Modo Muro: Clicca a vuoto per creare un muro. Trascina le frecce per ridimensionarlo, il cerchio blu per ruotarlo. Clicca altrove per confermare. Doppio tap su un muro esistente per modificarlo di nuovo.",
        "inst-wall-edit": "Trascina le frecce per ridimensionare, il cerchio blu per ruotare. Clicca altrove per confermare.",
        "inst-bar": "Modo Barra Rigida: Clicca sul primo punto e poi sul secondo.",
        "inst-rope": "Modo Corda: Clicca sul primo punto e poi sul secondo.",
        "inst-chain": "Modo Catena Rigida: Clicca sul primo punto e poi sul secondo.",
        "inst-eraser": "Modo Gomma: Clicca un oggetto, una barra o una corda per cancellarla.",
        "limit-reached": "⚠️ Limite di {max} oggetti raggiunto: cancella qualcosa prima di continuare",
        "no-scenes": "(nessuna scena salvata)"
    }
};

let currentLanguage = 'en';

function t(key, replacements = {}) {
    let text = TRANSLATIONS[currentLanguage][key] || TRANSLATIONS['en'][key] || key;
    for (const k in replacements) {
        text = text.replace(`{${k}}`, replacements[k]);
    }
    return text;
}

function updateUILanguage() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (key) {
            el.textContent = t(key);
        }
    });
    updateInstructionText();
    refreshSceneList();
}

function updateInstructionText() {
    const el = document.getElementById("instruction-mode");
    if (!el) return;
    if (isPaused) {
        el.innerText = t("inst-paused");
        return;
    }
    if (editingWallBody) {
        el.innerText = t("inst-wall-edit");
        return;
    }
    if (currentMode === "none") {
        el.innerText = t("inst-free");
    } else if (currentMode === "spawn") {
        if (currentChoice === "wall") {
            el.innerText = t("inst-wall");
        } else {
            el.innerText = t("inst-default");
        }
    } else if (currentMode === "bar") {
        el.innerText = t("inst-bar");
    } else if (currentMode === "rope") {
        el.innerText = t("inst-rope");
    } else if (currentMode === "chain") {
        el.innerText = t("inst-chain");
    } else if (currentMode === "eraser") {
        el.innerText = t("inst-eraser");
    }
}

// Set esteso di timbriche e strumenti virtuali
const SOUND_TIMBRES = {
    sine: { name: "🌙 Dolce / Eterea (Seno)", type1: "sine", type2: "sine", sub: true, filterType: "lowpass", cutoffMult: 2.5, resonance: 1.0 },
    square: { name: "👾 Chiptune / Retro 8-bit (Square)", type1: "square", type2: "sawtooth", sub: true, filterType: "lowpass", cutoffMult: 3.5, resonance: 2.5 },
    sawtooth: { name: "🎻 Synth Lead / Corda (Saw)", type1: "sawtooth", type2: "triangle", sub: false, filterType: "lowpass", cutoffMult: 3.0, resonance: 1.5 },
    triangle: { name: "🪈 Flauto / Acustico (Triangle)", type1: "triangle", type2: "sine", sub: false, filterType: "lowpass", cutoffMult: 2.0, resonance: 0.8 },
    organ: { name: "⛪ Organo da Chiesa (Organ)", type1: "sine", type2: "square", sub: true, filterType: "bandpass", cutoffMult: 4.0, resonance: 3.0 },
    brass: { name: "🎺 Sezione Ottoni (Brass)", type1: "sawtooth", type2: "square", sub: false, filterType: "lowpass", cutoffMult: 3.8, resonance: 2.0 },
    pad: { name: "🌌 Atmosfera / Ambient Pad", type1: "sine", type2: "triangle", sub: true, filterType: "lowpass", cutoffMult: 1.5, resonance: 0.5 },
    bell: { name: "🔔 Campana / Cristallo (Bell)", type1: "sine", type2: "sawtooth", sub: false, filterType: "highpass", cutoffMult: 1.2, resonance: 4.0 }
};
let currentTimbreMode = "sine";

function setTimbreMode(mode) {
    if (SOUND_TIMBRES[mode]) {
        currentTimbreMode = mode;
    }
}

function populateTimbreSelect() {
    const sel = document.getElementById("timbre-select");
    if (!sel) return;
    sel.innerHTML = "";
    for (const key in SOUND_TIMBRES) {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = SOUND_TIMBRES[key].name;
        if (key === currentTimbreMode) opt.selected = true;
        sel.appendChild(opt);
    }
}

const SCALE_PATTERNS = {
    major: [0, 2, 4, 5, 7, 9, 11],
    naturalMinor: [0, 2, 3, 5, 7, 8, 10],
    harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    pentatonicMajor: [0, 2, 4, 7, 9],
    pentatonicMinor: [0, 3, 5, 7, 10],
    blues: [0, 3, 5, 6, 7, 10],
    wholeTone: [0, 2, 4, 6, 8, 10],
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
};

const SCALE_NAMES = {
    pentatonicMinor: { it: "Pentatonica Minore", en: "Minor Pentatonic" },
    pentatonicMajor: { it: "Pentatonica Maggiore", en: "Major Pentatonic" },
    major: { it: "Maggiore", en: "Major" },
    naturalMinor: { it: "Minore Naturale", en: "Natural Minor" },
    harmonicMinor: { it: "Minore Armonica", en: "Harmonic Minor" },
    dorian: { it: "Dorica", en: "Dorian" },
    mixolydian: { it: "Misolidia", en: "Mixolydian" },
    blues: { it: "Blues", en: "Blues" },
    wholeTone: { it: "Toni Interi", en: "Whole Tone" },
    chromatic: { it: "Cromatica", en: "Chromatic" }
};

let currentScaleMode = "pentatonicMinor";

const materialRegisters = {
    bass: { centerDegree: 0, range: 3 },
    wood: { centerDegree: 4, range: 3 },
    mid: { centerDegree: 8, range: 4 },
    rubber: { centerDegree: 11, range: 3 },
    high: { centerDegree: 15, range: 4 },
    neon: { centerDegree: 19, range: 4 },
    wall: { centerDegree: 2, range: 2 }
};

let melodicDegree = {};
for (const key in materialRegisters) melodicDegree[key] = materialRegisters[key].centerDegree;

function degreeToFrequency(degreeIndex) {
    const pattern = SCALE_PATTERNS[currentScaleMode];
    const stepsPerOctave = pattern.length;
    const octave = Math.floor(degreeIndex / stepsPerOctave);
    const degreeInOctave = ((degreeIndex % stepsPerOctave) + stepsPerOctave) % stepsPerOctave;
    const semitone = pattern[degreeInOctave] + octave * 12;
    return baseRoot * Math.pow(2, semitone / 12);
}

function nextNoteFrequency(type) {
    const reg = materialRegisters[type] || materialRegisters.wall;
    let degree = melodicDegree[type] !== undefined ? melodicDegree[type] : reg.centerDegree;

    const pull = (reg.centerDegree - degree) * 0.15;
    const step = Math.round((Math.random() - 0.5) * 4 + pull);
    degree = Math.max(reg.centerDegree - reg.range, Math.min(reg.centerDegree + reg.range, degree + step));

    melodicDegree[type] = degree;
    return degreeToFrequency(degree);
}

function setScaleMode(mode) {
    if (!SCALE_PATTERNS[mode]) return;
    currentScaleMode = mode;
    for (const key in materialRegisters) melodicDegree[key] = materialRegisters[key].centerDegree;
}

function changeScale(mode) {
    setScaleMode(mode);
}

function populateScaleSelect() {
    const sel = document.getElementById("scale-select");
    if (!sel) return;
    sel.innerHTML = "";
    for (const key in SCALE_NAMES) {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = SCALE_NAMES[key][currentLanguage] || SCALE_NAMES[key].en;
        if (key === currentScaleMode) opt.selected = true;
        sel.appendChild(opt);
    }
}

function setLanguage(lang) {
    if (TRANSLATIONS[lang]) {
        currentLanguage = lang;
        populateScaleSelect();
        populateTimbreSelect();
        updateUILanguage();
    }
}

const volumes = { bass: 0.8, wood: 0.8, mid: 0.8, rubber: 0.8, high: 0.8, neon: 0.8, wall: 0.8 };
let masterVolume = 0.8;

function updateVolume(type, val) {
    volumes[type] = parseFloat(val);
}
function updateMasterVolume(val) {
    masterVolume = parseFloat(val);
}
function resetMixer() {
    masterVolume = 0.8;
    document.getElementById("vol-master").value = 0.8;
    for (let key in volumes) {
        volumes[key] = 0.8;
        const slider = document.getElementById("vol-" + key);
        if (slider) slider.value = 0.8;
    }
}

let activeSoundsCount = 0;
const MAX_SIMULTANEOUS_SOUNDS = 12;

function playMixedSound(typeA, typeB, velocity) {
    if (audioCtx.state === "suspended") audioCtx.resume();
    if (activeSoundsCount >= MAX_SIMULTANEOUS_SOUNDS) return;
    activeSoundsCount++;

    const now = audioCtx.currentTime;
    const primaryType = typeA;
    const secondaryType = typeB && typeB !== typeA ? typeB : null;
    const timbre = SOUND_TIMBRES[currentTimbreMode] || SOUND_TIMBRES.sine;

    const freq1 = nextNoteFrequency(primaryType);

    const osc1 = audioCtx.createOscillator();
    const oscSub = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    const filter1 = audioCtx.createBiquadFilter();

    osc1.type = timbre.type1;
    osc1.frequency.setValueAtTime(freq1, now);
    
    oscSub.type = "sine";
    oscSub.frequency.setValueAtTime(freq1 * 0.5, now);

    filter1.type = timbre.filterType || "lowpass";
    filter1.frequency.setValueAtTime(Math.min(freq1 * timbre.cutoffMult, 5000), now);
    filter1.Q.setValueAtTime(timbre.resonance, now);

    const baseVol1 = volumes[primaryType] !== undefined ? volumes[primaryType] : 0.8;
    const vol1 = Math.min(0.25, velocity * 0.03) * baseVol1 * masterVolume;

    const duration = currentTimbreMode === "pad" ? 3.5 : (currentTimbreMode === "bell" ? 3.0 : 2.5);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(vol1, now + (currentTimbreMode === "pad" ? 0.4 : 0.1));
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(filter1);
    if (timbre.sub) {
        oscSub.connect(filter1);
        oscSub.start(now);
        oscSub.stop(now + duration + 0.1);
    }
    
    filter1.connect(gain1);
    gain1.connect(audioCtx.destination);

    osc1.start(now);
    osc1.stop(now + duration + 0.1);

    if (secondaryType) {
        const freq2 = nextNoteFrequency(secondaryType);
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        const filter2 = audioCtx.createBiquadFilter();

        osc2.type = timbre.type2;
        osc2.frequency.setValueAtTime(freq2 / (currentTimbreMode === "organ" ? 1 : 2), now);
        filter2.type = "lowpass";
        filter2.frequency.setValueAtTime(2800, now);

        const vol2 = vol1 * 0.4;

        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(vol2, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + (duration - 0.3));

        osc2.connect(filter2);
        filter2.connect(gain2);
        gain2.connect(audioCtx.destination);

        osc2.start(now);
        osc2.stop(now + duration);
    }

    setTimeout(() => {
        activeSoundsCount = Math.max(0, activeSoundsCount - 1);
    }, 300);
    addScore(vol1);
}

let totalHarmony = 0;
const scoreEl = document.getElementById("score");
function addScore(points) {
    totalHarmony += Math.round(points * 2000);
    if (scoreEl) scoreEl.innerText = totalHarmony;
}
function clearScore() {
    totalHarmony = 0;
    if (scoreEl) scoreEl.innerText = "0";
}

let currentChoice = "bass";
let currentMode = "spawn";
let linkStartBody = null;
let linkStartPoint = null;
let isPaused = false;
let ropeIdCounter = 0;
let editingWallBody = null;
let resizingWallHandle = null;
let lastTapTime = 0;
let lastTapBody = null;
const DOUBLE_TAP_MS = 350;

function toggleToolbox(event) {
    if (event) event.stopPropagation();
    document.getElementById("toolbox").classList.toggle("collapsed");
}

function updateRopeProps() {
    const segVal = document.getElementById("slider-rope-seg").value;
    document.getElementById("val-rope-seg").innerText = segVal;

    for (let j = world.getJointList(); j; j = j.getNext()) {
        if (j.isRopeDistanceJoint && typeof j.setFrequency === "function") {
            j.setFrequency(18.0);
        }
    }
}

function toggleTheme() {
    document.body.classList.toggle("light-theme");
}

function togglePause() {
    isPaused = !isPaused;
    const btn = document.getElementById("btn-pause-play");
    if (isPaused) {
        btn.innerText = t("btn-play");
    } else {
        btn.innerText = t("btn-pause");
    }
    updateInstructionText();
}

function updateCursor() {
    const cursors = {
        none: "grab",
        spawn: "copy",
        bar: "crosshair",
        rope: "crosshair",
        chain: "crosshair",
        eraser: "cell"
    };
    canvas.style.cursor = cursors[currentMode] || "default";
}

function selectBlock(type) {
    editingWallBody = null;
    resizingWallHandle = null;
    if (currentMode === "spawn" && currentChoice === type) {
        currentMode = "none";
        document.querySelectorAll(".block-btn").forEach((btn) => btn.classList.remove("active"));
    } else {
        currentMode = "spawn";
        currentChoice = type;
        linkStartBody = null;
        linkStartPoint = null;
        document.querySelectorAll(".block-btn").forEach((btn) => btn.classList.remove("active"));
        document.querySelectorAll(".special-btn").forEach((btn) => btn.classList.remove("active"));
        document.getElementById("btn-" + type).classList.add("active");
    }
    updateCursor();
    updateInstructionText();
}

function setMode(mode) {
    editingWallBody = null;
    resizingWallHandle = null;
    if (currentMode === mode) {
        currentMode = "none";
        linkStartBody = null;
        linkStartPoint = null;
        document.querySelectorAll(".special-btn").forEach((btn) => btn.classList.remove("active"));
    } else {
        currentMode = mode;
        linkStartBody = null;
        linkStartPoint = null;
        document.querySelectorAll(".block-btn").forEach((btn) => btn.classList.remove("active"));
        document.querySelectorAll(".special-btn").forEach((btn) => btn.classList.remove("active"));
        document.getElementById("btn-" + mode).classList.add("active");
    }
    updateCursor();
    updateInstructionText();
}

const world = planck.World({ gravity: planck.Vec2(0, 9.8) });
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const bgCanvas = document.getElementById("bg-canvas");
const bgCtx = bgCanvas.getContext("2d");

const wallThickness = 40 / SCALE;
const ground = world.createBody({
    type: "static",
    position: planck.Vec2(window.innerWidth / 2 / SCALE, (window.innerHeight - 20) / SCALE)
});
let groundFixture = ground.createFixture(planck.Box(window.innerWidth / 2 / SCALE, wallThickness / 2), {
    friction: 0.3
});
ground.isWall = true;

const wallLeft = world.createBody({
    type: "static",
    position: planck.Vec2(wallThickness / 2, window.innerHeight / 2 / SCALE)
});
let wallLeftFixture = wallLeft.createFixture(planck.Box(wallThickness / 2, window.innerHeight / 2 / SCALE), {
    friction: 0.3
});
wallLeft.isWall = true;

const wallRight = world.createBody({
    type: "static",
    position: planck.Vec2((window.innerWidth - wallThickness / 2) / SCALE, window.innerHeight / 2 / SCALE)
});
let wallRightFixture = wallRight.createFixture(planck.Box(wallThickness / 2, window.innerHeight / 2 / SCALE), {
    friction: 0.3
});
wallRight.isWall = true;

const ceiling = world.createBody({
    type: "static",
    position: planck.Vec2(window.innerWidth / 2 / SCALE, wallThickness / 2)
});
let ceilingFixture = ceiling.createFixture(planck.Box(window.innerWidth / 2 / SCALE, wallThickness / 2), {
    friction: 0.3
});
ceiling.isWall = true;

let logicalWidth = window.innerWidth;
let logicalHeight = window.innerHeight;

const MAX_BODIES = 150;

function getSpawnedBodyCount() {
    let count = 0;
    for (let b = world.getBodyList(); b; b = b.getNext()) {
        if (!b.isWall) count++;
    }
    return count;
}

function updateBodyCountDisplay() {
    const el = document.getElementById("body-count");
    const box = document.getElementById("body-count-box");
    if (!el || !box) return;
    const count = getSpawnedBodyCount();
    el.innerText = count;
    box.classList.toggle("limit-full", count >= MAX_BODIES);
    box.classList.toggle("limit-near", count < MAX_BODIES && count >= MAX_BODIES * 0.85);
}

function flashLimitWarning() {
    const el = document.getElementById("instruction-mode");
    if (!el) return;
    const original = el.innerText;
    const originalColor = el.style.color;
    el.innerText = t("limit-reached", { max: MAX_BODIES });
    el.style.color = "#ff4757";
    clearTimeout(flashLimitWarning._t);
    flashLimitWarning._t = setTimeout(() => {
        el.innerText = original;
        el.style.color = originalColor;
    }, 2200);
}

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    logicalWidth = window.innerWidth;
    logicalHeight = window.innerHeight;

    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;
    canvas.style.width = logicalWidth + "px";
    canvas.style.height = logicalHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    bgCanvas.width = logicalWidth * dpr;
    bgCanvas.height = logicalHeight * dpr;
    bgCanvas.style.width = logicalWidth + "px";
    bgCanvas.style.height = logicalHeight + "px";
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (ground && wallLeft && wallRight && ceiling) {
        ground.setPosition(planck.Vec2(window.innerWidth / 2 / SCALE, (window.innerHeight - 20) / SCALE));
        ground.destroyFixture(groundFixture);
        groundFixture = ground.createFixture(planck.Box(window.innerWidth / 2 / SCALE, wallThickness / 2), {
            friction: 0.3
        });

        wallRight.setPosition(
            planck.Vec2((window.innerWidth - wallThickness / 2) / SCALE, window.innerHeight / 2 / SCALE)
        );
        wallRight.destroyFixture(wallRightFixture);
        wallRightFixture = wallRight.createFixture(planck.Box(wallThickness / 2, window.innerHeight / 2 / SCALE), {
            friction: 0.3
        });

        ceiling.setPosition(planck.Vec2(window.innerWidth / 2 / SCALE, wallThickness / 2));
        ceiling.destroyFixture(ceilingFixture);
        ceilingFixture = ceiling.createFixture(planck.Box(window.innerWidth / 2 / SCALE, wallThickness / 2), {
            friction: 0.3
        });

        wallLeft.setPosition(planck.Vec2(wallThickness / 2, window.innerHeight / 2 / SCALE));
        wallLeft.destroyFixture(wallLeftFixture);
        wallLeftFixture = wallLeft.createFixture(planck.Box(wallThickness / 2, window.innerHeight / 2 / SCALE), {
            friction: 0.3
        });
    }
    initBackgroundTrees();
}
window.addEventListener("resize", resizeCanvas);

let windSpeed = 0.0;
let windTurbulence = 0.0;
let windGustValue = 0;
let windGustTarget = 0;
let windGustChangeAt = 0;
let lastWindUpdateMs = null;

function updateWindGust(nowMs) {
    if (lastWindUpdateMs === null) lastWindUpdateMs = nowMs;
    const dt = Math.min((nowMs - lastWindUpdateMs) / 1000, 0.1);
    lastWindUpdateMs = nowMs;

    if (nowMs >= windGustChangeAt) {
        windGustTarget = Math.random() * 2 - 1;
        windGustChangeAt = nowMs + 500 + Math.random() * 2000;
    }
    windGustValue += (windGustTarget - windGustValue) * Math.min(dt * 1.2, 1);
}

function updatePhysics() {
    const gravVal = parseFloat(document.getElementById("slider-gravity").value);
    const dragVal = parseFloat(document.getElementById("slider-drag").value);
    windSpeed = parseFloat(document.getElementById("slider-wind").value);
    windTurbulence = parseFloat(document.getElementById("slider-turbulence").value);

    document.getElementById("val-gravity").innerText = gravVal;
    document.getElementById("val-drag").innerText = dragVal;
    document.getElementById("val-wind").innerText = windSpeed;
    document.getElementById("val-turbulence").innerText = windTurbulence;

    world.setGravity(planck.Vec2(0, gravVal));

    for (let b = world.getBodyList(); b; b = b.getNext()) {
        if (!b.isStatic() && !b.isWall) b.setLinearDamping(dragVal);
    }
}

function resetPhysics() {
    document.getElementById("slider-gravity").value = 9.8;
    document.getElementById("slider-drag").value = 0.02;
    document.getElementById("slider-wind").value = 0.0;
    document.getElementById("slider-turbulence").value = 0.0;
    updatePhysics();
}

let mouseJoint = null;
let mouseBody = world.createBody();

canvas.addEventListener("pointerdown", (event) => {
    const clientX = event.clientX;
    const clientY = event.clientY;

    if (clientX < 280 && clientY < 200) return;
    if (clientX > window.innerWidth - 300 && clientY < 60) return;

    const toolbox = document.getElementById("toolbox");
    if (!toolbox.classList.contains("collapsed") && clientX > window.innerWidth - 320 && clientY < window.innerHeight)
        return;

    const mousePos = planck.Vec2(clientX / SCALE, clientY / SCALE);
    let clickedBody = null;
    for (let b = world.getBodyList(); b; b = b.getNext()) {
        if (b.isWall) continue;
        for (let f = b.getFixtureList(); f; f = f.getNext()) {
            if (f.testPoint(mousePos)) {
                clickedBody = b;
                break;
            }
        }
        if (clickedBody) break;
    }

    const now = Date.now();
    const isDoubleTapOnWall =
        clickedBody &&
        clickedBody.wallHalfW !== undefined &&
        lastTapBody === clickedBody &&
        now - lastTapTime < DOUBLE_TAP_MS;
    lastTapTime = now;
    lastTapBody = clickedBody || null;

    if (isDoubleTapOnWall) {
        editingWallBody = clickedBody;
        resizingWallHandle = null;
        updateInstructionText();
        return;
    }

    if (editingWallBody) {
        const handles = getWallHandles(editingWallBody);
        let hitSide = null;
        for (const side in handles) {
            const h = handles[side];
            if (Math.hypot(clientX - h.x, clientY - h.y) < 20) {
                hitSide = side;
                break;
            }
        }
        if (hitSide) {
            resizingWallHandle = { side: hitSide };
            return;
        }
        editingWallBody = null;
        updateInstructionText();
    }

    if (currentMode === "none") {
        if (clickedBody && !clickedBody.isWall) {
            mouseJoint = world.createJoint(
                planck.MouseJoint({
                    bodyA: mouseBody,
                    bodyB: clickedBody,
                    target: mousePos,
                    maxForce: 3000 * SCALE * clickedBody.getMass(),
                    frequencyHz: 30.0,
                    dampingRatio: 1.0
                })
            );
        }
        return;
    }

    if (currentMode === "spawn") {
        if (clickedBody) {
            if (!clickedBody.isWall) {
                mouseJoint = world.createJoint(
                    planck.MouseJoint({
                        bodyA: mouseBody,
                        bodyB: clickedBody,
                        target: mousePos,
                        maxForce: 3000 * SCALE * clickedBody.getMass(),
                        frequencyHz: 30.0,
                        dampingRatio: 1.0
                    })
                );
            }
            return;
        }
        if (getSpawnedBodyCount() >= MAX_BODIES) {
            flashLimitWarning();
            return;
        }
        const newBody = spawnElement(mousePos.x, mousePos.y, currentChoice);
        if (currentChoice === "wall") {
            editingWallBody = newBody;
            updateInstructionText();
        }
        return;
    }

    if (currentMode === "eraser") {
        let clickedJoint = null;
        for (let j = world.getJointList(); j; j = j.getNext()) {
            if (typeof j.getAnchorA === "function" && typeof j.getAnchorB === "function") {
                const aA = j.getAnchorA();
                const aB = j.getAnchorB();
                const pA = planck.Vec2(aA.x * SCALE, aA.y * SCALE);
                const pB = planck.Vec2(aB.x * SCALE, aB.y * SCALE);
                const screenMouse = planck.Vec2(clientX, clientY);
                if (aA && aB && distToSegment(screenMouse, pA, pB) < 15) {
                    clickedJoint = j;
                    break;
                }
            }
        }
        if (clickedJoint) {
            if (clickedJoint.ropeId !== undefined) {
                const rId = clickedJoint.ropeId;
                let b = world.getBodyList();
                while (b) {
                    let nextB = b.getNext();
                    if (b.ropeId === rId) world.destroyBody(b);
                    b = nextB;
                }
                let j = world.getJointList();
                while (j) {
                    let nextJ = j.getNext();
                    if (j.ropeId === rId) world.destroyJoint(j);
                    j = nextJ;
                }
            } else {
                world.destroyJoint(clickedJoint);
            }
        } else if (clickedBody) {
            if (clickedBody.ropeId !== undefined) {
                const rId = clickedBody.ropeId;
                let b = world.getBodyList();
                while (b) {
                    let nextB = b.getNext();
                    if (b.ropeId === rId) world.destroyBody(b);
                    b = nextB;
                }
                let j = world.getJointList();
                while (j) {
                    let nextJ = j.getNext();
                    if (j.ropeId === rId) world.destroyJoint(j);
                    j = nextJ;
                }
            } else {
                let j = world.getJointList();
                while (j) {
                    let nextJ = j.getNext();
                    if (j.getBodyA() === clickedBody || j.getBodyB() === clickedBody) world.destroyJoint(j);
                    j = nextJ;
                }
                if (clickedBody === editingWallBody) {
                    editingWallBody = null;
                    resizingWallHandle = null;
                }
                world.destroyBody(clickedBody);
            }
        }
    } else if (currentMode === "bar" || currentMode === "rope" || currentMode === "chain") {
        if (clickedBody) {
            const localPoint = clickedBody.getLocalPoint(mousePos);
            if (!linkStartBody) {
                linkStartBody = clickedBody;
                linkStartPoint = localPoint;
            } else {
                if (
                    linkStartBody === clickedBody &&
                    planck.Vec2.distance(
                        linkStartBody.getWorldPoint(linkStartPoint),
                        clickedBody.getWorldPoint(localPoint)
                    ) <
                        10 / SCALE
                ) {
                    linkStartBody = null;
                    linkStartPoint = null;
                    return;
                }

                const posA = linkStartBody.getWorldPoint(linkStartPoint);
                const posB = clickedBody.getWorldPoint(localPoint);

                if (currentMode === "bar") {
                    const joint = world.createJoint(
                        planck.DistanceJoint({
                            bodyA: linkStartBody,
                            bodyB: clickedBody,
                            localAnchorA: linkStartPoint,
                            localAnchorB: localPoint,
                            length: planck.Vec2.distance(posA, posB),
                            frequencyHz: 0,
                            dampingRatio: 0.1
                        })
                    );
                    joint.isCustomRender = true;
                    joint.renderColor = "#ffa502";
                    joint.renderWidth = 4;
                } else if (currentMode === "chain") {
                    ropeIdCounter++;
                    const currentRopeId = ropeIdCounter;
                    const numSegments = parseInt(document.getElementById("slider-rope-seg").value);
                    const totalDist = planck.Vec2.distance(posA, posB);
                    const segmentLength = totalDist / numSegments;
                    const dirX = (posB.x - posA.x) / totalDist;
                    const dirY = (posB.y - posA.y) / totalDist;
                    const chainAngle = Math.atan2(dirY, dirX);
                    const linkHalfHeight = 2.5 / SCALE;

                    let prevBody = linkStartBody;

                    for (let i = 0; i < numSegments; i++) {
                        const startX = posA.x + dirX * segmentLength * i;
                        const startY = posA.y + dirY * segmentLength * i;
                        const endX = posA.x + dirX * segmentLength * (i + 1);
                        const endY = posA.y + dirY * segmentLength * (i + 1);
                        const cx = (startX + endX) / 2;
                        const cy = (startY + endY) / 2;

                        const segBody = world.createDynamicBody({
                            position: planck.Vec2(cx, cy),
                            angle: chainAngle
                        });
                        segBody.createFixture(planck.Box(segmentLength / 2, linkHalfHeight), {
                            density: 0.5,
                            friction: 0.2,
                            filterCategoryBits: 0x0002,
                            filterMaskBits: 0xffff & ~0x0002
                        });
                        segBody.setLinearDamping(0.1);
                        segBody.setAngularDamping(0.3);
                        segBody.ropeId = currentRopeId;
                        segBody.renderColor = "#ffa502";

                        const pivot = planck.Vec2(startX, startY);
                        const joint = world.createJoint(planck.RevoluteJoint({}, prevBody, segBody, pivot));
                        joint.ropeId = currentRopeId;
                        joint.isCustomRender = true;
                        joint.renderColor = "#c47a00";
                        joint.renderWidth = 2;

                        prevBody = segBody;
                    }

                    const finalJoint = world.createJoint(planck.RevoluteJoint({}, prevBody, clickedBody, posB));
                    finalJoint.ropeId = currentRopeId;
                    finalJoint.isCustomRender = true;
                    finalJoint.renderColor = "#c47a00";
                    finalJoint.renderWidth = 2;
                } else {
                    ropeIdCounter++;
                    const currentRopeId = ropeIdCounter;
                    const numSegments = parseInt(document.getElementById("slider-rope-seg").value);
                    const totalDist = planck.Vec2.distance(posA, posB);
                    const segmentLength = totalDist / numSegments;
                    let prevBody = linkStartBody;
                    let prevAnchor = linkStartPoint;

                    for (let i = 1; i < numSegments; i++) {
                        const percent = i / numSegments;
                        const x = posA.x + (posB.x - posA.x) * percent;
                        const y = posA.y + (posB.y - posA.y) * percent;
                        const segBody = world.createDynamicBody({ position: planck.Vec2(x, y) });
                        segBody.createFixture(planck.Circle(2.5 / SCALE), {
                            density: 0.2,
                            friction: 0.2,
                            filterCategoryBits: 0x0002,
                            filterMaskBits: 0xffff & ~0x0002
                        });
                        segBody.setLinearDamping(0.25);
                        segBody.ropeId = currentRopeId;

                        const joint = world.createJoint(
                            planck.DistanceJoint({
                                bodyA: prevBody,
                                bodyB: segBody,
                                localAnchorA: prevAnchor,
                                length: segmentLength,
                                frequencyHz: 18.0,
                                dampingRatio: 0.9
                            })
                        );
                        joint.ropeId = currentRopeId;
                        joint.isRopeDistanceJoint = true;
                        joint.isCustomRender = true;
                        joint.renderColor = "#ff4757";
                        joint.renderWidth = 2;

                        prevBody = segBody;
                        prevAnchor = planck.Vec2(0, 0);
                    }
                    const finalJoint = world.createJoint(
                        planck.DistanceJoint({
                            bodyA: prevBody,
                            bodyB: clickedBody,
                            localAnchorA: prevAnchor,
                            localAnchorB: localPoint,
                            length: segmentLength,
                            frequencyHz: 18.0,
                            dampingRatio: 0.9
                        })
                    );
                    finalJoint.ropeId = currentRopeId;
                    finalJoint.isRopeDistanceJoint = true;
                    finalJoint.isCustomRender = true;
                    finalJoint.renderColor = "#ff4757";
                    finalJoint.renderWidth = 2;
                }
                linkStartBody = null;
                linkStartPoint = null;
            }
        }
    }
});

function distToSegment(p, p1, p2) {
    const l2 = (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y);
    if (l2 === 0) return Math.hypot(p.x - p1.x, p.y - p1.y);
    let t = ((p.x - p1.x) * (p2.x - p1.x) + (p.y - p1.y) * (p2.y - p1.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (p1.x + t * (p2.x - p1.x)), p.y - (p1.y + t * (p2.y - p1.y)));
}

const MIN_WALL_HALF = 10 / SCALE;
const MAX_WALL_HALF = 600 / SCALE;
const WALL_HANDLE_OFFSET = 18 / SCALE;

function getWallHandles(body) {
    const halfW = body.wallHalfW;
    const halfH = body.wallHalfH;
    const local = {
        right: planck.Vec2(halfW + WALL_HANDLE_OFFSET, 0),
        left: planck.Vec2(-(halfW + WALL_HANDLE_OFFSET), 0),
        top: planck.Vec2(0, -(halfH + WALL_HANDLE_OFFSET)),
        bottom: planck.Vec2(0, halfH + WALL_HANDLE_OFFSET),
        rotate: planck.Vec2(0, -(halfH + WALL_HANDLE_OFFSET + 24 / SCALE))
    };
    const handles = {};
    for (const side in local) {
        const worldPt = body.getWorldPoint(local[side]);
        handles[side] = { x: worldPt.x * SCALE, y: worldPt.y * SCALE };
    }
    return handles;
}

function rotateWall(body, mouseWorldPos) {
    const center = body.getPosition();
    const dx = mouseWorldPos.x - center.x;
    const dy = mouseWorldPos.y - center.y;
    body.setAngle(Math.atan2(dx, -dy));
}

function resizeWall(body, side, mouseWorldPos) {
    const localMouse = body.getLocalPoint(mouseWorldPos);
    let halfW = body.wallHalfW;
    let halfH = body.wallHalfH;
    let localCenterOffset = planck.Vec2(0, 0);

    if (side === "right") {
        const newHalfW = Math.min(MAX_WALL_HALF, Math.max(MIN_WALL_HALF, (localMouse.x + halfW) / 2));
        localCenterOffset = planck.Vec2(newHalfW - halfW, 0);
        halfW = newHalfW;
    } else if (side === "left") {
        const newHalfW = Math.min(MAX_WALL_HALF, Math.max(MIN_WALL_HALF, (halfW - localMouse.x) / 2));
        localCenterOffset = planck.Vec2(halfW - newHalfW, 0);
        halfW = newHalfW;
    } else if (side === "bottom") {
        const newHalfH = Math.min(MAX_WALL_HALF, Math.max(MIN_WALL_HALF, (localMouse.y + halfH) / 2));
        localCenterOffset = planck.Vec2(0, newHalfH - halfH);
        halfH = newHalfH;
    } else if (side === "top") {
        const newHalfH = Math.min(MAX_WALL_HALF, Math.max(MIN_WALL_HALF, (halfH - localMouse.y) / 2));
        localCenterOffset = planck.Vec2(0, halfH - newHalfH);
        halfH = newHalfH;
    }

    const newCenterWorld = body.getWorldPoint(localCenterOffset);
    body.setPosition(newCenterWorld);

    let f = body.getFixtureList();
    while (f) {
        const nextF = f.getNext();
        body.destroyFixture(f);
        f = nextF;
    }
    body.createFixture(planck.Box(halfW, halfH), {
        density: blockConfigs.wall.density,
        restitution: blockConfigs.wall.restitution,
        friction: 0.2
    });
    body.wallHalfW = halfW;
    body.wallHalfH = halfH;
}

canvas.addEventListener("pointermove", (event) => {
    const mousePos = planck.Vec2(event.clientX / SCALE, event.clientY / SCALE);
    if (mouseJoint) mouseJoint.setTarget(mousePos);

    if (resizingWallHandle && editingWallBody) {
        if (resizingWallHandle.side === "rotate") {
            rotateWall(editingWallBody, mousePos);
        } else {
            resizeWall(editingWallBody, resizingWallHandle.side, mousePos);
        }
    }
});

window.addEventListener("pointerup", () => {
    if (mouseJoint) {
        world.destroyJoint(mouseJoint);
        mouseJoint = null;
    }
    resizingWallHandle = null;
});

canvas.addEventListener(
    "wheel",
    (event) => {
        if (!editingWallBody) return;
        event.preventDefault();
        const rotationStep = 0.05;
        const delta = event.deltaY > 0 ? rotationStep : -rotationStep;
        editingWallBody.setAngle(editingWallBody.getAngle() + delta);
    },
    { passive: false }
);

function getPolygonVertices(radius, sides) {
    let vertices = [];
    for (let i = 0; i < sides; i++) {
        let angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
        vertices.push(planck.Vec2((radius * Math.cos(angle)) / SCALE, (radius * Math.sin(angle)) / SCALE));
    }
    return vertices;
}

const blockConfigs = {
    bass: { name: "bass", sides: 4, size: 45, color: "#ff6b81", density: 0.8, restitution: 0.15 },
    wood: { name: "wood", sides: 5, size: 36, color: "#e67e22", density: 0.6, restitution: 0.35 },
    mid: { name: "mid", sides: 6, size: 32, color: "#70a1ff", density: 0.45, restitution: 0.5 },
    rubber: { name: "rubber", sides: 7, size: 28, color: "#ffa502", density: 0.35, restitution: 0.75 },
    high: { name: "high", sides: 8, size: 26, color: "#2ed573", density: 0.25, restitution: 0.85 },
    neon: { name: "neon", isCircle: true, radius: 24, color: "#ff00ff", density: 0.15, restitution: 0.95 },
    wall: {
        name: "wall",
        isRect: true,
        w: 90,
        h: 90,
        color: "#a4b0be",
        density: 0.8,
        restitution: 0.2,
        isStatic: true
    }
};

function spawnElement(x, y, typeKey) {
    const cfg = blockConfigs[typeKey];
    const currentDrag = parseFloat(document.getElementById("slider-drag").value);
    let body = cfg.isStatic
        ? world.createBody({ type: "static", position: planck.Vec2(x, y) })
        : world.createDynamicBody({ position: planck.Vec2(x, y) });

    if (cfg.isCircle) {
        body.createFixture(planck.Circle(cfg.radius / SCALE), {
            density: cfg.density,
            restitution: cfg.restitution,
            friction: 0.2
        });
    } else if (cfg.isRect) {
        body.createFixture(planck.Box(cfg.w / 2 / SCALE, cfg.h / 2 / SCALE), {
            density: cfg.density,
            restitution: cfg.restitution,
            friction: 0.2
        });
        if (typeKey === "wall") {
            body.wallHalfW = cfg.w / 2 / SCALE;
            body.wallHalfH = cfg.h / 2 / SCALE;
        }
    } else if (cfg.sides === 4) {
        body.createFixture(planck.Box(cfg.size / SCALE, cfg.size / SCALE), {
            density: cfg.density,
            restitution: cfg.restitution,
            friction: 0.2
        });
    } else {
        const verts = getPolygonVertices(cfg.size, cfg.sides);
        body.createFixture(planck.Polygon(verts), {
            density: cfg.density,
            restitution: cfg.restitution,
            friction: 0.2
        });
    }

    body.setLinearDamping(currentDrag);
    body.soundType = cfg.name;
    body.renderColor = cfg.color;
    return body;
}

world.on("begin-contact", (contact) => {
    const bodyA = contact.getFixtureA().getBody();
    const bodyB = contact.getFixtureB().getBody();
    if (bodyA.soundType && bodyB.soundType) {
        const velA = bodyA.getLinearVelocity();
        const velB = bodyB.getLinearVelocity();
        const relativeVel = Math.hypot(velA.x - velB.x, velA.y - velB.y);
        if (relativeVel > 0.8) playMixedSound(bodyA.soundType, bodyB.soundType, relativeVel);
    }
});

function triggerDecay() {
    for (let b = world.getBodyList(); b; b = b.getNext()) {
        if (b.isStatic() || b.isWall) continue;
        b.applyForceToCenter(
            planck.Vec2(((Math.random() - 0.5) * 4000) / SCALE, (-6000 - Math.random() * 4000) / SCALE),
            true
        );
        b.setAngularVelocity((Math.random() - 0.5) * 10);
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseRoot, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseRoot, audioCtx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.25 * masterVolume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.8);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(1.8);
}

function clearScene() {
    let b = world.getBodyList();
    while (b) {
        let nextB = b.getNext();
        if (!b.isWall) world.destroyBody(b);
        b = nextB;
    }
    linkStartBody = null;
    linkStartPoint = null;
    editingWallBody = null;
    resizingWallHandle = null;
    lastTapBody = null;
    lastTapTime = 0;
    clearScore();
}

let flashMessageTimeout = null;

function flashMessage(text, color) {
    const el = document.getElementById("instruction-mode");
    if (!el) return;
    clearTimeout(flashMessageTimeout);
    const original = el.innerText;
    el.innerText = text;
    el.style.color = color || "#2ed573";
    flashMessageTimeout = setTimeout(() => {
        updateInstructionText();
        el.style.color = "";
    }, 2200);
}

function serializeScene() {
    const bodyIndex = new Map();
    const bodies = [];
    let idx = 0;

    for (let b = world.getBodyList(); b; b = b.getNext()) {
        if (b.isWall) continue;
        bodyIndex.set(b, idx);

        const fixtures = [];
        for (let f = b.getFixtureList(); f; f = f.getNext()) {
            const shape = f.getShape();
            const fdata = {
                density: f.getDensity(),
                friction: f.getFriction(),
                restitution: f.getRestitution(),
                filterCategoryBits: f.getFilterCategoryBits(),
                filterMaskBits: f.getFilterMaskBits()
            };
            if (f.getType() === "circle") {
                fdata.shapeType = "circle";
                fdata.radius = shape.getRadius ? shape.getRadius() : shape.m_radius;
            } else {
                fdata.shapeType = "polygon";
                const verts = shape.m_vertices || shape.getVertices();
                fdata.vertices = verts.map((v) => ({ x: v.x, y: v.y }));
            }
            fixtures.push(fdata);
        }

        const pos = b.getPosition();
        bodies.push({
            isStatic: b.isStatic(),
            x: pos.x,
            y: pos.y,
            angle: b.getAngle(),
            soundType: b.soundType || null,
            renderColor: b.renderColor || null,
            ropeId: b.ropeId || null,
            wallHalfW: b.wallHalfW || null,
            wallHalfH: b.wallHalfH || null,
            linearDamping: b.getLinearDamping(),
            fixtures
        });
        idx++;
    }

    const joints = [];
    for (let j = world.getJointList(); j; j = j.getNext()) {
        const bA = j.getBodyA();
        const bB = j.getBodyB();
        if (!bodyIndex.has(bA) || !bodyIndex.has(bB)) continue;

        const type = j.getType();
        const jdata = {
            type,
            bodyA: bodyIndex.get(bA),
            bodyB: bodyIndex.get(bB),
            localAnchorA: j.getLocalAnchorA ? { x: j.getLocalAnchorA().x, y: j.getLocalAnchorA().y } : null,
            localAnchorB: j.getLocalAnchorB ? { x: j.getLocalAnchorB().x, y: j.getLocalAnchorB().y } : null,
            ropeId: j.ropeId || null,
            isRopeDistanceJoint: !!j.isRopeDistanceJoint,
            isCustomRender: !!j.isCustomRender,
            renderColor: j.renderColor || null,
            renderWidth: j.renderWidth || null
        };
        if (type === "distance-joint") {
            jdata.length = j.getLength();
            jdata.frequencyHz = j.getFrequency();
            jdata.dampingRatio = j.getDampingRatio();
        }
        joints.push(jdata);
    }

    return {
        version: 1,
        ropeIdCounter,
        physics: {
            gravity: document.getElementById("slider-gravity").value,
            drag: document.getElementById("slider-drag").value,
            wind: document.getElementById("slider-wind").value,
            turbulence: document.getElementById("slider-turbulence").value
        },
        bodies,
        joints
    };
}

function deserializeScene(data) {
    clearScene();

    const bodies = data.bodies.map((bd) => {
        const body = bd.isStatic
            ? world.createBody({ type: "static", position: planck.Vec2(bd.x, bd.y), angle: bd.angle })
            : world.createDynamicBody({ position: planck.Vec2(bd.x, bd.y), angle: bd.angle });

        bd.fixtures.forEach((fd) => {
            const shape =
                fd.shapeType === "circle"
                    ? planck.Circle(fd.radius)
                    : planck.Polygon(fd.vertices.map((v) => planck.Vec2(v.x, v.y)));
            body.createFixture(shape, {
                density: fd.density,
                friction: fd.friction,
                restitution: fd.restitution,
                filterCategoryBits: fd.filterCategoryBits,
                filterMaskBits: fd.filterMaskBits
            });
        });

        body.setLinearDamping(bd.linearDamping);
        if (bd.soundType) body.soundType = bd.soundType;
        if (bd.renderColor) body.renderColor = bd.renderColor;
        if (bd.ropeId) body.ropeId = bd.ropeId;
        if (bd.wallHalfW) {
            body.wallHalfW = bd.wallHalfW;
            body.wallHalfH = bd.wallHalfH;
        }
        return body;
    });

    data.joints.forEach((jd) => {
        const bodyA = bodies[jd.bodyA];
        const bodyB = bodies[jd.bodyB];
        if (!bodyA || !bodyB) return;

        let joint = null;
        if (jd.type === "distance-joint") {
            joint = world.createJoint(
                planck.DistanceJoint({
                    bodyA,
                    bodyB,
                    localAnchorA: planck.Vec2(jd.localAnchorA.x, jd.localAnchorA.y),
                    localAnchorB: planck.Vec2(jd.localAnchorB.x, jd.localAnchorB.y),
                    length: jd.length,
                    frequencyHz: jd.frequencyHz,
                    dampingRatio: jd.dampingRatio
                })
            );
        } else if (jd.type === "revolute-joint") {
            const worldAnchor = bodyA.getWorldPoint(planck.Vec2(jd.localAnchorA.x, jd.localAnchorA.y));
            joint = world.createJoint(planck.RevoluteJoint({}, bodyA, bodyB, worldAnchor));
        }
        if (!joint) return;

        if (jd.ropeId) joint.ropeId = jd.ropeId;
        if (jd.isRopeDistanceJoint) joint.isRopeDistanceJoint = true;
        if (jd.isCustomRender) joint.isCustomRender = true;
        if (jd.renderColor) joint.renderColor = jd.renderColor;
        if (jd.renderWidth) joint.renderWidth = jd.renderWidth;
    });

    ropeIdCounter = Math.max(ropeIdCounter, data.ropeIdCounter || 0);

    if (data.physics) {
        document.getElementById("slider-gravity").value = data.physics.gravity;
        document.getElementById("slider-drag").value = data.physics.drag;
        document.getElementById("slider-wind").value = data.physics.wind;
        document.getElementById("slider-turbulence").value = data.physics.turbulence;
        updatePhysics();
    }
}

const SAVE_KEY = "symphonyOfDecay_scenes";
const OLD_SAVE_KEY = "symphonyOfDecay_savedScene";

function getSavedScenes() {
    try {
        return JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
    } catch (e) {
        return {};
    }
}

function migrateOldSingleSave() {
    const old = localStorage.getItem(OLD_SAVE_KEY);
    if (!old) return;
    try {
        const data = JSON.parse(old);
        const scenes = getSavedScenes();
        if (!scenes["Salvataggio precedente"]) {
            scenes["Salvataggio precedente"] = data;
            localStorage.setItem(SAVE_KEY, JSON.stringify(scenes));
        }
    } catch (e) {}
    localStorage.removeItem(OLD_SAVE_KEY);
}

function refreshSceneList() {
    const sel = document.getElementById("scene-select");
    if (!sel) return;
    const scenes = getSavedScenes();
    const names = Object.keys(scenes).sort((a, b) => a.localeCompare(b));
    const previousValue = sel.value;
    sel.innerHTML = "";
    if (names.length === 0) {
        const opt = document.createElement("option");
        opt.textContent = t("no-scenes");
        opt.disabled = true;
        opt.selected = true;
        sel.appendChild(opt);
        return;
    }
    names.forEach((name) => {
        const opt = document.createElement("option");
        opt.value = name;
        const count = scenes[name].bodies ? scenes[name].bodies.length : 0;
        opt.textContent = `${name} (${count} objects)`;
        sel.appendChild(opt);
    });
    if (names.includes(previousValue)) sel.value = previousValue;
}

function saveScene() {
    const defaultName = "Scene " + new Date().toLocaleString([], { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    const name = prompt("Scene name:", defaultName);
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) {
        flashMessage("Invalid name", "#ff4757");
        return;
    }
    try {
        const scenes = getSavedScenes();
        if (Object.prototype.hasOwnProperty.call(scenes, trimmed)) {
            if (!confirm(`A scene named "${trimmed}" already exists. Overwrite it?`)) return;
        }
        const data = serializeScene();
        scenes[trimmed] = data;
        localStorage.setItem(SAVE_KEY, JSON.stringify(scenes));
        refreshSceneList();
        const sel = document.getElementById("scene-select");
        if (sel) sel.value = trimmed;
        flashMessage(`💾 "${trimmed}" saved (${data.bodies.length} objects)`, "#2ed573");
    } catch (e) {
        flashMessage("⚠️ Save failed", "#ff4757");
    }
}

function loadScene() {
    const sel = document.getElementById("scene-select");
    const name = sel ? sel.value : null;
    if (!name) {
        flashMessage("No scene selected", "#ffa502");
        return;
    }
    const scenes = getSavedScenes();
    const data = scenes[name];
    if (!data) {
        flashMessage("Scene not found", "#ff4757");
        return;
    }
    try {
        deserializeScene(data);
        flashMessage(`📂 "${name}" loaded (${data.bodies.length} objects)`, "#2ed573");
    } catch (e) {
        flashMessage("⚠️ Load failed: incompatible save", "#ff4757");
    }
}

function deleteScene() {
    const sel = document.getElementById("scene-select");
    const name = sel ? sel.value : null;
    if (!name) return;
    if (!confirm(`Delete scene "${name}"?`)) return;
    const scenes = getSavedScenes();
    delete scenes[name];
    localStorage.setItem(SAVE_KEY, JSON.stringify(scenes));
    refreshSceneList();
    flashMessage(`🗑️ "${name}" deleted`, "#ffa502");
}

let timeStep = 1 / 60;
let velIterations = 20;
let posIterations = 60;
const PHYSICS_SUBSTEPS = 4;

let backgroundTrees = [];
let maxDepth = 6;
let baseSpread = 0.45;

function seededRandom(s) {
    let seed = s;
    return function () {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };
}

function createFractalTree(worldX, groundY, scale, seedVal) {
    const trunkLen = 110 * scale;
    const tree = {
        worldX,
        groundY,
        scale,
        trunkLen,
        branchCount: 0,
        bX1: null,
        bY1: null,
        bLength: null,
        bAngle: null,
        bDepthArr: null,
        bDepthRatio: null,
        bParent: null,
        bRandFactor: null,
        bThickness: null,
        bIsTerminal: null,
        pX1: null,
        pY1: null,
        pX2: null,
        pY2: null,
        pGrow: null,
        pValid: null
    };
    let rand = seededRandom(seedVal);
    const tmp = [];

    function recurse(x, y, angle, length, depth, parentIndex) {
        if (depth > maxDepth || length < 6 * scale) return;
        const endX = x + Math.sin(angle) * length;
        const endY = y - Math.cos(angle) * length;
        const idx = tmp.length / 9;
        const dr = depth / maxDepth;
        const randAngle = (rand() - 0.5) * 0.3;
        const randLen = 0.58 + rand() * 0.12;
        const rf = rand();

        tmp.push(
            x,
            y,
            length,
            angle,
            depth,
            dr,
            parentIndex,
            rf,
            Math.max(0.5, (maxDepth - depth) * 1.1 * scale + 0.4)
        );

        const spread = baseSpread * (0.8 + rand() * 0.4);
        const nextLen = length * randLen;
        recurse(endX, endY, angle - spread + randAngle, nextLen, depth + 1, idx);
        recurse(endX, endY, angle + spread + randAngle, nextLen, depth + 1, idx);
    }

    recurse(worldX, groundY, 0, trunkLen, 0, -1);

    const n = tmp.length / 9;
    tree.branchCount = n;
    tree.bX1 = new Float64Array(n);
    tree.bY1 = new Float64Array(n);
    tree.bLength = new Float64Array(n);
    tree.bAngle = new Float64Array(n);
    tree.bDepthArr = new Uint16Array(n);
    tree.bDepthRatio = new Float32Array(n);
    tree.bParent = new Int32Array(n);
    tree.bRandFactor = new Float32Array(n);
    tree.bThickness = new Float32Array(n);
    tree.bIsTerminal = new Uint8Array(n);
    tree.pX1 = new Float64Array(n);
    tree.pY1 = new Float64Array(n);
    tree.pX2 = new Float64Array(n);
    tree.pY2 = new Float64Array(n);
    tree.pValid = new Uint8Array(n);

    for (let i = 0; i < n; i++) {
        const o = i * 9;
        tree.bX1[i] = tmp[o];
        tree.bY1[i] = tmp[o + 1];
        tree.bLength[i] = tmp[o + 2];
        tree.bAngle[i] = tmp[o + 3];
        tree.bDepthArr[i] = tmp[o + 4];
        tree.bDepthRatio[i] = tmp[o + 5];
        tree.bParent[i] = tmp[o + 6];
        tree.bRandFactor[i] = tmp[o + 7];
        tree.bThickness[i] = tmp[o + 8];
    }

    const hasChild = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
        const pi = tree.bParent[i];
        if (pi >= 0) hasChild[pi] = 1;
    }
    for (let i = 0; i < n; i++) {
        if (!hasChild[i]) tree.bIsTerminal[i] = 1;
    }
    return tree;
}

function updateTreesCount() {
    const countInput = parseInt(document.getElementById("input-trees-count").value) || 12;
    document.getElementById("val-trees-count").innerText = countInput;
    initCustomBackgroundTrees(countInput);
}

function initCustomBackgroundTrees(count) {
    backgroundTrees = [];
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < count; i++) {
        const posX = w * ((i + 0.5) / count) + (Math.random() - 0.5) * 40;
        const scaleVal = 0.5 + Math.random() * 0.7;
        const seedVal = 100 + i * 37;
        const groundY = h * (0.68 + Math.random() * 0.08);
        backgroundTrees.push(createFractalTree(posX, groundY, scaleVal, seedVal));
    }
}

function initBackgroundTrees() {
    const countInput = parseInt(document.getElementById("input-trees-count")?.value) || 12;
    initCustomBackgroundTrees(countInput);
}
initBackgroundTrees();

let fallingLeaves = [];
for (let i = 0; i < 90; i++) {
    fallingLeaves.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 7 + 3,
        speedY: Math.random() * 0.9 + 0.4,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.03
    });
}

function drawJapaneseBackground() {
    const isLight = document.body.classList.contains("light-theme");
    bgCtx.clearRect(0, 0, logicalWidth, logicalHeight);

    const w = logicalWidth;
    const h = logicalHeight;

    let skyGrad = bgCtx.createLinearGradient(0, 0, 0, h);
    if (isLight) {
        skyGrad.addColorStop(0, "#ffd1dc");
        skyGrad.addColorStop(0.5, "#e0f2fe");
        skyGrad.addColorStop(1, "#f1f5f9");
    } else {
        skyGrad.addColorStop(0, "#1e1b4b");
        skyGrad.addColorStop(0.5, "#311030");
        skyGrad.addColorStop(1, "#0f172a");
    }
    bgCtx.fillStyle = skyGrad;
    bgCtx.fillRect(0, 0, w, h);

    bgCtx.fillStyle = isLight ? "rgba(251, 191, 36, 0.3)" : "rgba(244, 114, 182, 0.15)";
    bgCtx.beginPath();
    bgCtx.arc(w * 0.8, h * 0.25, 70, 0, Math.PI * 2);
    bgCtx.fill();

    bgCtx.fillStyle = isLight ? "rgba(148, 163, 184, 0.4)" : "rgba(30, 41, 59, 0.6)";
    bgCtx.beginPath();
    bgCtx.moveTo(0, h * 0.65);
    bgCtx.lineTo(w * 0.2, h * 0.45);
    bgCtx.lineTo(w * 0.5, h * 0.6);
    bgCtx.lineTo(w * 0.75, h * 0.4);
    bgCtx.lineTo(w, h * 0.55);
    bgCtx.lineTo(w, h);
    bgCtx.lineTo(0, h);
    bgCtx.closePath();
    bgCtx.fill();

    bgCtx.fillStyle = isLight ? "rgba(100, 116, 139, 0.6)" : "rgba(15, 23, 42, 0.85)";
    bgCtx.beginPath();
    bgCtx.moveTo(0, h * 0.75);
    bgCtx.lineTo(w * 0.35, h * 0.55);
    bgCtx.lineTo(w * 0.6, h * 0.68);
    bgCtx.lineTo(w * 0.85, h * 0.52);
    bgCtx.lineTo(w, h * 0.62);
    bgCtx.lineTo(w, h);
    bgCtx.lineTo(0, h);
    bgCtx.closePath();
    bgCtx.fill();

    function drawPagoda(pX, pY) {
        bgCtx.fillStyle = isLight ? "#475569" : "#090d16";
        bgCtx.fillRect(pX - 16, pY - 25, 32, 25);
        bgCtx.beginPath();
        bgCtx.moveTo(pX - 35, pY);
        bgCtx.lineTo(pX + 35, pY);
        bgCtx.lineTo(pX + 25, pY - 12);
        bgCtx.lineTo(pX - 25, pY - 12);
        bgCtx.closePath();
        bgCtx.fill();
        bgCtx.fillRect(pX - 12, pY - 37, 24, 12);
        bgCtx.beginPath();
        bgCtx.moveTo(pX - 25, pY - 25);
        bgCtx.lineTo(pX + 25, pY - 25);
        bgCtx.lineTo(pX + 18, pY - 35);
        bgCtx.lineTo(pX - 18, pY - 35);
        bgCtx.closePath();
        bgCtx.fill();
        bgCtx.beginPath();
        bgCtx.moveTo(pX - 16, pY - 45);
        bgCtx.lineTo(pX + 16, pY - 45);
        bgCtx.lineTo(pX + 10, pY - 52);
        bgCtx.lineTo(pX - 10, pY - 52);
        bgCtx.closePath();
        bgCtx.fill();
        bgCtx.fillRect(pX - 1.5, pY - 64, 3, 12);
    }
    drawPagoda(w * 0.72, h * 0.57);
    drawPagoda(w * 0.38, h * 0.61);

    const time = Date.now() * 0.003;
    updateWindGust(Date.now());
    const effectiveWind = windSpeed + windGustValue * windTurbulence;

    backgroundTrees.forEach((t) => {
        const n = t.branchCount;
        const gw = effectiveWind * 0.1;

        for (let i = 0; i < n; i++) {
            const pi = t.bParent[i];
            let x1, y1;
            if (pi === -1) {
                x1 = t.bX1[i];
                y1 = t.bY1[i];
            } else {
                if (!t.pValid[pi]) {
                    t.pValid[i] = 0;
                    continue;
                }
                x1 = t.pX2[pi];
                y1 = t.pY2[pi];
            }

            const dr = t.bDepthRatio ? t.bDepthRatio[i] : t.bDepthArr[i] / maxDepth;
            const rf = t.bRandFactor[i];
            const d = t.bDepthArr[i];
            const wind = gw * (0.2 + dr * 0.8) + Math.sin(time + rf * 20 + d) * 0.08 * dr;
            const a = t.bAngle[i] + wind;
            const len = t.bLength[i];

            t.pX1[i] = x1;
            t.pY1[i] = y1;
            t.pX2[i] = x1 + Math.sin(a) * len;
            t.pY2[i] = y1 - Math.cos(a) * len;
            t.pValid[i] = 1;
        }

        bgCtx.lineCap = "round";
        let prevW = -1,
            pathStarted = false;
        for (let i = 0; i < n; i++) {
            if (!t.pValid[i]) continue;
            const wthick = (t.bThickness[i] + 0.5) | 0;
            if (wthick !== prevW) {
                if (pathStarted) bgCtx.stroke();
                bgCtx.beginPath();
                bgCtx.lineWidth = wthick;
                bgCtx.strokeStyle = isLight
                    ? t.scale < 0.8
                        ? "#94a3b8"
                        : "#334155"
                    : t.scale < 0.8
                      ? "#1e293b"
                      : "#0f172a";
                prevW = wthick;
                pathStarted = true;
            }
            bgCtx.moveTo(t.pX1[i], t.pY1[i]);
            bgCtx.lineTo(t.pX2[i], t.pY2[i]);
        }
        if (pathStarted) bgCtx.stroke();

        bgCtx.fillStyle = isLight ? "rgba(244, 114, 182, 0.85)" : "rgba(244, 114, 182, 0.7)";
        bgCtx.beginPath();
        const dotR = Math.max(2.5, 5 * t.scale);
        for (let i = 0; i < n; i++) {
            if (!t.bIsTerminal[i] || !t.pValid[i]) continue;
            bgCtx.moveTo(t.pX2[i] + dotR, t.pY2[i]);
            bgCtx.arc(t.pX2[i], t.pY2[i], dotR, 0, Math.PI * 2);
            bgCtx.moveTo(t.pX2[i] + dotR * 0.6, t.pY2[i] - dotR * 0.5);
            bgCtx.arc(t.pX2[i] + dotR * 0.4, t.pY2[i] - dotR * 0.4, dotR * 0.7, 0, Math.PI * 2);
        }
        bgCtx.fill();
    });

    bgCtx.fillStyle = isLight ? "#ec4899" : "#f472b6";
    fallingLeaves.forEach((leaf) => {
        leaf.x += effectiveWind * 1.5 + Math.sin(leaf.angle) * 0.8;
        leaf.y += leaf.speedY + Math.abs(effectiveWind) * 0.1;
        leaf.angle += leaf.spin;

        if (leaf.x > w + 20) leaf.x = -20;
        if (leaf.x < -20) leaf.x = w + 20;
        if (leaf.y > h + 20) {
            leaf.y = -20;
            leaf.x = Math.random() * w;
        }

        bgCtx.save();
        bgCtx.translate(leaf.x, leaf.y);
        bgCtx.rotate(leaf.angle);
        bgCtx.beginPath();
        bgCtx.ellipse(0, 0, leaf.size, leaf.size * 0.5, 0, 0, Math.PI * 2);
        bgCtx.fill();
        bgCtx.restore();
    });
}

function gameLoop() {
    if (!isPaused) {
        if (windSpeed !== 0 || windTurbulence > 0) {
            const time = Date.now() * 0.003;
            for (let b = world.getBodyList(); b; b = b.getNext()) {
                if (!b.isStatic() && !b.isWall) {
                    const flutter = Math.sin(time + b.getPosition().x * 0.05) * 0.5 + Math.cos(time * 0.7) * 0.5;
                    const noise = (windGustValue * 0.7 + flutter * 0.3) * windTurbulence;
                    const totalWindForce = ((windSpeed + noise) * 12 * b.getMass()) / SCALE;
                    b.applyForceToCenter(planck.Vec2(totalWindForce, 0), true);
                }
            }
        }
        for (let s = 0; s < PHYSICS_SUBSTEPS; s++) {
            world.step(timeStep / PHYSICS_SUBSTEPS, velIterations, posIterations);
        }
    }

    drawJapaneseBackground();
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    const isLight = document.body.classList.contains("light-theme");
    const wallColor = isLight ? "#d1d5db" : "#1a1a2e";

    for (let b = world.getBodyList(); b; b = b.getNext()) {
        const pos = b.getPosition();
        const angle = b.getAngle();

        ctx.save();
        ctx.translate(pos.x * SCALE, pos.y * SCALE);
        ctx.rotate(angle);

        for (let f = b.getFixtureList(); f; f = f.getNext()) {
            const shape = f.getType();
            ctx.fillStyle = b.isWall ? wallColor : b.renderColor || "#fff";
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1.5;

            if (shape === "circle") {
                const radius = f.getShape().m_radius;
                ctx.beginPath();
                ctx.arc(0, 0, radius * SCALE, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else if (shape === "polygon") {
                const vertices = f.getShape().m_vertices;
                ctx.beginPath();
                for (let i = 0; i < vertices.length; i++) {
                    const v = vertices[i];
                    if (i === 0) ctx.moveTo(v.x * SCALE, v.y * SCALE);
                    else ctx.lineTo(v.x * SCALE, v.y * SCALE);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    for (let j = world.getJointList(); j; j = j.getNext()) {
        if (typeof j.getAnchorA === "function" && typeof j.getAnchorB === "function") {
            const anchorA = j.getAnchorA();
            const anchorB = j.getAnchorB();
            if (anchorA && anchorB) {
                ctx.save();
                ctx.strokeStyle = j.renderColor || (isLight ? "#6b7280" : "#a4b0be");
                ctx.lineWidth = j.renderWidth || 2;
                ctx.beginPath();
                ctx.moveTo(anchorA.x * SCALE, anchorA.y * SCALE);
                ctx.lineTo(anchorB.x * SCALE, anchorB.y * SCALE);
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    if (linkStartBody && (currentMode === "rope" || currentMode === "chain" || currentMode === "bar")) {
        const startWorldPoint = linkStartBody.getWorldPoint(linkStartPoint);
        ctx.save();
        ctx.beginPath();
        ctx.arc(startWorldPoint.x * SCALE, startWorldPoint.y * SCALE, 8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 0, 85, 0.4)";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ff0055";
        ctx.stroke();
        ctx.restore();
    }

    if (editingWallBody) {
        const bodyAngle = editingWallBody.getAngle();
        const handles = getWallHandles(editingWallBody);
        const arrows = [
            { ...handles.right, angle: bodyAngle },
            { ...handles.left, angle: bodyAngle + Math.PI },
            { ...handles.top, angle: bodyAngle - Math.PI / 2 },
            { ...handles.bottom, angle: bodyAngle + Math.PI / 2 }
        ];
        ctx.save();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        arrows.forEach((a) => {
            ctx.save();
            ctx.translate(a.x, a.y);
            ctx.rotate(a.angle);
            ctx.fillStyle = "#ff0055";
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(-6, -7);
            ctx.lineTo(-6, 7);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });

        ctx.beginPath();
        ctx.moveTo(handles.top.x, handles.top.y);
        ctx.lineTo(handles.rotate.x, handles.rotate.y);
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(handles.rotate.x, handles.rotate.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#00d2ff";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
        ctx.restore();
    }

    updateBodyCountDisplay();
    requestAnimationFrame(gameLoop);
}

resizeCanvas();
migrateOldSingleSave();
refreshSceneList();
populateScaleSelect();
populateTimbreSelect();
updateUILanguage();

const timbreSelectEl = document.getElementById("timbre-select");
if (timbreSelectEl) {
    timbreSelectEl.addEventListener("change", (e) => {
        setTimbreMode(e.target.value);
    });
}

const scaleSelectEl = document.getElementById("scale-select");
if (scaleSelectEl) {
    scaleSelectEl.addEventListener("change", (e) => {
        setScaleMode(e.target.value);
    });
}

updateCursor();
const maxBodyEl = document.getElementById("body-count-max");
if (maxBodyEl) maxBodyEl.innerText = MAX_BODIES;
requestAnimationFrame(gameLoop);