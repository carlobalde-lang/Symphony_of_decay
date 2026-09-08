// main.js — Game loop principale e inizializzazione app (va caricato per ultimo)

let _rafId = null;
let trailEnabled = false;

let _cssVarCache = null;
let _cssVarCacheKey = null;

function getCssVar(name, fallback) {
    const key = document.body.className || "default";
    if (!_cssVarCache || _cssVarCacheKey !== key) {
        _cssVarCache = getComputedStyle(document.body);
        _cssVarCacheKey = key;
    }
    return _cssVarCache.getPropertyValue(name).trim() || fallback;
}

function setTrailEnabled(enabled) {
    trailEnabled = enabled;
}

// --- Snap-to-grid + griglia traslucida ---
let snapGridEnabled = false;
const GRID_CELL = 0.5; // metri

function setSnapGridEnabled(enabled) {
    snapGridEnabled = enabled;
    const btn = document.getElementById("btn-snap-grid");
    if (btn) btn.classList.toggle("active", enabled);
}

function toggleSnapGrid() {
    setSnapGridEnabled(!snapGridEnabled);
}

function applySnapToGrid(x, y) {
    if (!snapGridEnabled || GRID_CELL <= 0) return { x, y };
    return {
        x: Math.round(x / GRID_CELL) * GRID_CELL,
        y: Math.round(y / GRID_CELL) * GRID_CELL
    };
}

function drawGrid() {
    if (!snapGridEnabled) return;
    const leftWorld = screenToWorldX(0);
    const topWorld = screenToWorldY(0);
    const rightWorld = screenToWorldX(logicalWidth);
    const bottomWorld = screenToWorldY(logicalHeight);

    ctx.save();
    ctx.strokeStyle = getCssVar("--accent", "#ff0055") + "22";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.floor(leftWorld / GRID_CELL) * GRID_CELL; x <= rightWorld; x += GRID_CELL) {
        ctx.moveTo(x * SCALE, topWorld * SCALE);
        ctx.lineTo(x * SCALE, bottomWorld * SCALE);
    }
    for (let y = Math.floor(topWorld / GRID_CELL) * GRID_CELL; y <= bottomWorld; y += GRID_CELL) {
        ctx.moveTo(leftWorld * SCALE, y * SCALE);
        ctx.lineTo(rightWorld * SCALE, y * SCALE);
    }
    ctx.stroke();
    ctx.restore();
}

// --- Bloom / glow simulato su corpi luminosi ---
let bloomEnabled = false;

function setBloomEnabled(enabled) {
    bloomEnabled = enabled;
}

// --- Screenshot PNG che combina sfondo + scena ---
function screenshotCanvas() {
    try {
        const g = document.getElementById("game-canvas");
        const bg = document.getElementById("bg-canvas");
        const out = document.createElement("canvas");
        out.width = g.width;
        out.height = g.height;
        const octx = out.getContext("2d");
        if (bg) octx.drawImage(bg, 0, 0);
        octx.drawImage(g, 0, 0);
        const a = document.createElement("a");
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        a.download = "symphony-screenshot-" + ts + ".png";
        a.href = out.toDataURL("image/png");
        document.body.appendChild(a);
        a.click();
        a.remove();
        flashMessage("📸 Screenshot saved (PNG)", "#2ed573");
    } catch (e) {
        flashMessage("⚠️ Screenshot failed", "#ff4757");
    }
}

function drawSelectionOverlay() {
    const isLight = document.body.classList.contains("light-theme");
    const highlight = getCssVar("--accent", isLight ? "#0066ff" : "#4dc3ff");
    for (const b of selectedBodies) {
        const bounds = getBodyWorldBounds(b);
        if (!bounds) continue;
        const x = bounds.minX * SCALE;
        const y = bounds.minY * SCALE;
        const w = (bounds.maxX - bounds.minX) * SCALE;
        const h = (bounds.maxY - bounds.minY) * SCALE;
        ctx.save();
        ctx.strokeStyle = highlight;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
        ctx.restore();
    }
    if (marqueeState) {
        const x = Math.min(marqueeState.startX, marqueeState.endX) * SCALE;
        const y = Math.min(marqueeState.startY, marqueeState.endY) * SCALE;
        const w = Math.abs(marqueeState.endX - marqueeState.startX) * SCALE;
        const h = Math.abs(marqueeState.endY - marqueeState.startY) * SCALE;
        ctx.save();
        ctx.fillStyle = highlight + "22";
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = highlight;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
    }
}

function gameLoop() {
    updatePerformanceAdaptiveLimit(performance.now());

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
        updateEmitters();
        updateLifespans();
    }

    drawJapaneseBackground();
    const isLight = document.body.classList.contains("light-theme");
    const wallColor = getCssVar("--wall-color", isLight ? "#d1d5db" : "#1a1a2e");

    if (trailEnabled) {
        ctx.fillStyle = isLight ? "rgba(255, 255, 255, 0.16)" : "rgba(8, 8, 16, 0.18)";
        ctx.fillRect(0, 0, logicalWidth, logicalHeight);
    } else {
        ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    }

    // Camera: tutto il disegno mondo è in coords "mondo * SCALE"; la trasform
    // applica zoom+pan senza toccare il codice di rendering sottostante.
    const _emitterBadges = [];
    ctx.save();
    ctx.translate(camOffsetX, camOffsetY);
    ctx.scale(camZoom, camZoom);

    const accentColor = getCssVar("--accent", "#ff0055");
    const halfAccent = getCssVar("--accent-glow", "rgba(255, 0, 85, 0.2)");

    for (let b = world.getBodyList(); b; b = b.getNext()) {
        const pos = b.getPosition();
        const angle = b.getAngle();

        ctx.save();
        ctx.translate(pos.x * SCALE, pos.y * SCALE);
        ctx.rotate(angle);

        for (let f = b.getFixtureList(); f; f = f.getNext()) {
            const shape = f.getType();
            const bodyColor = b.isWall ? wallColor : b.renderColor || "#fff";
            ctx.fillStyle = bodyColor;
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1.5;
            if (bloomEnabled) {
                ctx.shadowColor = bodyColor;
                ctx.shadowBlur = 14;
            }

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

        if (b.isEmitter) {
            const tip = b.getWorldPoint(planck.Vec2(0, -(b.emitterHalfH + 16 / SCALE)));
            const baseL = b.getWorldPoint(planck.Vec2(-8 / SCALE, -(b.emitterHalfH - 2 / SCALE)));
            const baseR = b.getWorldPoint(planck.Vec2(8 / SCALE, -(b.emitterHalfH - 2 / SCALE)));
            ctx.save();
            ctx.globalAlpha = b.emitterPaused ? 0.3 : 1.0;
            ctx.fillStyle = accentColor;
            ctx.beginPath();
            ctx.moveTo(tip.x * SCALE, tip.y * SCALE);
            ctx.lineTo(baseL.x * SCALE, baseL.y * SCALE);
            ctx.lineTo(baseR.x * SCALE, baseR.y * SCALE);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Pulsante pausa/play cliccabile, sempre visibile sull'angolo dell'emettitore
            const badgeLocal = planck.Vec2(-b.emitterHalfW + EMITTER_BADGE_LOCAL_OFFSET, -b.emitterHalfH + EMITTER_BADGE_LOCAL_OFFSET);
            const badgeWorld = b.getWorldPoint(badgeLocal);
            _emitterBadges.push({ x: worldToScreenX(badgeWorld.x), y: worldToScreenY(badgeWorld.y), paused: b.emitterPaused });
        }
    }

    updateAndDrawImpactParticles();

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

    drawSelectionOverlay();
    drawGrid();

    if (linkStartBody && (currentMode === "rope" || currentMode === "chain" || currentMode === "bar")) {
        const startWorldPoint = linkStartBody.getWorldPoint(linkStartPoint);
        ctx.save();
        ctx.beginPath();
        ctx.arc(startWorldPoint.x * SCALE, startWorldPoint.y * SCALE, 8, 0, Math.PI * 2);
        ctx.fillStyle = halfAccent;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = accentColor;
        ctx.stroke();
        ctx.restore();
    }

    if (linkDragStart && (currentMode === "rope" || currentMode === "chain" || currentMode === "bar")) {
        ctx.save();
        ctx.strokeStyle = accentColor;
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(linkDragStart.startWorld.x * SCALE, linkDragStart.startWorld.y * SCALE);
        ctx.lineTo(_lastPointerWorld.x * SCALE, _lastPointerWorld.y * SCALE);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = halfAccent;
        ctx.beginPath();
        ctx.arc(linkDragStart.startWorld.x * SCALE, linkDragStart.startWorld.y * SCALE, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    if (editingWallBody) {
        const bodyAngle = editingWallBody.getAngle();
        const handles = getWallHandles(editingWallBody);

        if (!editingWallBody.isEmitter) {
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
                ctx.fillStyle = accentColor;
                ctx.beginPath();
                ctx.moveTo(8, 0);
                ctx.lineTo(-6, -7);
                ctx.lineTo(-6, 7);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            });
            ctx.restore();
        }

        const topHandlePoint = editingWallBody.isEmitter
            ? editingWallBody.getWorldPoint(planck.Vec2(0, -editingWallBody.emitterHalfH))
            : null;
        const topPoint = editingWallBody.isEmitter
            ? { x: topHandlePoint.x * SCALE, y: topHandlePoint.y * SCALE }
            : handles.top;

        ctx.save();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(topPoint.x, topPoint.y);
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

    ctx.restore();

    // Badge pausa/play degli emettitori: disegnati in coordinate schermo (fuori
    // dalla transform della camera) così mantengono dimensione costante col zoom.
    for (const badge of _emitterBadges) {
        const bx = badge.x;
        const by = badge.y;
        ctx.save();
        ctx.beginPath();
        ctx.arc(bx, by, EMITTER_BADGE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = badge.paused ? "#2ed573" : "#1a1a2e";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        if (badge.paused) {
            ctx.beginPath();
            ctx.moveTo(bx - 3, by - 4);
            ctx.lineTo(bx - 3, by + 4);
            ctx.lineTo(bx + 4, by);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillRect(bx - 3.5, by - 4, 2.4, 8);
            ctx.fillRect(bx + 1.1, by - 4, 2.4, 8);
        }
        ctx.restore();
    }
    _emitterBadges.length = 0;

    updateBodyCountDisplay();
    updateEmitterPanelPosition();
    _rafId = requestAnimationFrame(gameLoop);
}

resizeCanvas();
migrateOldSingleSave();
refreshSceneList();
populateScaleSelect();
populateTimbreSelect();
applyTheme(localStorage.getItem("symphony-theme") || "dark");
updateUILanguage();
autosaveStartInterval();
restoreLastSessionIfAny();

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

updateEffects();
updateUndoRedoButtons();

// Scorciatoie da tastiera
window.addEventListener("keydown", (e) => {
    const target = e.target;
    const tag = target && target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    const ctrl = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (ctrl && key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoAction();
        return;
    }
    if (ctrl && (key === "y" || (key === "z" && e.shiftKey))) {
        e.preventDefault();
        redoAction();
        return;
    }

    if (currentMode === "select") {
        if (ctrl && key === "c") {
            e.preventDefault();
            copySelection();
            return;
        }
        if (ctrl && key === "v") {
            e.preventDefault();
            pasteSelection();
            return;
        }
        if (ctrl && key === "m") {
            e.preventDefault();
            mirrorSelection(e.shiftKey ? "y" : "x");
            return;
        }
        if ((e.key === "Delete" || e.key === "Backspace") && !ctrl) {
            e.preventDefault();
            deleteSelectedBodies();
            return;
        }
        if (e.key === "Escape") {
            e.preventDefault();
            clearSelection();
            return;
        }
        if (key === "r") {
            e.preventDefault();
            rotateSelectedBodies(e.shiftKey ? -15 : 15);
            return;
        }
    }
});

// Cleanup on close
window.addEventListener("beforeunload", () => {
    autosaveNow();
    if (_rafId !== null) cancelAnimationFrame(_rafId);
    if (audioCtx.state !== "closed") audioCtx.close();
});

// Avvia loop
_rafId = requestAnimationFrame(gameLoop);
