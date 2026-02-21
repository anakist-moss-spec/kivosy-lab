// ============================================================
// KIVOSY AI - Safe Storage Module (Incognito-proof)
// ============================================================

const STORAGE_PREFIX = 'kivosy_';

/**
 * Safe localStorage wrapper - NEVER crashes in Incognito mode
 */
export const safeStorage = {
    /**
     * Load data with fallback - essential for incognito mode
     */
    load(key, defaultValue = null) {
        try {
            const saved = localStorage.getItem(STORAGE_PREFIX + key);
            return saved ? JSON.parse(saved) : defaultValue;
        } catch (e) {
            console.warn(`[Storage] Incognito mode: ${key} not available`);
            return defaultValue;
        }
    },

    /**
     * Save data safely - fails silently in incognito
     */
    save(key, value) {
        try {
            localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn(`[Storage] Cannot save ${key} (incognito mode)`);
            return false;
        }
    },

    /**
     * Remove data safely
     */
    remove(key) {
        try {
            localStorage.removeItem(STORAGE_PREFIX + key);
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * Clear all kivosy data
     */
    clear() {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(STORAGE_PREFIX)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (e) {
            return false;
        }
    }
};