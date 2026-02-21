// ============================================================
// KIVOSY AI - API Service Module
// ============================================================

import { configManager } from './config.js';
import { historyManager } from './history.js';
import { statsManager } from './stats.js';
import { uiManager } from './ui.js';

export const apiService = {
    /**
     * Clean model name for Gemini API
     */
    getCleanModelName(model) {
        return model.split('/').pop();
    },

    /**
     * Call Gemini API
     */
    async callGemini(prompt) {
        const apiKey = configManager.get('geminiKey');
        const model = configManager.get('geminiModel');
        
        if (!apiKey) throw new Error('Gemini API key is required');
        
        const cleanModel = this.getCleanModelName(model);
        const url = `https://generativelanguage.googleapis.com/v1/models/${cleanModel}:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{ parts: [{ text: prompt }] }]
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    },

    /**
     * Call Groq API
     */
    async callGroq(prompt) {
        const apiKey = configManager.get('groqKey');
        const model = configManager.get('groqModel');
        
        if (!apiKey) throw new Error('Groq API key is required');
        
        const url = 'https://api.groq.com/openai/v1/chat/completions';
        
        const payload = {
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    },

    /**
     * Call Hugging Face API
     */
    async callHuggingFace(prompt) {
        const apiKey = configManager.get('hfKey');
        const model = configManager.get('hfModel');
        
        if (!apiKey) throw new Error('Hugging Face API key is required');
        
        const url = 'https://router.huggingface.co/v1/chat/completions';
        
        const payload = {
            model: model,
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1000
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    },

    /**
     * Process a single model
     */
    async processModel(modelType, prompt, callFn, onSuccess, onError) {
        try {
            const result = await callFn(prompt);
            
            if (result && !result.error) {
                const model = configManager.get(`${modelType}Model`);
                historyManager.add(modelType, prompt, result, model);
                statsManager.recordUsage(modelType);
                
                if (onSuccess) onSuccess(result);
            }
        } catch (error) {
            console.error(`[API] ${modelType} error:`, error);
            if (onError) onError(error);
        }
    },

    /**
     * Call all models in parallel
     */
    async callAllModels(prompt) {
        const keys = {
            gemini: configManager.get('geminiKey'),
            groq: configManager.get('groqKey'),
            hf: configManager.get('hfKey')
        };

        // Create promise array for active services
        const promises = [];

        if (keys.gemini) {
            promises.push(
                this.processModel('gemini', prompt, this.callGemini.bind(this),
                    (result) => uiManager.updateModelResult('gemini', result, prompt),
                    (error) => uiManager.showModelError('gemini', error, prompt)
                )
            );
        } else {
            uiManager.showNoKeyMessage('gemini');
        }

        if (keys.groq) {
            promises.push(
                this.processModel('groq', prompt, this.callGroq.bind(this),
                    (result) => uiManager.updateModelResult('groq', result, prompt),
                    (error) => uiManager.showModelError('groq', error, prompt)
                )
            );
        } else {
            uiManager.showNoKeyMessage('groq');
        }

        if (keys.hf) {
            promises.push(
                this.processModel('hf', prompt, this.callHuggingFace.bind(this),
                    (result) => uiManager.updateModelResult('hf', result, prompt),
                    (error) => uiManager.showModelError('hf', error, prompt)
                )
            );
        } else {
            uiManager.showNoKeyMessage('hf');
        }

        // Initialize result cards
        uiManager.initializeResultCards();

        return Promise.allSettled(promises);
    }
};