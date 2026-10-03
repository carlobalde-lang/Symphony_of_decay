// scenes.js — Serializzazione/deserializzazione e salvataggio scene in localStorage

function serializeScene() {
    const bodyIndex = new Map();
    const bodies = [];
    let idx = 0;

    for (let b = world.getBodyList(); b; b = b.getNext()) {
        if (b.isWall || b === mouseBody) continue;
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
            baseColor: b.baseColor || null,
            ropeId: b.ropeId || null,
            isAnchor: b.isAnchor || false,
            wallHalfW: b.wallHalfW || null,
            wallHalfH: b.wallHalfH || null,
            isEmitter: b.isEmitter || false,
            emitterHalfW: b.emitterHalfW || null,
            emitterHalfH: b.emitterHalfH || null,
            emitterObjectType: b.emitterObjectType || null,
            emitterPower: b.emitterPower ?? null,
            emitterBPM: b.emitterBPM || null,
            emitterNextFireDelayMs: b.isEmitter ? Math.max(0, b.emitterNextFireMs - gameNowMs()) : null,
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
            remainingLifespanMs: b.lifespanMs ? Math.max(0, b.spawnedAtMs + b.lifespanMs - gameNowMs()) : null,
            linearVelocity: { x: b.getLinearVelocity().x, y: b.getLinearVelocity().y },
            angularVelocity: b.getAngularVelocity(),
            angularDamping: b.getAngularDamping(),
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
        if (type !== "distance-joint" && type !== "revolute-joint") continue;
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
            baseColor: j.baseColor || null,
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
        editorEmitterIndex: typeof currentEmitterPanelBody !== "undefined" && currentEmitterPanelBody ? bodyIndex.get(currentEmitterPanelBody) : null,
        ropeIdCounter,
        physics: {
            gravity: document.getElementById("slider-gravity").value,
            drag: document.getElementById("slider-drag").value,
            wind: document.getElementById("slider-wind").value,
            turbulence: document.getElementById("slider-turbulence").value
        },
        globalClockBpm,
        globalClockElapsedMs: Math.max(0, gameNowMs() - globalClockOriginMs),
        boundary: boundaryInnerRect(),
        bodies,
        joints
    };
}

function createBodyFromSerialized(bd) {
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

    body.setLinearDamping(bd.linearDamping ?? 0);
    body.setAngularDamping(bd.angularDamping ?? 0);
    if (bd.linearVelocity) body.setLinearVelocity(planck.Vec2(bd.linearVelocity.x, bd.linearVelocity.y));
    body.setAngularVelocity(bd.angularVelocity ?? 0);
    if (bd.soundType) body.soundType = bd.soundType;
    if (bd.baseColor) {
        body.baseColor = bd.baseColor;
        body.renderColor = shiftHueColor(bd.baseColor);
    } else if (bd.renderColor) {
        body.renderColor = bd.renderColor;
    }
    if (bd.ropeId) body.ropeId = bd.ropeId;
    if (bd.isAnchor) body.isAnchor = true;
    if (bd.wallHalfW) {
        body.wallHalfW = bd.wallHalfW;
        body.wallHalfH = bd.wallHalfH;
    }
    if (bd.isEmitter) {
        body.isEmitter = true;
        body.emitterHalfW = bd.emitterHalfW;
        body.emitterHalfH = bd.emitterHalfH;
        body.emitterObjectType = bd.emitterObjectType || "bass";
        body.emitterPower = bd.emitterPower ?? 12;
        body.emitterBPM = bd.emitterBPM || 90;
        let lifetimeVal = bd.emitterLifetime;
        if (lifetimeVal === null || lifetimeVal === undefined) lifetimeVal = 8;
        else {
            const n = typeof lifetimeVal === "number" ? lifetimeVal : parseFloat(lifetimeVal);
            lifetimeVal = isNaN(n) ? 0 : n;
        }
        body.emitterLifetime = lifetimeVal;
        body.emitterPaused = bd.emitterPaused || false;
        body.emitterSyncEnabled = bd.emitterSyncEnabled || false;
        body.emitterSyncDivision = bd.emitterSyncDivision || 1;
        body.emitterSwing = typeof bd.emitterSwing === "number" ? bd.emitterSwing : 0;
        if (Array.isArray(bd.emitterPattern) && bd.emitterPattern.length > 0) {
            body.emitterPattern = bd.emitterPattern.map((s) => {
                if (!s) return null;
                if (typeof s === "string") return { t: (s && blockConfigs[s]) ? s : null, v: 1 };
                return s && s.t && blockConfigs[s.t] ? { t: s.t, v: typeof s.v === "number" ? s.v : 1 } : null;
            });
        } else {
            body.emitterPattern = new Array(DEFAULT_PATTERN_LENGTH).fill(null);
        }
        body.emitterPatternIndex = bd.emitterPatternIndex || 0;
        if (Array.isArray(bd.emitterPatternBanks) && bd.emitterPatternBanks.length > 0) {
            body.emitterPatternBanks = bd.emitterPatternBanks.map((bank) =>
                Array.isArray(bank)
                    ? bank.map((s) => {
                          if (!s) return null;
                          if (typeof s === "string") return { t: (s && blockConfigs[s]) ? s : null, v: 1 };
                          return s && s.t && blockConfigs[s.t] ? { t: s.t, v: typeof s.v === "number" ? s.v : 1 } : null;
                      })
                    : new Array(DEFAULT_PATTERN_LENGTH).fill(null)
            );
        } else {
            ensurePatternBanks(body);
        }
        body.emitterActiveBank = typeof bd.emitterActiveBank === "number" ? Math.max(0, Math.min(bd.emitterActiveBank, body.emitterPatternBanks.length - 1)) : 0;
        body.emitterPattern = (body.emitterPatternBanks[body.emitterActiveBank] || new Array(DEFAULT_PATTERN_LENGTH).fill(null)).map(normalizeStep);
        body.emitterChainEnabled = bd.emitterChainEnabled || false;
        body.emitterChainPlayingBank = bd.emitterChainPlayingBank || 0;
        body.emitterNextFireMs = gameNowMs() + (bd.emitterNextFireDelayMs ?? 60000 / body.emitterBPM);
        if (body.emitterSyncEnabled) alignEmitterToGrid(body);
    }
    if (bd.remainingLifespanMs !== null && bd.remainingLifespanMs !== undefined) {
        if (bd.remainingLifespanMs > 0) {
            body.lifespanMs = bd.remainingLifespanMs;
            body.spawnedAtMs = gameNowMs();
        } else {
            // L'oggetto era già scaduto quando la scena è stata salvata: ricrearlo con
            // lifespanMs = 0 lo renderebbe immortale (0 significa "senza scadenza").
            // Meglio distruggerlo subito, come sarebbe successo in gioco.
            world.destroyBody(body);
            return null;
        }
    }
    return body;
}

function createJointFromSerialized(jd, bodyA, bodyB, ropeMap) {
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
    if (!joint) return joint;
    if (jd.ropeId) joint.ropeId = (ropeMap && ropeMap.get(jd.ropeId)) || jd.ropeId;
    if (jd.isRopeDistanceJoint) joint.isRopeDistanceJoint = true;
    if (jd.isCustomRender) joint.isCustomRender = true;
    if (jd.baseColor) {
        joint.baseColor = jd.baseColor;
        joint.renderColor = shiftHueColor(jd.baseColor);
    } else if (jd.renderColor) {
        joint.renderColor = jd.renderColor;
    }
    if (jd.renderWidth) joint.renderWidth = jd.renderWidth;
    return joint;
}

// Valida prima di modificare la scena corrente, inclusi valori fisici e giunti.
function validateScene(data) {
    const fail = () => { throw new Error("Formato scena incompatibile"); };
    const finite = (n) => typeof n === "number" && Number.isFinite(n);
    const point = (p) => p && finite(p.x) && finite(p.y);
    const optionalNumber = (n, min = -Infinity) => n == null || (finite(n) && n >= min);
    if (!data || data.version !== 1 || !Array.isArray(data.bodies) || !Array.isArray(data.joints)) fail();
    if (!optionalNumber(data.globalClockBpm, 1) || !optionalNumber(data.globalClockElapsedMs, 0)) fail();
    if (data.ropeIdCounter != null && (!Number.isInteger(data.ropeIdCounter) || data.ropeIdCounter < 0)) fail();
    if (data.boundary) {
        const r = data.boundary;
        if (![r.left, r.right, r.top, r.bottom].every(finite) || r.right - r.left < BOUNDARY_MIN_SIZE || r.bottom - r.top < BOUNDARY_MIN_SIZE) fail();
    }
    if (data.physics) {
        for (const key of ["gravity", "drag", "wind", "turbulence"]) {
            const el = document.getElementById("slider-" + key);
            const value = Number(data.physics[key]);
            if (data.physics[key] == null || data.physics[key] === "" || !Number.isFinite(value) || value < Number(el.min) || value > Number(el.max)) fail();
        }
    }
    for (const b of data.bodies) {
        if (!b || !finite(b.x) || !finite(b.y) || !finite(b.angle) || !Array.isArray(b.fixtures)) fail();
        if (b.linearVelocity != null && !point(b.linearVelocity)) fail();
        if (!optionalNumber(b.angularVelocity) || !optionalNumber(b.linearDamping, 0) || !optionalNumber(b.angularDamping, 0) || !optionalNumber(b.remainingLifespanMs, 0)) fail();
        for (const f of b.fixtures) {
            if (!f || !finite(f.density) || f.density < 0 || !finite(f.friction) || f.friction < 0 || !finite(f.restitution) || f.restitution < 0) fail();
            for (const key of ["filterCategoryBits", "filterMaskBits"]) {
                if (f[key] != null && (!Number.isInteger(f[key]) || f[key] < 0 || f[key] > 65535)) fail();
            }
            if (f.shapeType === "circle") {
                if (!finite(f.radius) || f.radius <= 0) fail();
            } else if (f.shapeType === "polygon") {
                if (!Array.isArray(f.vertices) || f.vertices.length < 3 || f.vertices.length > planck.Settings.maxPolygonVertices || !f.vertices.every(point)) fail();
                let area = 0;
                f.vertices.forEach((v, i) => { const next = f.vertices[(i + 1) % f.vertices.length]; area += v.x * next.y - next.x * v.y; });
                if (Math.abs(area) < 1e-10) fail();
            } else fail();
        }
        if (b.isEmitter) {
            if (!finite(b.emitterHalfW) || b.emitterHalfW <= 0 || !finite(b.emitterHalfH) || b.emitterHalfH <= 0) fail();
            if (!optionalNumber(b.emitterNextFireDelayMs, 0) || !optionalNumber(b.emitterBPM, 1) || !optionalNumber(b.emitterPower, 0) || !optionalNumber(b.emitterLifetime, 0) || !optionalNumber(b.emitterSyncDivision, 0.001) || !optionalNumber(b.emitterSwing, 0)) fail();
        }
        if (b.wallHalfW != null && (!finite(b.wallHalfW) || b.wallHalfW <= 0 || !finite(b.wallHalfH) || b.wallHalfH <= 0)) fail();
    }
    for (const j of data.joints) {
        if (!j || !["distance-joint", "revolute-joint"].includes(j.type)) fail();
        if (![j.bodyA, j.bodyB].every((i) => Number.isInteger(i) && i >= 0 && i < data.bodies.length) || j.bodyA === j.bodyB || !point(j.localAnchorA) || !point(j.localAnchorB)) fail();
        if (j.type === "distance-joint" && (!finite(j.length) || j.length <= 0 || !optionalNumber(j.frequencyHz, 0) || !optionalNumber(j.dampingRatio, 0))) fail();
    }
}

function deserializeScene(data) {
    validateScene(data);
    // Prepara tutti i nuovi corpi e giunti. Un errore lascia intatta la scena attuale.
    const previousBodies = new Set();
    for (let b = world.getBodyList(); b; b = b.getNext()) previousBodies.add(b);
    let bodies;
    try {
        bodies = data.bodies.map(createBodyFromSerialized);
        data.joints.forEach((jd) => {
            const a = bodies[jd.bodyA], b = bodies[jd.bodyB];
            if (a && b) createJointFromSerialized(jd, a, b, null);
        });
    } catch (error) {
        for (let b = world.getBodyList(); b;) {
            const next = b.getNext();
            if (!previousBodies.has(b)) world.destroyBody(b);
            b = next;
        }
        throw error;
    }
    clearScene(new Set(bodies.filter(Boolean)));
    if (data.boundary) applyBoundaryRect(data.boundary);
    if (data.globalClockBpm) {
        globalClockBpm = data.globalClockBpm;
        globalClockOriginMs = gameNowMs() - (data.globalClockElapsedMs ?? 0);
        const bpmEl = document.getElementById("slider-global-clock-bpm");
        const valEl = document.getElementById("val-global-clock-bpm");
        if (bpmEl) bpmEl.value = globalClockBpm;
        if (valEl) valEl.innerText = Math.round(globalClockBpm);
    }
    ropeIdCounter = Math.max(ropeIdCounter, data.ropeIdCounter || 0);
    if (data.physics) {
        for (const key of ["gravity", "drag", "wind", "turbulence"]) document.getElementById("slider-" + key).value = data.physics[key];
        updatePhysics();
        // updatePhysics applica il drag globale: conserva poi i valori propri dei corpi.
        bodies.forEach((b, i) => { if (b) b.setLinearDamping(data.bodies[i].linearDamping ?? 0); });
    }
    realignAllSyncedEmitters();
    resetPhysicsTiming();
    if (Number.isInteger(data.editorEmitterIndex) && bodies[data.editorEmitterIndex]?.isEmitter) {
        editingWallBody = bodies[data.editorEmitterIndex];
        updateInstructionText();
    }
}

// --- Undo / Redo ---
let undoStack = [];
let redoStack = [];
const MAX_UNDO_HISTORY = 20;

function saveUndoState(state = serializeScene()) {
    undoStack.push(state);
    if (undoStack.length > MAX_UNDO_HISTORY) undoStack.shift();
    redoStack = [];
    updateUndoRedoButtons();
}

function restoreHistory(source, destination, message) {
    if (source.length === 0) return;
    try {
        const current = serializeScene();
        deserializeScene(source[source.length - 1]);
        source.pop();
        destination.push(current);
        if (destination.length > MAX_UNDO_HISTORY) destination.shift();
        updateUndoRedoButtons();
        updateInstructionText();
        flashMessage(message, "#70a1ff");
    } catch (error) {
        flashMessage(t("history-failed"), "#ff4757");
    }
}

function undoAction() { restoreHistory(undoStack, redoStack, "↩️ Undo"); }
function redoAction() { restoreHistory(redoStack, undoStack, "↪️ Redo"); }

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById("btn-undo");
    const redoBtn = document.getElementById("btn-redo");
    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

const SAVE_KEY = "symphonyOfDecay_scenes";
const OLD_SAVE_KEY = "symphonyOfDecay_savedScene";

function getSavedScenes() {
    const parsed = storageGetJson(SAVE_KEY, {});
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.assign(Object.create(null), parsed) : Object.create(null);
}

function migrateOldSingleSave() {
    const old = storageGet(OLD_SAVE_KEY, null);
    if (!old) return;
    try {
        const data = JSON.parse(old);
        const scenes = getSavedScenes();
        if (!scenes["Salvataggio precedente"]) {
            scenes["Salvataggio precedente"] = data;
            if (!storageSet(SAVE_KEY, scenes)) return;
        }
    } catch (e) {}
    storageRemove(OLD_SAVE_KEY);
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
        const count = Array.isArray(scenes[name]?.bodies) ? scenes[name].bodies.length : 0;
        opt.textContent = t("scene-list-entry", { name, count });
        sel.appendChild(opt);
    });
    if (names.includes(previousValue)) sel.value = previousValue;
}

function saveScene() {
    const defaultName =
        t("scene-default") + " " +
        new Date().toLocaleString([], { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    const name = prompt(t("scene-name"), defaultName);
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) {
        flashMessage(t("scene-invalid-name"), "#ff4757");
        return;
    }
    try {
        const scenes = getSavedScenes();
        if (Object.prototype.hasOwnProperty.call(scenes, trimmed)) {
            if (!confirm(t("scene-overwrite", { name: trimmed }))) return;
        }
        const data = serializeScene();
        scenes[trimmed] = data;
        if (!storageSet(SAVE_KEY, scenes)) throw new Error("Storage unavailable");
        refreshSceneList();
        const sel = document.getElementById("scene-select");
        if (sel) sel.value = trimmed;
        flashMessage(t("scene-saved", { name: trimmed, count: data.bodies.length }), "#2ed573");
    } catch (e) {
        flashMessage(t("scene-save-failed"), "#ff4757");
    }
}

function loadScene() {
    const sel = document.getElementById("scene-select");
    const name = sel ? sel.value : null;
    if (!name) {
        flashMessage(t("scene-no-selection"), "#ffa502");
        return;
    }
    const scenes = getSavedScenes();
    const data = scenes[name];
    if (!data) {
        flashMessage(t("scene-not-found"), "#ff4757");
        return;
    }
    try {
        const previousState = serializeScene();
        deserializeScene(data);
        if (typeof fitStudioCamera === "function") fitStudioCamera();
        saveUndoState(previousState);
        updateInstructionText();
        flashMessage(t("scene-loaded", { name, count: data.bodies.length }), "#2ed573");
    } catch (e) {
        flashMessage(t("scene-load-failed"), "#ff4757");
    }
}

function deleteScene() {
    const sel = document.getElementById("scene-select");
    const name = sel ? sel.value : null;
    if (!name) return;
    if (!confirm(t("scene-delete-confirm", { name }))) return;
    const scenes = getSavedScenes();
    delete scenes[name];
    if (!storageSet(SAVE_KEY, scenes)) {
        flashMessage(t("scene-delete-failed"), "#ff4757");
        return;
    }
    refreshSceneList();
    flashMessage(t("scene-deleted", { name }), "#ffa502");
}

// --- Autosave: ripristina l'ultima sessione al riavvio ---
const AUTOSAVE_KEY = "symphonyOfDecay_autosave";

let _autosaveFailed = false;
function autosaveNow() {
    try {
        const data = serializeScene();
        if (!storageSet(AUTOSAVE_KEY, { savedAt: Date.now(), data })) throw new Error("Storage unavailable");
        _autosaveFailed = false;
    } catch (e) {
        if (!_autosaveFailed) flashMessage(t("autosave-failed"), "#ffa502");
        _autosaveFailed = true;
    }
}

function getAutosave() {
    try {
        const raw = storageGet(AUTOSAVE_KEY, null);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed.data && Array.isArray(parsed.data.bodies) ? parsed.data : null;
    } catch (e) {
        return null;
    }
}

function autosaveStartInterval() {
    setInterval(autosaveNow, 30000);
    window.addEventListener("pagehide", autosaveNow);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") autosaveNow();
    });
}

function restoreLastSessionIfAny() {
    const data = getAutosave();
    if (!data) return;
    try {
        deserializeScene(data);
        flashMessage(t("session-restored"), "#2ed573");
    } catch (e) {
        flashMessage(t("session-restore-failed"), "#ffa502");
    }
}

