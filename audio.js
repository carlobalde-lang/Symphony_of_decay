// audio.js — Web Audio: timbri, scale musicali, mixer volumi, sintesi suono

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const _unlockAudio = () => {
    if (audioCtx.state === "suspended") audioCtx.resume();
};
document.addEventListener("pointerdown", _unlockAudio, { once: true });
document.addEventListener("keydown", _unlockAudio, { once: true });
const baseRoot = 110.0; // A2, radice comune di tutte le scale

// --- Bus master + effetti globali (riverbero / delay) ---
const masterBus = audioCtx.createGain();
masterBus.gain.value = 1.0;
masterBus.connect(audioCtx.destination);

function _generateImpulseResponse(durationSec, decay) {
    const rate = audioCtx.sampleRate;
    const length = Math.max(1, Math.floor(rate * durationSec));
    const impulse = audioCtx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch);
        for (let i = 0; i < length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
    }
    return impulse;
}

const reverbConvolver = audioCtx.createConvolver();
reverbConvolver.buffer = _generateImpulseResponse(2.2, 2.5);
const reverbWetGain = audioCtx.createGain();
reverbWetGain.gain.value = 0.0; // impostato da updateEffects()
reverbConvolver.connect(reverbWetGain);
reverbWetGain.connect(masterBus);

const delayNode = audioCtx.createDelay(2.0);
delayNode.delayTime.value = 0.28;
const delayFeedback = audioCtx.createGain();
delayFeedback.gain.value = 0.35;
const delayWetGain = audioCtx.createGain();
delayWetGain.gain.value = 0.0; // impostato da updateEffects()
delayNode.connect(delayFeedback);
delayFeedback.connect(delayNode);
delayNode.connect(delayWetGain);
delayWetGain.connect(masterBus);

// Nodo a cui ogni suono si collega: si dirama automaticamente verso dry/reverb/delay
function connectToEffectsBus(sourceNode) {
    sourceNode.connect(masterBus);
    sourceNode.connect(reverbConvolver);
    sourceNode.connect(delayNode);
}

function updateEffects() {
    const reverbEl = document.getElementById("slider-reverb");
    const delayEl = document.getElementById("slider-delay");
    if (reverbEl) {
        reverbWetGain.gain.setTargetAtTime(parseFloat(reverbEl.value), audioCtx.currentTime, 0.05);
        const valEl = document.getElementById("val-reverb");
        if (valEl) valEl.innerText = reverbEl.value;
    }
    if (delayEl) {
        delayWetGain.gain.setTargetAtTime(parseFloat(delayEl.value), audioCtx.currentTime, 0.05);
        const valEl = document.getElementById("val-delay");
        if (valEl) valEl.innerText = delayEl.value;
    }
}

// --- Quantizzazione ritmica opzionale ---
let quantizeEnabled = false;
let quantizeBpm = 120;
let quantizeAudioOrigin = audioCtx.currentTime;

function setQuantizeEnabled(enabled) {
    quantizeEnabled = enabled;
    if (enabled) quantizeAudioOrigin = audioCtx.currentTime;
}

function setQuantizeBpm(bpm) {
    quantizeBpm = Math.max(20, parseFloat(bpm) || 120);
    const valEl = document.getElementById("val-bpm");
    if (valEl) valEl.innerText = Math.round(quantizeBpm);
}

function getScheduledTime(rawNow) {
    if (!quantizeEnabled) return rawNow;
    const grid = 60 / quantizeBpm; // un quarto (il "battito" indicato dai BPM)
    const elapsed = rawNow - quantizeAudioOrigin;
    const next = Math.ceil(elapsed / grid) * grid;
    return quantizeAudioOrigin + next;
}

// Set esteso di timbriche e strumenti virtuali
const SOUND_TIMBRES = {
    sine: {
        name: "🌙 Dolce / Eterea (Seno)",
        type1: "sine",
        type2: "sine",
        sub: true,
        filterType: "lowpass",
        cutoffMult: 2.5,
        resonance: 1.0
    },
    square: {
        name: "👾 Chiptune / Retro 8-bit (Square)",
        type1: "square",
        type2: "sawtooth",
        sub: true,
        filterType: "lowpass",
        cutoffMult: 3.5,
        resonance: 2.5
    },
    sawtooth: {
        name: "🎻 Synth Lead / Corda (Saw)",
        type1: "sawtooth",
        type2: "triangle",
        sub: false,
        filterType: "lowpass",
        cutoffMult: 3.0,
        resonance: 1.5
    },
    triangle: {
        name: "🪈 Flauto / Acustico (Triangle)",
        type1: "triangle",
        type2: "sine",
        sub: false,
        filterType: "lowpass",
        cutoffMult: 2.0,
        resonance: 0.8
    },
    organ: {
        name: "⛪ Organo da Chiesa (Organ)",
        type1: "sine",
        type2: "square",
        sub: true,
        filterType: "bandpass",
        cutoffMult: 4.0,
        resonance: 3.0
    },
    brass: {
        name: "🎺 Sezione Ottoni (Brass)",
        type1: "sawtooth",
        type2: "square",
        sub: false,
        filterType: "lowpass",
        cutoffMult: 3.8,
        resonance: 2.0
    },
    pad: {
        name: "🌌 Atmosfera / Ambient Pad",
        type1: "sine",
        type2: "triangle",
        sub: true,
        filterType: "lowpass",
        cutoffMult: 1.5,
        resonance: 0.5
    },
    bell: {
        name: "🔔 Campana / Cristallo (Bell)",
        type1: "sine",
        type2: "sawtooth",
        sub: false,
        filterType: "highpass",
        cutoffMult: 1.2,
        resonance: 4.0
    }
};
let currentTimbreMode = "sine";

function setTimbreMode(mode) {
    if (SOUND_TIMBRES[mode]) {
        currentTimbreMode = mode;
    }
}

function populateTimbreSelect() {
    const sel = document.getElementById("timbre-select");
    if (!sel) return;
    sel.innerHTML = "";
    for (const [key, timbre] of Object.entries(SOUND_TIMBRES)) {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = timbre.name;
        if (key === currentTimbreMode) opt.selected = true;
        sel.appendChild(opt);
    }
}

const SCALE_PATTERNS = {
    major: [0, 2, 4, 5, 7, 9, 11],
    naturalMinor: [0, 2, 3, 5, 7, 8, 10],
    harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    pentatonicMajor: [0, 2, 4, 7, 9],
    pentatonicMinor: [0, 3, 5, 7, 10],
    blues: [0, 3, 5, 6, 7, 10],
    wholeTone: [0, 2, 4, 6, 8, 10],
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
};

const SCALE_NAMES = {
    pentatonicMinor: { it: "Pentatonica Minore", en: "Minor Pentatonic" },
    pentatonicMajor: { it: "Pentatonica Maggiore", en: "Major Pentatonic" },
    major: { it: "Maggiore", en: "Major" },
    naturalMinor: { it: "Minore Naturale", en: "Natural Minor" },
    harmonicMinor: { it: "Minore Armonica", en: "Harmonic Minor" },
    dorian: { it: "Dorica", en: "Dorian" },
    mixolydian: { it: "Misolidia", en: "Mixolydian" },
    blues: { it: "Blues", en: "Blues" },
    wholeTone: { it: "Toni Interi", en: "Whole Tone" },
    chromatic: { it: "Cromatica", en: "Chromatic" }
};

let currentScaleMode = "pentatonicMinor";

const materialRegisters = {
    bass: { centerDegree: 0, range: 3 },
    wood: { centerDegree: 4, range: 3 },
    mid: { centerDegree: 8, range: 4 },
    rubber: { centerDegree: 11, range: 3 },
    high: { centerDegree: 15, range: 4 },
    neon: { centerDegree: 19, range: 4 },
    wall: { centerDegree: 2, range: 2 }
};

let melodicDegree = {};
for (const key of Object.keys(materialRegisters)) melodicDegree[key] = materialRegisters[key].centerDegree;

function degreeToFrequency(degreeIndex) {
    const pattern = SCALE_PATTERNS[currentScaleMode];
    const stepsPerOctave = pattern.length;
    const octave = Math.floor(degreeIndex / stepsPerOctave);
    const degreeInOctave = ((degreeIndex % stepsPerOctave) + stepsPerOctave) % stepsPerOctave;
    const semitone = pattern[degreeInOctave] + octave * 12;
    return baseRoot * Math.pow(2, semitone / 12);
}

function nextNoteFrequency(type) {
    const reg = materialRegisters[type] || materialRegisters.wall;
    let degree = melodicDegree[type] !== undefined ? melodicDegree[type] : reg.centerDegree;

    const pull = (reg.centerDegree - degree) * 0.15;
    const step = Math.round((Math.random() - 0.5) * 4 + pull);
    degree = Math.max(reg.centerDegree - reg.range, Math.min(reg.centerDegree + reg.range, degree + step));

    melodicDegree[type] = degree;
    return degreeToFrequency(degree);
}

function setScaleMode(mode) {
    if (!SCALE_PATTERNS[mode]) return;
    currentScaleMode = mode;
    for (const key of Object.keys(materialRegisters)) melodicDegree[key] = materialRegisters[key].centerDegree;
}

function changeScale(mode) {
    setScaleMode(mode);
}

function populateScaleSelect() {
    const sel = document.getElementById("scale-select");
    if (!sel) return;
    sel.innerHTML = "";
    for (const [key, names] of Object.entries(SCALE_NAMES)) {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = names[currentLanguage] || names.en;
        if (key === currentScaleMode) opt.selected = true;
        sel.appendChild(opt);
    }
}


const volumes = { bass: 0.8, wood: 0.8, mid: 0.8, rubber: 0.8, high: 0.8, neon: 0.8, wall: 0.8 };
let masterVolume = 0.8;

function updateVolume(type, val) {
    volumes[type] = parseFloat(val);
}
function updateMasterVolume(val) {
    masterVolume = parseFloat(val);
}
function resetMixer() {
    masterVolume = 0.8;
    document.getElementById("vol-master").value = 0.8;
    for (const key of Object.keys(volumes)) {
        volumes[key] = 0.8;
        const slider = document.getElementById("vol-" + key);
        if (slider) slider.value = 0.8;
    }
    const reverbEl = document.getElementById("slider-reverb");
    const delayEl = document.getElementById("slider-delay");
    if (reverbEl) reverbEl.value = 0.15;
    if (delayEl) delayEl.value = 0.12;
    updateEffects();
}

let activeSoundsCount = 0;
const MAX_SIMULTANEOUS_SOUNDS = 24;

function playMixedSound(typeA, typeB, velocity) {
    if (audioCtx.state === "suspended") audioCtx.resume();
    if (activeSoundsCount >= MAX_SIMULTANEOUS_SOUNDS) return;
    activeSoundsCount++;

    const now = getScheduledTime(audioCtx.currentTime);
    const primaryType = typeA;
    const secondaryType = typeB && typeB !== typeA ? typeB : null;
    const timbre = SOUND_TIMBRES[currentTimbreMode] || SOUND_TIMBRES.sine;

    const freq1 = nextNoteFrequency(primaryType);

    const osc1 = audioCtx.createOscillator();
    const oscSub = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    const filter1 = audioCtx.createBiquadFilter();

    osc1.type = timbre.type1;
    osc1.frequency.setValueAtTime(freq1, now);

    oscSub.type = "sine";
    oscSub.frequency.setValueAtTime(freq1 * 0.5, now);

    filter1.type = timbre.filterType || "lowpass";
    filter1.frequency.setValueAtTime(Math.min(freq1 * timbre.cutoffMult, 5000), now);
    filter1.Q.setValueAtTime(timbre.resonance, now);

    const baseVol1 = volumes[primaryType] !== undefined ? volumes[primaryType] : 0.8;
    const vol1 = Math.min(0.25, velocity * 0.03) * baseVol1 * masterVolume;

    const duration = currentTimbreMode === "pad" ? 3.5 : currentTimbreMode === "bell" ? 3.0 : 2.5;

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(vol1, now + (currentTimbreMode === "pad" ? 0.4 : 0.1));
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(filter1);
    if (timbre.sub) {
        oscSub.connect(filter1);
        oscSub.start(now);
        oscSub.stop(now + duration + 0.1);
    }

    filter1.connect(gain1);
    connectToEffectsBus(gain1);

    osc1.start(now);
    osc1.stop(now + duration + 0.1);
    osc1.onended = () => {
        activeSoundsCount = Math.max(0, activeSoundsCount - 1);
    };

    if (secondaryType) {
        const freq2 = nextNoteFrequency(secondaryType);
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        const filter2 = audioCtx.createBiquadFilter();

        osc2.type = timbre.type2;
        osc2.frequency.setValueAtTime(freq2 / (currentTimbreMode === "organ" ? 1 : 2), now);
        filter2.type = "lowpass";
        filter2.frequency.setValueAtTime(2800, now);

        const vol2 = vol1 * 0.4;

        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(vol2, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + (duration - 0.3));

        osc2.connect(filter2);
        filter2.connect(gain2);
        connectToEffectsBus(gain2);

        osc2.start(now);
        osc2.stop(now + duration);
    }

    addScore(vol1);
}

