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
        "no-scenes": "(no saved scenes)",
        "block-emitter": "🎯 Emitter",
        "inst-emitter": "Emitter Mode: Click empty space to place an emitter. Drag the arrow to rotate it, drag the body to move it. Click elsewhere to confirm.",
        "inst-emitter-edit": "Drag the blue circle to rotate the emitter, or drag its body to move it. Use the panel to set what it fires. Click elsewhere to confirm.",
        "emitter-panel-title": "🎯 Emitter Settings",
        "emitter-object-label": "Fires:",
        "emitter-power-label": "Launch Power",
        "emitter-bpm-label": "Fire Rate (BPM)",
        "emitter-panel-close": "✕ Close",
        "obj-bass": "Orolite",
        "obj-wood": "Pentacore",
        "obj-mid": "Hexarun",
        "obj-rubber": "Septifor",
        "obj-high": "Octavox",
        "obj-neon": "Astral",
        "obj-note_do": "🔴 Note Do (C)",
        "obj-note_re": "🟠 Note Re (D)",
        "obj-note_mi": "🟡 Note Mi (E)",
        "obj-note_fa": "🟢 Note Fa (F)",
        "obj-note_sol": "🔵 Note Sol (G)",
        "obj-note_la": "🟣 Note La (A)",
        "obj-note_si": "🟪 Note Si (B)",
        "dynamic-limit-label": "⚙️ Adaptive Limit",
        "emitter-lifetime-label": "Lifetime (s)",
        "emitter-lifetime-infinite": "∞",
        "emitter-pause": "⏸️ Pause Emitter",
        "emitter-resume": "▶️ Resume Emitter",
        "emitter-sync-label": "🎼 Sync to Global Clock",
        "emitter-sync-division-label": "Note Division",
        "global-clock-bpm-label": "Global Clock BPM",
        "global-clock-reset-btn": "↺ Reset Clock Phase",
        "global-clock-reset": "Clock phase reset"
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
        "no-scenes": "(nessuna scena salvata)",
        "block-emitter": "🎯 Emettitore",
        "inst-emitter": "Modo Emettitore: Clicca a vuoto per piazzare un emettitore. Trascina la freccia per ruotarlo, trascina il corpo per spostarlo. Clicca altrove per confermare.",
        "inst-emitter-edit": "Trascina il cerchio blu per ruotare l'emettitore, oppure trascina il suo corpo per spostarlo. Usa il pannello per impostare cosa spara. Clicca altrove per confermare.",
        "emitter-panel-title": "🎯 Impostazioni Emettitore",
        "emitter-object-label": "Spara:",
        "emitter-power-label": "Potenza di Lancio",
        "emitter-bpm-label": "Frequenza di Lancio (BPM)",
        "emitter-panel-close": "✕ Chiudi",
        "obj-bass": "Orolite",
        "obj-wood": "Pentacore",
        "obj-mid": "Hexarun",
        "obj-rubber": "Septifor",
        "obj-high": "Octavox",
        "obj-neon": "Astral",
        "obj-note_do": "🔴 Nota Do (C)",
        "obj-note_re": "🟠 Nota Re (D)",
        "obj-note_mi": "🟡 Nota Mi (E)",
        "obj-note_fa": "🟢 Nota Fa (F)",
        "obj-note_sol": "🔵 Nota Sol (G)",
        "obj-note_la": "🟣 Nota La (A)",
        "obj-note_si": "🟪 Nota Si (B)",
        "dynamic-limit-label": "⚙️ Limite Adattivo",
        "emitter-lifetime-label": "Durata (s)",
        "emitter-lifetime-infinite": "∞",
        "emitter-pause": "⏸️ Pausa Emettitore",
        "emitter-resume": "▶️ Riprendi Emettitore",
        "emitter-sync-label": "🎼 Sincronizza al Clock Globale",
        "emitter-sync-division-label": "Divisione Ritmica",
        "global-clock-bpm-label": "BPM Clock Globale",
        "global-clock-reset-btn": "↺ Reset Fase Clock",
        "global-clock-reset": "Fase del clock azzerata"
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
    syncEmitterPanel();
    if (!el) return;
    if (isPaused) {
        el.innerText = t("inst-paused");
        return;
    }
    if (editingWallBody) {
        el.innerText = editingWallBody.isEmitter ? t("inst-emitter-edit") : t("inst-wall-edit");
        return;
    }
    if (currentMode === "none") {
        el.innerText = t("inst-free");
    } else if (currentMode === "spawn") {
        if (currentChoice === "wall") {
            el.innerText = t("inst-wall");
        } else if (currentChoice === "emitter") {
            el.innerText = t("inst-emitter");
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
        if (currentEmitterPanelBody) {
            const savedValue = currentEmitterPanelBody.emitterObjectType;
            populateEmitterObjectSelect();
            document.getElementById("emitter-object-select").value = savedValue;
        }
        updateUILanguage();
    }
}
