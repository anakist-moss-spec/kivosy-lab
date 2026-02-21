// ============================================================
// KIVOSY AI - Usage Statistics Module
// ============================================================

import { safeStorage } from './storage.js';

class StatsManager {
    constructor() {
        this.stats = { total: 0, gemini: 0, groq: 0, hf: 0 };
        this.load();
    }

    load() {
        const saved = safeStorage.load('usage_stats', this.stats);
        this.stats = saved;
        return this.stats;
    }

    save() {
        safeStorage.save('usage_stats', this.stats);
    }

    /**
     * Sync stats with history
     */
    syncWithHistory(history) {
        this.stats.gemini = (history.gemini || []).length;
        this.stats.groq = (history.groq || []).length;
        this.stats.hf = (history.hf || []).length;
        this.stats.total = this.stats.gemini + this.stats.groq + this.stats.hf;
        this.save();
    }

    recordUsage(model) {
        if (this.stats.hasOwnProperty(model)) {
            this.stats[model]++;
            this.stats.total++;
            this.save();
            this.updateUI();
        }
    }

    updateUI() {
        const elements = {
            total: document.getElementById('stat-total'),
            gemini: document.getElementById('stat-gemini'),
            groq: document.getElementById('stat-groq'),
            hf: document.getElementById('stat-hf')
        };

        Object.entries(elements).forEach(([key, el]) => {
            if (el) el.innerText = this.stats[key].toLocaleString();
        });

        // Update tab badges
        ['gemini', 'groq', 'hf', 'total'].forEach(key => {
            const tabEl = document.getElementById(`tab-${key}`);
            if (tabEl) tabEl.innerText = this.stats[key]?.toLocaleString() || '0';
        });
    }

    getAll() {
        return { ...this.stats };
    }

    reset() {
        this.stats = { total: 0, gemini: 0, groq: 0, hf: 0 };
        this.save();
        this.updateUI();
    }
}

export const statsManager = new StatsManager();