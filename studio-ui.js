// Interfaccia dello studio: mantiene strumenti e identificatori del gioco.
let studioTab = 'create';
let _studioSceneCount = -1;
let _studioSceneMax = -1;
let _studioMeterCount = -1;

function setStudioTab(tab, focus = false) {
    if (!['create', 'sound', 'world', 'scenes'].includes(tab)) return;
    studioTab = tab;
    document.querySelectorAll('[data-studio-tab]').forEach(button => {
        const active = button.dataset.studioTab === tab;
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
        if (active && focus) button.focus();
    });
    document.querySelectorAll('[data-studio-panel]').forEach(panel => {
        panel.hidden = panel.dataset.studioPanel !== tab;
    });
}

function syncStudioControls() {
    const play = document.getElementById('btn-pause-play');
    if (play) play.textContent = t(isPaused ? 'btn-play' : 'btn-pause');
    const record = document.getElementById('btn-record');
    if (record && typeof _recording !== 'undefined') {
        record.textContent = t(_recording ? 'record-stop' : 'record-start');
        record.dataset.recording = String(_recording);
    }
    document.querySelectorAll('[data-quick-block]').forEach(button => {
        button.setAttribute('aria-pressed', String(currentMode === 'spawn' && currentChoice === button.dataset.quickBlock));
        button.setAttribute('aria-label', button.dataset.quickBlock === 'emitter' ? t('studio-emitter') : button.title);
    });
    document.querySelectorAll('[data-quick-mode]').forEach(button => {
        button.setAttribute('aria-pressed', String(currentMode === button.dataset.quickMode));
        button.setAttribute('aria-label', t(button.dataset.quickMode === 'select' ? 'studio-select' : button.dataset.quickMode === 'pan' ? 'studio-pan' : 'studio-erase'));
    });
    document.querySelectorAll('.block-btn, #btn-select, #btn-eraser, #btn-rope, #btn-chain, #btn-bar, #btn-snap-grid').forEach(button => {
        button.setAttribute('aria-pressed', String(button.classList.contains('active')));
    });
    const state = document.getElementById('studio-state');
    if (state) {
        state.textContent = t(isPaused ? 'studio-paused' : 'studio-live');
        state.classList.toggle('paused', isPaused);
    }
    const button = document.getElementById('toolbox-toggle');
    if (button) button.setAttribute('aria-expanded', String(!document.getElementById('toolbox').classList.contains('collapsed')));
    const toolbox = document.getElementById("toolbox");
    if (toolbox) toolbox.inert = toolbox.classList.contains("collapsed");
    const close = document.querySelector(".studio-icon-button");
    if (close) close.setAttribute("aria-label", t("studio-close-tools"));
    document.documentElement.lang = currentLanguage;
    const fit = document.getElementById("btn-fit-view");
    if (fit) fit.setAttribute("aria-label", t("studio-fit-view"));
    for (const id of ["btn-pause-play", "btn-undo", "btn-redo", "btn-help", "btn-record"]) {
        const control = document.getElementById(id);
        if (control) { control.title = control.textContent.trim(); control.setAttribute("aria-label", control.title); }
    }
}

function updateStudioSceneState(count) {
    if (_studioSceneCount !== count) {
        _studioSceneCount = count;
        const hint = document.getElementById('studio-empty');
        if (hint) hint.hidden = count > 0;
    }
    const audioLoad = document.getElementById('studio-audio-load');
    if (audioLoad) {
        const overloaded = audioCtx.currentTime - audioLastDroppedAt < 1.5;
        const text = t('studio-audio-load') + ': ' + activeSoundsCount + ' / ' + MAX_ACTIVE_VOICES + (overloaded ? ' · ' + t('studio-audio-overload') : '');
        if (audioLoad.textContent !== text) audioLoad.textContent = text;
        audioLoad.classList.toggle('overloaded', overloaded);
    }
    const meter = document.getElementById('object-meter');
    if (meter && (_studioMeterCount !== count || _studioSceneMax !== MAX_BODIES)) {
        _studioSceneMax = MAX_BODIES;
        _studioMeterCount = count;
        const value = Math.min(100, count / Math.max(1, MAX_BODIES) * 100);
        meter.style.setProperty('--capacity', value + '%');
        meter.setAttribute('aria-valuenow', String(Math.min(count, MAX_BODIES)));
        meter.setAttribute('aria-valuetext', count + ' / ' + MAX_BODIES);
        meter.setAttribute('aria-valuemax', String(MAX_BODIES));
    }
}

function isPointOverStudioUI(x, y) {
    return [...document.querySelectorAll('[data-canvas-overlay]')].some(element => {
        if (!element.getClientRects().length || element.hidden) return false;
        const style = getComputedStyle(element);
        if (style.visibility === 'hidden' || style.pointerEvents === 'none') return false;
        const r = element.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
}

function fitStudioCamera() {
    const bounds = boundaryInnerRect();
    const compact = window.innerWidth <= 900;
    const toolbox = document.getElementById('toolbox');
    const reserved = !compact && !toolbox.classList.contains('collapsed') ? toolbox.getBoundingClientRect().width + 40 : 0;
    const width = Math.max(120, logicalWidth - reserved - 64);
    const height = Math.max(120, logicalHeight - 240);
    camZoom = Math.max(CAM_MIN_ZOOM, Math.min(CAM_MAX_ZOOM, width / ((bounds.right - bounds.left) * SCALE), height / ((bounds.bottom - bounds.top) * SCALE)));
    camOffsetX = (logicalWidth - reserved) / 2 - (bounds.left + bounds.right) * SCALE * camZoom / 2;
    camOffsetY = logicalHeight / 2 - (bounds.top + bounds.bottom) * SCALE * camZoom / 2;
}

function initStudioUI() {
    const toolbox = document.getElementById('toolbox');
    if (window.innerWidth > 900) toolbox.classList.remove('collapsed');
    document.getElementById('toolbox-toggle').setAttribute('aria-controls', 'toolbox');
    const audioLoad = document.createElement('p');
    audioLoad.id = 'studio-audio-load';
    document.getElementById('studio-status').appendChild(audioLoad);
    const stop = document.createElement('button');
    stop.id = 'btn-stop-sounds';
    stop.className = 'sub-btn';
    stop.dataset.i18n = 'studio-stop-sounds';
    stop.textContent = t('studio-stop-sounds');
    stop.addEventListener('click', stopAllSounds);
    const controls = document.getElementById('top-center-controls');
    const fit = document.createElement('button');
    fit.id = 'btn-fit-view';
    fit.className = 'sub-btn';
    fit.textContent = '↔';
    fit.dataset.i18nTitle = 'studio-fit-view';
    fit.setAttribute('aria-label', t('studio-fit-view'));
    fit.addEventListener('click', fitStudioCamera);
    controls.appendChild(fit);
    controls.prepend(document.getElementById('btn-pause-play'));
    controls.insertBefore(document.getElementById('btn-record'), document.getElementById('btn-help'));
    // Le schede tengono tutti i controlli originali, senza duplicare gli ID.
    const tabs = ['create', 'world', 'sound', 'world'];
    const sections = [...toolbox.querySelectorAll(':scope > details.accordion')];
    for (const tab of ['create', 'sound', 'world']) {
        const panel = document.createElement('section');
        panel.id = 'studio-panel-' + tab;
        panel.dataset.studioPanel = tab;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', 'studio-tab-' + tab);
        sections.forEach((section, i) => {
            if (tabs[i] === tab) { section.open = true; panel.appendChild(section); }
        });
        toolbox.insertBefore(panel, document.getElementById('studio-panel-scenes'));
    }
    document.getElementById('studio-panel-sound').prepend(stop);
    document.getElementById('studio-panel-create').prepend(toolbox.querySelector('.select-tools'));
    // Il gruppo di registrazione ora è nel trasporto in alto.
    const emptyRecordGroup = document.querySelector('#studio-panel-sound .tool-group');
    if (emptyRecordGroup && !emptyRecordGroup.querySelector('button')) emptyRecordGroup.remove();
    const menu = toolbox.querySelector(':scope > .menu-controls');
    const clear = menu.querySelector('[onclick="clearSceneAction()"]');
    document.getElementById('studio-panel-scenes').appendChild(clear);
    const glitch = menu.querySelector('[onclick="triggerDecay()"]');
    glitch.classList.add('studio-glitch');
    document.getElementById('studio-panel-create').appendChild(glitch);
    menu.remove();
    for (const button of document.querySelectorAll('[data-studio-tab]')) {
        button.addEventListener('click', () => setStudioTab(button.dataset.studioTab));
        button.addEventListener('keydown', event => {
            const list = [...document.querySelectorAll('[data-studio-tab]')];
            let index = list.indexOf(button);
            if (event.key === 'ArrowRight') index = (index + 1) % list.length;
            else if (event.key === 'ArrowLeft') index = (index - 1 + list.length) % list.length;
            else if (event.key === 'Home') index = 0;
            else if (event.key === 'End') index = list.length - 1;
            else return;
            event.preventDefault();
            setStudioTab(list[index].dataset.studioTab, true);
        });
    }
    document.querySelectorAll('input[id], select[id]').forEach(field => {
        const group = field.closest('.tool-group, .mixer-item');
        const label = group && group.querySelector('label');
        if (label && !label.htmlFor && group.querySelector('input,select') === field) label.htmlFor = field.id;
    });
    document.getElementById('instruction-mode').setAttribute('role', 'status');
    document.getElementById('instruction-mode').setAttribute('aria-live', 'polite');
    setStudioTab('create');
    syncStudioControls();
    updateStudioSceneState(getSpawnedBodyCount());
}
