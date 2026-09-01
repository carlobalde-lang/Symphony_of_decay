// languages.js — Traduzioni UI (EN/IT) e gestione lingua corrente

const TRANSLATIONS = {
    en: {
        harmony: "Harmony",
        objects: "Objects",
        language: "Language:",
        "btn-clear": "🧹 Clear",
        "btn-pause": "⏸️ Pause",
        "btn-play": "▶️ Play",
        "btn-glitch": "⚡ GLITCH",
        "btn-undo": "↩️ Undo",
        "btn-redo": "↪️ Redo",
        "reverb-label": "Audio - Reverb",
        "delay-label": "Audio - Delay",
        "quantize-label": "Rhythmic Quantization",
        "bpm-label": "Quantize - BPM",
        "trail-label": "Visual - Motion Trail",
        "select-object": "Select Object",
        "btn-theme": "🌓 Theme",
        "block-wall": "Wall",
        "timbre-label": "Timbre / Sound Type:",
        "scale-label": "Musical Scale:",
        "interactive-tools": "Interactive Tools:",
        "tool-rope": "🧵 Rope",
        "tool-chain": "⛓️ Rigid Chain",
        "tool-bar": "🔗 Bar",
        "tool-eraser": "🧹 Eraser",
        "bg-trees": "Background Trees Count",
        "rope-segments": "Rope/Chain Segments",
        "gravity-label": "Physics - Gravity Y",
        "air-drag": "Physics - Air Drag",
        "wind-speed": "Wind - Speed",
        "wind-turb": "Wind - Turbulence",
        "reset-physics": "↩️ Reset Physics",
        "saved-scenes": "Saved Scenes:",
        "btn-save": "💾 Save",
        "btn-load": "📂 Load",
        "btn-delete": "🗑️ Delete Selected",
        "volume-mixer": "Volume Mixer",
        "btn-reset": "Reset",
        "master-vol": "Master Volume",
        "inst-default": "Drag to move. Click on empty space to spawn.",
        "inst-free": "Free Mode: Drag only to move objects.",
        "inst-paused": "Simulation paused.",
        "inst-active": "Simulation active.",
        "inst-wall":
            "Wall Mode: Click empty space to create a wall. Drag arrows to resize, blue circle to rotate. Click elsewhere to confirm. Double tap an existing wall to edit it again.",
        "inst-wall-edit":
            "Drag arrows to resize, blue circle to rotate, or drag the wall body to move it. Click elsewhere to confirm.",
        "inst-bar": "Rigid Bar Mode: Click first point, then second point.",
        "inst-rope": "Rope Mode: Click first point, then second point.",
        "inst-chain": "Rigid Chain Mode: Click first point, then second point.",
        "inst-eraser": "Eraser Mode: Click an object, bar, or rope to delete it.",
        "limit-reached": "⚠️ Limit of {max} objects reached: delete something before continuing",
        "no-scenes": "(no saved scenes)"
    },
    it: {
        harmony: "Armonia",
        objects: "Oggetti",
        language: "Lingua:",
        "btn-clear": "🧹 Pulisci",
        "btn-undo": "↩️ Annulla",
        "btn-redo": "↪️ Ripeti",
        "reverb-label": "Audio - Riverbero",
        "delay-label": "Audio - Delay",
        "quantize-label": "Quantizzazione Ritmica",
        "bpm-label": "Quantizza - BPM",
        "trail-label": "Visuale - Scia di Movimento",
        "btn-pause": "⏸️ Pausa",
        "btn-play": "▶️ Play",
        "btn-glitch": "⚡ GLITCH",
        "select-object": "Seleziona Oggetto",
        "btn-theme": "🌓 Tema",
        "block-wall": "Muro",
        "timbre-label": "Timbro / Tipo Suono:",
        "scale-label": "Scala Musicale:",
        "interactive-tools": "Strumenti Interattivi:",
        "tool-rope": "🧵 Corda",
        "tool-chain": "⛓️ Catena Rigida",
        "tool-bar": "🔗 Barra",
        "tool-eraser": "🧹 Gomma",
        "bg-trees": "Conteggio Alberi Sfondo",
        "rope-segments": "Segmenti Corda/Catena",
        "gravity-label": "Fisica - Gravità Y",
        "air-drag": "Fisica - Attrito Aria",
        "wind-speed": "Vento - Velocità",
        "wind-turb": "Vento - Turbolenza",
        "reset-physics": "↩️ Ripristina Fisica",
        "saved-scenes": "Scene Salvate:",
        "btn-save": "💾 Salva",
        "btn-load": "📂 Carica",
        "btn-delete": "🗑️ Elimina Selezionata",
        "volume-mixer": "Mixer Volume",
        "btn-reset": "Reset",
        "master-vol": "Volume Principale",
        "inst-default": "Trascina per muovere. Clicca a vuoto per spawnare.",
        "inst-free": "Modalità Libera: Trascina solo per muovere gli oggetti.",
        "inst-paused": "Simulazione in PAUSA.",
        "inst-active": "Simulazione attiva.",
        "inst-wall":
            "Modo Muro: Clicca a vuoto per creare un muro. Trascina le frecce per ridimensionarlo, il cerchio blu per ruotarlo. Clicca altrove per confermare. Doppio tap su un muro esistente per modificarlo di nuovo.",
        "inst-wall-edit":
            "Trascina le frecce per ridimensionare, il cerchio blu per ruotare, oppure trascina il corpo del muro per spostarlo. Clicca altrove per confermare.",
        "inst-bar": "Modo Barra Rigida: Clicca sul primo punto e poi sul secondo.",
        "inst-rope": "Modo Corda: Clicca sul primo punto e poi sul secondo.",
        "inst-chain": "Modo Catena Rigida: Clicca sul primo punto e poi sul secondo.",
        "inst-eraser": "Modo Gomma: Clicca un oggetto, una barra o una corda per cancellarla.",
        "limit-reached": "⚠️ Limite di {max} oggetti raggiunto: cancella qualcosa prima di continuare",
        "no-scenes": "(nessuna scena salvata)"
    }
};

let currentLanguage = "en";

function t(key, replacements = {}) {
    let text = TRANSLATIONS[currentLanguage][key] || TRANSLATIONS["en"][key] || key;
    for (const k in replacements) {
        text = text.replace(`{${k}}`, replacements[k]);
    }
    return text;
}

function updateUILanguage() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (key) {
            el.textContent = t(key);
        }
    });
    updateInstructionText();
    refreshSceneList();
}

function updateInstructionText() {
    const el = document.getElementById("instruction-mode");
    if (!el) return;
    if (isPaused) {
        el.innerText = t("inst-paused");
        return;
    }
    if (editingWallBody) {
        el.innerText = t("inst-wall-edit");
        return;
    }
    if (currentMode === "none") {
        el.innerText = t("inst-free");
    } else if (currentMode === "spawn") {
        if (currentChoice === "wall") {
            el.innerText = t("inst-wall");
        } else {
            el.innerText = t("inst-default");
        }
    } else if (currentMode === "bar") {
        el.innerText = t("inst-bar");
    } else if (currentMode === "rope") {
        el.innerText = t("inst-rope");
    } else if (currentMode === "chain") {
        el.innerText = t("inst-chain");
    } else if (currentMode === "eraser") {
        el.innerText = t("inst-eraser");
    }
}

function setLanguage(lang) {
    if (TRANSLATIONS[lang]) {
        currentLanguage = lang;
        populateScaleSelect();
        populateTimbreSelect();
        updateUILanguage();
    }
}
