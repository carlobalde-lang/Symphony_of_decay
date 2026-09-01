// main.js — Game loop principale e inizializzazione app (va caricato per ultimo)

let _rafId = null;
let trailEnabled = false;

function setTrailEnabled(enabled) {
    trailEnabled = enabled;
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
