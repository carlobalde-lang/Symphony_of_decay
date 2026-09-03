// physics-world.js — Setup mondo Planck.js, canvas, muri, resize, vento, interazioni pointer/mouse

const SCALE = 40.0;

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

let _cachedDrag = 0.02; // default

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

    // Click sul pulsante pausa/play disegnato sull'angolo dell'emettitore: toggla e basta,
    // non seleziona/apre il pannello.
    for (let eb = world.getBodyList(); eb; eb = eb.getNext()) {
        if (!eb.isEmitter) continue;
        const badgeWorld = eb.getWorldPoint(
            planck.Vec2(-eb.emitterHalfW + EMITTER_BADGE_LOCAL_OFFSET, -eb.emitterHalfH + EMITTER_BADGE_LOCAL_OFFSET)
        );
        const bx = badgeWorld.x * SCALE;
        const by = badgeWorld.y * SCALE;
        if (Math.hypot(clientX - bx, clientY - by) < EMITTER_BADGE_RADIUS + 4) {
            eb.emitterPaused = !eb.emitterPaused;
            if (currentEmitterPanelBody === eb) updateEmitterPauseButtonLabel();
            return;
        }
    }

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
        const newBody = spawnElement(mousePos.x, mousePos.y, currentChoice);
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
                const pA = planck.Vec2(aA.x * SCALE, aA.y * SCALE);
                const pB = planck.Vec2(aB.x * SCALE, aB.y * SCALE);
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
                    isDraggingWall = false;
                    updateInstructionText();
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

                saveUndoState();
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
                            filterCategoryBits: CAT_ROPE,
                            filterMaskBits: CAT_ROPE_MASK
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
                            filterCategoryBits: CAT_ROPE,
                            filterMaskBits: CAT_ROPE_MASK
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
        friction: 0.2
    });
    body.wallHalfW = halfW;
    body.wallHalfH = halfH;
}

canvas.addEventListener("pointermove", (event) => {
    const mousePos = planck.Vec2(event.clientX / SCALE, event.clientY / SCALE);
    if (mouseJoint) mouseJoint.setTarget(mousePos);

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

window.addEventListener("pointerup", () => {
    if (mouseJoint) {
        world.destroyJoint(mouseJoint);
        mouseJoint = null;
    }
    resizingWallHandle = null;
    isDraggingWall = false;
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


let timeStep = 1 / 60;
let velIterations = 20;
let posIterations = 60;
const PHYSICS_SUBSTEPS = 4;
