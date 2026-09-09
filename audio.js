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

// Limiter/compressore finale: evita che la somma di molti suoni assieme
// saturi l'uscita (clipping) generando glitch e "buchi" di volume percepiti.
const masterCompressor = audioCtx.createDynamicsCompressor();
masterCompressor.threshold.value = -12; // dB, sopra questo livello inizia a comprimere
masterCompressor.knee.value = 24; // transizione morbida
masterCompressor.ratio.value = 12; // compressione forte tipo limiter
masterCompressor.attack.value = 0.003; // reagisce in fretta ai picchi
masterCompressor.release.value = 0.25; // recupero morbido

masterBus.connect(masterCompressor);
masterCompressor.connect(audioCtx.destination);

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

// --- Timbri personalizzati (salvati in localStorage, integrati in SOUND_TIMBRES) ---
const CUSTOM_TIMBRES_KEY = "symphony-custom-timbres";

function clampVal(v, min, max) {
    const n = parseFloat(v);
    return Math.max(min, Math.min(max, isFinite(n) ? n : min));
}

function sanitizeTimbreDef(t) {
    return {
        key: String(t.key || ""),
        name: String(t.name || "").slice(0, 60),
        type1: ["sine", "triangle", "sawtooth", "square"].includes(t.type1) ? t.type1 : "sine",
        type2: ["sine", "triangle", "sawtooth", "square"].includes(t.type2) ? t.type2 : "sine",
        sub: !!t.sub,
        filterType: ["lowpass", "highpass", "bandpass"].includes(t.filterType) ? t.filterType : "lowpass",
        cutoffMult: clampVal(t.cutoffMult, 0.5, 6),
        resonance: clampVal(t.resonance, 0, 12),
        attack: clampVal(t.attack ?? 0.1, 0.01, 0.6),
        decay: clampVal(t.decay ?? 2.5, 0.5, 4),
        isCustom: true
    };
}

function getStoredCustomTimbres() {
    try {
        const arr = JSON.parse(localStorage.getItem(CUSTOM_TIMBRES_KEY) || "[]");
        return Array.isArray(arr) ? arr : [];
    } catch (e) {
        return [];
    }
}

function saveStoredCustomTimbres(arr) {
    try {
        localStorage.setItem(CUSTOM_TIMBRES_KEY, JSON.stringify(arr));
    } catch (e) {}
}

function isCustomTimbreKey(key) {
    return /^custom_/.test(key || "");
}

function loadCustomTimbres() {
    getStoredCustomTimbres().forEach((t) => {
        if (t && t.key && t.name && SOUND_TIMBRES[t.key] === undefined) {
            SOUND_TIMBRES[t.key] = sanitizeTimbreDef(t);
        }
    });
}

function saveCustomTimbre(name, def) {
    const trimmed = String(name || "").trim().slice(0, 60);
    if (!trimmed) return null;
    const key = "custom_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
    const stored = sanitizeTimbreDef({ ...def, key, name: trimmed });
    SOUND_TIMBRES[key] = stored;
    const arr = getStoredCustomTimbres();
    arr.push(stored);
    saveStoredCustomTimbres(arr);
    return key;
}

function deleteCustomTimbre(key) {
    if (!isCustomTimbreKey(key)) return;
    if (SOUND_TIMBRES[key]) delete SOUND_TIMBRES[key];
    const arr = getStoredCustomTimbres().filter((t) => t.key !== key);
    saveStoredCustomTimbres(arr);
    if (currentTimbreMode === key) {
        currentTimbreMode = "sine";
        const sel = document.getElementById("timbre-select");
        if (sel) sel.value = "sine";
    }
    if (typeof populateTimbreSelect === "function") populateTimbreSelect();
}

function populateTimbreSelect() {
    const sel = document.getElementById("timbre-select");
    if (!sel) return;
    sel.innerHTML = "";
    for (const [key, timbre] of Object.entries(SOUND_TIMBRES)) {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = isCustomTimbreKey(key) ? "⭐ " + timbre.name : timbre.name;
        if (key === currentTimbreMode) opt.selected = true;
        sel.appendChild(opt);
    }
}

// Timbre corrente con fallback: ogni suono (melodico, note, strumenti, sequencer)
// passa da qui così cambiare il Timbre / Sound Type cambia davvero tutto.
function getCurrentTimbre() {
    return SOUND_TIMBRES[currentTimbreMode] || SOUND_TIMBRES.sine;
}

// Durata di coda coerente col timbro scelto (pad/bell sostengono più a lungo;
// i timbri personalizzati hanno il proprio parametro "decay").
function getTimbreDuration() {
    const tb = getCurrentTimbre();
    if (typeof tb.decay === "number") return tb.decay;
    return currentTimbreMode === "pad" ? 3.5 : currentTimbreMode === "bell" ? 3.0 : 2.5;
}

function getTimbreAttack() {
    const tb = getCurrentTimbre();
    if (typeof tb.attack === "number") return tb.attack;
    return currentTimbreMode === "pad" ? 0.4 : 0.1;
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

// Frequenze fisse (temperamento equabile, ottava centrale) per le sfere-nota
// Do-Re-Mi-Fa-Sol-La-Si: ogni sfera suona sempre la propria nota, indipendentemente
// da scala musicale corrente e dal "drift" melodico usato per gli altri oggetti.
const NOTE_FREQUENCIES = {
    note_do: 261.626, // C4
    note_dod: 277.183, // C#4
    note_re: 293.665, // D4
    note_reb: 311.127, // D#4
    note_mi: 329.628, // E4
    note_fa: 349.228, // F4
    note_fad: 369.994, // F#4
    note_sol: 391.995, // G4
    note_sold: 415.305, // G#4
    note_la: 440.0, // A4
    note_lad: 466.164, // A#4
    note_si: 493.883 // B4
};

// La nota può avere l'ottava codificata nel tipo (es. "note_do_3", "note_do_5"):
// "note_do" senza suffisso = ottava centrale (4), come da NOTE_FREQUENCIES.
function noteFrequencyForType(type) {
    if (NOTE_FREQUENCIES[type] !== undefined) return NOTE_FREQUENCIES[type];
    const m = /^(note_[a-z]+)_(\d+)$/.exec(type);
    if (m && NOTE_FREQUENCIES[m[1]] !== undefined) {
        return NOTE_FREQUENCIES[m[1]] * Math.pow(2, parseInt(m[2], 10) - 4);
    }
    return null;
}

function nextNoteFrequency(type) {
    const fixed = noteFrequencyForType(type);
    if (fixed !== null) return fixed;

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


const volumes = {
    bass: 0.8,
    wood: 0.8,
    mid: 0.8,
    rubber: 0.8,
    high: 0.8,
    neon: 0.8,
    note_do: 0.8,
    note_re: 0.8,
    note_mi: 0.8,
    note_fa: 0.8,
note_sol: 0.8,
    note_la: 0.8,
    note_si: 0.8,
    inst_kick: 0.8,
    inst_snare: 0.8,
    inst_hihat_c: 0.8,
    inst_hihat_o: 0.8,
    inst_clap: 0.8,
    inst_conga: 0.8,
    inst_bongo: 0.8,
    inst_clave: 0.8
};
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

// --- Voice stealing ---
// Non c'è un limite a QUANTI suoni possono partire, ma per non sovraccaricare
// il motore audio (troppi oscillatori assieme = glitch e silenzio) si tiene un
// tetto sul numero di voci REALMENTE in corso. Quando si supera, la voce più
// vecchia viene interrotta con una dissolvenza rapida (non un taglio secco)
// per fare spazio a quella nuova, che parte sempre regolarmente.
const MAX_ACTIVE_VOICES = 40;
const STEAL_FADE_SEC = 0.02;
let activeVoices = [];

function stealOldestVoiceIfNeeded() {
    while (activeVoices.length >= MAX_ACTIVE_VOICES) {
        const voice = activeVoices.shift();
        const stealNow = audioCtx.currentTime;
        try {
            voice.gains.forEach((g) => {
                g.gain.cancelScheduledValues(stealNow);
                g.gain.setValueAtTime(g.gain.value, stealNow);
                g.gain.linearRampToValueAtTime(0.0001, stealNow + STEAL_FADE_SEC);
            });
            voice.oscillators.forEach((o) => {
                try {
                    o.stop(stealNow + STEAL_FADE_SEC + 0.005);
                } catch (e) {}
            });
        } catch (e) {}
    }
}

function playMixedSound(typeA, typeB, velocity, decayRatio) {
    if (audioCtx.state === "suspended") audioCtx.resume();
    // "decayRatio" (0..1) = quanto la coppia è invecchiata rispetto alla propria
    // vita utile: a 0 l'oggetto è "fresco", a 1 sta per esaurirsi. Più l'oggetto
    // decade, più il suono diventa spento (filtro chiuso, volume attenuato).
    const decay = Math.max(0, Math.min(1, decayRatio || 0));
    // Sfere-strumento (kick, snare, hi-hat...): suonano la batteria sintetizzata
    // usando l'intensità d'impatto, senza passare dagli oscillator melodici.
    if (isInstrumentType(typeA)) return playCollisionInstrument(typeA, velocity * (1 - 0.35 * decay));
    if (isInstrumentType(typeB)) return playCollisionInstrument(typeB, velocity * (1 - 0.35 * decay));
    activeSoundsCount++;
    stealOldestVoiceIfNeeded();

    const now = getScheduledTime(audioCtx.currentTime);
    const primaryType = typeA;
    const secondaryType = typeB && typeB !== typeA ? typeB : null;
    const timbre = getCurrentTimbre();

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
    filter1.frequency.setValueAtTime(
        Math.min(freq1 * timbre.cutoffMult, 5000) * Math.pow(1 - 0.85 * decay, 1.2),
        now
    );
    filter1.Q.setValueAtTime(timbre.resonance, now);

    const baseVol1 = volumes[primaryType] !== undefined ? volumes[primaryType] : 0.8;

    // Il parametro "velocity" qui è in realtà l'intensità d'impatto (velocità relativa
    // combinata con la massa effettiva della coppia in collisione, vedi objects.js).
    // Curva ampia e non lineare: urti leggeri restano nettamente sotto quelli forti,
    // che invece si avvicinano al volume massimo.
    const IMPACT_MIN_VOL = 0.02;
    const IMPACT_MAX_VOL = 0.42;
    const IMPACT_REF = 8; // intensità oltre la quale il volume è già vicino al massimo
    const normalizedImpact = Math.min(1, velocity / IMPACT_REF);
    const curvedImpact = Math.pow(normalizedImpact, 0.6);
    const vol1 = (IMPACT_MIN_VOL + (IMPACT_MAX_VOL - IMPACT_MIN_VOL) * curvedImpact) * baseVol1 * masterVolume * (1 - 0.4 * decay);

    const duration = getTimbreDuration();

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(vol1, now + getTimbreAttack());
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

    const voiceEntry = {
        oscillators: timbre.sub ? [osc1, oscSub] : [osc1],
        gains: [gain1]
    };
    activeVoices.push(voiceEntry);

    osc1.onended = () => {
        activeSoundsCount = Math.max(0, activeSoundsCount - 1);
        const idx = activeVoices.indexOf(voiceEntry);
        if (idx !== -1) activeVoices.splice(idx, 1);
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

        voiceEntry.oscillators.push(osc2);
        voiceEntry.gains.push(gain2);

        if (primaryType !== secondaryType) addHarmonyScore(freq1, freq2, vol1);
    }

    addScore(vol1);
}

// --- Sintesi strumenti sequencer (batteria + clavicembalo) ---
// Il sequencer può suonare questi strumenti direttamente: nessun corpo fisico
// viene spawnato, solo il suono sintetizzato. Le celle nel pattern rappresentano
// strumenti reali (kick, snare, hi-hat...) o note (Do-Si suonate come clavicembalo).

const AUDIO_VELOCITY = [0.45, 0.7, 1.0]; // soft, mid, loud — guadagni proporzionali

const _noiseBufferCache = {};
function getNoiseBuffer(durationSec) {
    const key = Math.max(1, Math.round(durationSec * 20));
    if (!_noiseBufferCache[key]) {
        const rate = audioCtx.sampleRate;
        const len = Math.max(1, Math.round(rate * (key / 20)));
        const buf = audioCtx.createBuffer(1, len, rate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        _noiseBufferCache[key] = buf;
    }
    return _noiseBufferCache[key];
}

function registerVoice(oscillators, gains) {
    const entry = { oscillators, gains };
    activeVoices.push(entry);
    return entry;
}
function forgetVoice(entry) {
    const idx = activeVoices.indexOf(entry);
    if (idx !== -1) activeVoices.splice(idx, 1);
    activeSoundsCount = Math.max(0, activeSoundsCount - 1);
}
function beginVoice() {
    activeSoundsCount++;
    stealOldestVoiceIfNeeded();
}

function playKick(v) {
    const now = getScheduledTime(audioCtx.currentTime);
    const tb = getCurrentTimbre();
    beginVoice();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = tb.type1;
    osc.frequency.setValueAtTime(170, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.12);
    gain.gain.setValueAtTime(0.9 * v * masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc.connect(gain);
    connectToEffectsBus(gain);
    osc.start(now);
    osc.stop(now + 0.55);
    const entry = registerVoice([osc], [gain]);
    osc.onended = () => forgetVoice(entry);
}

function playSnare(v) {
    const now = getScheduledTime(audioCtx.currentTime);
    const tb = getCurrentTimbre();
    beginVoice();
    const body = audioCtx.createOscillator();
    const bg = audioCtx.createGain();
    body.type = tb.type1;
    body.frequency.setValueAtTime(190, now);
    body.frequency.exponentialRampToValueAtTime(120, now + 0.12);
    bg.gain.setValueAtTime(0.55 * v * masterVolume, now);
    bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    body.connect(bg);
    connectToEffectsBus(bg);
    body.start(now);
    body.stop(now + 0.18);

    const src = audioCtx.createBufferSource();
    src.buffer = getNoiseBuffer(0.28);
    const bp = audioCtx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 0.8;
    const ng = audioCtx.createGain();
    ng.gain.setValueAtTime(0.7 * v * masterVolume, now);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    src.connect(bp);
    bp.connect(ng);
    connectToEffectsBus(ng);
    src.start(now);
    src.stop(now + 0.25);
    const entry = registerVoice([body, src], [bg, ng]);
    body.onended = () => forgetVoice(entry);
}

function playHiHat(open, v) {
    const now = getScheduledTime(audioCtx.currentTime);
    const tb = getCurrentTimbre();
    beginVoice();
    const src = audioCtx.createBufferSource();
    src.buffer = getNoiseBuffer(open ? 0.5 : 0.1);
    const hp = audioCtx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7500;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.45 * v * masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (open ? 0.4 : 0.07));
    src.connect(hp);
    hp.connect(gain);
    // Ping timbrico: rende udibile il cambio di sound type anche sullo hi-hat a rumore
    const ping = audioCtx.createOscillator();
    const pg = audioCtx.createGain();
    ping.type = tb.type2;
    ping.frequency.setValueAtTime(open ? 5200 : 6800, now);
    pg.gain.setValueAtTime(0.1 * v * masterVolume, now);
    pg.gain.exponentialRampToValueAtTime(0.0001, now + (open ? 0.18 : 0.05));
    ping.connect(pg);
    connectToEffectsBus(gain);
    connectToEffectsBus(pg);
    src.start(now);
    src.stop(now + (open ? 0.45 : 0.1));
    ping.start(now);
    ping.stop(now + (open ? 0.2 : 0.07));
    const entry = registerVoice([src, ping], [gain, pg]);
    src.onended = () => forgetVoice(entry);
}

function playClap(v) {
    const now = getScheduledTime(audioCtx.currentTime);
    const tb = getCurrentTimbre();
    beginVoice();
    const src = audioCtx.createBufferSource();
    src.buffer = getNoiseBuffer(0.3);
    const bp = audioCtx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1100;
    bp.Q.value = 1.2;
    const gain = audioCtx.createGain();
    const g = 0.55 * v * masterVolume;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(g, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    gain.gain.setValueAtTime(0, now + 0.03);
    gain.gain.linearRampToValueAtTime(g * 0.85, now + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    gain.gain.setValueAtTime(0, now + 0.07);
    gain.gain.linearRampToValueAtTime(g * 0.7, now + 0.075);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    src.connect(bp);
    bp.connect(gain);
    // Ping timbrico: il clap resta a rumore ma colora il timbro scelto
    const ping = audioCtx.createOscillator();
    const pg = audioCtx.createGain();
    ping.type = tb.type2;
    ping.frequency.setValueAtTime(2400, now);
    pg.gain.setValueAtTime(0.08 * v * masterVolume, now);
    pg.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    ping.connect(pg);
    connectToEffectsBus(gain);
    connectToEffectsBus(pg);
    src.start(now);
    src.stop(now + 0.32);
    ping.start(now);
    ping.stop(now + 0.08);
    const entry = registerVoice([src, ping], [gain, pg]);
    src.onended = () => forgetVoice(entry);
}

function playConga(v, high) {
    const now = getScheduledTime(audioCtx.currentTime);
    const tb = getCurrentTimbre();
    beginVoice();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = tb.type1;
    const f0 = high ? 380 : 240;
    const f1 = high ? 180 : 105;
    const dur = high ? 0.15 : 0.3;
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(f1, now + dur);
    gain.gain.setValueAtTime(0.6 * v * masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    connectToEffectsBus(gain);
    osc.start(now);
    osc.stop(now + dur + 0.05);
    const entry = registerVoice([osc], [gain]);
    osc.onended = () => forgetVoice(entry);
}

function playClave(v) {
    const now = getScheduledTime(audioCtx.currentTime);
    const tb = getCurrentTimbre();
    beginVoice();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = tb.type2;
    osc.frequency.setValueAtTime(2100, now);
    gain.gain.setValueAtTime(0.4 * v * masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.connect(gain);
    connectToEffectsBus(gain);
    osc.start(now);
    osc.stop(now + 0.06);
    const entry = registerVoice([osc], [gain]);
    osc.onended = () => forgetVoice(entry);
}

function playHarpsichordNote(freq, v) {
    const now = getScheduledTime(audioCtx.currentTime);
    const tb = getCurrentTimbre();
    beginVoice();
    const gain = audioCtx.createGain();
    const harmonics = [1, 2, 3, 4, 5, 6, 8];
    const amps = [1, 0.55, 0.42, 0.3, 0.2, 0.13, 0.07];
    const dur = currentTimbreMode === "pad" ? 1.8 : currentTimbreMode === "bell" ? 1.3 : 0.85;
    const vol = 0.3 * v * masterVolume;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    const oscs = [];
    harmonics.forEach((h, i) => {
        const o = audioCtx.createOscillator();
        o.type = i === 0 ? tb.type1 : tb.type2;
        o.frequency.setValueAtTime(freq * h, now);
        oscs.push(o);
        o.connect(gain);
    });
    const click = audioCtx.createBufferSource();
    click.buffer = getNoiseBuffer(0.03);
    const cg = audioCtx.createGain();
    const chp = audioCtx.createBiquadFilter();
    chp.type = "highpass";
    chp.frequency.value = 4500;
    cg.gain.setValueAtTime(vol * 0.5, now);
    cg.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
    click.connect(chp);
    chp.connect(cg);
    cg.connect(gain);
    connectToEffectsBus(gain);
    oscs.forEach((o) => o.start(now));
    oscs.forEach((o) => o.stop(now + dur + 0.1));
    click.start(now);
    click.stop(now + 0.03);
    const entry = registerVoice(oscs.concat(click), [gain]);
    oscs[0].onended = () => forgetVoice(entry);
}

const INST_TYPES = ["inst_kick", "inst_snare", "inst_hihat_c", "inst_hihat_o", "inst_clap", "inst_conga", "inst_bongo", "inst_clave"];
function isInstrumentType(type) {
    return INST_TYPES.indexOf(type) !== -1;
}

function dispatchInstrumentSound(instKey, v) {
    switch (instKey) {
        case "inst_kick": playKick(v); break;
        case "inst_snare": playSnare(v); break;
        case "inst_hihat_c": playHiHat(false, v); break;
        case "inst_hihat_o": playHiHat(true, v); break;
        case "inst_clap": playClap(v); break;
        case "inst_conga": playConga(v, false); break;
        case "inst_bongo": playConga(v, true); break;
        case "inst_clave": playClave(v); break;
        default: break;
    }
}

function playSequencerInstrument(instKey, velLevel) {
    const v = AUDIO_VELOCITY[velLevel] !== undefined ? AUDIO_VELOCITY[velLevel] : AUDIO_VELOCITY[1];
    dispatchInstrumentSound(instKey, v);
}

// Strumento colpito da sfere fisiche: l'intensità d'impatto (velocità relative
// combinate con la massa) viene mappata con la stessa curva non lineare usata
// per gli altri timbri, così più forte è l'urto più "spinge" la batteria.
function playCollisionInstrument(instKey, impactIntensity) {
    const IMPACT_MIN_VOL = 0.02;
    const IMPACT_MAX_VOL = 0.95;
    const IMPACT_REF = 8;
    const normalizedImpact = Math.min(1, impactIntensity / IMPACT_REF);
    const curvedImpact = Math.pow(normalizedImpact, 0.6);
    const v = IMPACT_MIN_VOL + (IMPACT_MAX_VOL - IMPACT_MIN_VOL) * curvedImpact;
    const instVol = (volumes[instKey] !== undefined ? volumes[instKey] : 0.8);
    dispatchInstrumentSound(instKey, Math.min(1.4, v * 1.6 * instVol));
}

function playSequencerNote(noteType, velLevel) {
    const freq = NOTE_FREQUENCIES[noteType];
    if (!freq) return;
    playHarpsichordNote(freq, AUDIO_VELOCITY[velLevel] !== undefined ? AUDIO_VELOCITY[velLevel] : AUDIO_VELOCITY[1]);
}

// --- Bonus armonico ---
// Quando due note diverse suonano insieme, l'intervallo tra le loro frequenze
// viene confrontato con gli intervalli della scala corrente. Più l'intervallo è
// consonante (unisono/ottava, quinta, quarta, terze, sesta) più cresce il punteggio.
const CONSONANT_INTERVALS = { 0: 1.6, 3: 1.2, 4: 1.2, 5: 1.5, 7: 2.0, 9: 1.2, 12: 1.6 };
let lastHarmonyNote = null;

function addHarmonyScore(freqA, freqB, velocity) {
    if (!freqA || !freqB) return;
    const low = Math.min(freqA, freqB);
    const high = Math.max(freqA, freqB);
    const semitones = Math.round(12 * Math.log2(high / low)) % 12;
    const multiplier = CONSONANT_INTERVALS[semitones];
    if (multiplier !== undefined) {
        addScore(velocity * multiplier * 1.2);
    }
}

// --- Registrazione sessione in WAV ---
// Tap sul master bus con uno ScriptProcessor: campiona i frame senza risuonarli.
// --- Registrazione della sessione ---
// Percorso primario: MediaRecorder + Opus (WebM/Ogg/M4A) = file piccolo e nativo.
// Fallback: WAV lossless via ScriptProcessorNode.
// Nota: un ScriptProcessorNode processa SOLO se l'uscita è collegata fino al
// destination; senza quel collegamento onaudioprocess non scatta mai e il
// file usciva da ~1 KB.

let _recording = false;

// Percorso MediaRecorder (compresso)
let _recDest = null; // MediaStreamAudioDestinationNode
let _recDestConnected = false;
let _mediaRecorder = null;
let _recMimeType = "";
let _recChunks = [];

// Percorso WAV (fallback)
let _recNode = null;
let _recSilentGain = null;
let _recLeft = null;
let _recRight = null;
let _recLength = 0;

const _recMimeCandidates = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4;codecs=mp4a.40.2"];

function _recExtFor(mimeType) {
    if (!mimeType) return "webm";
    if (mimeType.includes("ogg")) return "ogg";
    if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
    return "webm";
}

function _downloadBlob(blob, ext) {
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = URL.createObjectURL(blob);
    a.download = "symphony-recording-" + ts + "." + ext;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
    }, 1000);
}

function _setRecordButton(labelKey) {
    const btn = document.getElementById("btn-record");
    if (btn) btn.textContent = t(labelKey);
}

function _encodeWav(left, right, sampleRate) {
    const numFrames = left.length;
    const numChannels = right ? 2 : 1;
    const dataSize = numFrames * numChannels * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeStr = (offset, str) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeStr(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < numFrames; i++) {
        let s1 = Math.max(-1, Math.min(1, left[i]));
        view.setInt16(offset, s1 < 0 ? s1 * 0x8000 : s1 * 0x7fff, true);
        offset += 2;
        if (right) {
            let s2 = Math.max(-1, Math.min(1, right[i]));
            view.setInt16(offset, s2 < 0 ? s2 * 0x8000 : s2 * 0x7fff, true);
            offset += 2;
        }
    }
    return new Blob([buffer], { type: "audio/wav" });
}

function toggleRecording() {
    if (_recording) stopRecording();
    else startRecording();
}

function startRecording() {
    if (_recording) return;
    if (audioCtx.state === "suspended") audioCtx.resume();

    _recording = true;
    _setRecordButton("record-stop");
    flashMessage(t("record-message-start"), "#ff4757");

    // --- Percorso primario: MediaRecorder + Opus (file piccolo, nativo) ---
    if (typeof MediaRecorder !== "undefined") {
        try {
            if (!_recDest) _recDest = audioCtx.createMediaStreamDestination();
            _recChunks = [];
            _recMimeType = _recMimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
            _mediaRecorder = _recMimeType
                ? new MediaRecorder(_recDest.stream, { mimeType: _recMimeType, audioBitsPerSecond: 128000 })
                : new MediaRecorder(_recDest.stream, { audioBitsPerSecond: 128000 });
            masterBus.connect(_recDest);
            _recDestConnected = true;
            _mediaRecorder.addEventListener("dataavailable", (e) => {
                if (e.data && e.data.size > 0) _recChunks.push(e.data);
            });
            _mediaRecorder.addEventListener("stop", _finishMediaRecorder);
            _mediaRecorder.start(250);
            return;
        } catch (err) {
            console.warn("MediaRecorder non disponibile, ripiego su WAV:", err);
            _mediaRecorder = null;
        }
    } else {
        console.warn("MediaRecorder non supportato, registrazione in WAV");
    }

    // --- Fallback: WAV lossless tramite AudioWorklet (ScriptProcessor solo se arcaici) ---
    _startWaveRecorder();
}

async function _startWaveRecorder() {
    _recLeft = [];
    _recRight = [];
    _recLength = 0;
    try {
        _recNode = await _ensureRecorderWorklet();
    } catch (err) {
        console.warn("AudioWorklet non disponibile, ripiego su ScriptProcessor:", err);
        _recNode = _createLegacyScriptProcessor();
    }
    if (!_recNode) return;
    // Se nel frattempo la registrazione è già stata fermata, non collegare nulla.
    if (!_recording) {
        try {
            _recNode.disconnect();
        } catch (e) {}
        _recNode = null;
        return;
    }
    // Anche un AudioWorkletNode processa solo se l'uscita è collegata fino al
    // destination: gain muto, come in passato con il ScriptProcessorNode.
    _recSilentGain = audioCtx.createGain();
    _recSilentGain.gain.value = 0;
    masterBus.connect(_recNode);
    _recNode.connect(_recSilentGain);
    _recSilentGain.connect(audioCtx.destination);
}

let _workletModuleUrl = null;
let _workletLoaded = false;

async function _ensureRecorderWorklet() {
    if (!(audioCtx.audioWorklet && typeof AudioWorkletNode !== "undefined")) {
        throw new Error("AudioWorklet not supported");
    }
    if (!_workletLoaded) {
        if (_workletModuleUrl === null) {
            const code =
                "class SessionRecorderProcessor extends AudioWorkletProcessor { " +
                "process(inputs) { " +
                "const input = inputs[0]; " +
                "if (input && input[0]) { " +
                "const ch0 = input[0]; " +
                "const ch1 = input[1] || ch0; " +
                "this.port.postMessage({ ch0: ch0.slice(0), ch1: ch1.slice(0) }); " +
                "} " +
                "return true; " +
                "} " +
                "} " +
                "registerProcessor('session-recorder', SessionRecorderProcessor);";
            _workletModuleUrl = URL.createObjectURL(new Blob([code], { type: "application/javascript" }));
        }
        await audioCtx.audioWorklet.addModule(_workletModuleUrl);
        _workletLoaded = true;
    }
    const node = new AudioWorkletNode(audioCtx, "session-recorder", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2]
    });
    node.port.onmessage = (e) => {
        if (!_recording) return;
        const ch0 = e.data.ch0;
        const ch1 = e.data.ch1;
        _recLeft.push(ch0);
        _recRight.push(ch1);
        _recLength += ch0.length;
    };
    return node;
}

function _createLegacyScriptProcessor() {
    const node = audioCtx.createScriptProcessor(4096, 2, 2);
    node.onaudioprocess = (e) => {
        if (!_recording) return;
        const inL = e.inputBuffer.getChannelData(0);
        const inR = e.inputBuffer.getChannelData(1);
        _recLeft.push(new Float32Array(inL));
        _recRight.push(new Float32Array(inR));
        _recLength += inL.length;
    };
    return node;
}

function stopRecording() {
    if (!_recording) return;
    _recording = false;
    _setRecordButton("record-start");
    flashMessage(t("record-message-stop"), "#00d2ff");

    if (_mediaRecorder) {
        if (_mediaRecorder.state !== "inactive") {
            try {
                _mediaRecorder.stop();
            } catch (e) {}
        }
        // Il salvataggio avviene nell'handler "stop" (_finishMediaRecorder).
        return;
    }
    _stopWaveRecorder();
}

function _finishMediaRecorder() {
    if (_recDestConnected && _recDest) {
        try {
            masterBus.disconnect(_recDest);
        } catch (e) {}
        _recDestConnected = false;
    }
    if (_mediaRecorder) {
        _mediaRecorder.removeEventListener("stop", _finishMediaRecorder);
    }
    const mime = _recMimeType || "audio/webm";
    if (_recChunks.length > 0) {
        _downloadBlob(new Blob(_recChunks, { type: mime }), _recExtFor(mime));
    }
    _recChunks = [];
    _mediaRecorder = null;
}

function _stopWaveRecorder() {
    if (!_recNode) return;
    try {
        masterBus.disconnect(_recNode);
    } catch (e) {}
    try {
        _recNode.disconnect();
    } catch (e) {}
    if (_recSilentGain) {
        try {
            _recSilentGain.disconnect();
        } catch (e) {}
    }
    _recNode.onaudioprocess = null;
    _recNode = null;
    _recSilentGain = null;

    const sampleRate = audioCtx.sampleRate;
    const left = new Float32Array(_recLength);
    const right = new Float32Array(_recLength);
    let pos = 0;
    for (let i = 0; i < _recLeft.length; i++) {
        left.set(_recLeft[i], pos);
        right.set(_recRight[i], pos);
        pos += _recLeft[i].length;
    }
    _recLeft = [];
    _recRight = [];
    _recLength = 0;

    if (pos > 0) {
        _downloadBlob(_encodeWav(left, right, sampleRate), "wav");
    }
}

// --- Visualizer: spettro di frequenza dal master bus (dopo il limitatore) ---
// Tap sull'uscita del compressore: col segnale già limitato le barre non saturano
// a fondo scala e lo spettro resta dinamico.
const _vizAnalyser = audioCtx.createAnalyser();
_vizAnalyser.fftSize = 1024;
_vizAnalyser.smoothingTimeConstant = 0.82;
masterCompressor.connect(_vizAnalyser);
const _vizFrequencyData = new Uint8Array(_vizAnalyser.frequencyBinCount);

function _drawVisualizer() {
    const canvas = document.getElementById("viz-canvas");
    if (canvas) {
        const ctx2 = canvas.getContext("2d");
        _vizAnalyser.getByteFrequencyData(_vizFrequencyData);
        const w = canvas.width;
        const h = canvas.height;
        ctx2.clearRect(0, 0, w, h);
        const binCount = _vizFrequencyData.length;
        const nyquist = audioCtx.sampleRate / 2;
        const fMin = 45;
        const fMax = 5200; // banda musicale reale: sopra ~5kHz la musica sintetizzata tace
        const f0 = Math.log2(fMin);
        const f1 = Math.log2(fMax);
        const barCount = Math.max(1, Math.floor(w / 3));
        const barW = w / barCount;
        const accent = typeof getCssVar === "function" ? getCssVar("--accent", "#ff0055") : "#ff0055";
        ctx2.fillStyle = accent;
        for (let i = 0; i < barCount; i++) {
            // Scala logaritmica: tutta la banda utile è distribuita sulla larghezza
            // così anche la metà destra viene usata.
            const freq = Math.pow(2, f0 + (i / barCount) * (f1 - f0));
            // Media di un intorno di bin (±12% a banda): spettro continuo, niente
            // singoli bin a palla che schizzano a fondo scala.
            const binMid = (freq / nyquist) * binCount;
            const halfSpread = Math.max(1, binMid * 0.12);
            const bin0 = Math.max(0, Math.floor(binMid - halfSpread));
            const bin1 = Math.min(binCount - 1, Math.ceil(binMid + halfSpread));
            let acc = 0;
            for (let b = bin0; b <= bin1; b++) acc += _vizFrequencyData[b];
            let v = (acc / (bin1 - bin0 + 1)) / 255;
            // Gamma < 1: rialza le code fredde (destra) senza saturare i bassi.
            v = Math.pow(v, 0.6);
            // Lieve rolloff-tilt verso l'alto per compensare i timbri sintetizzati.
            v = Math.min(1, v * (1 + 0.25 * (i / barCount)));
            const bh = Math.max(1, v * h);
            ctx2.globalAlpha = 0.35 + v * 0.65;
            ctx2.fillRect(i * barW, h - bh, Math.max(1, barW - 1), bh);
        }
        ctx2.globalAlpha = 1;
    }
    requestAnimationFrame(_drawVisualizer);
}
_drawVisualizer();
loadCustomTimbres();

