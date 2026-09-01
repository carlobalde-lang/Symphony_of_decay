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
        if (relativeVel > 0.8) {
            playMixedSound(bodyA.soundType, bodyB.soundType, relativeVel);
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

