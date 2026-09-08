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

// --- Help / Aiuto: popup con tutte le istruzioni ---
const HELP_SECTIONS = {
    en: [
        {
            title: "🚀 Getting Started",
            html: `<p>Welcome! This is a musical physics sandbox: every object plays a sound when it collides. Click or tap on empty space to spawn the selected object, then drag objects around with the mouse or your finger.</p><ul><li><b>⏸️ Pause / ▶️ Play</b> — freeze or resume the simulation.</li><li><b>↩️ Undo / ↪️ Redo</b> — revert or re-apply the last changes.</li><li><b>⚡ GLITCH</b> — trigger a decaying audio-visual glitch effect.</li></ul>`,
        },
        {
            title: "🎥 Camera & Input",
            html: `<h4>Mouse (desktop)</h4><ul><li><kbd>Wheel</kbd> — zoom in/out on the cursor.</li><li><kbd>Middle-drag</kbd> — pan the view.</li><li><kbd>Left-drag</kbd> — move the object or wall under the cursor.</li></ul><h4>Touch (mobile / tablet)</h4><ul><li><b>Two fingers + spread/pinch</b> — zoom, centered between the fingers.</li><li><b>Two fingers moving together</b> — pan the view.</li><li><b>One finger</b> — drag objects, spawn, select.</li><li><b>Double tap</b> — start editing a wall or emitter.</li><li><b>Editing a wall</b> — pinch rotates and resizes it at the same time.</li></ul>`,
        },
        {
            title: "🧩 Spawnable Objects",
            html: `<ul><li><b>Shapes</b> — geometric blocks with different bounciness: Orolite (hard, low bounce), Pentacore, Hexarun, Septifor, Octavox, Astral (light, super bouncy).</li><li><b>Musical Notes</b> — the spheres Do–Si: each one always sings its own fixed pitch.</li><li><b>Instruments</b> — Kick, Snare, Hi-Hat (closed / open), Clap, Conga, Bongo, Clave: synthesized drums on impact.</li><li><b>Wall</b> — static editable rectangle, handy as a platform.</li><li><b>Emitter</b> — periodically shoots objects in its direction (see "Emitters").</li></ul><p class="help-tip">On touch devices, spawned objects are half the size for easier handling.</p>`,
        },
        {
            title: "🧱 Walls",
            html: `<ul><li><b>Perimeter walls</b> — press and drag one of the grey borders to resize the playfield; the position is saved with the scene.</li><li><b>Editing a wall</b> — spawn a Wall, then double tap on it or click it. Drag the arrows to resize, the blue circle to rotate (or use the wheel), and drag the wall body to move it.</li><li><b>Emitters</b> — edited the same way but only rotation.</li></ul>`,
        },
        {
            title: "🔗 Rope / Chain / Bar",
            html: `<ul><li>Choose <b>Rope</b>, <b>Rigid Chain</b> or <b>Bar</b>, then click two points, or click-and-drag between two points.</li><li>If you start or end the drag over empty space, an <b>invisible anchor</b> is created automatically, so you can hang things in mid-air.</li><li><b>Rope</b> — 10 stretchy spring segments. <b>Rigid chain</b> — 10 rigid segments linked like a real chain. <b>Bar</b> — one single rigid rod.</li></ul>`,
        },
        {
            title: "🖱️ Select Tool",
            html: `<ul><li>Click an object to select it, or drag on empty space to box-select several.</li><li><kbd>Shift</kbd>+click adds / removes objects from the selection.</li><li>Drag one selected object to move the whole group.</li><li><kbd>R</kbd> / <kbd>Shift+R</kbd> — rotate +15° / −15°. <kbd>Delete</kbd> — delete. <kbd>Esc</kbd> — deselect.</li><li><kbd>Ctrl+C</kbd> copy · <kbd>Ctrl+V</kbd> paste · <kbd>Ctrl+M</kbd> mirror · <b>Grid</b> toggles the snap grid.</li></ul>`,
        },
        {
            title: "🧹 Eraser",
            html: `<p>Click an object, bar or rope to delete it. Ropes and chains are removed entirely (all their segments); clicking a single joint deletes just that connection.</p>`,
        },
        {
            title: "🎯 Emitters",
            html: `<ul><li>Each emitter shows a <b>pause badge ▶/⏸</b> on its corner: tap it to start or stop it.</li><li>Select the emitter to open its panel: <b>Fires</b> (which object), <b>Launch Power</b>, <b>Fire Rate (BPM)</b>, <b>Swing</b>, <b>Lifetime</b> (0 = infinite).</li><li><b>Sequencer / Drum Machine</b> — drop instruments on the 8/16/32 steps; presets included. Click a filled step to cycle velocity, drag to paint many.</li><li><b>Sync to Global Clock</b> — locks the emitter to the global tempo and grid; when resumed from pause it joins the others in sync.</li></ul>`,
        },
        {
            title: "🌍 Physics",
            html: `<ul><li><b>Gravity Y</b>, <b>Air Drag</b>, <b>Wind Speed</b> and <b>Turbulence</b> sliders; <b>Reset Physics</b> restores the defaults.</li><li>Collisions produce the music: heavier objects hit harder, softer objects bounce higher.</li></ul>`,
        },
        {
            title: "🔊 Audio",
            html: `<ul><li><b>Record Session</b> — records the output and saves a small compressed audio file (Opus).</li><li><b>Timbre / Sound Type</b> and <b>Musical Scale</b> selectors.</li><li><b>Reverb</b> and <b>Delay</b> amounts; <b>Rhythmic Quantization</b> with adjustable <b>BPM</b>.</li><li><b>Volume Mixer</b> — master and per-type volumes.</li></ul>`,
        },
        {
            title: "🎨 Graphics",
            html: `<ul><li><b>Theme</b> — 8 color themes. <b>Motion Trail</b> and <b>Bloom / Glow</b> toggles.</li><li><b>Save Screenshot (PNG)</b> — exports the current view.</li></ul>`,
        },
        {
            title: "💾 Scenes",
            html: `<ul><li><b>Save</b> stores the current scene under the chosen name, <b>Load</b> restores it and <b>Delete Selected</b> removes it. Autosave is always active.</li><li>A scene includes objects, joints, walls / perimeter position, emitter settings and physics settings.</li></ul>`,
        },
        {
            title: "⌨️ Keyboard Shortcuts",
            html: `<ul><li><kbd>Ctrl+Z</kbd> / <kbd>Ctrl+Y</kbd> — undo / redo (<kbd>Shift+Ctrl+Z</kbd> also works for redo).</li><li><kbd>R</kbd> / <kbd>Shift+R</kbd> — rotate the selection ±15°.</li><li><kbd>Delete</kbd> / <kbd>Backspace</kbd> — delete the selection.</li><li><kbd>Esc</kbd> — deselect or close a popup.</li><li><kbd>Ctrl+C</kbd> / <kbd>Ctrl+V</kbd> / <kbd>Ctrl+M</kbd> — copy / paste / mirror.</li><li><kbd>Space</kbd> — nothing yet 🙂 (shortcuts only apply when a field is not focused).</li></ul>`,
        },
    ],
    it: [
        {
            title: "🚀 Per Iniziare",
            html: `<p>Benvenuto! Questa è una sandbox musicale a fisica reale: ogni oggetto suona quando collide. Clicca o tocca uno spazio vuoto per creare l'oggetto selezionato, poi trascina gli oggetti con il mouse o con il dito.</p><ul><li><b>⏸️ Pausa / ▶️ Play</b> — congela o riprende la simulazione.</li><li><b>↩️ Annulla / ↪️ Ripristina</b> — ripristina o riapplica le ultime modifiche.</li><li><b>⚡ GLITCH</b> — attiva un effetto audiovisivo decadente.</li></ul>`,
        },
        {
            title: "🎥 Camera e Input",
            html: `<h4>Mouse (desktop)</h4><ul><li><kbd>Rotella</kbd> — ingrandisci/rimpicciolisci sul puntatore.</li><li><kbd>Trascina col tasto centrale</kbd> — sposta la visuale.</li><li><kbd>Trascina col tasto sinistro</kbd> — muovi l'oggetto o il muro sotto il cursore.</li></ul><h4>Tocco (mobile / tablet)</h4><ul><li><b>Due dita + apertura/chiusura</b> — zoom centrato tra le dita.</li><li><b>Due dita che si muovono insieme</b> — sposta la visuale.</li><li><b>Un dito</b> — trascina oggetti, crea, seleziona.</li><li><b>Doppio tocco</b> — avvia la modifica di un muro o di un emettitore.</li><li><b>Modifica di un muro</b> — il pizzico ruota e ridimensiona insieme.</li></ul>`,
        },
        {
            title: "🧩 Oggetti Creabili",
            html: `<ul><li><b>Forme</b> — blocchi geometrici con elasticità diversa: Orolite (duro, rimbalza poco), Pentacore, Hexarun, Septifor, Octavox, Astral (leggero, springata).</li><li><b>Note Musicali</b> — le sfere Do–Si: ognuna canta sempre la sua nota fissa.</li><li><b>Strumenti</b> — Kick, Rullante, Hi-Hat (chiusa/aperta), Clap, Conga, Bongo, Claves: tamburi sintetizzati all'impatto.</li><li><b>Muro</b> — rettangolo statico modificabile, utile come piattaforma.</li><li><b>Emettitore</b> — spara oggetti periodicamente nella sua direzione (vedi "Emettitori").</li></ul><p class="help-tip">Sui dispositivi touch gli oggetti creati sono grandi la metà per facilitarne l'uso.</p>`,
        },
        {
            title: "🧱 Muri",
            html: `<ul><li><b>Muri perimetrali</b> — premi e trascina uno dei bordi grigi per ridimensionare l'area di gioco; la posizione viene salvata con la scena.</li><li><b>Modifica di un muro</b> — crea un Muro, poi toccalelo due volte o cliccalo. Trascina le frecce per ridimensionare, il cerchio blu per ruotare (o usa la rotella), e il corpo del muro per spostarlo.</li><li><b>Emettitori</b> — si modificano allo stesso modo ma solo in rotazione.</li></ul>`,
        },
        {
            title: "🔗 Corde / Catene / Barre",
            html: `<ul><li>Scegli <b>Corda</b>, <b>Catena rigida</b> o <b>Barra</b>, poi clicca due punti, oppure clicca-trascina tra due punti.</li><li>Se inizi o finisci il trascinamento sopra uno spazio vuoto, viene creato automaticamente un <b> ancora invisibile</b>: puoi appenderle in aria.</li><li><b>Corda</b> — 10 segmenti elastici con molla. <b>Catena rigida</b> — 10 segmenti rigidi legati come una vera catena. <b>Barra</b> — una singola asta rigida.</li></ul>`,
        },
        {
            title: "🖱️ Strumento Seleziona",
            html: `<ul><li>Fai clic su un oggetto per selezionarlo, oppure trascina su uno spazio vuoto per selezionarne tanti.</li><li><kbd>Shift</kbd>+clic aggiunge o toglie oggetti dalla selezione.</li><li>Trascina un oggetto selezionato per spostare tutto il gruppo.</li><li><kbd>R</kbd> / <kbd>Shift+R</kbd> — ruota di +15° / −15°. <kbd>Canc</kbd> — elimina. <kbd>Esc</kbd> — deseleziona.</li><li><kbd>Ctrl+C</kbd> copia · <kbd>Ctrl+V</kbd> incolla · <kbd>Ctrl+M</kbd> specchia · <b>Griglia</b> attiva lo snap.</li></ul>`,
        },
        {
            title: "🧹 Gomma",
            html: `<p>Clicca un oggetto, una barra o una corda per eliminarlo. Corde e catene vengono rimosse per intero (tutti i segmenti); cliccando un singolo giunto elimini solo quel collegamento.</p>`,
        },
        {
            title: "🎯 Emettitori",
            html: `<ul><li>Ogni emettitore mostra un <b>badge di pausa ▶/⏸</b> nell'angolo: toccalo per avviarlo o fermarlo.</li><li>Seleziona l'emettitore per aprire il pannello: <b>Spara</b> (quale oggetto), <b>Potenza</b>, <b>Cadenza (BPM)</b>, <b>Swing</b>, <b>Durata</b> (0 = infinito).</li><li><b>Sequencer / Drum Machine</b> — piazza strumenti sugli step da 8/16/32; ci sono i preset. Clicca uno step pieno per ciclare la velocità, trascina per dipingerne tanti.</li><li><b>Sincronizza al Clock Globale</b> — blocca l'emettitore sul tempo globale e sulla griglia; alla ripresa dalla pausa entra in sincrono con gli altri.</li></ul>`,
        },
        {
            title: "🌍 Fisica",
            html: `<ul><li>Gli slider <b>Gravità Y</b>, <b>Attrito Aria</b>, <b>Velocità Vento</b> e <b>Turbolenza</b>; <b>Reset Fisica</b> ripristina i valori di default.</li><li>Sono le collisioni a fare la musica: gli oggetti pesanti colpiscono più forte, quelli leggeri rimbalzano di più.</li></ul>`,
        },
        {
            title: "🔊 Audio",
            html: `<ul><li><b>Registra Sessione</b> — registra l'uscita e salva un file audio compresso e leggero (Opus).</li><li>Selettori <b>Timbre / Tipo di Suono</b> e <b>Scala Musicale</b>.</li><li><b>Reverb</b> e <b>Delay</b>; <b>Quantizzazione Ritmica</b> con <b>BPM</b> regolabile.</li><li><b>Mixer Volume</b> — volume master e per tipo.</li></ul>`,
        },
        {
            title: "🎨 Grafica",
            html: `<ul><li><b>Tema</b> — 8 temi colore. Attiva <b>Scia</b> e <b>Bloom / Glow</b>.</li><li><b>Salva Schermata (PNG)</b> — esporta la vista corrente.</li></ul>`,
        },
        {
            title: "💾 Scene",
            html: `<ul><li><b>Salva</b> memorizza la scena corrente con il nome scelto, <b>Carica</b> la ripristina e <b>Elimina Selezionata</b> la rimuove. Il salvataggio automatico è sempre attivo.</li><li>Una scena include oggetti, giunti, muri / posizione del perimetro, impostazioni degli emettitori e della fisica.</li></ul>`,
        },
        {
            title: "⌨️ Scorciatoie da Tastiera",
            html: `<ul><li><kbd>Ctrl+Z</kbd> / <kbd>Ctrl+Y</kbd> — annulla / ripristina (anche <kbd>Shift+Ctrl+Z</kbd>).</li><li><kbd>R</kbd> / <kbd>Shift+R</kbd> — ruota la selezione di ±15°.</li><li><kbd>Canc</kbd> / <kbd>Backspace</kbd> — elimina la selezione.</li><li><kbd>Esc</kbd> — deseleziona o chiudi il popup.</li><li><kbd>Ctrl+C</kbd> / <kbd>Ctrl+V</kbd> / <kbd>Ctrl+M</kbd> — copia / incolla / specchia.</li><li><kbd>Spazio</kbd> — per ora nulla 🙂 (le scorciatoie valgono solo se un campo non è a fuoco).</li></ul>`,
        },
    ],
};

function buildHelpHTML() {
    const sections = HELP_SECTIONS[currentLanguage] || HELP_SECTIONS.en;
    return sections.map((s) => `<h3>${s.title}</h3>${s.html}`).join("");
}

function openHelp() {
    const modal = document.getElementById("help-modal");
    if (!modal) return;
    document.getElementById("help-content").innerHTML = buildHelpHTML();
    modal.style.display = "flex";
}

function closeHelp() {
    const modal = document.getElementById("help-modal");
    if (modal) modal.style.display = "none";
}

// Scorciatoie da tastiera
window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        const helpModal = document.getElementById("help-modal");
        if (helpModal && helpModal.style.display !== "none") {
            helpModal.style.display = "none";
            return;
        }
    }
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
