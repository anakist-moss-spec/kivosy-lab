// ============================================================
// KIVOSY AI - Configuration Module
// ============================================================

import { safeStorage } from './storage.js';

export const CONFIG_KEYS = {
    GEMINI_KEY: 'geminiKey',
    GROQ_KEY: 'groqKey',
    HF_KEY: 'hfKey',
    GEMINI_MODEL: 'geminiModel',
    GROQ_MODEL: 'groqModel',
    HF_MODEL: 'hfModel'
};

export const defaultConfig = {
    [CONFIG_KEYS.GEMINI_KEY]: '',
    [CONFIG_KEYS.GROQ_KEY]: '',
    [CONFIG_KEYS.HF_KEY]: '',
    [CONFIG_KEYS.GEMINI_MODEL]: 'gemini-2.5-flash',
    [CONFIG_KEYS.GROQ_MODEL]: 'llama-3.3-70b-versatile',
    [CONFIG_KEYS.HF_MODEL]: 'Qwen/Qwen2.5-72B-Instruct'
};

class ConfigManager {
    constructor() {
        this.config = { ...defaultConfig };
        this.load();
    }

    load() {
        const saved = safeStorage.load('config', defaultConfig);
        this.config = { ...defaultConfig, ...saved };
        return this.config;
    }

    save(newConfig) {
        this.config = { ...this.config, ...newConfig };
        safeStorage.save('config', this.config);
        return this.config;
    }

    get(key) {
        return this.config[key] || defaultConfig[key];
    }

    getAll() {
        return { ...this.config };
    }

    reset() {
        this.config = { ...defaultConfig };
        safeStorage.remove('config');
        return this.config;
    }

    hasAnyKey() {
        return !!(this.config.geminiKey || this.config.groqKey || this.config.hfKey);
    }

    getKeyForService(service) {
        switch(service) {
            case 'gemini': return this.config.geminiKey;
            case 'groq': return this.config.groqKey;
            case 'hf': return this.config.hfKey;
            default: return null;
        }
    }

    getModelForService(service) {
        switch(service) {
            case 'gemini': return this.config.geminiModel;
            case 'groq': return this.config.groqModel;
            case 'hf': return this.config.hfModel;
            default: return null;
        }
    }
}

export const configManager = new ConfigManager();