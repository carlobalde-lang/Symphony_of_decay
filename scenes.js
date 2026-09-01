// scenes.js — Serializzazione/deserializzazione e salvataggio scene in localStorage

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

    if (!data || data.version !== 1 || !Array.isArray(data.bodies) || !Array.isArray(data.joints)) {
        throw new Error("Formato scena incompatibile");
    }

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

// --- Undo / Redo ---
let undoStack = [];
let redoStack = [];
const MAX_UNDO_HISTORY = 20;

function saveUndoState() {
    undoStack.push(serializeScene());
    if (undoStack.length > MAX_UNDO_HISTORY) undoStack.shift();
    redoStack = [];
    updateUndoRedoButtons();
}

function undoAction() {
    if (undoStack.length === 0) return;
    redoStack.push(serializeScene());
    if (redoStack.length > MAX_UNDO_HISTORY) redoStack.shift();
    const prevState = undoStack.pop();
    deserializeScene(prevState);
    updateUndoRedoButtons();
    flashMessage("↩️ Undo", "#70a1ff");
}

function redoAction() {
    if (redoStack.length === 0) return;
    undoStack.push(serializeScene());
    if (undoStack.length > MAX_UNDO_HISTORY) undoStack.shift();
    const nextState = redoStack.pop();
    deserializeScene(nextState);
    updateUndoRedoButtons();
    flashMessage("↪️ Redo", "#70a1ff");
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById("btn-undo");
    const redoBtn = document.getElementById("btn-redo");
    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
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
    const defaultName =
        "Scene " +
        new Date().toLocaleString([], { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
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
        saveUndoState();
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

