// background.js — Sfondo animato: alberi frattali e foglie cadenti

let backgroundTrees = [];
let maxDepth = 6;
let baseSpread = 0.45;

function seededRandom(s) {
    let seed = s;
    return function () {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };
}

function createFractalTree(worldX, groundY, scale, seedVal) {
    const trunkLen = 110 * scale;
    const tree = {
        worldX,
        groundY,
        scale,
        trunkLen,
        branchCount: 0,
        bX1: null,
        bY1: null,
        bLength: null,
        bAngle: null,
        bDepthArr: null,
        bDepthRatio: null,
        bParent: null,
        bRandFactor: null,
        bThickness: null,
        bIsTerminal: null,
        pX1: null,
        pY1: null,
        pX2: null,
        pY2: null,
        pGrow: null,
        pValid: null
    };
    let rand = seededRandom(seedVal);
    const tmp = [];

    function recurse(x, y, angle, length, depth, parentIndex) {
        if (depth > maxDepth || length < 6 * scale) return;
        const endX = x + Math.sin(angle) * length;
        const endY = y - Math.cos(angle) * length;
        const idx = tmp.length / 9;
        const dr = depth / maxDepth;
        const randAngle = (rand() - 0.5) * 0.3;
        const randLen = 0.58 + rand() * 0.12;
        const rf = rand();

        tmp.push(
            x,
            y,
            length,
            angle,
            depth,
            dr,
            parentIndex,
            rf,
            Math.max(0.5, (maxDepth - depth) * 1.1 * scale + 0.4)
        );

        const spread = baseSpread * (0.8 + rand() * 0.4);
        const nextLen = length * randLen;
        recurse(endX, endY, angle - spread + randAngle, nextLen, depth + 1, idx);
        recurse(endX, endY, angle + spread + randAngle, nextLen, depth + 1, idx);
    }

    recurse(worldX, groundY, 0, trunkLen, 0, -1);

    const n = tmp.length / 9;
    tree.branchCount = n;
    tree.bX1 = new Float64Array(n);
    tree.bY1 = new Float64Array(n);
    tree.bLength = new Float64Array(n);
    tree.bAngle = new Float64Array(n);
    tree.bDepthArr = new Uint16Array(n);
    tree.bDepthRatio = new Float32Array(n);
    tree.bParent = new Int32Array(n);
    tree.bRandFactor = new Float32Array(n);
    tree.bThickness = new Float32Array(n);
    tree.bIsTerminal = new Uint8Array(n);
    tree.pX1 = new Float64Array(n);
    tree.pY1 = new Float64Array(n);
    tree.pX2 = new Float64Array(n);
    tree.pY2 = new Float64Array(n);
    tree.pValid = new Uint8Array(n);

    for (let i = 0; i < n; i++) {
        const o = i * 9;
        tree.bX1[i] = tmp[o];
        tree.bY1[i] = tmp[o + 1];
        tree.bLength[i] = tmp[o + 2];
        tree.bAngle[i] = tmp[o + 3];
        tree.bDepthArr[i] = tmp[o + 4];
        tree.bDepthRatio[i] = tmp[o + 5];
        tree.bParent[i] = tmp[o + 6];
        tree.bRandFactor[i] = tmp[o + 7];
        tree.bThickness[i] = tmp[o + 8];
    }

    const hasChild = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
        const pi = tree.bParent[i];
        if (pi >= 0) hasChild[pi] = 1;
    }
    for (let i = 0; i < n; i++) {
        if (!hasChild[i]) tree.bIsTerminal[i] = 1;
    }
    return tree;
}

function initCustomBackgroundTrees(count) {
    backgroundTrees = [];
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < count; i++) {
        const posX = w * ((i + 0.5) / count) + (Math.random() - 0.5) * 40;
        const scaleVal = 0.5 + Math.random() * 0.7;
        const seedVal = 100 + i * 37;
        const groundY = h * (0.68 + Math.random() * 0.08);
        backgroundTrees.push(createFractalTree(posX, groundY, scaleVal, seedVal));
    }
}

function initBackgroundTrees() {
    initCustomBackgroundTrees(30);
}
initBackgroundTrees();

let fallingLeaves = [];
for (let i = 0; i < 90; i++) {
    fallingLeaves.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 7 + 3,
        speedY: Math.random() * 0.9 + 0.4,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.03
    });
}

function drawJapaneseBackground() {
    const isLight = document.body.classList.contains("light-theme");
    bgCtx.clearRect(0, 0, logicalWidth, logicalHeight);

    const w = logicalWidth;
    const h = logicalHeight;

    let skyGrad = bgCtx.createLinearGradient(0, 0, 0, h);
    if (isLight) {
        skyGrad.addColorStop(0, "#ffd1dc");
        skyGrad.addColorStop(0.5, "#e0f2fe");
        skyGrad.addColorStop(1, "#f1f5f9");
    } else {
        skyGrad.addColorStop(0, "#1e1b4b");
        skyGrad.addColorStop(0.5, "#311030");
        skyGrad.addColorStop(1, "#0f172a");
    }
    bgCtx.fillStyle = skyGrad;
    bgCtx.fillRect(0, 0, w, h);

    bgCtx.fillStyle = isLight ? "rgba(251, 191, 36, 0.3)" : "rgba(244, 114, 182, 0.15)";
    bgCtx.beginPath();
    bgCtx.arc(w * 0.8, h * 0.25, 70, 0, Math.PI * 2);
    bgCtx.fill();

    bgCtx.fillStyle = isLight ? "rgba(148, 163, 184, 0.4)" : "rgba(30, 41, 59, 0.6)";
    bgCtx.beginPath();
    bgCtx.moveTo(0, h * 0.65);
    bgCtx.lineTo(w * 0.2, h * 0.45);
    bgCtx.lineTo(w * 0.5, h * 0.6);
    bgCtx.lineTo(w * 0.75, h * 0.4);
    bgCtx.lineTo(w, h * 0.55);
    bgCtx.lineTo(w, h);
    bgCtx.lineTo(0, h);
    bgCtx.closePath();
    bgCtx.fill();

    bgCtx.fillStyle = isLight ? "rgba(100, 116, 139, 0.6)" : "rgba(15, 23, 42, 0.85)";
    bgCtx.beginPath();
    bgCtx.moveTo(0, h * 0.75);
    bgCtx.lineTo(w * 0.35, h * 0.55);
    bgCtx.lineTo(w * 0.6, h * 0.68);
    bgCtx.lineTo(w * 0.85, h * 0.52);
    bgCtx.lineTo(w, h * 0.62);
    bgCtx.lineTo(w, h);
    bgCtx.lineTo(0, h);
    bgCtx.closePath();
    bgCtx.fill();

    function drawPagoda(pX, pY) {
        bgCtx.fillStyle = isLight ? "#475569" : "#090d16";
        bgCtx.fillRect(pX - 16, pY - 25, 32, 25);
        bgCtx.beginPath();
        bgCtx.moveTo(pX - 35, pY);
        bgCtx.lineTo(pX + 35, pY);
        bgCtx.lineTo(pX + 25, pY - 12);
        bgCtx.lineTo(pX - 25, pY - 12);
        bgCtx.closePath();
        bgCtx.fill();
        bgCtx.fillRect(pX - 12, pY - 37, 24, 12);
        bgCtx.beginPath();
        bgCtx.moveTo(pX - 25, pY - 25);
        bgCtx.lineTo(pX + 25, pY - 25);
        bgCtx.lineTo(pX + 18, pY - 35);
        bgCtx.lineTo(pX - 18, pY - 35);
        bgCtx.closePath();
        bgCtx.fill();
        bgCtx.beginPath();
        bgCtx.moveTo(pX - 16, pY - 45);
        bgCtx.lineTo(pX + 16, pY - 45);
        bgCtx.lineTo(pX + 10, pY - 52);
        bgCtx.lineTo(pX - 10, pY - 52);
        bgCtx.closePath();
        bgCtx.fill();
        bgCtx.fillRect(pX - 1.5, pY - 64, 3, 12);
    }
    drawPagoda(w * 0.72, h * 0.57);
    drawPagoda(w * 0.38, h * 0.61);

    const time = Date.now() * 0.003;
    updateWindGust(Date.now());
    const effectiveWind = windSpeed + windGustValue * windTurbulence;

    backgroundTrees.forEach((t) => {
        const n = t.branchCount;
        const gw = effectiveWind * 0.1;

        for (let i = 0; i < n; i++) {
            const pi = t.bParent[i];
            let x1, y1;
            if (pi === -1) {
                x1 = t.bX1[i];
                y1 = t.bY1[i];
            } else {
                if (!t.pValid[pi]) {
                    t.pValid[i] = 0;
                    continue;
                }
                x1 = t.pX2[pi];
                y1 = t.pY2[pi];
            }

            const dr = t.bDepthRatio ? t.bDepthRatio[i] : t.bDepthArr[i] / maxDepth;
            const rf = t.bRandFactor[i];
            const d = t.bDepthArr[i];
            const wind = gw * (0.2 + dr * 0.8) + Math.sin(time + rf * 20 + d) * 0.08 * dr;
            const a = t.bAngle[i] + wind;
            const len = t.bLength[i];

            t.pX1[i] = x1;
            t.pY1[i] = y1;
            t.pX2[i] = x1 + Math.sin(a) * len;
            t.pY2[i] = y1 - Math.cos(a) * len;
            t.pValid[i] = 1;
        }

        bgCtx.lineCap = "round";
        let prevW = -1,
            pathStarted = false;
        for (let i = 0; i < n; i++) {
            if (!t.pValid[i]) continue;
            const wthick = (t.bThickness[i] + 0.5) | 0;
            if (wthick !== prevW) {
                if (pathStarted) bgCtx.stroke();
                bgCtx.beginPath();
                bgCtx.lineWidth = wthick;
                bgCtx.strokeStyle = isLight
                    ? t.scale < 0.8
                        ? "#94a3b8"
                        : "#334155"
                    : t.scale < 0.8
                      ? "#1e293b"
                      : "#0f172a";
                prevW = wthick;
                pathStarted = true;
            }
            bgCtx.moveTo(t.pX1[i], t.pY1[i]);
            bgCtx.lineTo(t.pX2[i], t.pY2[i]);
        }
        if (pathStarted) bgCtx.stroke();

        bgCtx.fillStyle = isLight ? "rgba(244, 114, 182, 0.85)" : "rgba(244, 114, 182, 0.7)";
        bgCtx.beginPath();
        const dotR = Math.max(2.5, 5 * t.scale);
        for (let i = 0; i < n; i++) {
            if (!t.bIsTerminal[i] || !t.pValid[i]) continue;
            bgCtx.moveTo(t.pX2[i] + dotR, t.pY2[i]);
            bgCtx.arc(t.pX2[i], t.pY2[i], dotR, 0, Math.PI * 2);
            bgCtx.moveTo(t.pX2[i] + dotR * 0.6, t.pY2[i] - dotR * 0.5);
            bgCtx.arc(t.pX2[i] + dotR * 0.4, t.pY2[i] - dotR * 0.4, dotR * 0.7, 0, Math.PI * 2);
        }
        bgCtx.fill();
    });

    bgCtx.fillStyle = isLight ? "#ec4899" : "#f472b6";
    fallingLeaves.forEach((leaf) => {
        leaf.x += effectiveWind * 1.5 + Math.sin(leaf.angle) * 0.8;
        leaf.y += leaf.speedY + Math.abs(effectiveWind) * 0.1;
        leaf.angle += leaf.spin;

        if (leaf.x > w + 20) leaf.x = -20;
        if (leaf.x < -20) leaf.x = w + 20;
        if (leaf.y > h + 20) {
            leaf.y = -20;
            leaf.x = Math.random() * w;
        }

        bgCtx.save();
        bgCtx.translate(leaf.x, leaf.y);
        bgCtx.rotate(leaf.angle);
        bgCtx.beginPath();
        bgCtx.ellipse(0, 0, leaf.size, leaf.size * 0.5, 0, 0, Math.PI * 2);
        bgCtx.fill();
        bgCtx.restore();
    });
}

