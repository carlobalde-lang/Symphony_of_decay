// objects.js — Punteggio, stato strumenti/modalità, spawn oggetti, tipi di blocco

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
let isDraggingWall = false;
let wallDragOffset = planck.Vec2(0, 0);
let lastTapTime = 0;
let lastTapBody = null;
const DOUBLE_TAP_MS = 350;

// --- Stato strumento di selezione ---
let selectedBodies = new Set();      // body attualmente selezionati
let selectionDrag = null;            // { startMouse, startPositions: Map<body, {x,y}> }
let marqueeState = null;             // { startX, startY, endX, endY } in coordinate mondo
let _selectionClipboard = null;      // snapshot serializzato per il copia/incolla
let _lastPointerWorld = null;        // ultima posizione puntatore in coordinate mondo

function toggleToolbox(event) {
    if (event) event.stopPropagation();
    document.getElementById("toolbox").classList.toggle("collapsed");
}

const THEME_NAMES = ["dark", "light", "cyberpunk", "synthwave", "matrix", "sunset", "forest", "candy"];
const THEME_CLASSES = THEME_NAMES.slice(1).map((n) => "theme-" + n);

// --- Colorazione oggetti in base al tema ---
let _themeHueCacheKey = null;
let _themeHueShift = 0;

function hexToHue(hex) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!m) return null;
    const r = parseInt(m[1].substr(0, 2), 16) / 255;
    const g = parseInt(m[1].substr(2, 2), 16) / 255;
    const b = parseInt(m[1].substr(4, 2), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max === min) return 0;
    const d = max - min;
    let h;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return h * 60;
}

function rgbToCss(r, g, b) {
    const to = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
    return "#" + to(r) + to(g) + to(b);
}

function getThemeHueShift() {
    const key = document.body.className || "default";
    if (_themeHueCacheKey === key) return _themeHueShift;
    const accent = (getComputedStyle(document.body).getPropertyValue("--accent") || "#ff0055").trim();
    const hue = hexToHue(accent);
    _themeHueShift = hue === null ? 0 : hue - 340;
    _themeHueCacheKey = key;
    return _themeHueShift;
}

function shiftHueColor(hex) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    const shift = getThemeHueShift();
    if (shift === 0) return hex;
    const r = parseInt(m[1].substr(0, 2), 16) / 255;
    const g = parseInt(m[1].substr(2, 2), 16) / 255;
    const b = parseInt(m[1].substr(4, 2), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    const l = (max + min) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    let h = 0;
    if (d !== 0) {
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
    }
    h = ((h * 60 + shift + 360) % 360) / 60;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h % 2) - 1));
    const mm = l - c / 2;
    let rp = 0, gp = 0, bp = 0;
    if (h < 1) { rp = c; gp = x; bp = 0; }
    else if (h < 2) { rp = x; gp = c; bp = 0; }
    else if (h < 3) { rp = 0; gp = c; bp = x; }
    else if (h < 4) { rp = 0; gp = x; bp = c; }
    else if (h < 5) { rp = x; gp = 0; bp = c; }
    else { rp = c; gp = 0; bp = x; }
    return rgbToCss((rp + mm) * 255, (gp + mm) * 255, (bp + mm) * 255);
}

function refreshRenderColors() {
    _themeHueCacheKey = null;
    for (let b = world.getBodyList(); b; b = b.getNext()) {
        if (b.baseColor) b.renderColor = shiftHueColor(b.baseColor);
    }
    for (let j = world.getJointList(); j; j = j.getNext()) {
        if (j.baseColor) j.renderColor = shiftHueColor(j.baseColor);
    }
}

function applyTheme(name) {
    if (!THEME_NAMES.includes(name)) name = "dark";
    document.body.classList.remove("light-theme");
    THEME_CLASSES.forEach((c) => document.body.classList.remove(c));
    if (name === "light") {
        document.body.classList.add("light-theme");
    } else if (name !== "dark") {
        document.body.classList.add("theme-" + name);
    }
    localStorage.setItem("symphony-theme", name);
    const sel = document.getElementById("theme-select");
    if (sel) sel.value = name;
    refreshRenderColors();
}

function setTheme(name) {
    applyTheme(name);
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
        eraser: "cell",
        select: "pointer"
    };
    canvas.style.cursor = cursors[currentMode] || "default";
}

function selectBlock(type) {
    editingWallBody = null;
    resizingWallHandle = null;
    isDraggingWall = false;
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
    isDraggingWall = false;
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
    // Sfere-nota: ognuna suona sempre la propria nota fissa (Do-Si), vedi NOTE_FREQUENCIES in audio.js
    note_do: { name: "note_do", isCircle: true, radius: 20, color: "#ff3b30", density: 0.3, restitution: 0.6 },
    note_re: { name: "note_re", isCircle: true, radius: 20, color: "#ff9500", density: 0.3, restitution: 0.6 },
    note_mi: { name: "note_mi", isCircle: true, radius: 20, color: "#ffcc00", density: 0.3, restitution: 0.6 },
    note_fa: { name: "note_fa", isCircle: true, radius: 20, color: "#34c759", density: 0.3, restitution: 0.6 },
    note_sol: { name: "note_sol", isCircle: true, radius: 20, color: "#30b0c7", density: 0.3, restitution: 0.6 },
    note_la: { name: "note_la", isCircle: true, radius: 20, color: "#5e5ce6", density: 0.3, restitution: 0.6 },
    note_si: { name: "note_si", isCircle: true, radius: 20, color: "#af52de", density: 0.3, restitution: 0.6 },
    // Sfere-strumento: batteria sintetizzata all'impatto (vedi playCollisionInstrument in audio.js)
    inst_kick: { name: "inst_kick", isCircle: true, radius: 26, color: "#8b5cf6", density: 0.8, restitution: 0.2 },
    inst_snare: { name: "inst_snare", isCircle: true, radius: 24, color: "#f1f2f6", density: 0.4, restitution: 0.4 },
    inst_hihat_c: { name: "inst_hihat_c", isCircle: true, radius: 18, color: "#fbc531", density: 0.3, restitution: 0.7 },
    inst_hihat_o: { name: "inst_hihat_o", isCircle: true, radius: 18, color: "#e1b12c", density: 0.3, restitution: 0.7 },
    inst_clap: { name: "inst_clap", isCircle: true, radius: 20, color: "#e0a458", density: 0.35, restitution: 0.5 },
    inst_conga: { name: "inst_conga", isCircle: true, radius: 24, color: "#b5533d", density: 0.65, restitution: 0.25 },
    inst_bongo: { name: "inst_bongo", isCircle: true, radius: 22, color: "#d97b54", density: 0.6, restitution: 0.3 },
    inst_clave: { name: "inst_clave", isCircle: true, radius: 17, color: "#57606f", density: 0.9, restitution: 0.45 },
    wall: {
        name: "wall",
        isRect: true,
        w: 90,
        h: 90,
        color: "#a4b0be",
        density: 0.8,
        restitution: 0.2,
        isStatic: true
    },
    // Emettitore: piazzabile e ruotabile come un muro, ma non ridimensionabile.
    // Spara periodicamente l'oggetto scelto nella direzione in cui è orientato.
    emitter: {
        name: null, // l'emettitore non produce suoni interattivi (nessun clink agli urti)
        isRect: true,
        w: 70,
        h: 38,
        color: "#f1c40f",
        density: 1.0,
        restitution: 0.1,
        isStatic: true,
        isEmitter: true
    }
};

// Tipi spawnabili dall'emettitore (esclude muro ed emettitore stesso)
function getEmitterSpawnableTypes() {
    return Object.keys(blockConfigs).filter((k) => k !== "wall" && k !== "emitter");
}

// Su dispositivi touch (telefono/tablet) gli oggetti spawnano a metà dimensione
// (blocchi, sfere, strumenti, muri e emettitori) per essere più comodi al dito.
const SPAWN_SCALE = window.matchMedia("(pointer: coarse)").matches ? 0.5 : 1;

const EMITTER_MIN_INTERVAL_MS = 120; // limite di sicurezza a BPM molto alti
const DEFAULT_PATTERN_LENGTH = 16; // step del sequencer stile drum machine
const VELOCITY_LEVELS = [0.55, 1.0, 1.4]; // soft, mid, loud — moltiplicatori di potenza
const VELOCITY_LABELS = ["·", "●", "◉"]; // indicatori visivi per i 3 livelli

function normalizeStep(step) {
    if (step === null || step === undefined) return null;
    if (typeof step === "string") return { t: step, v: 1 };
    if (typeof step === "object" && step !== null && step.t) return { t: step.t, v: typeof step.v === "number" ? step.v : 1 };
    return null;
}

let _patternClipboard = null;
let _isDragPainting = false;
let _dragPaintMode = null; // "paint" | "clear"
let _dragStartX = 0;
let _dragStartY = 0;
let _dragStartIndex = -1;
let _justDragged = false;
const DRAG_THRESHOLD = 6; // px di movimento necessario per attivare il drag-paint

function spawnElement(x, y, typeKey) {
    const cfg = blockConfigs[typeKey];
    const currentDrag = _cachedDrag;
    const s = SPAWN_SCALE;
    let body = cfg.isStatic
        ? world.createBody({ type: "static", position: planck.Vec2(x, y) })
        : world.createDynamicBody({ position: planck.Vec2(x, y) });

    if (cfg.isCircle) {
        body.createFixture(planck.Circle((cfg.radius * s) / SCALE), {
            density: cfg.density,
            restitution: cfg.restitution,
            friction: 0.6
        });
    } else if (cfg.isRect) {
        body.createFixture(planck.Box((cfg.w / 2 / SCALE) * s, (cfg.h / 2 / SCALE) * s), {
            density: cfg.density,
            restitution: cfg.restitution,
            friction: 0.6
        });
        if (typeKey === "wall") {
            body.wallHalfW = (cfg.w / 2 / SCALE) * s;
            body.wallHalfH = (cfg.h / 2 / SCALE) * s;
        }
        if (typeKey === "emitter") {
            body.isEmitter = true;
            body.emitterHalfW = (cfg.w / 2 / SCALE) * s;
            body.emitterHalfH = (cfg.h / 2 / SCALE) * s;
            body.emitterObjectType = "bass";
            body.emitterPower = 12;
            body.emitterBPM = 90;
            body.emitterLifetime = 8; // secondi; 0 = infinito
            body.emitterNextFireMs = Date.now() + 60000 / body.emitterBPM;
            body.emitterPaused = false;
            body.emitterSyncEnabled = false;
            body.emitterSyncDivision = 1;
            body.emitterPattern = new Array(DEFAULT_PATTERN_LENGTH).fill(null);
            body.emitterPatternIndex = 0;
            body.emitterPatternBanks = [body.emitterPattern];
            body.emitterActiveBank = 0;
            body.emitterChainEnabled = false;
            body.emitterChainPlayingBank = 0;
            body.emitterSwing = 0;
        }
    } else if (cfg.sides === 4) {
        body.createFixture(planck.Box((cfg.size / SCALE) * s, (cfg.size / SCALE) * s), {
            density: cfg.density,
            restitution: cfg.restitution,
            friction: 0.6
        });
    } else {
        const verts = getPolygonVertices(cfg.size * s, cfg.sides);
        body.createFixture(planck.Polygon(verts), {
            density: cfg.density,
            restitution: cfg.restitution,
            friction: 0.6
        });
    }

    body.setLinearDamping(currentDrag);
    body.soundType = cfg.name;
    body.baseColor = cfg.color;
    body.renderColor = shiftHueColor(cfg.color);
    return body;
}

// --- Strumento di selezione ---

function getBodyWorldBounds(body) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let f = body.getFixtureList(); f; f = f.getNext()) {
        const shape = f.getShape();
        if (f.getType() === "circle") {
            const r = shape.m_radius;
            const c = body.getWorldPoint(planck.Vec2(0, 0));
            minX = Math.min(minX, c.x - r);
            maxX = Math.max(maxX, c.x + r);
            minY = Math.min(minY, c.y - r);
            maxY = Math.max(maxY, c.y + r);
        } else {
            const verts = shape.m_vertices || [];
            for (const v of verts) {
                const p = body.getWorldPoint(planck.Vec2(v.x, v.y));
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y);
                maxY = Math.max(maxY, p.y);
            }
        }
    }
    if (minX === Infinity) return null;
    return { minX, minY, maxX, maxY };
}

// Una corda/catena è un unico "oggetto logico": selezionarla intera.
function getSelectionGroupForBody(body) {
    if (body && body.ropeId !== undefined) {
        const group = [];
        for (let b = world.getBodyList(); b; b = b.getNext()) {
            if (b.ropeId === body.ropeId) group.push(b);
        }
        if (group.length) return group;
    }
    return [body];
}

function clearSelection() {
    selectedBodies.clear();
    selectionDrag = null;
    marqueeState = null;
}

// Tasto destro: deseleziona qualsiasi cosa sia attiva o selezionata.
function deselectAllActive() {
    clearSelection();
    linkStartBody = null;
    linkStartPoint = null;
    if (currentEmitterPanelBody) {
        currentEmitterPanelBody = null;
        closeEmitterPanel();
    }
    if (editingWallBody) {
        editingWallBody = null;
        resizingWallHandle = null;
        isDraggingWall = false;
    }
    currentMode = "none";
    document.querySelectorAll(".block-btn").forEach((btn) => btn.classList.remove("active"));
    document.querySelectorAll(".special-btn").forEach((btn) => btn.classList.remove("active"));
    updateCursor();
    updateInstructionText();
}

function handleSelectPointerDown(mousePos, clickedBody, shiftKey) {
    if (clickedBody) {
        const group = getSelectionGroupForBody(clickedBody);
        const allSelected = group.every((b) => selectedBodies.has(b));
        if (shiftKey) {
            group.forEach((b) => {
                if (selectedBodies.has(b)) selectedBodies.delete(b);
                else selectedBodies.add(b);
            });
            return;
        }
        if (!allSelected) {
            selectedBodies.clear();
            group.forEach((b) => selectedBodies.add(b));
        }
        beginSelectionDrag(mousePos);
    } else {
        if (!shiftKey) clearSelection();
        marqueeState = { startX: mousePos.x, startY: mousePos.y, endX: mousePos.x, endY: mousePos.y, additive: shiftKey };
    }
}

function beginSelectionDrag(mousePos) {
    const startPositions = new Map();
    for (const b of selectedBodies) {
        const p = b.getPosition();
        startPositions.set(b, { x: p.x, y: p.y });
    }
    selectionDrag = { startMouse: { x: mousePos.x, y: mousePos.y }, startPositions };
}

function updateSelectionDrag(mousePos) {
    if (!selectionDrag) return;
    const dx = mousePos.x - selectionDrag.startMouse.x;
    const dy = mousePos.y - selectionDrag.startMouse.y;
    for (const [b, start] of selectionDrag.startPositions) {
        b.setPosition(planck.Vec2(start.x + dx, start.y + dy));
        b.setLinearVelocity(planck.Vec2(0, 0));
        b.setAngularVelocity(0);
    }
}

function endSelectionDrag() {
    selectionDrag = null;
}

function updateMarquee(mousePos) {
    if (marqueeState) {
        marqueeState.endX = mousePos.x;
        marqueeState.endY = mousePos.y;
    }
}

function finalizeMarquee() {
    if (!marqueeState) return;
    const minX = Math.min(marqueeState.startX, marqueeState.endX);
    const maxX = Math.max(marqueeState.startX, marqueeState.endX);
    const minY = Math.min(marqueeState.startY, marqueeState.endY);
    const maxY = Math.max(marqueeState.startY, marqueeState.endY);
    const additive = marqueeState.additive;
    marqueeState = null;

    if (maxX - minX < 0.01 && maxY - minY < 0.01) return;

    const toAdd = new Set();
    for (let b = world.getBodyList(); b; b = b.getNext()) {
        if (b.isWall) continue;
        const bounds = getBodyWorldBounds(b);
        if (!bounds) continue;
        if (bounds.maxX < minX || bounds.minX > maxX) continue;
        if (bounds.maxY < minY || bounds.minY > maxY) continue;
        const group = getSelectionGroupForBody(b);
        group.forEach((g) => toAdd.add(g));
    }
    if (!additive) clearSelection();
    toAdd.forEach((b) => selectedBodies.add(b));
    flashMessage(t("sel-count").replace("{n}", selectedBodies.size), "#00d2ff");
}

// --- Copia / Incolla / Specchia selezione ---

function serializeBodyForClipboard(b) {
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
    return {
        isStatic: b.isStatic(),
        x: pos.x,
        y: pos.y,
        angle: b.getAngle(),
        soundType: b.soundType || null,
        renderColor: b.renderColor || null,
        ropeId: b.ropeId || null,
        wallHalfW: b.wallHalfW || null,
        wallHalfH: b.wallHalfH || null,
        isEmitter: b.isEmitter || false,
        emitterHalfW: b.emitterHalfW || null,
        emitterHalfH: b.emitterHalfH || null,
        emitterObjectType: b.emitterObjectType || null,
        emitterPower: b.emitterPower || null,
        emitterBPM: b.emitterBPM || null,
        emitterLifetime: b.emitterLifetime !== undefined ? b.emitterLifetime : null,
        emitterPaused: b.emitterPaused || false,
        emitterSyncEnabled: b.emitterSyncEnabled || false,
        emitterSyncDivision: b.emitterSyncDivision || null,
        emitterSwing: typeof b.emitterSwing === "number" ? b.emitterSwing : 0,
        emitterPattern: Array.isArray(b.emitterPattern) ? b.emitterPattern.map((s) => s ? { ...s } : null) : null,
        emitterPatternIndex: b.emitterPatternIndex || 0,
        emitterPatternBanks: Array.isArray(b.emitterPatternBanks) && b.emitterPatternBanks.length
            ? b.emitterPatternBanks.map((bank) => (Array.isArray(bank) ? bank.map((s) => s ? (typeof s === "string" ? s : { ...s }) : null) : null))
            : null,
        emitterActiveBank: typeof b.emitterActiveBank === "number" ? b.emitterActiveBank : 0,
        emitterChainEnabled: b.emitterChainEnabled || false,
        emitterChainPlayingBank: b.emitterChainPlayingBank || 0,
        remainingLifespanMs: null,
        linearDamping: b.getLinearDamping(),
        fixtures
    };
}

function serializeJointForClipboard(j, bodyIndex) {
    const jdata = {
        type: j.getType(),
        bodyA: bodyIndex.get(j.getBodyA()),
        bodyB: bodyIndex.get(j.getBodyB()),
        localAnchorA: j.getLocalAnchorA ? { x: j.getLocalAnchorA().x, y: j.getLocalAnchorA().y } : null,
        localAnchorB: j.getLocalAnchorB ? { x: j.getLocalAnchorB().x, y: j.getLocalAnchorB().y } : null,
        ropeId: j.ropeId || null,
        isRopeDistanceJoint: !!j.isRopeDistanceJoint,
        isCustomRender: !!j.isCustomRender,
        renderColor: j.renderColor || null,
        renderWidth: j.renderWidth || null
    };
    if (j.getType() === "distance-joint") {
        jdata.length = j.getLength();
        jdata.frequencyHz = j.getFrequency();
        jdata.dampingRatio = j.getDampingRatio();
    }
    return jdata;
}

function copySelection() {
    if (selectedBodies.size === 0) return;
    const bodyIndex = new Map();
    const bodies = [];
    let idx = 0;
    for (let b = world.getBodyList(); b; b = b.getNext()) {
        if (!selectedBodies.has(b)) continue;
        bodyIndex.set(b, idx++);
        bodies.push(serializeBodyForClipboard(b));
    }
    if (bodies.length === 0) return;
    const joints = [];
    for (let j = world.getJointList(); j; j = j.getNext()) {
        if (!bodyIndex.has(j.getBodyA()) || !bodyIndex.has(j.getBodyB())) continue;
        joints.push(serializeJointForClipboard(j, bodyIndex));
    }
    _selectionClipboard = { bodies, joints };
    flashMessage(t("sel-copied"), "#00d2ff");
}

function pasteSelection() {
    if (!_selectionClipboard || _selectionClipboard.bodies.length === 0) return;
    if (getSpawnedBodyCount() + _selectionClipboard.bodies.length > MAX_BODIES) {
        flashLimitWarning();
        return;
    }
    const clip = _selectionClipboard;
    let cx = 0, cy = 0;
    for (const bd of clip.bodies) { cx += bd.x; cy += bd.y; }
    cx /= clip.bodies.length;
    cy /= clip.bodies.length;

    const tx = _lastPointerWorld ? _lastPointerWorld.x : cx + 40 / SCALE;
    const ty = _lastPointerWorld ? _lastPointerWorld.y : cy + 40 / SCALE;
    const dx = tx - cx;
    const dy = ty - cy;

    saveUndoState();
    const ropeMap = new Map();
    const newBodies = clip.bodies.map((bd) => {
        const copy = { ...bd, x: bd.x + dx, y: bd.y + dy };
        if (copy.ropeId) {
            if (!ropeMap.has(copy.ropeId)) ropeMap.set(copy.ropeId, ++ropeIdCounter);
            copy.ropeId = ropeMap.get(copy.ropeId);
        }
        return createBodyFromSerialized(copy);
    });
    clip.joints.forEach((jd) => {
        const bA = newBodies[jd.bodyA];
        const bB = newBodies[jd.bodyB];
        if (!bA || !bB) return;
        createJointFromSerialized(jd, bA, bB, ropeMap);
    });
    selectedBodies.clear();
    newBodies.forEach((b) => selectedBodies.add(b));
    flashMessage(t("sel-pasted"), "#00d2ff");
}

function mirrorSelection(axis) {
    if (selectedBodies.size === 0) return;
    axis = axis || "x";

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const b of selectedBodies) {
        const bounds = getBodyWorldBounds(b);
        if (!bounds) continue;
        minX = Math.min(minX, bounds.minX);
        maxX = Math.max(maxX, bounds.maxX);
        minY = Math.min(minY, bounds.minY);
        maxY = Math.max(maxY, bounds.maxY);
    }
    if (minX === Infinity) return;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    saveUndoState();

    // Cattura e distrugge i joint tra i selezionati: gli ancoraggi locali vanno specchiati.
    const jointData = [];
    let j = world.getJointList();
    while (j) {
        const next = j.getNext();
        const bA = j.getBodyA();
        const bB = j.getBodyB();
        if (selectedBodies.has(bA) && selectedBodies.has(bB)) {
            jointData.push(serializeJointForClipboard(j, new Map([[bA, 0], [bB, 1]])));
            jointData[jointData.length - 1].bodyA = bA;
            jointData[jointData.length - 1].bodyB = bB;
            world.destroyJoint(j);
        }
        j = next;
    }

    for (const b of selectedBodies) {
        const p = b.getPosition();
        const a = b.getAngle();
        let nx = p.x, ny = p.y, na = a;
        if (axis === "x") { nx = 2 * centerX - p.x; na = -a; }
        if (axis === "y") { ny = 2 * centerY - p.y; na = -a; }
        b.setPosition(planck.Vec2(nx, ny));
        b.setAngle(na);
        b.setLinearVelocity(planck.Vec2(0, 0));
        b.setAngularVelocity(0);
    }

    jointData.forEach((jd) => {
        if (axis === "x") {
            jd.localAnchorA = { x: -jd.localAnchorA.x, y: jd.localAnchorA.y };
            jd.localAnchorB = { x: -jd.localAnchorB.x, y: jd.localAnchorB.y };
        }
        if (axis === "y") {
            jd.localAnchorA = { x: jd.localAnchorA.x, y: -jd.localAnchorA.y };
            jd.localAnchorB = { x: jd.localAnchorB.x, y: -jd.localAnchorB.y };
        }
        createJointFromSerialized(jd, jd.bodyA, jd.bodyB, null);
    });
    flashMessage(t("sel-mirrored"), "#00d2ff");
}

function rotateSelectedBodies(deg) {
    if (selectedBodies.size === 0) return;
    const rad = (deg * Math.PI) / 180;
    let cx = 0, cy = 0, n = 0;
    for (const b of selectedBodies) {
        const p = b.getPosition();
        cx += p.x;
        cy += p.y;
        n++;
    }
    if (!n) return;
    cx /= n;
    cy /= n;

    saveUndoState();

    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);
    for (const b of selectedBodies) {
        const p = b.getPosition();
        const dx = p.x - cx;
        const dy = p.y - cy;
        b.setPosition(planck.Vec2(cx + dx * cosA - dy * sinA, cy + dx * sinA + dy * cosA));
        b.setAngle(b.getAngle() + rad);
        b.setLinearVelocity(planck.Vec2(0, 0));
        b.setAngularVelocity(0);
    }
    flashMessage(t("sel-rotated"), "#00d2ff");
}

function deleteSelectedBodies() {
    if (selectedBodies.size === 0) return;
    saveUndoState();
    const toDelete = new Set(selectedBodies);
    let j = world.getJointList();
    while (j) {
        const next = j.getNext();
        if (toDelete.has(j.getBodyA()) || toDelete.has(j.getBodyB())) world.destroyJoint(j);
        j = next;
    }
    for (const b of [...toDelete]) {
        if (b === editingWallBody) {
            editingWallBody = null;
            resizingWallHandle = null;
            isDraggingWall = false;
        }
        if (currentEmitterPanelBody === b) {
            closeEmitterPanel();
            currentEmitterPanelBody = null;
        }
        world.destroyBody(b);
    }
    selectedBodies.clear();
    flashMessage(t("sel-deleted"), "#ff4757");
}

// --- Particelle da impatto ---
let impactParticles = [];
const MAX_IMPACT_PARTICLES = 300;

function spawnImpactParticles(worldX, worldY, color, intensity) {
    const count = Math.min(14, Math.max(4, Math.round(intensity * 2)));
    for (let i = 0; i < count; i++) {
        if (impactParticles.length >= MAX_IMPACT_PARTICLES) impactParticles.shift();
        const angle = Math.random() * Math.PI * 2;
        const speed = (0.5 + Math.random() * 2.5) * Math.min(intensity, 6);
        impactParticles.push({
            x: worldX * SCALE,
            y: worldY * SCALE,
            vx: Math.cos(angle) * speed * 20,
            vy: Math.sin(angle) * speed * 20,
            life: 1.0,
            decay: 1.2 + Math.random() * 0.8,
            size: 1.5 + Math.random() * 2.5,
            color: color || "#ffffff"
        });
    }
}

function updateAndDrawImpactParticles() {
    if (impactParticles.length === 0) return;
    const dt = timeStep;
    ctx.save();
    for (let i = impactParticles.length - 1; i >= 0; i--) {
        const p = impactParticles[i];
        p.life -= p.decay * dt;
        if (p.life <= 0) {
            impactParticles.splice(i, 1);
            continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.94;
        p.vy *= 0.94;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

world.on("begin-contact", (contact) => {
    const bodyA = contact.getFixtureA().getBody();
    const bodyB = contact.getFixtureB().getBody();
    if (bodyA.soundType && bodyB.soundType) {
        // Proiettile appena spawnato: il contatto "alla bocca" (overlap con parete/oggetto)
        // non deve suonare come un impatto reale. Dopo 50ms il corpo si è mosso davvero.
        const nowMs = Date.now();
        const graceMs = 50;
        const recentSpawn = (body) => body.spawnedAtMs !== undefined && nowMs - body.spawnedAtMs < graceMs;
        if (recentSpawn(bodyA) || recentSpawn(bodyB)) return;
        const velA = bodyA.getLinearVelocity();
        const velB = bodyB.getLinearVelocity();
        const relativeVel = Math.hypot(velA.x - velB.x, velA.y - velB.y);
        if (relativeVel > 0.35) {
            // Il muro non ha un suono proprio: prende in prestito il timbro dell'oggetto che lo colpisce.
            let soundA = bodyA.soundType;
            let soundB = bodyB.soundType;
            if (soundA === "wall" && soundB !== "wall") soundA = soundB;
            if (soundB === "wall" && soundA !== "wall") soundB = soundA;

            // Intensità dell'impatto: combina velocità relativa e massa effettiva della coppia,
            // così un urto pesante e lento suona comunque più "forte" di uno leggero e veloce.
            const massA = bodyA.getMass();
            const massB = bodyB.getMass();
            let effectiveMass;
            if (massA > 0 && massB > 0) effectiveMass = (massA * massB) / (massA + massB);
            else effectiveMass = massA > 0 ? massA : massB > 0 ? massB : 1;
            const impactIntensity = relativeVel * Math.sqrt(effectiveMass);

            playMixedSound(soundA, soundB, impactIntensity);
            const posA = bodyA.getPosition();
            const posB = bodyB.getPosition();
            spawnImpactParticles(
                (posA.x + posB.x) / 2,
                (posA.y + posB.y) / 2,
                bodyA.renderColor || bodyB.renderColor || "#ffffff",
                relativeVel
            );
        }
    }
});

function clearSceneAction() {
    saveUndoState();
    clearScene();
    updateInstructionText();
}

function triggerDecay() {
    saveUndoState();
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
    connectToEffectsBus(gain);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.8);
}

function clearScene() {
    // 1) I muri perimetrali vengono rimessi alla dimensione della finestra
    resetBoundaryToWindow();
    // 2) Raccogli
    const toDestroy = [];
    for (let b = world.getBodyList(); b; b = b.getNext()) {
        if (!b.isWall) toDestroy.push(b);
    }
    // 2) Distruggi i joint collegati (prima, perché destroyBody li cancella comunque)
    for (let j = world.getJointList(); j; j = j.getNext()) {
        if (j.getBodyA() && toDestroy.includes(j.getBodyA())) toDestroy.push(j); // non serve, destroyBody si occupa dei joint
    }
    // 3) Distruggi i body (questo rimuove automaticamente i joint associati)
    toDestroy.forEach((b) => {
        if (b !== world) world.destroyBody(b);
    });

    linkStartBody = null;
    linkStartPoint = null;
    editingWallBody = null;
    resizingWallHandle = null;
    isDraggingWall = false;
    lastTapBody = null;
    lastTapTime = 0;
    selectedBodies.clear();
    selectionDrag = null;
    marqueeState = null;
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

// --- Emettitore: sparo periodico ---


// --- Clock globale condiviso ---
// Un emettitore in modalità "sync" spara agganciato a questa griglia temporale
// comune (fase fissa dall'origine), invece che al proprio BPM libero: così più
// emettitori sincronizzati restano in fase tra loro come tracce di una canzone.
let globalClockBpm = 120;
let globalClockOriginMs = Date.now();

const SYNC_DIVISIONS = [
    { value: 0.25, label: "1/16" },
    { value: 0.5, label: "1/8" },
    { value: 1, label: "1/4" },
    { value: 2, label: "1/2" },
    { value: 4, label: "1" },
    { value: 8, label: "2" }
];

function setGlobalClockBpm(value) {
    globalClockBpm = Math.max(20, parseFloat(value) || 120);
    const valEl = document.getElementById("val-global-clock-bpm");
    if (valEl) valEl.innerText = Math.round(globalClockBpm);
    realignAllSyncedEmitters();
}

function resetGlobalClock() {
    globalClockOriginMs = Date.now();
    realignAllSyncedEmitters();
    flashMessage("🎼 " + t("global-clock-reset"), "#2ed573");
}

function getEmitterActivePattern(b) {
    const banks = Array.isArray(b.emitterPatternBanks) && b.emitterPatternBanks.length > 0 ? b.emitterPatternBanks : null;
    const chainOn = !!b.emitterChainEnabled && !!banks && banks.length > 1;
    if (chainOn) {
        const playBank = banks[((b.emitterChainPlayingBank || 0) % banks.length + banks.length) % banks.length];
        if (Array.isArray(playBank)) return playBank;
    }
    return (b.emitterPattern && b.emitterPattern.length > 0 ? b.emitterPattern : (banks ? banks[b.emitterActiveBank || 0] : null)) || [];
}

function alignEmitterToGrid(b) {
    const beatLenMs = 60000 / globalClockBpm;
    const gridMs = Math.max(EMITTER_MIN_INTERVAL_MS, b.emitterSyncDivision * beatLenMs);
    const elapsed = Date.now() - globalClockOriginMs;
    const nextIndex = Math.floor(elapsed / gridMs) + 1;
    b.emitterNextFireMs = globalClockOriginMs + nextIndex * gridMs;
    // Allinea anche il playhead del sequencer alla cella del prossimo tick:
    // così un emitter che entra in sync o riprende da pausa mostrerà e partirà
    // dalla stessa cella attiva degli altri emitter sincronizzati.
    const pat = getEmitterActivePattern(b);
    if (Array.isArray(pat) && pat.length > 0) {
        b.emitterPatternIndex = nextIndex % pat.length;
    }
}

function realignAllSyncedEmitters() {
    for (let b = world.getBodyList(); b; b = b.getNext()) {
        if (b.isEmitter && b.emitterSyncEnabled) alignEmitterToGrid(b);
    }
}

function updateEmitters() {
    const now = Date.now();
    for (let b = world.getBodyList(); b; b = b.getNext()) {
        if (!b.isEmitter) continue;
        if (b.emitterPaused) continue;
        if (now < b.emitterNextFireMs) continue;

        const swingPct = (b.emitterSwing || 0) / 100;

        if (b.emitterSyncEnabled) {
            const beatLenMs = 60000 / globalClockBpm;
            const gridMs = Math.max(EMITTER_MIN_INTERVAL_MS, b.emitterSyncDivision * beatLenMs);
            const swingOff = gridMs * swingPct * 0.5;
            const prevFireMs = b.emitterNextFireMs;
            let guard = 0;
            while (b.emitterNextFireMs <= now && guard < 64) {
                const tickIdx = Math.floor((b.emitterNextFireMs - globalClockOriginMs) / gridMs);
                const swing = (tickIdx & 1) === 1 ? swingOff : -swingOff;
                b.emitterNextFireMs += Math.max(EMITTER_MIN_INTERVAL_MS, gridMs + swing);
                guard++;
            }
            // L'emitter era rimasto indietro (ripartito da pausa o clock spostato):
            // non deve sparare subito il tick arretrato, ma restare in attesa del
            // prossimo confine così riparte in sincrono sulla cella attiva, insieme
            // agli altri emitter sincronizzati.
            if (b.emitterNextFireMs - prevFireMs > gridMs * 1.5) {
                const fireTick = Math.floor((b.emitterNextFireMs - globalClockOriginMs) / gridMs);
                const syncPat = getEmitterActivePattern(b);
                if (Array.isArray(syncPat) && syncPat.length > 0) {
                    b.emitterPatternIndex = fireTick % syncPat.length;
                }
                continue;
            }
            b._syncCellIdx = Math.floor((b.emitterNextFireMs - globalClockOriginMs) / gridMs) - 1;
        } else {
            const baseInterval = Math.max(EMITTER_MIN_INTERVAL_MS, 60000 / Math.max(1, b.emitterBPM));
            const isOdd = b.emitterPatternIndex % 2 === 1;
            const swingOff = baseInterval * swingPct * 0.5;
            const swingInterval = Math.max(EMITTER_MIN_INTERVAL_MS, isOdd ? baseInterval + swingOff : baseInterval - swingOff);
            b.emitterNextFireMs = now + swingInterval;
        }

        if (getSpawnedBodyCount() >= MAX_BODIES) continue;

        let spawnType = null;
        let spawnVel = 1;

        // Playback con catena di banchi: se il chaining è attivo, gli step vengono
        // letti dai banchi in sequenza (A → B → C → A...), altrimenti solo dal banco attivo.
        const banks = Array.isArray(b.emitterPatternBanks) && b.emitterPatternBanks.length > 0
            ? b.emitterPatternBanks
            : null;
        const chainOn = !!b.emitterChainEnabled && !!banks && banks.length > 1;

        let playingPattern = b.emitterPattern || (banks ? banks[b.emitterActiveBank || 0] : null) || null;
        let flashIdx = b.emitterPatternIndex;
        if (chainOn) {
            const playBank = banks[((b.emitterChainPlayingBank || 0) % banks.length + banks.length) % banks.length];
            if (Array.isArray(playBank)) playingPattern = playBank;
            flashIdx = (b.emitterPatternIndex % Math.max(1, playingPattern.length));
        }

        const hasPatternNotes = playingPattern && playingPattern.some((s) => stepType(s) && blockConfigs[stepType(s)]);
        if (hasPatternNotes) {
            let step;
            if (b.emitterSyncEnabled) {
                // La cella da suonare deriva dal tick globale: per tutti gli emitter
                // con sync vale lo stesso indice di griglia → stessa cella del sequencer.
                b.emitterPatternIndex = ((b._syncCellIdx % Math.max(1, playingPattern.length)) + Math.max(1, playingPattern.length)) % Math.max(1, playingPattern.length);
                if (chainOn && b.emitterPatternIndex === 0) {
                    b.emitterChainPlayingBank = ((b.emitterChainPlayingBank || 0) + 1) % banks.length;
                }
                step = playingPattern[b.emitterPatternIndex];
            } else {
                step = playingPattern[flashIdx];
                b.emitterPatternIndex = (b.emitterPatternIndex + 1) % Math.max(1, playingPattern.length);
                if (chainOn && b.emitterPatternIndex === 0) {
                    b.emitterChainPlayingBank = ((b.emitterChainPlayingBank || 0) + 1) % banks.length;
                }
            }
            const sType = stepType(step);
            if (sType && blockConfigs[sType]) {
                spawnType = sType;
                spawnVel = stepVelocity(step);
            } else {
                continue;
            }
        } else {
            // Anche senza note, l'indice avanza: mantiene coerenza parità/griglia e,
            // in catena, consente di passare al banco successivo se questo è vuoto.
            if (b.emitterSyncEnabled) {
                b.emitterPatternIndex = ((b._syncCellIdx % Math.max(1, playingPattern.length)) + Math.max(1, playingPattern.length)) % Math.max(1, playingPattern.length);
                if (chainOn && b.emitterPatternIndex === 0) {
                    b.emitterChainPlayingBank = ((b.emitterChainPlayingBank || 0) + 1) % banks.length;
                }
            } else {
                b.emitterPatternIndex = (b.emitterPatternIndex + 1) % Math.max(1, playingPattern.length);
                if (chainOn && b.emitterPatternIndex === 0) {
                    b.emitterChainPlayingBank = ((b.emitterChainPlayingBank || 0) + 1) % banks.length;
                }
            }
            spawnType = blockConfigs[b.emitterObjectType] ? b.emitterObjectType : "bass";
        }
        const cfg = blockConfigs[spawnType];
        const halfH = b.emitterHalfH;
        const muzzleOffset = halfH + ((cfg.radius || cfg.size || cfg.h / 2 || 20) * SPAWN_SCALE) / SCALE + 4 / SCALE;
        const spawnPoint = b.getWorldPoint(planck.Vec2(0, -muzzleOffset));
        const forward = b.getWorldVector(planck.Vec2(0, -1));

        const projectile = spawnElement(spawnPoint.x, spawnPoint.y, spawnType);
        projectile.spawnX = spawnPoint.x;
        projectile.spawnY = spawnPoint.y;
        projectile.spawnRadius = ((cfg.radius || cfg.size || cfg.h / 2 || 20) * SPAWN_SCALE) / SCALE;
        projectile.spawnedAtMs = Date.now();
        const power = (b.emitterPower || 12) * (VELOCITY_LEVELS[spawnVel] || 1);
        projectile.setLinearVelocity(planck.Vec2(forward.x * power, forward.y * power));

        if (b.emitterLifetime > 0) {
            projectile.lifespanMs = b.emitterLifetime * 1000;
            projectile.spawnedAtMs = Date.now();
        }

        spawnImpactParticles(spawnPoint.x, spawnPoint.y, "#f1c40f", power * 0.4);
        const activeBank2 = b.emitterActiveBank || 0;
        if (Array.isArray(playingPattern) && playingPattern.length > 0) {
            const sameBank = !chainOn || ((b.emitterChainPlayingBank || 0) % Math.max(1, banks.length)) === activeBank2;
            if (sameBank) flashStepCell(b, flashIdx);
        }
    }
}

// --- Ciclo di vita degli oggetti con durata limitata (sparati dagli emettitori) ---

function updateLifespans() {
    const now = Date.now();
    let b = world.getBodyList();
    while (b) {
        const nextB = b.getNext();
        if (b.lifespanMs && now - b.spawnedAtMs >= b.lifespanMs) {
            const pos = b.getPosition();
            spawnImpactParticles(pos.x, pos.y, b.renderColor || "#ffffff", 3);

            if (b === linkStartBody) {
                linkStartBody = null;
                linkStartPoint = null;
            }
            if (b === lastTapBody) lastTapBody = null;
            if (mouseJoint && (mouseJoint.getBodyA() === b || mouseJoint.getBodyB() === b)) {
                world.destroyJoint(mouseJoint);
                mouseJoint = null;
            }
            world.destroyBody(b);
        }
        b = nextB;
    }
}

let currentEmitterPanelBody = null;

function populateEmitterObjectSelect() {
    const sel = document.getElementById("emitter-object-select");
    if (!sel) return;
    sel.innerHTML = "";
    getEmitterSpawnableTypes().forEach((key) => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = t("obj-" + key);
        sel.appendChild(opt);
    });
}

function populatePatternAddSelect() {
    const sel = document.getElementById("emitter-pattern-add-select");
    if (!sel) return;
    const prevValue = sel.value;
    sel.innerHTML = "";
    getEmitterSpawnableTypes().forEach((key) => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = t("obj-" + key);
        sel.appendChild(opt);
    });
    if (prevValue && getEmitterSpawnableTypes().includes(prevValue)) sel.value = prevValue;
}

// --- Drum-machine style step sequencer ---

function ensurePatternArray(body, length) {
    if (!body.emitterPattern || !Array.isArray(body.emitterPattern)) {
        body.emitterPattern = new Array(length || DEFAULT_PATTERN_LENGTH).fill(null);
    }
    body.emitterPattern = body.emitterPattern.map(normalizeStep);
    ensurePatternBanks(body);
    if (Array.isArray(body.emitterPatternBanks) && body.emitterPatternBanks.length) {
        body.emitterPatternBanks[body.emitterActiveBank || 0] = body.emitterPattern;
    }
    return body.emitterPattern;
}

// --- Banchi pattern (A/B/C) + chaining ---
// Ogni emitter può avere più "banchi" (batterie di step separate). Con il chaining
// attivo i banchi suonano in sequenza (A→B→C→A...); altrimenti suona solo il banco attivo.
const MAX_PATTERN_BANKS = 4;

function ensurePatternBanks(body) {
    if (!body.emitterPatternBanks || !Array.isArray(body.emitterPatternBanks) || body.emitterPatternBanks.length === 0) {
        body.emitterPatternBanks = [body.emitterPattern || new Array(DEFAULT_PATTERN_LENGTH).fill(null)];
    }
    if (typeof body.emitterActiveBank !== "number" || body.emitterActiveBank < 0 || body.emitterActiveBank >= body.emitterPatternBanks.length) {
        body.emitterActiveBank = 0;
    }
    return body.emitterPatternBanks;
}

function saveActiveBank(body) {
    const banks = ensurePatternBanks(body);
    banks[body.emitterActiveBank] = (body.emitterPattern || []).map((s) => s ? (typeof s === "string" ? s : { ...s }) : null);
    return banks;
}

function setEmitterActiveBank(idx) {
    if (!currentEmitterPanelBody) return;
    const banks = ensurePatternBanks(currentEmitterPanelBody);
    const clamped = Math.max(0, Math.min(idx, banks.length - 1));
    if (clamped === currentEmitterPanelBody.emitterActiveBank) return;
    banks[currentEmitterPanelBody.emitterActiveBank] = (currentEmitterPanelBody.emitterPattern || []).map((s) => s ? (typeof s === "string" ? s : { ...s }) : null);
    currentEmitterPanelBody.emitterActiveBank = clamped;
    currentEmitterPanelBody.emitterPattern = (banks[clamped] || new Array(DEFAULT_PATTERN_LENGTH).fill(null)).map(normalizeStep);
    banks[clamped] = currentEmitterPanelBody.emitterPattern;
    currentEmitterPanelBody.emitterPatternIndex = 0;
    renderEmitterPattern();
    renderEmitterBankBar();
}

function addPatternBank() {
    if (!currentEmitterPanelBody) return;
    const banks = ensurePatternBanks(currentEmitterPanelBody);
    if (banks.length >= MAX_PATTERN_BANKS) return;
    saveActiveBank(currentEmitterPanelBody);
    const newBank = new Array((currentEmitterPanelBody.emitterPattern && currentEmitterPanelBody.emitterPattern.length) || DEFAULT_PATTERN_LENGTH).fill(null);
    banks.push(newBank);
    currentEmitterPanelBody.emitterActiveBank = banks.length - 1;
    currentEmitterPanelBody.emitterPattern = newBank;
    currentEmitterPanelBody.emitterPatternIndex = 0;
    renderEmitterPattern();
    renderEmitterBankBar();
}

function removePatternBank() {
    if (!currentEmitterPanelBody) return;
    const banks = ensurePatternBanks(currentEmitterPanelBody);
    if (banks.length <= 1) return;
    banks.splice(currentEmitterPanelBody.emitterActiveBank, 1);
    currentEmitterPanelBody.emitterActiveBank = Math.max(0, currentEmitterPanelBody.emitterActiveBank - 1);
    currentEmitterPanelBody.emitterPattern = (banks[currentEmitterPanelBody.emitterActiveBank] || new Array(DEFAULT_PATTERN_LENGTH).fill(null)).map(normalizeStep);
    banks[currentEmitterPanelBody.emitterActiveBank] = currentEmitterPanelBody.emitterPattern;
    currentEmitterPanelBody.emitterPatternIndex = 0;
    renderEmitterPattern();
    renderEmitterBankBar();
}

function toggleEmitterChain(enabled) {
    if (!currentEmitterPanelBody) return;
    currentEmitterPanelBody.emitterChainEnabled = !!enabled;
    renderEmitterBankBar();
}

function renderEmitterBankBar() {
    const container = document.getElementById("emitter-bank-bar");
    if (!container || !currentEmitterPanelBody) return;
    const banks = ensurePatternBanks(currentEmitterPanelBody);
    const active = currentEmitterPanelBody.emitterActiveBank;
    container.innerHTML = "";
    banks.forEach((bank, i) => {
        const btn = document.createElement("button");
        btn.className = "sub-btn" + (i === active ? " bank-btn-active" : "");
        btn.textContent = String.fromCharCode(65 + i);
        btn.title = "Bank " + String.fromCharCode(65 + i);
        btn.onclick = () => setEmitterActiveBank(i);
        container.appendChild(btn);
    });
    const addBtn = document.createElement("button");
    addBtn.className = "sub-btn";
    addBtn.textContent = "+";
    addBtn.title = "Add bank";
    addBtn.onclick = addPatternBank;
    container.appendChild(addBtn);
    if (banks.length > 1) {
        const rmBtn = document.createElement("button");
        rmBtn.className = "sub-btn";
        rmBtn.textContent = "−";
        rmBtn.title = "Remove bank";
        rmBtn.onclick = removePatternBank;
        container.appendChild(rmBtn);
        const chainLbl = document.createElement("label");
        chainLbl.className = "chain-toggle-label";
        chainLbl.innerHTML = `<input type="checkbox" ${currentEmitterPanelBody.emitterChainEnabled ? "checked" : ""} onchange="toggleEmitterChain(this.checked)"> ${t("emitter-chain-label")}`;
        container.appendChild(chainLbl);
    }
}

function shortLabelForType(typeKey) {
    if (!typeKey) return "";
    const noteMap = {
        note_do: "Do", note_re: "Re", note_mi: "Mi", note_fa: "Fa",
        note_sol: "Sol", note_la: "La", note_si: "Si"
    };
    if (noteMap[typeKey]) return noteMap[typeKey];
    const shapeMap = {
        bass: "Oro", wood: "Pen", mid: "Hex",
        rubber: "Sep", high: "Oct", neon: "Ast"
    };
    if (shapeMap[typeKey]) return shapeMap[typeKey];
    const instMap = {
        inst_kick: "Kick", inst_snare: "Snare", inst_hihat_c: "HHC",
        inst_hihat_o: "HHO", inst_clap: "Clap", inst_conga: "Conga",
        inst_bongo: "Bongo", inst_clave: "Clave"
    };
    if (instMap[typeKey]) return instMap[typeKey];
    return typeKey.slice(0, 3);
}

function stepType(step) {
    if (!step) return null;
    return typeof step === "string" ? step : (step.t || null);
}
function stepVelocity(step) {
    if (!step) return 1;
    return typeof step === "number" ? 1 : (typeof step === "object" ? (step.v ?? 1) : 1);
}

function renderEmitterPattern() {
    const container = document.getElementById("emitter-pattern-steps");
    const objectSelect = document.getElementById("emitter-object-select");
    const emptyHint = document.getElementById("emitter-pattern-empty-hint");
    if (!container || !currentEmitterPanelBody) return;

    if (!container._delegationAttached) {
        container.addEventListener("click", (e) => {
            if (_justDragged) { e.preventDefault(); return; }
            const cell = e.target.closest(".drum-step");
            if (cell && cell.dataset.index !== undefined) {
                e.preventDefault();
                paintPatternStep(parseInt(cell.dataset.index, 10));
            }
        });
        container.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            const cell = e.target.closest(".drum-step");
            if (cell && cell.dataset.index !== undefined) {
                clearPatternStep(parseInt(cell.dataset.index, 10));
            }
        });
        container.addEventListener("dblclick", (e) => {
            e.preventDefault();
            const cell = e.target.closest(".drum-step");
            if (cell && cell.dataset.index !== undefined) {
                clearPatternStep(parseInt(cell.dataset.index, 10));
            }
        });
        container.addEventListener("mousedown", (e) => {
            _dragStartX = e.clientX;
            _dragStartY = e.clientY;
            const cell = e.target.closest(".drum-step");
            _dragStartIndex = cell && cell.dataset.index !== undefined ? parseInt(cell.dataset.index, 10) : -1;
        });
        container.addEventListener("mousemove", (e) => {
            if (_isDragPainting) return;
            if (e.buttons === 0) return;
            const dx = e.clientX - _dragStartX;
            const dy = e.clientY - _dragStartY;
            if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
            _isDragPainting = true;
            _dragPaintMode = e.buttons === 1 ? "paint" : "clear";
            // Dipingi anche la cella da cui è partito il drag (quella del mousedown)
            if (_dragStartIndex >= 0) {
                if (_dragPaintMode === "paint") paintPatternStep(_dragStartIndex, true, true);
                else clearPatternStep(_dragStartIndex, true);
            }
        });
        container.addEventListener("mouseover", (e) => {
            if (!_isDragPainting || !currentEmitterPanelBody) return;
            const cell = e.target.closest(".drum-step");
            if (!cell || cell.dataset.index === undefined) return;
            const idx = parseInt(cell.dataset.index, 10);
            if (_dragPaintMode === "paint") paintPatternStep(idx, true, true);
            else clearPatternStep(idx, true);
        });
        container._delegationAttached = true;
    }

    const pattern = ensurePatternArray(currentEmitterPanelBody);
    const len = pattern.length;
    container.innerHTML = "";
    container.style.gridTemplateColumns = len <= 8 ? `repeat(${len}, 1fr)` : "repeat(8, 1fr)";

    const currentIdx = currentEmitterPanelBody.emitterPatternIndex % Math.max(1, len);

    pattern.forEach((step, i) => {
        const typeKey = stepType(step);
        const vel = stepVelocity(step);
        const cell = document.createElement("div");
        cell.className = "drum-step" + (typeKey ? " filled" : "") + (i === currentIdx ? " active" : "");
        cell.dataset.index = i;

        const num = document.createElement("span");
        num.className = "step-num";
        num.textContent = i + 1;
        cell.appendChild(num);

        if (typeKey) {
            const label = document.createElement("span");
            label.className = "step-label";
            label.textContent = shortLabelForType(typeKey);
            const cfg = blockConfigs[typeKey];
            if (cfg && cfg.color) {
                cell.style.borderColor = cfg.color;
                cell.style.boxShadow = `0 0 6px ${cfg.color}55`;
            }
            cell.appendChild(label);

            const velDot = document.createElement("span");
            velDot.className = "step-velocity";
            velDot.textContent = VELOCITY_LABELS[vel] || VELOCITY_LABELS[1];
            velDot.style.opacity = 0.4 + vel * 0.3;
            cell.appendChild(velDot);
        }

        container.appendChild(cell);
    });

    const hasAny = pattern.some((s) => stepType(s));
    if (objectSelect) objectSelect.disabled = hasAny;
    if (emptyHint) emptyHint.style.display = hasAny ? "none" : "block";
}

function updatePlayheadHighlight() {
    const container = document.getElementById("emitter-pattern-steps");
    if (!container || !currentEmitterPanelBody) return;
    const pattern = ensurePatternArray(currentEmitterPanelBody);
    const currentIdx = currentEmitterPanelBody.emitterPatternIndex % Math.max(1, pattern.length);
    const cells = container.querySelectorAll(".drum-step");
    cells.forEach((cell, i) => {
        cell.classList.toggle("active", i === currentIdx);
    });
}

function paintPatternStep(index, skipRender, force) {
    if (!currentEmitterPanelBody) return;
    const sel = document.getElementById("emitter-pattern-add-select");
    if (!sel || !sel.value) return;
    const pattern = ensurePatternArray(currentEmitterPanelBody);
    if (index < 0 || index >= pattern.length) return;
    const current = pattern[index];
    const currentType = stepType(current);
    const selectedType = sel.value;
    if (force && currentType === selectedType) {
        // durante il drag, non ciclare velocità su celle già identiche: lascia invariato
        if (!skipRender) renderEmitterPattern();
        return;
    }
    if (current && currentType === selectedType) {
        const curVel = stepVelocity(current);
        if (curVel < 2) {
            pattern[index] = { t: selectedType, v: curVel + 1 };
        } else {
            pattern[index] = null;
        }
    } else {
        pattern[index] = { t: selectedType, v: 1 };
    }
    if (!skipRender) renderEmitterPattern();
}

function clearPatternStep(index, skipRender) {
    if (!currentEmitterPanelBody) return;
    const pattern = ensurePatternArray(currentEmitterPanelBody);
    if (index < 0 || index >= pattern.length) return;
    pattern[index] = null;
    if (!skipRender) renderEmitterPattern();
}

function setPatternLength(newLen) {
    if (!currentEmitterPanelBody) return;
    newLen = Math.max(1, Math.min(32, parseInt(newLen, 10) || DEFAULT_PATTERN_LENGTH));
    const old = currentEmitterPanelBody.emitterPattern || [];
    const next = new Array(newLen).fill(null);
    for (let i = 0; i < Math.min(old.length, newLen); i++) next[i] = old[i];
    currentEmitterPanelBody.emitterPattern = next;
    if (currentEmitterPanelBody.emitterPatternIndex >= newLen) {
        currentEmitterPanelBody.emitterPatternIndex = 0;
    }
    renderEmitterPattern();
}

function shiftPattern(dir) {
    if (!currentEmitterPanelBody) return;
    const pattern = ensurePatternArray(currentEmitterPanelBody);
    if (pattern.length === 0) return;
    if (dir > 0) {
        const last = pattern.pop();
        pattern.unshift(last);
    } else {
        const first = pattern.shift();
        pattern.push(first);
    }
    renderEmitterPattern();
}

function clearEmitterPattern() {
    if (!currentEmitterPanelBody) return;
    const len = (currentEmitterPanelBody.emitterPattern && currentEmitterPanelBody.emitterPattern.length) || DEFAULT_PATTERN_LENGTH;
    currentEmitterPanelBody.emitterPattern = new Array(len).fill(null);
    currentEmitterPanelBody.emitterPatternIndex = 0;
    renderEmitterPattern();
}

let _patternPlayheadTimer = null;
function startPatternPlayheadRefresh() {
    if (_patternPlayheadTimer) return;
    _patternPlayheadTimer = setInterval(() => {
        if (currentEmitterPanelBody && document.getElementById("emitter-panel")?.style.display !== "none") {
            updatePlayheadHighlight();
        } else {
            stopPatternPlayheadRefresh();
        }
    }, 120);
}
function stopPatternPlayheadRefresh() {
    if (_patternPlayheadTimer) {
        clearInterval(_patternPlayheadTimer);
        _patternPlayheadTimer = null;
    }
}

function flashStepCell(emitterBody, stepIndex) {
    if (currentEmitterPanelBody !== emitterBody) return;
    const container = document.getElementById("emitter-pattern-steps");
    if (!container) return;
    const cells = container.querySelectorAll(".drum-step");
    if (cells[stepIndex]) {
        cells[stepIndex].classList.add("flash");
        setTimeout(() => cells[stepIndex]?.classList.remove("flash"), 180);
    }
}

function setEmitterSwing(value) {
    const val = parseFloat(value) || 0;
    document.getElementById("val-emitter-swing").innerText = val;
    if (currentEmitterPanelBody) currentEmitterPanelBody.emitterSwing = val;
}

function copyEmitterPattern() {
    if (!currentEmitterPanelBody) return;
    _patternClipboard = currentEmitterPanelBody.emitterPattern.map((s) => s ? { ...s } : null);
    flashMessage("📋 Pattern copied", "#2ed573");
}

function pasteEmitterPattern() {
    if (!currentEmitterPanelBody || !_patternClipboard) return;
    const newLen = _patternClipboard.length;
    currentEmitterPanelBody.emitterPattern = _patternClipboard.map((s) => s ? { ...s } : null);
    if (currentEmitterPanelBody.emitterPatternIndex >= newLen) {
        currentEmitterPanelBody.emitterPatternIndex = 0;
    }
    renderEmitterPattern();
    flashMessage("📋 Pattern pasted", "#2ed573");
}

const PATTERN_PRESETS = {
    "four-on-floor": () => {
        const p = new Array(16).fill(null);
        [0, 4, 8, 12].forEach((i) => (p[i] = { t: "inst_kick", v: 1 }));
        [2, 6, 10, 14].forEach((i) => (p[i] = { t: "inst_hihat_c", v: 1 }));
        return p;
    },
    "hihat-8th": () => {
        const p = new Array(16).fill(null);
        [0, 2, 4, 6, 8, 10, 12, 14].forEach((i) => (p[i] = { t: "inst_hihat_c", v: 1 }));
        return p;
    },
    "hihat-16th": () => {
        const p = new Array(16).fill(null);
        p.forEach((_, i) => {
            if (i % 4 === 0) p[i] = { t: "inst_hihat_o", v: 2 };
            else if (i % 2 === 0) p[i] = { t: "inst_hihat_c", v: 1 };
        });
        return p;
    },
    "kick-snare": () => {
        const p = new Array(16).fill(null);
        [0, 8].forEach((i) => (p[i] = { t: "inst_kick", v: 2 }));
        [4, 12].forEach((i) => (p[i] = { t: "inst_snare", v: 1 }));
        return p;
    },
    "breakbeat": () => {
        const p = new Array(16).fill(null);
        p[0] = { t: "inst_kick", v: 2 };
        p[3] = { t: "inst_snare", v: 1 };
        p[4] = { t: "inst_kick", v: 1 };
        p[6] = { t: "inst_kick", v: 2 };
        p[7] = { t: "inst_snare", v: 2 };
        p[10] = { t: "inst_kick", v: 1 };
        p[11] = { t: "inst_hihat_c", v: 1 };
        p[12] = { t: "inst_snare", v: 1 };
        p[14] = { t: "inst_bongo", v: 1 };
        p[15] = { t: "inst_bongo", v: 2 };
        return p;
    },
    "clave-3-2": () => {
        const p = new Array(16).fill(null);
        [0, 3, 6].forEach((i) => (p[i] = { t: "inst_clave", v: 2 }));
        [10, 13].forEach((i) => (p[i] = { t: "inst_clave", v: 2 }));
        [0, 8].forEach((i) => (p[i] = { t: "inst_conga", v: 1 }));
        [4, 12].forEach((i) => (p[i] = { t: "inst_bongo", v: 1 }));
        return p;
    },
    "clave-2-3": () => {
        const p = new Array(16).fill(null);
        [0, 3].forEach((i) => (p[i] = { t: "inst_clave", v: 2 }));
        [6, 10, 13].forEach((i) => (p[i] = { t: "inst_clave", v: 2 }));
        [0, 8].forEach((i) => (p[i] = { t: "inst_conga", v: 1 }));
        [4, 12].forEach((i) => (p[i] = { t: "inst_bongo", v: 1 }));
        return p;
    },
    "dembow": () => {
        const p = new Array(16).fill(null);
        [0, 6, 12].forEach((i) => (p[i] = { t: "inst_kick", v: 2 }));
        [4, 14].forEach((i) => (p[i] = { t: "inst_snare", v: 2 }));
        [2, 8, 10].forEach((i) => (p[i] = { t: "inst_hihat_c", v: 1 }));
        p[15] = { t: "inst_clap", v: 1 };
        return p;
    },
    "reggae-skank": () => {
        const p = new Array(16).fill(null);
        [0, 8].forEach((i) => (p[i] = { t: "inst_kick", v: 2 }));
        [4, 12].forEach((i) => (p[i] = { t: "inst_snare", v: 1 }));
        [2, 4, 6, 10, 12, 14].forEach((i) => (p[i] = { t: "inst_hihat_c", v: 1 }));
        return p;
    },
    "half-time": () => {
        const p = new Array(16).fill(null);
        p[0] = { t: "inst_kick", v: 2 };
        p[7] = { t: "inst_snare", v: 2 };
        p[8] = { t: "inst_kick", v: 1 };
        p[15] = { t: "inst_snare", v: 2 };
        [4, 12].forEach((i) => (p[i] = { t: "inst_hihat_c", v: 2 }));
        [6, 14].forEach((i) => (p[i] = { t: "inst_hihat_o", v: 1 }));
        return p;
    },
    "afro-latin": () => {
        const p = new Array(16).fill(null);
        [0, 4, 8, 12].forEach((i) => (p[i] = { t: "inst_conga", v: 2 }));
        [2, 6, 10, 14].forEach((i) => (p[i] = { t: "inst_bongo", v: 1 }));
        [3, 7, 11].forEach((i) => (p[i] = { t: "inst_clave", v: 2 }));
        [15].forEach((i) => (p[i] = { t: "inst_hihat_o", v: 1 }));
        return p;
    },
    "melody-asc": () => {
        const notes = ["note_do", "note_re", "note_mi", "note_fa", "note_sol", "note_la", "note_si", "note_do"];
        return notes.map((n) => ({ t: n, v: 1 }));
    },
    "arpeggio-16": () => {
        const notes = ["note_do", "note_mi", "note_sol", "note_si"];
        return new Array(16).fill(null).map((_, i) => ({ t: notes[i % notes.length], v: (i % 4) + 1 }));
    },
    "random-16": () => {
        const types = getEmitterSpawnableTypes();
        return new Array(16).fill(null).map(() => Math.random() > 0.4 ? { t: types[Math.floor(Math.random() * types.length)], v: Math.floor(Math.random() * 3) } : null);
    }
};

function applyPatternPreset(key) {
    if (!currentEmitterPanelBody || !PATTERN_PRESETS[key]) return;
    currentEmitterPanelBody.emitterPattern = PATTERN_PRESETS[key]();
    currentEmitterPanelBody.emitterPatternIndex = 0;
    renderEmitterPattern();
}

function closeDragPaint() {
    if (_isDragPainting) {
        _isDragPainting = false;
        _justDragged = true;
        renderEmitterPattern();
        setTimeout(() => { _justDragged = false; }, 50);
    }
}
document.addEventListener("mouseup", closeDragPaint);

function populateSyncDivisionSelect() {
    const sel = document.getElementById("emitter-sync-division-select");
    if (!sel) return;
    sel.innerHTML = "";
    SYNC_DIVISIONS.forEach((d) => {
        const opt = document.createElement("option");
        opt.value = d.value;
        opt.textContent = d.label;
        sel.appendChild(opt);
    });
}

function updateSyncControlsEnabled(target) {
    const bpmSlider = document.getElementById("slider-emitter-bpm");
    const divSelect = document.getElementById("emitter-sync-division-select");
    const bpmRow = document.getElementById("emitter-bpm-row");
    const syncRow = document.getElementById("emitter-sync-division-row");
    if (bpmSlider) bpmSlider.disabled = !!target.emitterSyncEnabled;
    if (divSelect) divSelect.disabled = !target.emitterSyncEnabled;
    if (bpmRow) bpmRow.style.opacity = target.emitterSyncEnabled ? 0.4 : 1;
    if (syncRow) syncRow.style.opacity = target.emitterSyncEnabled ? 1 : 0.4;
}

// --- Posizionamento dinamico del pannello emettitore ---
// Il pannello segue l'emettitore selezionato, scegliendo il primo lato libero
// (destra, sinistra, sotto, sopra) che non esce dallo schermo e non copre
// il toolbox principale o il box informazioni in alto a sinistra.

function rectsOverlap(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function positionEmitterPanel(target) {
    const panel = document.getElementById("emitter-panel");
    if (!panel || !target) return;

    const margin = 12;
    const gap = 150;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const pos = target.getPosition();
    const ex = worldToScreenX(pos.x);
    const ey = worldToScreenY(pos.y);

    const panelW = panel.offsetWidth || 300;
    const panelH = panel.offsetHeight || 300;

    // Zone da evitare: toolbox principale (se visibile) e box info in alto a sinistra
    const forbidden = [];
    const toolboxEl = document.getElementById("toolbox");
    if (toolboxEl && !toolboxEl.classList.contains("collapsed")) {
        forbidden.push(toolboxEl.getBoundingClientRect());
    }
    const uiEl = document.getElementById("ui");
    if (uiEl) forbidden.push(uiEl.getBoundingClientRect());

    function clampRect(r) {
        let left = Math.min(Math.max(r.left, margin), vw - panelW - margin);
        let top = Math.min(Math.max(r.top, margin), vh - panelH - margin);
        return { left, top, right: left + panelW, bottom: top + panelH };
    }

    const candidates = [
        { left: ex + gap, top: ey - panelH / 2 }, // destra
        { left: ex - gap - panelW, top: ey - panelH / 2 }, // sinistra
        { left: ex - panelW / 2, top: ey + gap }, // sotto
        { left: ex - panelW / 2, top: ey - gap - panelH } // sopra
    ].map((c) => clampRect({ left: c.left, top: c.top, right: c.left + panelW, bottom: c.top + panelH }));

    let chosen = candidates.find((c) => !forbidden.some((f) => rectsOverlap(c, f)));
    if (!chosen) chosen = candidates[2]; // fallback: sotto, comunque clampato a schermo

    panel.style.left = chosen.left + "px";
    panel.style.top = chosen.top + "px";
}

function updateEmitterPanelPosition() {
    if (_emitterPanelUserMoved) return;
    if (currentEmitterPanelBody) positionEmitterPanel(currentEmitterPanelBody);
}

function syncEmitterPanel() {
    const panel = document.getElementById("emitter-panel");
    if (!panel) return;

    const target = editingWallBody && editingWallBody.isEmitter ? editingWallBody : null;

    if (target !== currentEmitterPanelBody) {
        currentEmitterPanelBody = target;
        _emitterPanelUserMoved = false;
        if (target) {
            populateEmitterObjectSelect();
            document.getElementById("emitter-object-select").value = target.emitterObjectType;
            document.getElementById("slider-emitter-power").value = target.emitterPower;
            document.getElementById("val-emitter-power").innerText = target.emitterPower;
            document.getElementById("slider-emitter-bpm").value = target.emitterBPM;
            document.getElementById("val-emitter-bpm").innerText = Math.round(target.emitterBPM);
            document.getElementById("slider-emitter-lifetime").value = target.emitterLifetime;
            document.getElementById("val-emitter-lifetime").innerText =
                target.emitterLifetime > 0 ? target.emitterLifetime : t("emitter-lifetime-infinite");
            populateSyncDivisionSelect();
            document.getElementById("chk-emitter-sync").checked = !!target.emitterSyncEnabled;
            document.getElementById("emitter-sync-division-select").value = target.emitterSyncDivision;
            document.getElementById("slider-global-clock-bpm").value = globalClockBpm;
            document.getElementById("val-global-clock-bpm").innerText = Math.round(globalClockBpm);
            if (!Array.isArray(target.emitterPattern) || target.emitterPattern.length === 0) {
                target.emitterPattern = new Array(DEFAULT_PATTERN_LENGTH).fill(null);
            }
            ensurePatternArray(target, target.emitterPattern.length || DEFAULT_PATTERN_LENGTH);
            populatePatternAddSelect();
            renderEmitterPattern();
            renderEmitterBankBar();
            startPatternPlayheadRefresh();
            updateSyncControlsEnabled(target);
            updateEmitterPauseButtonLabel();
            const swingSlider = document.getElementById("slider-emitter-swing");
            if (swingSlider) swingSlider.value = target.emitterSwing || 0;
            const swingVal = document.getElementById("val-emitter-swing");
            if (swingVal) swingVal.innerText = target.emitterSwing || 0;
            panel.style.visibility = "hidden";
            panel.style.display = "flex";
            initEmitterPanelDrag();
            positionEmitterPanel(target);
            panel.style.visibility = "visible";
        } else {
            panel.style.display = "none";
            stopPatternPlayheadRefresh();
        }
    }
}

function setEmitterSyncEnabled(enabled) {
    if (!currentEmitterPanelBody) return;
    currentEmitterPanelBody.emitterSyncEnabled = enabled;
    if (enabled) alignEmitterToGrid(currentEmitterPanelBody);
    updateSyncControlsEnabled(currentEmitterPanelBody);
}

function setEmitterSyncDivision(value) {
    if (!currentEmitterPanelBody) return;
    currentEmitterPanelBody.emitterSyncDivision = parseFloat(value);
    if (currentEmitterPanelBody.emitterSyncEnabled) alignEmitterToGrid(currentEmitterPanelBody);
}

function setEmitterObjectType(value) {
    if (currentEmitterPanelBody) currentEmitterPanelBody.emitterObjectType = value;
}

function setEmitterPower(value) {
    const val = parseFloat(value);
    document.getElementById("val-emitter-power").innerText = val;
    if (currentEmitterPanelBody) currentEmitterPanelBody.emitterPower = val;
}

function setEmitterBpm(value) {
    const val = parseFloat(value);
    document.getElementById("val-emitter-bpm").innerText = Math.round(val);
    if (currentEmitterPanelBody) currentEmitterPanelBody.emitterBPM = val;
}

function setEmitterLifetime(value) {
    const val = parseFloat(value);
    document.getElementById("val-emitter-lifetime").innerText = val > 0 ? val : t("emitter-lifetime-infinite");
    if (currentEmitterPanelBody) currentEmitterPanelBody.emitterLifetime = val;
}

function updateEmitterPauseButtonLabel() {
    const btn = document.getElementById("btn-emitter-pause");
    if (!btn || !currentEmitterPanelBody) return;
    btn.innerText = currentEmitterPanelBody.emitterPaused ? t("emitter-resume") : t("emitter-pause");
}

function toggleEmitterPaused() {
    if (!currentEmitterPanelBody) return;
    currentEmitterPanelBody.emitterPaused = !currentEmitterPanelBody.emitterPaused;
    updateEmitterPauseButtonLabel();
}

function closeEmitterPanel() {
    editingWallBody = null;
    _isDragPainting = false;
    stopPatternPlayheadRefresh();
    updateInstructionText();
}

// --- Pannello emitter trascinabile ---
// Il drag sull'header disabilita il riposizionamento automatico (che altrimenti
// a ogni frame rimanderebbe il pannello vicino all'emettitore): la posizione
// scelta dall'utente resta valida finché non si apre il pannello su un altro emitter.

let _emitterPanelUserMoved = false;
let _emitterPanelDragState = null;

function initEmitterPanelDrag() {
    const panel = document.getElementById("emitter-panel");
    if (!panel || panel._dragAttached) return;

    const header = panel.querySelector(".emitter-panel-header");
    if (!header) return;
    panel._dragAttached = true;

    header.addEventListener("pointerdown", (e) => {
        if (e.target.closest("button")) return;
        if (e.button !== undefined && e.button !== 0) return;
        const rect = panel.getBoundingClientRect();
        _emitterPanelDragState = {
            startX: e.clientX,
            startY: e.clientY,
            startLeft: rect.left,
            startTop: rect.top
        };
        _emitterPanelUserMoved = true;
        panel.classList.add("dragging");
        e.preventDefault();
    });

    document.addEventListener("pointermove", (e) => {
        if (!_emitterPanelDragState) return;
        const margin = 8;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const deltaX = e.clientX - _emitterPanelDragState.startX;
        const deltaY = e.clientY - _emitterPanelDragState.startY;
        let left = _emitterPanelDragState.startLeft + deltaX;
        let top = _emitterPanelDragState.startTop + deltaY;
        const panelW = panel.offsetWidth;
        const panelH = panel.offsetHeight;
        left = Math.min(Math.max(left, margin), Math.max(margin, vw - panelW - margin));
        top = Math.min(Math.max(top, margin), Math.max(margin, vh - panelH - margin));
        panel.style.left = left + "px";
        panel.style.top = top + "px";
    });

    document.addEventListener("pointerup", () => {
        if (_emitterPanelDragState) {
            _emitterPanelDragState = null;
            panel.classList.remove("dragging");
        }
    });
}
