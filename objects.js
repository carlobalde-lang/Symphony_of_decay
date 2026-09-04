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

const EMITTER_MIN_INTERVAL_MS = 120; // limite di sicurezza a BPM molto alti

function spawnElement(x, y, typeKey) {
    const cfg = blockConfigs[typeKey];
    const currentDrag = _cachedDrag;
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
        if (typeKey === "emitter") {
            body.isEmitter = true;
            body.emitterHalfW = cfg.w / 2 / SCALE;
            body.emitterHalfH = cfg.h / 2 / SCALE;
            body.emitterObjectType = "bass";
            body.emitterPower = 12;
            body.emitterBPM = 90;
            body.emitterLifetime = 8; // secondi; 0 = infinito
            body.emitterNextFireMs = Date.now() + 60000 / body.emitterBPM;
            body.emitterPaused = false;
            body.emitterSyncEnabled = false;
            body.emitterSyncDivision = 1;
            body.emitterPattern = [];
            body.emitterPatternIndex = 0;
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
        const velA = bodyA.getLinearVelocity();
        const velB = bodyB.getLinearVelocity();
        const relativeVel = Math.hypot(velA.x - velB.x, velA.y - velB.y);
        if (relativeVel > 0.35) {
            // Il muro non ha un suono proprio: prende in prestito il timbro dell'oggetto che lo colpisce.
            let soundA = bodyA.soundType;
            let soundB = bodyB.soundType;
            if (soundA === "wall" && soundB !== "wall") soundA = soundB;
            if (soundB === "wall" && soundA !== "wall") soundB = soundA;
            playMixedSound(soundA, soundB, relativeVel);
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
    // 1) Raccogli
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

function alignEmitterToGrid(b) {
    const beatLenMs = 60000 / globalClockBpm;
    const gridMs = Math.max(EMITTER_MIN_INTERVAL_MS, b.emitterSyncDivision * beatLenMs);
    const elapsed = Date.now() - globalClockOriginMs;
    const nextIndex = Math.floor(elapsed / gridMs) + 1;
    b.emitterNextFireMs = globalClockOriginMs + nextIndex * gridMs;
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
        if (b.emitterPaused || editingWallBody === b) continue;
        if (now < b.emitterNextFireMs) continue;

        if (b.emitterSyncEnabled) {
            const beatLenMs = 60000 / globalClockBpm;
            const gridMs = Math.max(EMITTER_MIN_INTERVAL_MS, b.emitterSyncDivision * beatLenMs);
            // Sommata alla griglia (non ricalcolata da "ora"): resta agganciata in fase
            // con gli altri emettitori sincronizzati, senza drift.
            while (b.emitterNextFireMs <= now) b.emitterNextFireMs += gridMs;
        } else {
            const intervalMs = Math.max(EMITTER_MIN_INTERVAL_MS, 60000 / Math.max(1, b.emitterBPM));
            // Ricalcolata da "ora" (non sommata) per evitare raffiche di recupero dopo una pausa/lag.
            b.emitterNextFireMs = now + intervalMs;
        }

        if (getSpawnedBodyCount() >= MAX_BODIES) continue;

        let spawnType;
        if (b.emitterPattern && b.emitterPattern.length > 0) {
            spawnType = b.emitterPattern[b.emitterPatternIndex % b.emitterPattern.length];
            if (!blockConfigs[spawnType]) spawnType = "bass";
            b.emitterPatternIndex = (b.emitterPatternIndex + 1) % b.emitterPattern.length;
        } else {
            spawnType = blockConfigs[b.emitterObjectType] ? b.emitterObjectType : "bass";
        }
        const cfg = blockConfigs[spawnType];
        const halfH = b.emitterHalfH;
        const muzzleOffset = halfH + (cfg.radius || cfg.size || cfg.h / 2 || 20) / SCALE + 4 / SCALE;
        const spawnPoint = b.getWorldPoint(planck.Vec2(0, -muzzleOffset));
        const forward = b.getWorldVector(planck.Vec2(0, -1));

        const projectile = spawnElement(spawnPoint.x, spawnPoint.y, spawnType);
        const power = b.emitterPower || 12;
        projectile.setLinearVelocity(planck.Vec2(forward.x * power, forward.y * power));

        if (b.emitterLifetime > 0) {
            projectile.lifespanMs = b.emitterLifetime * 1000;
            projectile.spawnedAtMs = Date.now();
        }

        spawnImpactParticles(spawnPoint.x, spawnPoint.y, "#f1c40f", power * 0.4);
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

function renderEmitterPattern() {
    const container = document.getElementById("emitter-pattern-steps");
    const objectSelect = document.getElementById("emitter-object-select");
    if (!container || !currentEmitterPanelBody) return;

    const pattern = currentEmitterPanelBody.emitterPattern || [];
    container.innerHTML = "";

    if (pattern.length === 0) {
        const empty = document.createElement("span");
        empty.className = "pattern-empty-hint";
        empty.textContent = t("emitter-pattern-empty");
        container.appendChild(empty);
    } else {
        pattern.forEach((typeKey, i) => {
            const chip = document.createElement("span");
            chip.className = "pattern-step-chip";
            const label = document.createElement("span");
            label.textContent = t("obj-" + typeKey).replace(/^[^\s]+\s/, ""); // toglie l'emoji per compattezza
            const del = document.createElement("button");
            del.textContent = "✕";
            del.onclick = () => removePatternStep(i);
            chip.appendChild(label);
            chip.appendChild(del);
            container.appendChild(chip);
        });
    }

    if (objectSelect) objectSelect.disabled = pattern.length > 0;
}

function addPatternStep() {
    if (!currentEmitterPanelBody) return;
    const sel = document.getElementById("emitter-pattern-add-select");
    if (!sel || !sel.value) return;
    if (!currentEmitterPanelBody.emitterPattern) currentEmitterPanelBody.emitterPattern = [];
    currentEmitterPanelBody.emitterPattern.push(sel.value);
    renderEmitterPattern();
}

function removePatternStep(index) {
    if (!currentEmitterPanelBody || !currentEmitterPanelBody.emitterPattern) return;
    currentEmitterPanelBody.emitterPattern.splice(index, 1);
    if (currentEmitterPanelBody.emitterPatternIndex >= currentEmitterPanelBody.emitterPattern.length) {
        currentEmitterPanelBody.emitterPatternIndex = 0;
    }
    renderEmitterPattern();
}

function clearEmitterPattern() {
    if (!currentEmitterPanelBody) return;
    currentEmitterPanelBody.emitterPattern = [];
    currentEmitterPanelBody.emitterPatternIndex = 0;
    renderEmitterPattern();
}

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
    const ex = pos.x * SCALE;
    const ey = pos.y * SCALE;

    const panelW = panel.offsetWidth || 260;
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
    if (currentEmitterPanelBody) positionEmitterPanel(currentEmitterPanelBody);
}

function syncEmitterPanel() {
    const panel = document.getElementById("emitter-panel");
    if (!panel) return;

    const target = editingWallBody && editingWallBody.isEmitter ? editingWallBody : null;

    if (target !== currentEmitterPanelBody) {
        currentEmitterPanelBody = target;
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
            if (!target.emitterPattern) target.emitterPattern = [];
            populatePatternAddSelect();
            renderEmitterPattern();
            updateSyncControlsEnabled(target);
            updateEmitterPauseButtonLabel();
            panel.style.visibility = "hidden";
            panel.style.display = "flex";
            positionEmitterPanel(target);
            panel.style.visibility = "visible";
        } else {
            panel.style.display = "none";
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
    updateInstructionText();
}


