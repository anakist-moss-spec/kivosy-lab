// KIVOSY AI Command Center - Client-Side Application
// BYOK (Bring Your Own Key) - Keys stored only in browser localStorage
// OPTIMIZED VERSION - All duplicates removed, features preserved

// ========== Configuration & State Management ==========
const CONFIG_KEY = 'kivosy_ai_config';
const HISTORY_KEY = 'kivosy_ai_history';

// [이수석의 핵심 처방] 시크릿 모드에서도 앱을 살려내는 안전 로딩 함수
function loadSafeData(key, defaultValue) {
    try {
        const savedData = localStorage.getItem(key);
        if (!savedData) return defaultValue;
        return JSON.parse(savedData);
    } catch (e) {
        // 시크릿 모드에서 localStorage 접근 에러가 나면 여기로 옵니다!
        console.warn(`[Storage Warning] 시크릿 모드 감지됨 (${key}). 기본값을 사용합니다.`);
        return defaultValue; 
    }
}

// Default configuration
const defaultConfig = {
    geminiKey: '',
    groqKey: '',
    hfKey: '',
    geminiModel: 'gemini-2.5-flash',
    groqModel: 'llama-3.3-70b-versatile',
    hfModel: 'Qwen/Qwen2.5-72B-Instruct'
};

// Chat history structure
let chatHistory = {
    gemini: [],
    groq: [],
    hf: []
};

// ========== Toast/Notification System (MERGED: showToast + showNotification) ==========
function showToast(message, targetElement = null, type = "success") {
    // Console log for debugging
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Try to use dedicated toast element first
    const toast = document.getElementById("toast");
    
    if (toast && targetElement) {
        // Toast bubble positioning (original showToast logic)
        toast.innerText = message;
        toast.style.backgroundColor = type === "error" ? "#dc3545" : "#28a745";
        
        const rect = targetElement.getBoundingClientRect();
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        toast.style.left = (rect.left + scrollLeft + (rect.width / 2)) + "px";
        toast.style.top = (rect.top + scrollTop - 35) + "px";
        toast.style.transform = "translateX(-50%)";
        
        toast.classList.add("show");
        
        setTimeout(() => {
            toast.classList.remove("show");
        }, 2000);
    } else {
        // Fallback notification bubble (original showNotification logic)
        const notification = document.createElement('div');
        notification.className = `notification-bubble ${type}`;
        notification.innerText = message;
        document.body.appendChild(notification);
        
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            notification.style.left = `${rect.left + (rect.width / 2)}px`;
            notification.style.top = `${window.scrollY + rect.top - 20}px`;
        } else {
            notification.style.left = '50%';
            notification.style.bottom = '30px';
        }
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 2000);
    }
}

// ========== Configuration Management ==========
function loadConfig() {
    try {
        const saved = localStorage.getItem(CONFIG_KEY);
        if (saved) {
            const config = JSON.parse(saved);
            document.getElementById('gemini-key').value = config.geminiKey || '';
            document.getElementById('groq-key').value = config.groqKey || '';
            document.getElementById('hf-key').value = config.hfKey || '';
            document.getElementById('gemini-model').value = config.geminiModel || defaultConfig.geminiModel;
            document.getElementById('groq-model').value = config.groqModel || defaultConfig.groqModel;
            document.getElementById('hf-model').value = config.hfModel || defaultConfig.hfModel;
        }
    } catch (e) {
        console.error('Error loading config:', e);
    }
}

function saveConfig(event) {
    const geminiKey = document.getElementById('gemini-key').value.trim();
    const groqKey = document.getElementById('groq-key').value.trim();
    const hfKey = document.getElementById('hf-key').value.trim();

    if (!geminiKey && !groqKey && !hfKey) {
        showToast("⚠️ Please enter an API Key!", event.target, "error");
        return;
    }

    const config = {
        geminiKey: geminiKey,
        groqKey: groqKey,
        hfKey: hfKey,
        geminiModel: document.getElementById('gemini-model').value,
        groqModel: document.getElementById('groq-model').value,
        hfModel: document.getElementById('hf-model').value
    };
    
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    showToast("✅ Settings Saved!", event.currentTarget, "success");
    
    if (typeof updateModelDisplays === 'function') updateModelDisplays();
}

function clearConfig(event) {
    if (confirm('Are you sure you want to delete all API keys and settings?')) {
        localStorage.removeItem(CONFIG_KEY);
        document.getElementById('gemini-key').value = '';
        document.getElementById('groq-key').value = '';
        document.getElementById('hf-key').value = '';
        document.getElementById('gemini-model').value = defaultConfig.geminiModel;
        document.getElementById('groq-model').value = defaultConfig.groqModel;
        document.getElementById('hf-model').value = defaultConfig.hfModel;

        showToast("🗑️ Reset Complete!", event.target, "success");
    }
}

// ========== History Management (MERGED: addToHistory + saveToHistory) ==========
function loadHistory() {
    try {
        const saved = localStorage.getItem(HISTORY_KEY);
        if (saved) {
            chatHistory = JSON.parse(saved);
            renderHistory();

            // --- [이 부분이 핵심!] 히스토리를 불러온 직후 통계도 맞춥니다 ---
            syncStatsWithHistory(); 
            refreshStatsUI();
            // --------------------------------------------------------
        }
    } catch (e) {
        console.error('Error loading history:', e);
    }
}

function saveHistory() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(chatHistory));
    renderHistory();
}

// Unified history addition function (combines addToHistory + saveToHistory features)
function addToHistory(service, prompt, response, model) {
    if (!chatHistory[service]) {
        chatHistory[service] = [];
    }
    
    // --- [추가] 통계 카운트 업! ---
    recordUsage(service); 
    // ---------------------------

    const newEntry = {
        prompt: prompt,
        response: response,
        timestamp: new Date().toISOString(),
        model: model
    };
    
    // Add to beginning (unshift for newest first) - from saveToHistory
    chatHistory[service].unshift(newEntry);
    
    // Keep within limits - from both functions (50 max from addToHistory, 20 from saveToHistory)
    // Using 50 as the higher limit to preserve maximum functionality
    if (chatHistory[service].length > 50) {
        chatHistory[service] = chatHistory[service].slice(0, 50);
    }
    
    saveHistory();
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all chat history?')) {
        chatHistory = { gemini: [], groq: [], hf: [] };
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
        showToast('🗑️ History cleared!', null, 'info');
    }
}

// ========== History Rendering with Quick Send ==========
// ========== History Rendering (복구 및 기능 개선 버전) ==========
function renderHistory() {
    const container = document.getElementById('history-container');
    if (!container) return;
    
    let html = '';
    const allMessages = [];
    
    // 1. 모든 서비스의 메시지를 하나로 모으기
    for (const [service, messages] of Object.entries(chatHistory)) {
        messages.forEach((msg, index) => {
            // 원본 인덱스를 보존해서 넘겨줘야 정확한 답변을 찾습니다.
            allMessages.push({ ...msg, service: service, originalIndex: index });
        });
    }
    
    // 2. 최신순 정렬
    allMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (allMessages.length === 0) {
        html = '<div class="empty-history">No messages yet. Start chatting!</div>';
    } else {
        allMessages.slice(0, 20).forEach(msg => {
            const serviceIcons = { gemini: '🤖', groq: '⚡', hf: '🤗' };
            
            // 3. [핵심 수정] onclick 부분을 안전하게 변경
            // msg.originalIndex를 직접 사용해서 데이터 유실 방지
            html += `
                <div class="history-item" 
                    onclick="showPastChat('${msg.service}', ${msg.originalIndex})" 
                    title="📂 Click to view this conversation" 
                    style="cursor:pointer;">
                    <small>${serviceIcons[msg.service] || '💬'} ${msg.service.toUpperCase()}</small>
                    <div class="history-prompt">
                        Q: ${escapeHtml(msg.prompt.substring(0, 50))}${msg.prompt.length > 50 ? '...' : ''}
                        <span class="quick-send-bolt">📂</span>
                    </div>
                </div>
            `;
        });
    }
    container.innerHTML = html;
}

// =============================================
// 과거 답변을 모달로 박스 안에 예쁘게 가두는 버전
// =============================================
function showPastChat(service, index) {
    const historyItem = chatHistory[service][index];
    if (!historyItem) return;

    const modal = document.getElementById('history-modal');
    const modalBody = document.getElementById('modal-body');
    const modalContent = modal.querySelector('.modal-content'); 

    if (!modal || !modalBody) return;

    const formattedHTML = formatResponse(historyItem.response || "No response saved.");

    // [핵심] 여기에 id="modal-prompt-text"가 반드시 있어야 reusePrompt가 작동합니다.
    modalBody.innerHTML = `
        <div class="past-view-container">
            <div class="user-bubble" style="background:#f0f4f8; border-radius:8px; padding:12px;">
                <span style="font-size:10px; font-weight:bold; color:var(--accent-primary);">👤 QUESTION</span>
                <div id="modal-prompt-text" style="font-size:13px; margin-top:5px; line-height:1.4;">${escapeHtml(historyItem.prompt)}</div>
            </div>
            
            <div class="ai-bubble ${service}" style="margin-top:10px; border-top:2px solid var(--accent-primary); padding-top:15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <span style="font-size:11px; font-weight:bold; opacity:0.7;">📜 ${service.toUpperCase()} ARCHIVE</span>
                    <button onclick="saveAsPDF_Individual(this)" class="mini-pdf-btn">📕 PDF</button>
                </div>
                <div class="bubble-text markdown-body" style="font-size:14px; line-height:1.6;">
                    ${formattedHTML}
                </div>
            </div>
        </div>
    `;

    modal.style.display = "block";

    requestAnimationFrame(() => {
        if (modalContent) modalContent.scrollTop = 0;
        modal.scrollTop = 0;
    });

    showToast('Conversation loaded successfully!', null, 'success');
}


function reusePrompt() {
    const promptElement = document.getElementById('modal-prompt-text');
    if (!promptElement) {
        showToast('No prompt found.', null, 'error');
        return;
    }

    const promptText = promptElement.textContent.trim();

    // 🚩 [수석비서의 치트키] ID가 틀려도 어떻게든 입력창을 찾아냅니다.
    const userInput = document.getElementById('user-input') || 
                      document.querySelector('textarea') || 
                      document.querySelector('input[type="text"]');
    
    if (userInput) {
        userInput.value = promptText;
        
        // 모달 닫기
        closeHistoryModal();
        
        // 높이 조절 및 포커스
        setTimeout(() => {
            userInput.style.height = 'auto';
            userInput.style.height = userInput.scrollHeight + 'px';
            userInput.focus();
            userInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        
        showToast('Prompt restored!', null, 'success');
    } else {
        // 진짜로 못 찾으면 공장장님께 보고
        showToast('Critical: Input box not found on this page!', null, 'error');
        console.error('수석비서 보고: 공장장님, HTML에 글 쓰는 textarea나 input이 아예 없는데요?!');
    }
}



// [탈출] 히스토리 모달 닫기
function closeHistoryModal() {
    const modal = document.getElementById('history-modal');
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = 'auto';
        
        // 닫을 때 미리 올려두기
        const modalContent = document.querySelector('.modal-content');
        if (modalContent) modalContent.scrollTop = 0;
    }
}





// ========== Quick Send Function (수정 버전) ==========
function loadPastChat(prompt, event) {
    const promptInput = document.getElementById('main-prompt'); 
    if (!promptInput) return;

    promptInput.value = prompt;
    promptInput.style.height = 'auto';
    promptInput.style.height = (promptInput.scrollHeight) + 'px';
    promptInput.focus();

    // 키가 하나라도 있는지 체크
    const hasKey = document.getElementById('gemini-key')?.value.trim() || 
                   document.getElementById('groq-key')?.value.trim() || 
                   document.getElementById('hf-key')?.value.trim();

    if (!hasKey) {
        // 🚩 여기가 범인이었습니다! 
        // 딥시크가 넣은 openModal 대신 공장장님의 alert 로직으로 복구!
        alert('⚠️ API Key Required!\n\nPlease enter at least one API key in the sidebar to use the Quick Send feature.');
        
        // 사이드바 강조하면서 스크롤
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.scrollIntoView({ behavior: 'smooth' });
    } else {
        showToast('🚀 Re-sending prompt...', null, 'success');
        setTimeout(() => {
            document.getElementById('main-send')?.click();
        }, 300);
    }
}

// ========== Utility Functions ==========
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateModelDisplays() {
    const geminiDisplay = document.getElementById('gemini-model-display');
    const groqDisplay = document.getElementById('groq-model-display');
    const hfDisplay = document.getElementById('hf-model-display');
    
    if (geminiDisplay) geminiDisplay.textContent = document.getElementById('gemini-model').value;
    if (groqDisplay) groqDisplay.textContent = document.getElementById('groq-model').value;
    if (hfDisplay) hfDisplay.textContent = document.getElementById('hf-model').value;
}

function getCleanModelName(model) {
    return model.split('/').pop();
}

// ========== API Calls ==========
async function callGemini(prompt) {
    const apiKey = document.getElementById('gemini-key').value;
    const model = document.getElementById('gemini-model').value;
    const cleanModel = getCleanModelName(model);
    
    if (!apiKey) throw new Error('Gemini API key is required');
    
    const url = `https://generativelanguage.googleapis.com/v1/models/${cleanModel}:generateContent?key=${apiKey}`;
    
    const payload = {
        contents: [{
            parts: [{ text: prompt }]
        }]
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
}

async function callGroq(prompt) {
    const apiKey = document.getElementById('groq-key').value;
    const model = document.getElementById('groq-model').value;
    
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
}

async function callHuggingFace(prompt) {
    const apiKey = document.getElementById('hf-key').value;
    const model = document.getElementById('hf-model').value;
    
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
}

async function callAllModels(prompt) {
    const resultsDiv = document.getElementById('unified-results');
    if (!resultsDiv) return;

    // 0. 현재 어떤 탭을 보고 있는지 확인 (Gemini, Groq, HF, unified)
    const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-tab');
    
    // 1. 현재 탭의 키가 있는지 먼저 검사 (1:1 모드일 때만)
    if (activeTab && activeTab !== 'unified') {
        const currentKey = document.getElementById(`${activeTab}-key`)?.value.trim();
        if (!currentKey) {
            // 🚩 핵심: 1:1 대화창에 즉시 에러 배달
            const individualTab = document.getElementById(`${activeTab}-tab`);
            if (individualTab) {
                individualTab.innerHTML += `
                    <div class="chat-entry">
                        <div class="user-bubble">
                            <span class="bubble-label">👤 MY QUESTION</span>
                            <div class="bubble-text">${escapeHtml(prompt)}</div>
                        </div>
                        <div class="ai-bubble" style="margin-top:10px; border: 1px solid #fad2cf; background: #feefee; padding: 15px; border-radius: 12px;">
                            <div style="color: #d93025; font-weight: bold;">⚠️ API Key Missing</div>
                            <p style="font-size: 13px; color: #3c4043; margin-top: 5px;">
                                Please enter your ${activeTab.toUpperCase()} API key in Settings to use this model.
                            </p>
                        </div>
                    </div>
                `;
                setTimeout(() => { individualTab.scrollTop = individualTab.scrollHeight; }, 100);
            }
            showToast(`Please set ${activeTab.toUpperCase()} API Key!`, null, "error");
            return; // 🛑 키가 없으면 여기서 함수 중단 (서버 호출 안함)
        }
    }

    // 2. 통합 화면(All대화) 초기 UI 세팅
    resultsDiv.innerHTML = `
        <div class="result-card" id="gemini-card">
            <div class="card-header"><span class="model-name">🤖 GEMINI</span></div>
            <div class="result-content"><div class="spinner"></div> Thinking...</div>
        </div>
        <div class="result-card" id="groq-card">
            <div class="card-header"><span class="model-name">⚡ GROQ</span></div>
            <div class="result-content"><div class="spinner"></div> Thinking...</div>
        </div>
        <div class="result-card" id="hf-card">
            <div class="card-header"><span class="model-name">🤗 HUGGING FACE</span></div>
            <div class="result-content"><div class="spinner"></div> Thinking...</div>
        </div>
    `;

    // 2. 🚀 개별 모델 처리 공정 정의
    const processModel = async (modelType, callFn, modelIdSelector) => {
        try {
            const result = await callFn(prompt);
            
            if (result && !result.error) {
                // 히스토리 저장
                addToHistory(modelType, prompt, result, document.getElementById(modelIdSelector).value);

                // 1:1 개별 탭 화면에 답변 배달
                const individualTab = document.getElementById(`${modelType}-tab`);
                if (individualTab) {
                    const formattedHTML = formatResponse(result); 
                    individualTab.innerHTML += `
                        <div class="chat-entry">
                            <div class="user-bubble">
                                <span class="bubble-label">👤 MY QUESTION</span>
                                <div class="bubble-text">${escapeHtml(prompt)}</div>
                            </div>
                            <div class="ai-bubble ${modelType}" id="${modelType}-msg-${Date.now()}">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px dashed rgba(0,0,0,0.1); padding-bottom: 5px;">
                                    <span class="bubble-label">✨ ${modelType.toUpperCase()}</span>
                                    <div class="mini-actions">
                                        <button onclick="saveAsPDF_Individual(this)" class="mini-pdf-btn">📕 PDF</button>
                                    </div>
                                </div>
                                <div class="bubble-text">${formattedHTML}</div>
                            </div>
                        </div>
                        <div class="chat-spacer"></div>
                    `;
                    setTimeout(() => { individualTab.scrollTop = individualTab.scrollHeight; }, 100);
                }

                // 통합 화면 카드 업데이트
                const oldCard = document.getElementById(`${modelType}-card`);
                if (oldCard) {
                    oldCard.outerHTML = createResultCard(modelType, formatResponse(result));
                    const remote = document.getElementById('quick-remote');
                    if (remote) remote.style.display = 'flex'; 
                }
            }
        } catch (e) {
            // [에러 처리] 통합 화면 카드 업데이트
            const cardContent = document.querySelector(`#${modelType}-card .result-content`);
            if (cardContent) {
                cardContent.innerHTML = `
                    <div style="color: #d93025; background: #feefee; padding: 10px; border-radius: 8px; border: 1px solid #fad2cf; font-size: 13px;">
                        <strong>⚠️ API Error:</strong> ${e.message}
                    </div>
                `;
            }

            // [에러 처리] 개별 탭 에러 배달
            const individualTab = document.getElementById(`${modelType}-tab`);
            if (individualTab) {
                individualTab.innerHTML += `
                    <div class="chat-entry">
                        <div class="user-bubble">
                            <span class="bubble-label">👤 MY QUESTION</span>
                            <div class="bubble-text">${escapeHtml(prompt)}</div>
                        </div>
                        <div class="ai-bubble" style="margin-top:10px; border: 1px solid #fad2cf; background: #feefee; padding: 15px; border-radius: 12px;">
                            <div style="display: flex; align-items: center; gap: 8px; color: #d93025; font-weight: bold; margin-bottom: 8px;">
                                <span>🚫</span> Connection Failed (${modelType.toUpperCase()})
                            </div>
                            <p style="font-size: 13px; color: #3c4043; line-height: 1.5; margin: 0;">
                                <strong>Reason:</strong> ${e.message}<br>
                                <span style="font-size: 11px; color: #70757a;">Check your API key in Settings.</span>
                            </p>
                        </div>
                    </div>
                    <div class="chat-spacer"></div>
                `;
                setTimeout(() => { individualTab.scrollTop = individualTab.scrollHeight; }, 100);
            }
            showToast(`${modelType.toUpperCase()} Error!`, null, 'error');
        }
    };

    // 3. 🚦 동시 발사 (키가 있는 녀석만!)
    const keys = {
        gemini: document.getElementById('gemini-key')?.value.trim(),
        groq: document.getElementById('groq-key')?.value.trim(),
        hf: document.getElementById('hf-key')?.value.trim()
    };

    // --- 🤖 GEMINI 처리 ---
    if (keys.gemini) {
        processModel('gemini', callGemini, 'gemini-model');
    } else {
        // 통합 카드 문구
        const card = document.querySelector('#gemini-card .result-content');
        if (card) card.innerHTML = "<span style='color: #9aa0a6; font-style: italic;'>Waiting for API Key...</span>";
        
        // [추가] 1:1 탭에도 안내 문구 배달
        const individualTab = document.getElementById('gemini-tab');
        if (individualTab && individualTab.innerHTML.trim() === "") { // 탭이 비어있을 때만
            individualTab.innerHTML = `<div style="text-align:center; padding:40px; color:#9aa0a6; font-style:italic;">⚠️ Gemini API Key is required to start chatting here.</div>`;
        }
    }

    // --- ⚡ GROQ 처리 ---
    if (keys.groq) {
        processModel('groq', callGroq, 'groq-model');
    } else {
        // 통합 카드 문구
        const card = document.querySelector('#groq-card .result-content');
        if (card) card.innerHTML = "<span style='color: #9aa0a6; font-style: italic;'>Waiting for API Key...</span>";
        
        // [추가] 1:1 탭에도 안내 문구 배달
        const individualTab = document.getElementById('groq-tab');
        if (individualTab && individualTab.innerHTML.trim() === "") {
            individualTab.innerHTML = `<div style="text-align:center; padding:40px; color:#9aa0a6; font-style:italic;">⚠️ Groq API Key is required to start chatting here.</div>`;
        }
    }

    // --- 🤗 HUGGING FACE 처리 ---
    if (keys.hf) {
        processModel('hf', callHuggingFace, 'hf-model');
    } else {
        // 통합 카드 문구
        const card = document.querySelector('#hf-card .result-content');
        if (card) card.innerHTML = "<span style='color: #9aa0a6; font-style: italic;'>Waiting for API Key...</span>";
        
        // [추가] 1:1 탭에도 안내 문구 배달
        const individualTab = document.getElementById('hf-tab');
        if (individualTab && individualTab.innerHTML.trim() === "") {
            individualTab.innerHTML = `<div style="text-align:center; padding:40px; color:#9aa0a6; font-style:italic;">⚠️ Hugging Face API Key is required to start chatting here.</div>`;
        }
    }
}


// 🧱 마크다운 엔진(Marked.js)을 사용한 렌더링 함수
function formatResponse(text) {
    if (!text) return "";
    
    // Marked.js 옵션 설정 (줄바꿈 허용)
    marked.setOptions({ breaks: true, gfm: true });
    
    return marked.parse(text); 
}


// ========== Modal System ==========

// 1. 열기/닫기 기본 함수
function openModal(modalId = 'guideModal') {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = "block";
}

function closeModal(modalId = 'guideModal') {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = "none";
}

// 2. 히스토리 전용 닫기 함수 (여기에 이미 있다면 그대로 두세요)
function closeHistoryModal() {
    const modal = document.getElementById('history-modal');
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = 'auto'; // 스크롤 복구
    }
}

// 3. ✅ 통합 모달 닫기 시스템 (이것만 window.onclick으로 남깁니다)
window.onclick = function(event) {
    const guideModal = document.getElementById('guideModal');
    const historyModal = document.getElementById('history-modal');

    // 보안 가이드 모달 배경 클릭
    if (event.target == guideModal) {
        guideModal.style.display = "none";
    }
    
    // 히스토리 모달 배경 클릭
    if (event.target == historyModal) {
        closeHistoryModal(); 
    }
};

// ========== Guide Popup Function ==========
function showGuide() {
    const target = document.getElementById('gemini-key');
    const popup = document.getElementById('guide-popup');
    if (!target || !popup) return;
    
    const parentDetails = target.closest('details');
    if (parentDetails) {
        parentDetails.open = true;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
        target.focus();
        target.classList.add('highlight-input');
        
        const rect = target.getBoundingClientRect();
        popup.style.display = 'block';
        popup.style.top = (window.scrollY + rect.top - 10) + 'px';
        popup.style.left = (rect.right + 15) + 'px';

        setTimeout(() => {
            target.classList.remove('highlight-input');
            popup.style.display = 'none';
        }, 3000);
    }, 500);
}

// ========== Event Listeners Setup ==========
function setupEventListeners() {
    // Tab switching (수정된 버전 - 하단 신호등 연동)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget;
            const tabId = target.getAttribute('data-tab');
            
            // 🎯 핵심: 모든 기능을 통합 관리하는 switchTab을 여기서 호출합니다!
            // 화면 전환 + 상단 탭 불 켜기 + 하단 뱃지 불 켜기를 한 번에 처리합니다.
            if (typeof switchTab === 'function') {
                switchTab(tabId);
            } else {
                // 혹시 switchTab이 없으면 기존 로직이라도 실행
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                target.classList.add('active');
                const targetTab = document.getElementById(`${tabId}-tab`);
                if (targetTab) targetTab.classList.add('active');
            }
        });
    });

    // 🚀 [공장장님 전용 수정 설비: 입력 완료 시 현재 닫고 + 다음 칸 열기]
    ['gemini-key', 'groq-key', 'hf-key'].forEach((id, index, array) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', (e) => {
                if (e.target.value.trim() !== "") {
                    // 1. 현재 입력한 칸 '착' 접기
                    const currentDetails = e.target.closest('.config-group');
                    if (currentDetails) currentDetails.removeAttribute('open');

                    // 2. 다음 모델 칸 '스르륵' 열기
                    const nextId = array[index + 1]; // 다음 ID (gemini -> groq -> hf)
                    if (nextId) {
                        const nextEl = document.getElementById(nextId);
                        const nextDetails = nextEl.closest('.config-group');
                        if (nextDetails) nextDetails.setAttribute('open', '');
                    }
                }
            });
        }
    });
    
    // (이 부분이 빠져있어서 세이브가 안 된 겁니다!)
    const saveKeysBtn = document.getElementById('save-keys');
    if (saveKeysBtn) {
        saveKeysBtn.addEventListener('click', (e) => {
            saveConfig(e); 
        });
    }

    const clearKeysBtn = document.getElementById('clear-keys');
    if (clearKeysBtn) clearKeysBtn.addEventListener('click', clearConfig);

    // Model selection updates
    ['gemini-model', 'groq-model', 'hf-model'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener(id === 'hf-model' ? 'input' : 'change', updateModelDisplays);
        }
    });

    // Main send button
    const mainSend = document.getElementById('main-send');
    if (mainSend) {
        mainSend.addEventListener('click', async () => {
            const promptInput = document.getElementById('main-prompt');
            const prompt = promptInput ? promptInput.value.trim() : "";
            
            if (!prompt) {
                showToast('Please enter a prompt', promptInput, 'error');
                return;
            }
            await callAllModels(prompt);
            if (promptInput) promptInput.value = ''; // Clear after send
        });
    }

    // [엔터 키 전송 로직 업데이트]
    const mainPrompt = document.getElementById('main-prompt');
    if (mainPrompt) {
        mainPrompt.addEventListener('keydown', (e) => {
            // 1. 한글 입력 시 엔터 중복 실행 방지 (isComposing)
            if (e.isComposing) return;

            // 2. 엔터키를 눌렀을 때 (Shift 키를 안 누른 상태)
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // 줄 바꿈 방지
                
                const mainSend = document.getElementById('main-send');
                if (mainSend) {
                    mainSend.click(); // 전송 버튼 클릭 강제 실행!
                    console.log("🚀 엔터키로 메세지 발사!");
                }
            }
            
            // 3. Shift + Enter는 자연스럽게 줄 바꿈이 되도록 내버려둡니다.
        });
    }

// 🎯 Sidebar toggle (아이콘 변경 + 자동 접힘 기능 통합)
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const body = document.body;

    function updateSidebarUI() {
        const isCollapsed = sidebar.classList.contains('collapsed');
        // 아이콘 변경: 접혔을 땐 ❯, 열렸을 땐 ☰
        if (sidebarToggle) {
            sidebarToggle.innerText = isCollapsed ? '❯' : '☰';
        }
    }

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation(); 
            sidebar.classList.toggle('collapsed');
            body.classList.toggle('sidebar-closed');
            updateSidebarUI();
            console.log('✅ 레이아웃 및 아이콘 토글 완료!');
        });
    }

    // 창 크기 조절 시 768px 이하로 떨어지면 자동으로 접기
    window.addEventListener('resize', () => {
        if (window.innerWidth <= 768 && !sidebar.classList.contains('collapsed')) {
            sidebar.classList.add('collapsed');
            body.classList.add('sidebar-closed');
            updateSidebarUI();
        }
    });

    // 모바일 외부 클릭 시 닫기 (클래스명 collapsed로 통일)
    document.addEventListener('click', (e) => {
        const isMobile = window.innerWidth <= 768;
        if (isMobile && sidebar && !sidebar.classList.contains('collapsed')) {
            if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                sidebar.classList.add('collapsed');
                body.classList.add('sidebar-closed');
                updateSidebarUI();
            }
        }
    });
    

    // Export history
    const exportBtn = document.getElementById('export-history');
    if (exportBtn) {
        exportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const dataStr = JSON.stringify(chatHistory, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kivosy_history_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            showToast('📥 History exported!', e.target, 'success');
        });
    }
    
    // Clear history from footer
    const clearHistoryBtn = document.querySelector('[onclick="clearHistory()"]');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            clearHistory();
        });
    }
}

// ========== Initialization ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 KIVOSY AI Command Center initializing...');
    
    loadConfig();
    loadHistory();
    renderHistory();
    setupEventListeners();
    updateModelDisplays();

    // --- [추가] 저장된 통계 UI에 그리기 ---
    refreshStatsUI();
    // ----------------------------------
});

// ========== Export for debugging ==========
window.kivosy = {
    getConfig: () => JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'),
    getHistory: () => chatHistory,
    clearAll: () => {
        localStorage.clear();
        location.reload();
    },
    showToast,
    openModal,
    closeModal
};

// API Key 숨기기/보이기 토글 함수
function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('.material-icons');
    
    if (input.type === "password") {
        input.type = "text";
        icon.innerText = "visibility_off"; // 눈 감은 모양 (Streamlit 방식)
    } else {
        input.type = "password";
        icon.innerText = "visibility"; // 눈 뜬 모양 (Streamlit 방식)
    }
}



// 입력창 아래 🚦 공장장님의 '신호등' 및 '탭 전환' 통합 관리 함수
function switchTab(mode, isAuto = false) {
    console.log("🚀 Switching to Mode:", mode);

    // 1. 상단 탭 버튼들 업데이트
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === mode) {
            btn.classList.add('active');
        }
    });

    // 2. 실제 본문 화면 전환
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    const targetTab = document.getElementById(`${mode}-tab`);
    if (targetTab) targetTab.classList.add('active');

    // 3. 🚦 하단 신호등(model-badge) 불 켜기
    document.querySelectorAll('.model-badge').forEach(badge => {
        badge.classList.remove('active');
        if (badge.getAttribute('onclick').includes(`'${mode}'`)) {
            badge.classList.add('active');
        }
    });

    // 🚩 [추가] 1:1 탭으로 이동 시, 그 방의 대화 내용이 최신이 보게 스크롤 내리기
    if (mode !== 'unified') {
        const targetTab = document.getElementById(`${mode}-tab`);
        if (targetTab) {
            // 약간의 딜레이를 주어 화면 전환 후 부드럽게 내려가게 합니다.
            setTimeout(() => {
                targetTab.scrollTop = targetTab.scrollHeight;
            }, 100);
        }
    }


    // isAuto가 false일 때(즉, 사용자가 직접 버튼을 눌렀을 때)만 스크롤을 올립니다.
    // 🚩 [진짜 범인 체포] chatContainer의 스크롤을 맨 위로!
    if (!isAuto) {
        const mainChat = document.getElementById('chatContainer');
        if (mainChat) {
            mainChat.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            console.log("✅ ChatContainer scrolled to top!");
        }

        // 혹시 모르니 내부 히스토리 컨테이너들도 같이 초기화
        document.querySelectorAll('.history-container').forEach(c => {
            c.scrollTop = 0;
        });
    }
}

// 페이지 로딩 완료 후 자동 실행 (여기는 두 번째 인자에 true를 줘서 스크롤 방지!)
window.addEventListener('load', () => {
    setTimeout(() => {
        switchTab('unified', true); 
    }, 500);
});


// ========== Usage Statistics (Metrics) Management ==========

// 1. 통계 데이터 초기화
let usageStats = { total: 0, gemini: 0, groq: 0, hf: 0 };

// 2. 히스토리 배열의 길이를 측정하여 통계를 강제로 맞추는 함수 (핵심 수정본)
function syncStatsWithHistory() {
    // chatHistory가 비어있을 경우를 대비해 기본값 처리
    usageStats.gemini = (chatHistory.gemini || []).length;
    usageStats.groq = (chatHistory.groq || []).length;
    usageStats.hf = (chatHistory.hf || []).length;
    usageStats.total = usageStats.gemini + usageStats.groq + usageStats.hf;
    
    // 계산된 최신 값을 localStorage에 백업
    localStorage.setItem('kivosy_usage_stats', JSON.stringify(usageStats));
    console.log("📊 Stats Synced:", usageStats);
}

// 3. 화면의 숫자를 업데이트하는 함수
function refreshStatsUI() {
    const statsMap = {
        'total': usageStats.total,
        'gemini': usageStats.gemini,
        'groq': usageStats.groq,
        'hf': usageStats.hf
    };

    for (const [key, value] of Object.entries(statsMap)) {
        // 1. 기존 상단 바 숫자가 있다면 업데이트
        const statEl = document.getElementById(`stat-${key}`);
        if (statEl) statEl.innerText = value.toLocaleString();

        // 2. 탭 버튼 옆 괄호 안의 숫자 업데이트 (새로 추가된 ID들)
        const tabEl = document.getElementById(`tab-${key}`);
        if (tabEl) tabEl.innerText = value.toLocaleString();
    }
}

// 4. 새로운 질문 시 사용량 기록 함수
function recordUsage(model) {
    if (usageStats.hasOwnProperty(model)) {
        usageStats[model]++;
        usageStats.total++;
        localStorage.setItem('kivosy_usage_stats', JSON.stringify(usageStats));
        refreshStatsUI();
    }
}

// ========== 각 답변이 나오면 해당 AI답변으로 바로 이동하는 리모컨=======

// [KIVOSY] 특정 모델 카드 위치로 부드럽게 이동하는 함수
function scrollToModel(modelId) {
    // 1. 일단 통합 탭(All Models)으로 화면을 전환합니다.
    switchTab('unified');

    // 2. 모델 ID에 맞는 카드를 찾습니다. 
    // (이때 app.js에서 카드를 생성할 때 id나 class를 modelId로 지정해줘야 합니다)
    const element = document.getElementById(`${modelId}-card`) || document.querySelector(`.${modelId}-result`);
    
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // 시각적 효과: 해당 카드 반짝이게 하기
        element.style.boxShadow = "0 0 20px var(--accent-primary)";
        setTimeout(() => {
            element.style.boxShadow = "";
        }, 1500);
    } else {
        alert("아직 답변이 생성되지 않았습니다!");
    }
}

// ========== 각나온 답변 바로 내려받기 ==========

// [KIVOSY] 각 모델의 답변 카드를 생성할 때 툴바 포함 구조
function createResultCard(modelId, content) {
    // 1. 모델별 아이콘 매핑
    const modelIcons = {
        'gemini': '🤖', // 구글 제미나이의 반짝임
        'groq': '⚡',   // 초고속 LPU 그록
        'hf': '🤗',     // 허깅페이스 마스코트
        'llama': '🦙'   // 라마 모델일 경우
    };

    // 2. 해당 모델 아이콘 선택 (없으면 기본 로봇 ✨)
    const icon = modelIcons[modelId.toLowerCase()] || '✨';

    return `
        <div class="result-card" id="${modelId}-card" data-model="${modelId}">
            <div class="card-header">
                <span class="model-name">${icon} ${modelId.toUpperCase()}</span>
                <div class="card-actions">
                    <button onclick="copyToClipboard('${modelId}')" title="텍스트 복사">📋 Copy</button>
                    <button onclick="saveAsFile('${modelId}')" title="메모장 저장">📄 TXT</button>
                    <button onclick="saveAsPDF('${modelId}')" title="PDF 리포트 저장">📕 PDF</button>
                </div>
            </div>
            <div class="result-content" id="${modelId}-text">${content}</div>
        </div>
    `;
}

// 📋 클립보드 복사 함수
function copyToClipboard(modelId) {
    const text = document.getElementById(`${modelId}-text`).innerText;
    navigator.clipboard.writeText(text).then(() => {
        // 공장장님 코드에 showToast가 있다면 작동, 없다면 alert로 대체 가능
        if (typeof showToast === 'function') {
            showToast(`✅ ${modelId.toUpperCase()} 답변 복사 완료!`);
        } else {
            alert(`${modelId.toUpperCase()} 복사 완료!`);
        }
    });
}

// 💾 .txt 파일 저장 함수
function saveAsFile(modelId) {
    const text = document.getElementById(`${modelId}-text`).innerText;
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `KIVOSY_${modelId}_${new Date().toLocaleDateString()}.txt`;
    a.click();
}

//==========================================================
//=============    전체 대화용      =========================
// 📕 PDF로 깔끔하게 저장하는 함수 (html2pdf 라이브러리 사용)
//==========================================================
function saveAsPDF(modelId) {
    const element = document.getElementById(`${modelId}-card`); 
    const resultContent = element.querySelector('.result-content');

    // [중요] PDF 생성 전 스크롤 높이 제한을 잠시 풉니다.
    const originalMaxHeight = resultContent.style.maxHeight;
    resultContent.style.maxHeight = 'none'; 
    resultContent.style.overflow = 'visible';

    const options = {
        margin: [10, 10, 10, 10],
        filename: `KIVOSY_Full_Report_${modelId}.pdf`,
        html2canvas: { 
            scale: 2, 
            useCORS: true,
            scrollY: 0, // 스크롤 위치 초기화
            windowHeight: element.scrollHeight // 전체 높이 인식
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(options).from(element).save().then(() => {
        // [중요] PDF 생성이 끝나면 다시 원래 스크롤 상태로 복구
        resultContent.style.maxHeight = originalMaxHeight;
        resultContent.style.overflow = 'auto';
    });
}


//==========================================================
//=============    개별 부분출력용      =====================
// [KIVOSY] 개별 채팅 메시지만 PDF로 저장 (v3.1 추가 공정)
//==========================================================
function saveAsPDF_Individual(btnElement) {
    // 1. 데이터 가져오기
    const container = btnElement.closest('.past-view-container') || btnElement.closest('.ai-bubble');
    const bubbleText = container.querySelector('.bubble-text');
    if (!bubbleText) return;

    const modelName = container.classList.contains('gemini') ? 'GEMINI' : 
                      container.classList.contains('groq') ? 'GROQ' : 'HF';

    showToast('Direct downloading...', null, 'info');

    // 2. 🚩 [비법] 아주 단순한 가상 컨테이너 생성 (에러 방지 핵심)
    const worker = document.createElement('div');
    worker.style.width = '700px';
    worker.style.padding = '40px';
    worker.style.background = '#ffffff';
    
    // 복잡한 클래스 다 떼고, 딱 필요한 스타일만 직접 주입
    // 내용 복제 (KIVOSY Brand Identity 적용)
    worker.innerHTML = `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #343a40;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0d6efd; padding-bottom: 15px; margin-bottom: 20px;">
                <div>
                    <h1 style="margin: 0; color: #0d6efd; font-size: 24px; letter-spacing: -0.5px;">KIVOSY AI REPORT</h1>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #606770;">Intelligence Archive Service</p>
                </div>
                <div style="text-align: right;">
                    <span style="background: #eef4ff; color: #0d6efd; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; border: 1px solid #d0e1fd;">
                        ${modelName} Engine
                    </span>
                </div>
            </div>

            <div style="background: #f8fafd; padding: 15px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #dee1e6;">
                <div style="font-size: 13px; color: #343a40;">
                    <strong>Generated Date:</strong> ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}
                </div>
            </div>

            <div style="line-height: 1.7; font-size: 14px; color: #343a40; min-height: 500px;">
                ${bubbleText.innerHTML}
            </div>

            <div style="margin-top: 50px; border-top: 1px solid #dee1e6; padding-top: 10px; text-align: center; font-size: 11px; color: #dddfe2;">
                © 2026 KIVOSY AI Command Center. All rights reserved.
            </div>
        </div>
    `;

    // 3. PDF 옵션 (인쇄창 없이 바로 저장되도록 설정)
    const options = {
        margin: [15, 15, 15, 15],
        filename: `KIVOSY_${modelName}_${new Date().getTime()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true,
            logging: false,
            letterRendering: true
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // 4. 🔥 라이브러리 실행 (Worker 사용으로 스택 에러 방지)
    html2pdf().set(options).from(worker).save().then(() => {
        showToast('Download Complete!', null, 'success');
    }).catch(err => {
        console.error('Download Error:', err);
        // 혹시라도 실패하면 아까의 '무적 프린트' 방식으로 자동 전환 (보험)
        showToast('Switching to Print View...', null, 'info');
        saveAsPDF_Individual_Print(btnElement); 
    });
}

//==========================================================
// 피드백관련 함수
//==========================================================

// 🚀 피드백 버튼 클릭 시 구글 폼 열기
const feedbackBtn = document.getElementById('sendFeedback');

if (feedbackBtn) {
    feedbackBtn.addEventListener('click', () => {
        // 공장장님이 알려주신 구글 폼 주소입니다!
        const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSeTSDIioJ_AewFfH1S1aAIqKCRt3iROqbyPULl-9S6gsBpjxw/viewform?usp=sf_link";
        
        // 새 창으로 열기
        window.open(formUrl, '_blank');
    });
}