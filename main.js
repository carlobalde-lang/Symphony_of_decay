// main.js — Game loop principale e inizializzazione app (va caricato per ultimo)

let _rafId = null;
let trailEnabled = false;

function setTrailEnabled(enabled) {
    trailEnabled = enabled;
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
    const wallColor = isLight ? "#d1d5db" : "#1a1a2e";

    if (trailEnabled) {
        ctx.fillStyle = isLight ? "rgba(255, 255, 255, 0.16)" : "rgba(8, 8, 16, 0.18)";
        ctx.fillRect(0, 0, logicalWidth, logicalHeight);
    } else {
        ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    }

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

        if (b.isEmitter) {
            const tip = b.getWorldPoint(planck.Vec2(0, -(b.emitterHalfH + 16 / SCALE)));
            const baseL = b.getWorldPoint(planck.Vec2(-8 / SCALE, -(b.emitterHalfH - 2 / SCALE)));
            const baseR = b.getWorldPoint(planck.Vec2(8 / SCALE, -(b.emitterHalfH - 2 / SCALE)));
            ctx.save();
            ctx.globalAlpha = b.emitterPaused ? 0.3 : 1.0;
            ctx.fillStyle = "#ff0055";
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
            const bx = badgeWorld.x * SCALE;
            const by = badgeWorld.y * SCALE;
            ctx.save();
            ctx.beginPath();
            ctx.arc(bx, by, EMITTER_BADGE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = b.emitterPaused ? "#2ed573" : "#1a1a2e";
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.fillStyle = "#ffffff";
            if (b.emitterPaused) {
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

    updateBodyCountDisplay();
    updateEmitterPanelPosition();
    _rafId = requestAnimationFrame(gameLoop);
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

updateEffects();
updateUndoRedoButtons();

// Scorciatoie da tastiera per Undo / Redo
window.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoAction();
    } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        redoAction();
    }
});

// Cleanup on close
window.addEventListener("beforeunload", () => {
    if (_rafId !== null) cancelAnimationFrame(_rafId);
    if (audioCtx.state !== "closed") audioCtx.close();
});

// Avvia loop
_rafId = requestAnimationFrame(gameLoop);
