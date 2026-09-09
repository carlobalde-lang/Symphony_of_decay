// languages.js — Traduzioni UI (EN/IT) e gestione lingua corrente

const TRANSLATIONS = {
    en: {
        harmony: "Harmony",
        objects: "Objects",
        language: "Language:",
        "btn-clear": "🧹 Clear All",
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
        "theme-label": "Theme:",
        "theme-dark": "🌑 Dark",
        "theme-light": "☀️ Light",
        "theme-cyberpunk": "🤖 Cyberpunk",
        "theme-synthwave": "🌅 Synthwave",
        "theme-matrix": "🟩 Matrix",
        "theme-sunset": "🌇 Sunset",
        "theme-forest": "🌲 Forest",
        "theme-candy": "🍬 Candy",
        "block-wall": "Wall",
        "timbre-label": "Timbre / Sound Type:",
        "scale-label": "Musical Scale:",
        "btn-customize-timbre": "✨ Customize",
        "cust-title": "✨ Customize Sound",
        "cust-hint": "Tweak the current timbre with the sliders: changes apply live to every sound. Then give it a name and save: it joins the Timbre / Sound Type list.",
        "cust-wave1": "Waveform 1 (main)",
        "cust-wave2": "Waveform 2 (harmonic)",
        "cust-sub": "Sub oscillator (octave down)",
        "cust-filter": "Filter type",
        "cust-cutoff": "Filter cutoff",
        "cust-resonance": "Filter resonance",
        "cust-attack": "Attack (s)",
        "cust-decay": "Decay / tail (s)",
        "cust-name-placeholder": "Name your timbre…",
        "cust-save": "💾 Save Timbre",
        "cust-saved": "✓ Timbre saved",
        "cust-use": "✔ Use",
        "cust-your": "Your custom timbres:",
        "cust-delete": "🗑️",
        "cust-empty": "No custom timbres yet.",
        "cust-warn-name": "Write a name first.",
        "interactive-tools": "Interactive Tools:",
        "tool-rope": "🧵 Rope",
        "tool-chain": "⛓️ Rigid Chain",
        "tool-bar": "🔗 Bar",
        "tool-eraser": "🧹 Eraser",
        "tool-select": "🖱️ Select",
        "sel-copy": "📋 Copy",
        "sel-paste": "📥 Paste",
        "sel-mirror": "🪞 Mirror",
        "sel-copied": "📋 Copied selection",
        "sel-pasted": "📥 Pasted selection",
        "sel-mirrored": "🪞 Selection mirrored",
        "sel-rotated": "🔄 Selection rotated",
        "sel-deleted": "🗑️ Selection deleted",
        "sel-count": "{n} selected",
        "tool-snap-grid": "▦ Grid",
        "accordion-objects": "🧩 Spawnable Objects",
        "category-shapes": "🔷 Shapes",
        "category-notes": "🎵 Musical Notes",
        "category-instruments": "🥁 Instruments",
        "category-special": "✨ Special",
        "category-connectors": "🔗 Rope / Chain / Bar",
        "accordion-physics": "🌍 Physics",
        "accordion-audio": "🔊 Audio",
        "accordion-graphics": "🎨 Graphics",
        "record-label": "Record Session",
        "record-start": "⏺️ Record",
        "record-stop": "⏹️ Stop",
        "record-message-start": "🔴 Recording started",
        "record-message-stop": "💾 Recording saved",
        "snap-grid-label": "Snap to Grid",
        "bloom-label": "Bloom / Glow",
        "screenshot-btn": "📸 Save Screenshot (PNG)",
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
            "Drag arrows to resize, blue circle to rotate, or drag the wall body to move it. Use the panel to set its sound. Click elsewhere to confirm.",
        "inst-bar": "Rigid Bar Mode: Click two points, or click-drag between two points.",
        "inst-rope": "Rope Mode: Click two points, or click-drag between two points.",
        "inst-chain": "Rigid Chain Mode: Click two points, or click-drag between two points.",
        "inst-eraser": "Eraser Mode: Click an object, bar, or rope to delete it.",
        "inst-select":
            "Select Mode: click an object to select it, Shift+click to add/remove, drag an empty area to draw a selection box. Drag selected objects to move them. Ctrl+C / Ctrl+V to copy & paste, Ctrl+M / Ctrl+Shift+M to mirror, Delete to remove.",
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
        "obj-inst_kick": "🟣 Kick",
        "obj-inst_snare": "⚪ Snare",
        "obj-inst_hihat_c": "🟡 Hi-Hat Closed",
        "obj-inst_hihat_o": "🟠 Hi-Hat Open",
        "obj-inst_clap": "🟤 Clap",
        "obj-inst_conga": "🟤 Conga",
        "obj-inst_bongo": "🟠 Bongo",
        "obj-inst_clave": "🩶 Clave",
        "dynamic-limit-label": "☑️ Adaptive Performance Limit",
        "dynamic-limit-hint": "Automatically lowers the object limit when performance drops, and raises it again when there's room.",
        "emitter-lifetime-label": "Lifetime (s)",
        "emitter-lifetime-infinite": "∞",
        "emitter-pause": "⏸️ Pause Emitter",
        "emitter-resume": "▶️ Resume Emitter",
        "block-echo": "⚪ Echo Sphere",
        "obj-echo": "⚪ Echo Sphere",
        "wall-panel-title": "🧱 Wall Sound",
        "wall-panel-close": "✕ Close",
        "wall-panel-hint": "Choose the note this wall plays when touched. Tap a key to hear it instantly. The wall takes the note's color: warm colors for low notes, cold for high ones. Gray = no sound of its own.",
        "wall-sound-auto": "🎼 Auto (no own sound)",
        "obj-note_dod": "🔘 Note Do# (C#)",
        "obj-note_reb": "🔘 Note Re# (D#)",
        "obj-note_fad": "🔘 Note Fa# (F#)",
        "obj-note_sold": "🔘 Note Sol# (G#)",
        "obj-note_lad": "🔘 Note La# (A#)",
        "emitter-sync-label": "🎼 Sync to Global Clock",
        "emitter-sync-division-label": "Note Division",
        "global-clock-bpm-label": "Global Clock BPM",
        "global-clock-reset-btn": "↺ Reset Clock Phase",
        "global-clock-reset": "Clock phase reset",
        "emitter-pattern-label": "🎵 Sequencer / Drum Machine",
        "emitter-pattern-add-btn": "+ Add",
        "emitter-pattern-clear-btn": "🗑️ Clear",
        "emitter-pattern-empty": "(empty — uses \"Fires\" above)",
        "emitter-pattern-hint": "Click a step to place the selected instrument. Right-click to clear. Empty steps = rest.",
        "emitter-paint-label": "Paint with:",
        "emitter-vel-hint": "Click a filled step to cycle velocity (· soft ● mid ◉ loud). Drag across steps to paint multiple.",
        "emitter-preset-placeholder": "— Preset pattern —",
        "emitter-chain-label": "Chain",
        "emitter-swing-label": "Swing",
        "btn-help": "❓ Help",
        "help-title": "❓ Help & Instructions",
        "btn-close-help": "✕ Close"
    },
    it: {
        harmony: "Armonia",
        objects: "Oggetti",
        language: "Lingua:",
        "btn-clear": "🧹 Pulisci Tutto",
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
        "theme-label": "Tema:",
        "theme-dark": "🌑 Buio",
        "theme-light": "☀️ Chiaro",
        "theme-cyberpunk": "🤖 Cyberpunk",
        "theme-synthwave": "🌅 Synthwave",
        "theme-matrix": "🟩 Matrix",
        "theme-sunset": "🌇 Tramonto",
        "theme-forest": "🌲 Foresta",
        "theme-candy": "🍬 Caramella",
        "block-wall": "Muro",
        "timbre-label": "Timbro / Tipo Suono:",
        "scale-label": "Scala Musicale:",
        "btn-customize-timbre": "✨ Personalizza",
        "cust-title": "✨ Personalizza Suono",
        "cust-hint": "Regola il timbro attivo con gli slider: le modifiche si applicano subito a tutti i suoni. Poi dagli un nome e salvalo: entra nell'elenco Timbre / Sound Type.",
        "cust-wave1": "Forma d'onda 1 (principale)",
        "cust-wave2": "Forma d'onda 2 (armonica)",
        "cust-sub": "Oscillatore sub (ottava sotto)",
        "cust-filter": "Tipo filtro",
        "cust-cutoff": "Taglio filtro",
        "cust-resonance": "Risonanza filtro",
        "cust-attack": "Attacco (s)",
        "cust-decay": "Decadimento / coda (s)",
        "cust-name-placeholder": "Dai un nome al timbro…",
        "cust-save": "💾 Salva Timbro",
        "cust-saved": "✓ Timbro salvato",
        "cust-use": "✔ Usa",
        "cust-your": "I tuoi timbri personalizzati:",
        "cust-delete": "🗑️",
        "cust-empty": "Nessun timbro personalizzato.",
        "cust-warn-name": "Scrivi prima un nome.",
        "interactive-tools": "Strumenti Interattivi:",
        "tool-rope": "🧵 Corda",
        "tool-chain": "⛓️ Catena Rigida",
        "tool-bar": "🔗 Barra",
        "tool-eraser": "🧹 Gomma",
        "tool-select": "🖱️ Selezione",
        "sel-copy": "📋 Copia",
        "sel-paste": "📥 Incolla",
        "sel-mirror": "🪞 Specchia",
        "sel-copied": "📋 Selezione copiata",
        "sel-pasted": "📥 Selezione incollata",
        "sel-mirrored": "🪞 Selezione specchiata",
        "sel-rotated": "🔄 Selezione ruotata",
        "sel-deleted": "🗑️ Selezione eliminata",
        "sel-count": "{n} selezionati",
        "tool-snap-grid": "▦ Griglia",
        "accordion-objects": "🧩 Oggetti Spawnabili",
        "category-shapes": "🔷 Forme",
        "category-notes": "🎵 Note Musicali",
        "category-instruments": "🥁 Strumenti",
        "category-special": "✨ Speciali",
        "category-connectors": "🔗 Corda / Catena / Barra",
        "accordion-physics": "🌍 Fisica",
        "accordion-audio": "🔊 Audio",
        "accordion-graphics": "🎨 Grafica",
        "record-label": "Registra Sessione",
        "record-start": "⏺️ Registra",
        "record-stop": "⏹️ Ferma",
        "record-message-start": "🔴 Registrazione avviata",
        "record-message-stop": "💾 Registrazione salvata",
        "snap-grid-label": "Snap alla griglia",
        "bloom-label": "Bloom / Bagliore",
        "screenshot-btn": "📸 Salva screenshot (PNG)",
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
            "Trascina le frecce per ridimensionare, il cerchio blu per ruotare, oppure trascina il corpo del muro per spostarlo. Usa il pannello per impostarne il suono. Clicca altrove per confermare.",
        "inst-bar": "Modo Barra Rigida: Clicca due punti, oppure clicca e trascina tra due punti.",
        "inst-rope": "Modo Corda: Clicca due punti, oppure clicca e trascina tra due punti.",
        "inst-chain": "Modo Catena Rigida: Clicca due punti, oppure clicca e trascina tra due punti.",
        "inst-eraser": "Modo Gomma: Clicca un oggetto, una barra o una corda per cancellarla.",
        "inst-select":
            "Modo Selezione: clicca un oggetto per selezionarlo, Maiusc+clic per aggiungerlo/toglierlo, trascina su uno spazio vuoto per disegnare una cornice di selezione. Trascina gli oggetti selezionati per spostarli. Ctrl+C / Ctrl+V per copia e incolla, Ctrl+M / Ctrl+Maiusc+M per specchiare, Canc per eliminare.",
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
        "obj-inst_kick": "🟣 Kick",
        "obj-inst_snare": "⚪ Rullante",
        "obj-inst_hihat_c": "🟡 Hi-Hat Chiuso",
        "obj-inst_hihat_o": "🟠 Hi-Hat Aperto",
        "obj-inst_clap": "🟤 Battere le Mani",
        "obj-inst_conga": "🟤 Conga",
        "obj-inst_bongo": "🟠 Bongo",
        "obj-inst_clave": "🩶 Claves",
        "dynamic-limit-label": "☑️ Limite Prestazioni Adattivo",
        "dynamic-limit-hint": "Abbassa automaticamente il limite oggetti quando le prestazioni calano, e lo rialza quando c'è margine.",
        "emitter-lifetime-label": "Durata (s)",
        "emitter-lifetime-infinite": "∞",
        "emitter-pause": "⏸️ Pausa Emettitore",
        "emitter-resume": "▶️ Riprendi Emettitore",
        "block-echo": "⚪ Sfera Eco",
        "obj-echo": "⚪ Sfera Eco",
        "wall-panel-title": "🧱 Suono del Muro",
        "wall-panel-close": "✕ Chiudi",
        "wall-panel-hint": "Scegli la nota che questo muro suona quando viene toccato. Tocca un tasto per ascoltarla subito. Il muro prende il colore della nota: colori caldi per le note basse, freddi per le alte. Grigio = nessun suono proprio.",
        "wall-sound-auto": "🎼 Auto (nessun suono proprio)",
        "obj-note_dod": "🔘 Nota Do# (C#)",
        "obj-note_reb": "🔘 Nota Re# (D#)",
        "obj-note_fad": "🔘 Nota Fa# (F#)",
        "obj-note_sold": "🔘 Nota Sol# (G#)",
        "obj-note_lad": "🔘 Nota La# (A#)",
        "emitter-sync-label": "🎼 Sincronizza al Clock Globale",
        "emitter-sync-division-label": "Divisione Ritmica",
        "global-clock-bpm-label": "BPM Clock Globale",
        "global-clock-reset-btn": "↺ Reset Fase Clock",
        "global-clock-reset": "Fase del clock azzerata",
        "emitter-pattern-label": "🎵 Sequencer / Drum Machine",
        "emitter-pattern-add-btn": "+ Aggiungi",
        "emitter-pattern-clear-btn": "🗑️ Cancella",
        "emitter-pattern-empty": "(vuoto — usa \"Spara\" sopra)",
        "emitter-pattern-hint": "Clicca uno step per piazzare lo strumento selezionato. Click destro per cancellare. Step vuoti = pausa.",
        "emitter-paint-label": "Disegna con:",
        "emitter-vel-hint": "Clicca uno step pieno per ciclare la velocità (· soft ● medio ◉ forte). Trascina tra gli step per dipingerne più di uno.",
        "emitter-preset-placeholder": "— Pattern preimpostato —",
        "emitter-chain-label": "Catena",
        "emitter-swing-label": "Swing",
        "btn-help": "❓ Aiuto",
        "help-title": "❓ Aiuto e Istruzioni",
        "btn-close-help": "✕ Chiudi"
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
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
        const key = el.getAttribute("data-i18n-title");
        if (key) {
            el.title = t(key);
        }
    });
    updateInstructionText();
    refreshSceneList();
    const helpModal = document.getElementById("help-modal");
    if (helpModal && helpModal.style.display !== "none" && typeof buildHelpHTML === "function") {
        document.getElementById("help-content").innerHTML = buildHelpHTML();
    }
    const custModal = document.getElementById("customize-modal");
    if (custModal && custModal.style.display !== "none" && typeof buildCustomizerContent === "function") {
        buildCustomizerContent();
    }
}

function updateInstructionText() {
    const el = document.getElementById("instruction-mode");
    const shortcutEl = document.getElementById("instruction-shortcuts");
    syncEmitterPanel();
    syncWallPanel();
    if (!el) return;
    const setShortcuts = (text) => {
        if (shortcutEl) shortcutEl.innerText = text || "";
    };
    if (isPaused) {
        el.innerText = t("inst-paused");
        setShortcuts("");
        return;
    }
    if (editingWallBody) {
        el.innerText = editingWallBody.isEmitter ? t("inst-emitter-edit") : t("inst-wall-edit");
        setShortcuts("🖱️ Wheel: angle • 🎯 drag handle • Middle-drag: pan • Wheel: zoom");
        return;
    }
    if (currentMode === "none") {
        el.innerText = t("inst-free");
        setShortcuts("🖱️ Wheel: zoom • Middle-drag: pan");
    } else if (currentMode === "spawn") {
        if (currentChoice === "wall") {
            el.innerText = t("inst-wall");
        } else if (currentChoice === "emitter") {
            el.innerText = t("inst-emitter");
        } else {
            el.innerText = t("inst-default");
        }
        setShortcuts("🖱️ Wheel: zoom • Middle-drag: pan");
    } else if (currentMode === "bar") {
        el.innerText = t("inst-bar");
        setShortcuts("🖱️ Wheel: zoom • Middle-drag: pan");
    } else if (currentMode === "rope") {
        el.innerText = t("inst-rope");
        setShortcuts("🖱️ Wheel: zoom • Middle-drag: pan");
    } else if (currentMode === "chain") {
        el.innerText = t("inst-chain");
        setShortcuts("🖱️ Wheel: zoom • Middle-drag: pan");
    } else if (currentMode === "eraser") {
        el.innerText = t("inst-eraser");
        setShortcuts("🖱️ Wheel: zoom • Middle-drag: pan");
    } else if (currentMode === "select") {
        el.innerText = t("inst-select");
        setShortcuts("R: rot 15° • Shift+R: -15° • Del: elimina • Esc: deseleziona • Ctrl+C: copia • Ctrl+V: incolla • Ctrl+M: specchia • 🖱️ Wheel: zoom • Middle-drag: pan");
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
            populatePatternAddSelect();
            renderEmitterPattern();
        }
        updateUILanguage();
    }
}
