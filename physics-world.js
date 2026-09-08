// physics-world.js — Setup mondo Planck.js, canvas, muri, resize, vento, interazioni pointer/mouse

const SCALE = 40.0;

// --- Camera: zoom + pan ---
// Il disegno usa coordinate "mondo * SCALE" (px a zoom 1 senza offset). Nel
// gameLoop applico ctx.translate(camOffset) + ctx.scale(camZoom): nessun
// cambiamento serve nel codice di rendering. L'inverso si usa per hit-test/input.
let camZoom = 1;
let camOffsetX = 0;
let camOffsetY = 0;
const CAM_MIN_ZOOM = 0.15;
const CAM_MAX_ZOOM = 4.0;

function screenToWorldX(sx) {
    return (sx - camOffsetX) / (SCALE * camZoom);
}
function screenToWorldY(sy) {
    return (sy - camOffsetY) / (SCALE * camZoom);
}
function worldToScreenX(wx) {
    return wx * SCALE * camZoom + camOffsetX;
}
function worldToScreenY(wy) {
    return wy * SCALE * camZoom + camOffsetY;
}
// Converte una coordinata già scalata * SCALE (come i wall handle) in px schermo.
function scaledToScreenX(sx) {
    return sx * camZoom + camOffsetX;
}
function scaledToScreenY(sy) {
    return sy * camZoom + camOffsetY;
}

let camPanActive = false;
let camPanStartX = 0;
let camPanStartY = 0;

// --- Touch: pinch per zoom+pan (due dita), e pinch per ruotare/ridimensionare i muri in editing ---
const touchPointers = new Map();
let pinchState = null;
// Fino a ±6% di variazione della distanza tra le dita il gesto è "pan puro"
// (due dita che scorrono assieme); oltre si applica lo zoom.
const PURE_PAN_RATIO = 1.06;

function startPinch() {
    // Annulla eventuali azioni a un dito in corso
    if (mouseJoint) {
        world.destroyJoint(mouseJoint);
        mouseJoint = null;
    }
    boundaryDrag = null;
    linkDragStart = null;
    resizingWallHandle = null;
    isDraggingWall = false;
    endSelectionDrag();
    if (marqueeState) marqueeState = null;

    const pts = [...touchPointers.values()];
    if (pts.length !== 2) {
        pinchState = null;
        return;
    }
    const dx = pts[1].x - pts[0].x;
    const dy = pts[1].y - pts[0].y;
    const midX = (pts[0].x + pts[1].x) / 2;
    const midY = (pts[0].y + pts[1].y) / 2;
    pinchState = {
        startDist: Math.hypot(dx, dy) || 1,
        startAngle: Math.atan2(dy, dx),
        camZoom0: camZoom,
        camOffsetX0: camOffsetX,
        camOffsetY0: camOffsetY,
        worldMidX: (midX - camOffsetX) / (SCALE * camZoom),
        worldMidY: (midY - camOffsetY) / (SCALE * camZoom),
        editing: editingWallBody,
        editAngle0: editingWallBody ? editingWallBody.getAngle() : 0,
        editHalfW0: editingWallBody && !editingWallBody.isEmitter ? editingWallBody.wallHalfW : 0,
        editHalfH0: editingWallBody && !editingWallBody.isEmitter ? editingWallBody.wallHalfH : 0
    };
}

function updatePinch() {
    if (!pinchState) return;
    const pts = [...touchPointers.values()];
    if (pts.length !== 2) {
        pinchState = null;
        return;
    }
    const dx = pts[1].x - pts[0].x;
    const dy = pts[1].y - pts[0].y;
    const dist = Math.hypot(dx, dy);
    const midX = (pts[0].x + pts[1].x) / 2;
    const midY = (pts[0].y + pts[1].y) / 2;
    const st = pinchState;

    if (st.editing) {
        const b = st.editing;
        b.setAngle(st.editAngle0 + (Math.atan2(dy, dx) - st.startAngle));
        if (!b.isEmitter) {
            const factor = dist / st.startDist;
            if (Math.abs(factor - 1) > 0.002) {
                const newHW = Math.min(MAX_WALL_HALF, Math.max(MIN_WALL_HALF, st.editHalfW0 * factor));
                const newHH = Math.min(MAX_WALL_HALF, Math.max(MIN_WALL_HALF, st.editHalfH0 * factor));
                let f = b.getFixtureList();
                while (f) {
                    const nf = f.getNext();
                    b.destroyFixture(f);
                    f = nf;
                }
                b.createFixture(planck.Box(newHW, newHH), {
                    density: blockConfigs.wall.density,
                    restitution: blockConfigs.wall.restitution,
                    friction: 0.6
                });
                b.wallHalfW = newHW;
                b.wallHalfH = newHH;
            }
        }
        return;
    }

    const distRatio = dist / st.startDist;
    if (distRatio > 1 / PURE_PAN_RATIO && distRatio < PURE_PAN_RATIO) {
        // Due dita che scorrono assieme senza cambiare distanza: pan puro, nessuno zoom.
        camOffsetX = midX - st.worldMidX * SCALE * camZoom;
        camOffsetY = midY - st.worldMidY * SCALE * camZoom;
        return;
    }
    const newZoom = Math.max(CAM_MIN_ZOOM, Math.min(CAM_MAX_ZOOM, st.camZoom0 * distRatio));
    camZoom = newZoom;
    camOffsetX = midX - st.worldMidX * SCALE * newZoom;
    camOffsetY = midY - st.worldMidY * SCALE * newZoom;
}

// Numero di segmenti per corde/catene, fissato (ex slider rimosso dall'UI)
const ROPE_CHAIN_SEGMENTS = 10;

// Pulsante pausa/play disegnato sull'angolo dell'emettitore
const EMITTER_BADGE_LOCAL_OFFSET = 11 / SCALE;
const EMITTER_BADGE_RADIUS = 10; // px, in coordinate schermo

const CAT_ROPE = 0x0002;
const CAT_ROPE_MASK = 0xffff & ~0x0002; // non-colla con le corde

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
    friction: 0.6
});
ground.isWall = true;

const wallLeft = world.createBody({
    type: "static",
    position: planck.Vec2(wallThickness / 2, window.innerHeight / 2 / SCALE)
});
let wallLeftFixture = wallLeft.createFixture(planck.Box(wallThickness / 2, window.innerHeight / 2 / SCALE), {
    friction: 0.6
});
wallLeft.isWall = true;

const wallRight = world.createBody({
    type: "static",
    position: planck.Vec2((window.innerWidth - wallThickness / 2) / SCALE, window.innerHeight / 2 / SCALE)
});
let wallRightFixture = wallRight.createFixture(planck.Box(wallThickness / 2, window.innerHeight / 2 / SCALE), {
    friction: 0.6
});
wallRight.isWall = true;

const ceiling = world.createBody({
    type: "static",
    position: planck.Vec2(window.innerWidth / 2 / SCALE, wallThickness / 2)
});
let ceilingFixture = ceiling.createFixture(planck.Box(window.innerWidth / 2 / SCALE, wallThickness / 2), {
    friction: 0.6
});
ceiling.isWall = true;

// --- Rettangolo perimetrale rimodellabile ---
// I quattro muri statici (ground/ceiling/wallLeft/wallRight) formano il
// playfield. Con lo zoom verso l'esterno si può trascinare un muro perimetrale
// per ridimensionare il rettangolo che contiene tutto: il lato trascinato si
// muove, i due muri adiacenti si allungano e il lato opposto resta fermo.
const BOUNDARY_MIN_SIZE = 40 / SCALE;
const BOUNDARY_HIT_MARGIN = 18 / SCALE;
let boundaryDrag = null; // { side, offsetX, offsetY, moved }
let linkDragStart = null; // { startWorld, startBody, startLocal }
let linkAnchorCounter = 0;
const LINK_DRAG_MIN_PX = 8;

function boundaryInnerRect() {
    const t = wallThickness / 2;
    return {
        left: wallLeft.getPosition().x + t,
        right: wallRight.getPosition().x - t,
        bottom: ground.getPosition().y - t,
        top: ceiling.getPosition().y + t
    };
}

function replaceFixture(body, shape, oldFixture) {
    if (oldFixture) body.destroyFixture(oldFixture);
    return body.createFixture(shape, { friction: 0.6 });
}

function applyBoundaryRect(rect) {
    const t = wallThickness / 2;
    const w = (rect.right - rect.left) / 2;
    const h = (rect.bottom - rect.top) / 2;
    const cx = (rect.left + rect.right) / 2;
    const cy = (rect.bottom + rect.top) / 2;

    ground.setPosition(planck.Vec2(cx, rect.bottom + t));
    groundFixture = replaceFixture(ground, planck.Box(w, t), groundFixture);

    ceiling.setPosition(planck.Vec2(cx, rect.top - t));
    ceilingFixture = replaceFixture(ceiling, planck.Box(w, t), ceilingFixture);

    wallLeft.setPosition(planck.Vec2(rect.left - t, cy));
    wallLeftFixture = replaceFixture(wallLeft, planck.Box(t, h), wallLeftFixture);

    wallRight.setPosition(planck.Vec2(rect.right + t, cy));
    wallRightFixture = replaceFixture(wallRight, planck.Box(t, h), wallRightFixture);
}

function hitBoundarySide(p) {
    const candidates = [
        [ground, "bottom"],
        [ceiling, "top"],
        [wallLeft, "left"],
        [wallRight, "right"]
    ];
    for (const [body, side] of candidates) {
        for (let f = body.getFixtureList(); f; f = f.getNext()) {
            if (f.testPoint(p)) return side;
        }
    }
    // Tolleranza di prossimità alle facce esterne: le strisce sono sottili (40px) e
    // con lo zoom diventano difficili da prendere. La banda è FUORI dal rect così
    // non ruba i click agli oggetti dentro il playfield.
    const r = boundaryInnerRect();
    const m = BOUNDARY_HIT_MARGIN;
    const t = wallThickness;
    if (p.y >= r.top && p.y <= r.bottom) {
        if (p.x <= r.left && p.x >= r.left - t - m) return "left";
        if (p.x >= r.right && p.x <= r.right + t + m) return "right";
    }
    if (p.x >= r.left && p.x <= r.right) {
        if (p.y <= r.top && p.y >= r.top - t - m) return "top";
        if (p.y >= r.bottom && p.y <= r.bottom + t + m) return "bottom";
    }
    return null;
}

function startBoundaryDrag(side, mousePos) {
    let grabBody;
    if (side === "bottom") grabBody = ground;
    else if (side === "top") grabBody = ceiling;
    else if (side === "left") grabBody = wallLeft;
    else grabBody = wallRight;
    boundaryDrag = {
        side,
        offsetX: grabBody.getPosition().x - mousePos.x,
        offsetY: grabBody.getPosition().y - mousePos.y,
        moved: false
    };
}

function updateBoundaryDrag(mousePos) {
    const d = boundaryDrag;
    if (!d) return;
    if (!d.moved) {
        d.moved = true;
        saveUndoState();
    }
    const t = wallThickness / 2;
    const cur = boundaryInnerRect();
    const rect = { left: cur.left, right: cur.right, top: cur.top, bottom: cur.bottom };
    if (d.side === "bottom") {
        rect.bottom = Math.max(cur.top + BOUNDARY_MIN_SIZE, mousePos.y + d.offsetY - t);
    } else if (d.side === "top") {
        rect.top = Math.min(cur.bottom - BOUNDARY_MIN_SIZE, mousePos.y + d.offsetY + t);
    } else if (d.side === "left") {
        rect.left = Math.min(cur.right - BOUNDARY_MIN_SIZE, mousePos.x + d.offsetX + t);
    } else if (d.side === "right") {
        rect.right = Math.max(cur.left + BOUNDARY_MIN_SIZE, mousePos.x + d.offsetX - t);
    }
    applyBoundaryRect(rect);
}

// Riporta i muri perimetrali alla dimensione della finestra (default di partenza,
// usato da "erase all" e al primo avvio).
function resetBoundaryToWindow() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    ground.setPosition(planck.Vec2(W / 2 / SCALE, (H - 20) / SCALE));
    groundFixture = replaceFixture(ground, planck.Box(W / 2 / SCALE, wallThickness / 2), groundFixture);

    wallRight.setPosition(planck.Vec2((W - wallThickness / 2) / SCALE, H / 2 / SCALE));
    wallRightFixture = replaceFixture(wallRight, planck.Box(wallThickness / 2, H / 2 / SCALE), wallRightFixture);

    ceiling.setPosition(planck.Vec2(W / 2 / SCALE, wallThickness / 2));
    ceilingFixture = replaceFixture(ceiling, planck.Box(W / 2 / SCALE, wallThickness / 2), ceilingFixture);

    wallLeft.setPosition(planck.Vec2(wallThickness / 2, H / 2 / SCALE));
    wallLeftFixture = replaceFixture(wallLeft, planck.Box(wallThickness / 2, H / 2 / SCALE), wallLeftFixture);
}

let logicalWidth = window.innerWidth;
let logicalHeight = window.innerHeight;

const DEFAULT_MAX_BODIES = 150;
let MAX_BODIES = DEFAULT_MAX_BODIES;

// --- Limite oggetti adattivo in base alle prestazioni ---
const DYNAMIC_LIMIT_MIN = 30;
const DYNAMIC_LIMIT_MAX = 400;
const DYNAMIC_LIMIT_STEP = 10;
const LOW_FPS_THRESHOLD = 42; // sotto questo, il limite scende
const HIGH_FPS_THRESHOLD = 56; // sopra questo (e vicini al limite), il limite sale
let dynamicLimitEnabled = true;
let _perfLastFrameMs = null;
let _perfAccumMs = 0;
let _perfFrameCount = 0;

function updateMaxBodyDisplay() {
    const el = document.getElementById("body-count-max");
    if (el) el.innerText = MAX_BODIES;
}

function setDynamicLimitEnabled(enabled) {
    dynamicLimitEnabled = enabled;
    if (!enabled) {
        MAX_BODIES = DEFAULT_MAX_BODIES;
        updateMaxBodyDisplay();
    }
    _perfAccumMs = 0;
    _perfFrameCount = 0;
}

// Da chiamare una volta per frame (anche in pausa, il costo di rendering conta comunque).
function updatePerformanceAdaptiveLimit(nowMs) {
    if (_perfLastFrameMs === null) {
        _perfLastFrameMs = nowMs;
        return;
    }
    const dt = nowMs - _perfLastFrameMs;
    _perfLastFrameMs = nowMs;
    if (!dynamicLimitEnabled || dt <= 0) return;

    _perfAccumMs += dt;
    _perfFrameCount++;
    if (_perfAccumMs < 1000) return; // valuta circa una volta al secondo

    const avgFps = 1000 / (_perfAccumMs / _perfFrameCount);
    _perfAccumMs = 0;
    _perfFrameCount = 0;

    if (avgFps < LOW_FPS_THRESHOLD && MAX_BODIES > DYNAMIC_LIMIT_MIN) {
        MAX_BODIES = Math.max(DYNAMIC_LIMIT_MIN, MAX_BODIES - DYNAMIC_LIMIT_STEP);
        updateMaxBodyDisplay();
    } else if (avgFps > HIGH_FPS_THRESHOLD && MAX_BODIES < DYNAMIC_LIMIT_MAX) {
        MAX_BODIES = Math.min(DYNAMIC_LIMIT_MAX, MAX_BODIES + DYNAMIC_LIMIT_STEP);
        updateMaxBodyDisplay();
    }
}

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
    flashMessage(t("limit-reached", { max: MAX_BODIES }), "#ff4757");
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

    // Nota: ridimensionare la finestra NON tocca i muri perimetrali: la posizione
    // (eventualmente custom) è salvata nella scena e viene ripristinata al load.
    initBackgroundTrees();
}

let _resizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(resizeCanvas, 120);
});

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

let _cachedDrag = 0.2; // default

function updatePhysics() {
    const gravVal = parseFloat(document.getElementById("slider-gravity").value);
    _cachedDrag = parseFloat(document.getElementById("slider-drag").value);
    windSpeed = parseFloat(document.getElementById("slider-wind").value);
    windTurbulence = parseFloat(document.getElementById("slider-turbulence").value);

    document.getElementById("val-gravity").innerText = gravVal;
    document.getElementById("val-drag").innerText = _cachedDrag;
    document.getElementById("val-wind").innerText = windSpeed;
    document.getElementById("val-turbulence").innerText = windTurbulence;

    world.setGravity(planck.Vec2(0, gravVal));

    for (let b = world.getBodyList(); b; b = b.getNext()) {
        if (!b.isStatic() && !b.isWall) b.setLinearDamping(_cachedDrag);
    }
}


function resetPhysics() {
    document.getElementById("slider-gravity").value = 9.8;
    document.getElementById("slider-drag").value = 0.2;
    document.getElementById("slider-wind").value = 0.0;
    document.getElementById("slider-turbulence").value = 0.0;
    updatePhysics();
}

let mouseJoint = null;
let mouseBody = world.createBody();

canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") {
        touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (touchPointers.size === 2) {
        startPinch();
        return;
    }
    if (event.button === 2) {
        deselectAllActive();
        return;
    }
    // Pan camera con il tasto centrale
    if (event.button === 1) {
        camPanActive = true;
        camPanStartX = event.clientX;
        camPanStartY = event.clientY;
        try { canvas.setPointerCapture(event.pointerId); } catch (e) {}
        return;
    }
    const clientX = event.clientX;
    const clientY = event.clientY;

    if (clientX < 280 && clientY < 200) return;
    if (clientX > window.innerWidth - 300 && clientY < 60) return;
    const topCenterEl = document.getElementById("top-center-controls");
    if (topCenterEl) {
        const r = topCenterEl.getBoundingClientRect();
        if (clientX >= r.left - 6 && clientX <= r.right + 6 && clientY >= r.top - 6 && clientY <= r.bottom + 6) return;
    }

    const mousePos = planck.Vec2(screenToWorldX(clientX), screenToWorldY(clientY));
    _lastPointerWorld = planck.Vec2(mousePos.x, mousePos.y);

    // Click sul pulsante pausa/play disegnato sull'angolo dell'emettitore: toggla e basta,
    // non seleziona/apre il pannello.
    for (let eb = world.getBodyList(); eb; eb = eb.getNext()) {
        if (!eb.isEmitter) continue;
        const badgeWorld = eb.getWorldPoint(
            planck.Vec2(-eb.emitterHalfW + EMITTER_BADGE_LOCAL_OFFSET, -eb.emitterHalfH + EMITTER_BADGE_LOCAL_OFFSET)
        );
        const bx = worldToScreenX(badgeWorld.x);
        const by = worldToScreenY(badgeWorld.y);
        if (Math.hypot(clientX - bx, clientY - by) < EMITTER_BADGE_RADIUS + 4) {
            eb.emitterPaused = !eb.emitterPaused;
            if (currentEmitterPanelBody === eb) updateEmitterPauseButtonLabel();
            return;
        }
    }

    // Drag dei muri perimetrali: ridimensiona il rettangolo che contiene tutto.
    // Prima del guard della toolbox così vale anche quando il menu è aperto (il menu
    // intercetta comunque i click sopra se stesso, ma la striscia del muro resta attiva).
    if (event.button === 0) {
        const boundarySide = hitBoundarySide(mousePos);
        if (boundarySide) {
            startBoundaryDrag(boundarySide, mousePos);
            try { canvas.setPointerCapture(event.pointerId); } catch (e) {}
            return;
        }
    }

    const toolbox = document.getElementById("toolbox");
    if (!toolbox.classList.contains("collapsed") && clientX > window.innerWidth - 320 && clientY < window.innerHeight)
        return;

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

    if (currentMode === "select") {
        handleSelectPointerDown(mousePos, clickedBody, event.shiftKey);
        return;
    }

    if (editingWallBody) {
        const handles = getWallHandles(editingWallBody);
        let hitSide = null;
        for (const side in handles) {
            const h = handles[side];
            if (Math.hypot(clientX - scaledToScreenX(h.x), clientY - scaledToScreenY(h.y)) < 20) {
                hitSide = side;
                break;
            }
        }
        if (hitSide) {
            resizingWallHandle = { side: hitSide };
            return;
        }

        let clickedInsideEditingWall = false;
        for (let f = editingWallBody.getFixtureList(); f; f = f.getNext()) {
            if (f.testPoint(mousePos)) {
                clickedInsideEditingWall = true;
                break;
            }
        }

        if (clickedInsideEditingWall) {
            isDraggingWall = true;
            wallDragOffset = planck.Vec2(
                editingWallBody.getPosition().x - mousePos.x,
                editingWallBody.getPosition().y - mousePos.y
            );
            return;
        }

        // Clic fuori dal muro in fase di editing: chiude l'editing e interrompe l'esecuzione del click corrente
        editingWallBody = null;
        updateInstructionText();
        return;
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
        isDraggingWall = false;
        updateInstructionText();
        return;
    }

    const isEmitterSelectClick =
        clickedBody &&
        clickedBody.isEmitter &&
        currentMode !== "eraser" &&
        currentMode !== "bar" &&
        currentMode !== "rope" &&
        currentMode !== "chain";

    if (isEmitterSelectClick) {
        editingWallBody = clickedBody;
        resizingWallHandle = null;
        isDraggingWall = false;
        updateInstructionText();
        return;
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
        saveUndoState();
        const sn = applySnapToGrid(mousePos.x, mousePos.y);
        const newBody = spawnElement(sn.x, sn.y, currentChoice);
        if (currentChoice === "wall" || currentChoice === "emitter") {
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
                const pA = planck.Vec2(scaledToScreenX(aA.x * SCALE), scaledToScreenY(aA.y * SCALE));
                const pB = planck.Vec2(scaledToScreenX(aB.x * SCALE), scaledToScreenY(aB.y * SCALE));
                const screenMouse = planck.Vec2(clientX, clientY);
                if (aA && aB && distToSegment(screenMouse, pA, pB) < 15) {
                    clickedJoint = j;
                    break;
                }
            }
        }
        if (clickedJoint || clickedBody) saveUndoState();
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
                const jA = clickedJoint.getBodyA();
                const jB = clickedJoint.getBodyB();
                world.destroyJoint(clickedJoint);
                cleanupAnchorIfEmpty(jA);
                cleanupAnchorIfEmpty(jB);
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
                    isDraggingWall = false;
                    updateInstructionText();
                }
                world.destroyBody(clickedBody);
            }
        }
    } else if (currentMode === "bar" || currentMode === "rope" || currentMode === "chain") {
        // Click-and-drag: il giunto viene creato al rilascio (handleLinkPointerUp).
        // Un click semplice (senza drag) mantiene la logica a due clic via linkStartBody.
        linkDragStart = {
            startWorld: planck.Vec2(mousePos.x, mousePos.y),
            startClientX: clientX,
            startClientY: clientY,
            startBody: clickedBody,
            startLocal: clickedBody ? clickedBody.getLocalPoint(mousePos) : null
        };
    }
});

function createLinkAnchor(worldPos) {
    const b = world.createBody({ type: "static", position: planck.Vec2(worldPos.x, worldPos.y) });
    b.isAnchor = true;
    b.anchorId = ++linkAnchorCounter;
    return b;
}

function resolveLinkEndpoint(worldPos, body) {
    if (body) return { body: body, local: body.getLocalPoint(worldPos) };
    const anchor = createLinkAnchor(worldPos);
    return { body: anchor, local: planck.Vec2(0, 0) };
}

function bodyAtPoint(p) {
    for (let b = world.getBodyList(); b; b = b.getNext()) {
        if (b.isWall) continue;
        for (let f = b.getFixtureList(); f; f = f.getNext()) {
            if (f.testPoint(p)) return b;
        }
    }
    return null;
}

function createLinkBetween(type, bodyA, localA, bodyB, localB) {
    const posA = bodyA.getWorldPoint(localA);
    const posB = bodyB.getWorldPoint(localB);
    if (planck.Vec2.distance(posA, posB) < 4 / SCALE) return;
    saveUndoState();

    if (type === "bar") {
        const joint = world.createJoint(
            planck.DistanceJoint({
                bodyA: bodyA,
                bodyB: bodyB,
                localAnchorA: localA,
                localAnchorB: localB,
                length: planck.Vec2.distance(posA, posB),
                frequencyHz: 0,
                dampingRatio: 0.1
            })
        );
        joint.isCustomRender = true;
        joint.baseColor = "#ffa502";
        joint.renderColor = shiftHueColor("#ffa502");
        joint.renderWidth = 4;
    } else if (type === "chain") {
        ropeIdCounter++;
        const currentRopeId = ropeIdCounter;
        const numSegments = ROPE_CHAIN_SEGMENTS;
        const totalDist = planck.Vec2.distance(posA, posB);
        const segmentLength = totalDist / numSegments;
        const dirX = (posB.x - posA.x) / totalDist;
        const dirY = (posB.y - posA.y) / totalDist;
        const chainAngle = Math.atan2(dirY, dirX);
        const linkHalfHeight = 2.5 / SCALE;

        let prevBody = bodyA;

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
                friction: 0.6,
                filterCategoryBits: CAT_ROPE,
                filterMaskBits: CAT_ROPE_MASK
            });
            segBody.setLinearDamping(0.1);
            segBody.setAngularDamping(0.3);
            segBody.ropeId = currentRopeId;
            segBody.baseColor = "#ffa502";
            segBody.renderColor = shiftHueColor("#ffa502");

            const pivot = planck.Vec2(startX, startY);
            const joint = world.createJoint(planck.RevoluteJoint({}, prevBody, segBody, pivot));
            joint.ropeId = currentRopeId;
            joint.isCustomRender = true;
            joint.baseColor = "#c47a00";
            joint.renderColor = shiftHueColor("#c47a00");
            joint.renderWidth = 2;

            prevBody = segBody;
        }

        const finalJoint = world.createJoint(planck.RevoluteJoint({}, prevBody, bodyB, posB));
        finalJoint.ropeId = currentRopeId;
        finalJoint.isCustomRender = true;
        finalJoint.baseColor = "#c47a00";
        finalJoint.renderColor = shiftHueColor("#c47a00");
        finalJoint.renderWidth = 2;

        if (bodyA.isAnchor) bodyA.ropeId = currentRopeId;
        if (bodyB.isAnchor) bodyB.ropeId = currentRopeId;
    } else {
        ropeIdCounter++;
        const currentRopeId = ropeIdCounter;
        const numSegments = ROPE_CHAIN_SEGMENTS;
        const totalDist = planck.Vec2.distance(posA, posB);
        const segmentLength = totalDist / numSegments;
        let prevBody = bodyA;
        let prevAnchor = localA;

        for (let i = 1; i < numSegments; i++) {
            const percent = i / numSegments;
            const x = posA.x + (posB.x - posA.x) * percent;
            const y = posA.y + (posB.y - posA.y) * percent;
            const segBody = world.createDynamicBody({ position: planck.Vec2(x, y) });
            segBody.createFixture(planck.Circle(2.5 / SCALE), {
                density: 0.2,
                friction: 0.6,
                filterCategoryBits: CAT_ROPE,
                filterMaskBits: CAT_ROPE_MASK
            });
            segBody.setLinearDamping(0.25);
            segBody.ropeId = currentRopeId;
            segBody.baseColor = "#a4b0be";
            segBody.renderColor = shiftHueColor("#a4b0be");

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
            joint.baseColor = "#ff4757";
            joint.renderColor = shiftHueColor("#ff4757");
            joint.renderWidth = 2;

            prevBody = segBody;
            prevAnchor = planck.Vec2(0, 0);
        }
        const finalJoint = world.createJoint(
            planck.DistanceJoint({
                bodyA: prevBody,
                bodyB: bodyB,
                localAnchorA: prevAnchor,
                localAnchorB: localB,
                length: segmentLength,
                frequencyHz: 18.0,
                dampingRatio: 0.9
            })
        );
        finalJoint.ropeId = currentRopeId;
        finalJoint.isRopeDistanceJoint = true;
        finalJoint.isCustomRender = true;
        finalJoint.baseColor = "#ff4757";
        finalJoint.renderColor = shiftHueColor("#ff4757");
        finalJoint.renderWidth = 2;

        if (bodyA.isAnchor) bodyA.ropeId = currentRopeId;
        if (bodyB.isAnchor) bodyB.ropeId = currentRopeId;
    }
}

function handleLinkPointerUp(event) {
    const start = linkDragStart;
    linkDragStart = null;
    if (currentMode !== "bar" && currentMode !== "rope" && currentMode !== "chain") return;

    const mousePos = planck.Vec2(screenToWorldX(event.clientX), screenToWorldY(event.clientY));
    const movedPx = Math.hypot(event.clientX - start.startClientX, event.clientY - start.startClientY);

    if (movedPx < LINK_DRAG_MIN_PX) {
        // Click semplice: logica a due clic (primo punto memorizzato, secondo crea il link).
        if (!start.startBody) return;
        if (!linkStartBody) {
            linkStartBody = start.startBody;
            linkStartPoint = start.startLocal;
            return;
        }
        if (
            linkStartBody === start.startBody &&
            planck.Vec2.distance(linkStartBody.getWorldPoint(linkStartPoint), start.startBody.getWorldPoint(start.startLocal)) < 10 / SCALE
        ) {
            linkStartBody = null;
            linkStartPoint = null;
            return;
        }
        createLinkBetween(currentMode, linkStartBody, linkStartPoint, start.startBody, start.startLocal);
        linkStartBody = null;
        linkStartPoint = null;
        return;
    }

    // Drag: crea il link tra i due punti; sugli estremi senza corpo vengono messi
    // degli ancoraggi statici invisibili così si può anche "disegnare" nel vuoto.
    const endBody = bodyAtPoint(mousePos);
    const startRes = resolveLinkEndpoint(start.startWorld, start.startBody);
    const endRes = resolveLinkEndpoint(mousePos, endBody);
    if (startRes.body === endRes.body) return;
    createLinkBetween(currentMode, startRes.body, startRes.local, endRes.body, endRes.local);
    linkStartBody = null;
    linkStartPoint = null;
}

function cleanupAnchorIfEmpty(b) {
    if (!b || !b.isAnchor) return;
    for (let j = world.getJointList(); j; j = j.getNext()) {
        if (j.getBodyA() === b || j.getBodyB() === b) return;
    }
    world.destroyBody(b);
}

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
    const halfW = body.isEmitter ? body.emitterHalfW : body.wallHalfW;
    const halfH = body.isEmitter ? body.emitterHalfH : body.wallHalfH;

    if (body.isEmitter) {
        // L'emettitore si può solo ruotare (e trascinare), non ridimensionare.
        const localRotate = planck.Vec2(0, -(halfH + WALL_HANDLE_OFFSET + 24 / SCALE));
        const worldPt = body.getWorldPoint(localRotate);
        return { rotate: { x: worldPt.x * SCALE, y: worldPt.y * SCALE } };
    }

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
        friction: 0.6
    });
    body.wallHalfW = halfW;
    body.wallHalfH = halfH;
}

window.addEventListener("contextmenu", (event) => {
    if (event.target === canvas || event.target === document.body || event.target === canvas.parentElement) event.preventDefault();
    deselectAllActive();
});

canvas.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" && touchPointers.has(event.pointerId)) {
        touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (pinchState && touchPointers.size === 2) {
        updatePinch();
        return;
    }
    if (camPanActive) {
        camOffsetX += event.clientX - camPanStartX;
        camOffsetY += event.clientY - camPanStartY;
        camPanStartX = event.clientX;
        camPanStartY = event.clientY;
        return;
    }
    const mousePos = planck.Vec2(screenToWorldX(event.clientX), screenToWorldY(event.clientY));
    _lastPointerWorld = planck.Vec2(mousePos.x, mousePos.y);

    if (boundaryDrag) {
        updateBoundaryDrag(mousePos);
        return;
    }

    if (mouseJoint) mouseJoint.setTarget(mousePos);

    if (selectionDrag) {
        updateSelectionDrag(mousePos);
        return;
    }

    if (marqueeState) {
        updateMarquee(mousePos);
        return;
    }

    if (isDraggingWall && editingWallBody) {
        editingWallBody.setPosition(planck.Vec2(mousePos.x + wallDragOffset.x, mousePos.y + wallDragOffset.y));
        editingWallBody.setLinearVelocity(planck.Vec2(0, 0));
        editingWallBody.setAngularVelocity(0);
        return;
    }

    if (resizingWallHandle && editingWallBody) {
        if (resizingWallHandle.side === "rotate") {
            rotateWall(editingWallBody, mousePos);
        } else {
            resizeWall(editingWallBody, resizingWallHandle.side, mousePos);
        }
    }
});

window.addEventListener("pointerup", (event) => {
    if (event.pointerType === "touch") touchPointers.delete(event.pointerId);
    if (touchPointers.size < 2) pinchState = null;
    camPanActive = false;
    boundaryDrag = null;
    if (mouseJoint) {
        world.destroyJoint(mouseJoint);
        mouseJoint = null;
    }
    resizingWallHandle = null;
    isDraggingWall = false;
    endSelectionDrag();
    finalizeMarquee();
    if (linkDragStart) handleLinkPointerUp(event);
});

window.addEventListener("pointercancel", (event) => {
    if (event && event.pointerType === "touch") touchPointers.delete(event.pointerId);
    if (touchPointers.size < 2) pinchState = null;
    camPanActive = false;
    boundaryDrag = null;
    linkDragStart = null;
});

canvas.addEventListener(
    "wheel",
    (event) => {
        if (editingWallBody) {
            event.preventDefault();
            const rotationStep = 0.05;
            const delta = event.deltaY > 0 ? rotationStep : -rotationStep;
            editingWallBody.setAngle(editingWallBody.getAngle() + delta);
            return;
        }
        event.preventDefault();
        const factor = event.deltaY > 0 ? 1 / 1.1 : 1.1;
        const newZoom = Math.max(CAM_MIN_ZOOM, Math.min(CAM_MAX_ZOOM, camZoom * factor));
        if (newZoom === camZoom) return;
        const wx = screenToWorldX(event.clientX);
        const wy = screenToWorldY(event.clientY);
        camZoom = newZoom;
        camOffsetX = event.clientX - wx * SCALE * camZoom;
        camOffsetY = event.clientY - wy * SCALE * camZoom;
    },
    { passive: false }
);


let timeStep = 1 / 60;
let velIterations = 20;
let posIterations = 60;
const PHYSICS_SUBSTEPS = 4;
