// storage.js — Accesso sicuro a localStorage: gestisce JSON corrotti, quota
// superata e contesti restrittivi (security/private) senza far crashare il gioco.

function storageGet(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : raw;
    } catch (e) {
        return fallback;
    }
}

function storageGetJson(key, fallback) {
    const raw = storageGet(key, null);
    if (raw === null) return fallback;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return fallback;
    }
}

function storageSet(key, value) {
    try {
        localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
        return true;
    } catch (e) {
        return false;
    }
}

function storageRemove(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (e) {
        return false;
    }
}