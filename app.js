/**
 * SEA-LION App — app.js
 * Core application logic: navigation, chat, voice, education, archive
 */

import { askGemini, DIALECT_INFO } from './gemini.js';

// ── State ─────────────────────────────────────────────────────
let currentView = 'chat';
let currentDialect = 'auto';  // 'auto' means detect from message content
let isLowBandwidth = false;
let isRecording = false;
let isVoiceMessage = false;   // true when the current message was recorded by voice
let isBotTyping = false;
let recognition = null;
let voiceTranscript = '';     // internal transcript for voice (not shown in input)
let archiveRecording = false;
let archiveMediaRecorder = null;
let archiveChunks = [];

// Chat history (for context)
const chatHistory = [];

// ── DOM Refs ──────────────────────────────────────────────────
const views = document.querySelectorAll('.view');
const navBtns = document.querySelectorAll('.nav-btn');
const dialectSelect = document.getElementById('dialect-select');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const voiceBtn = document.getElementById('voice-btn');
const bwToggle = document.getElementById('bw-toggle');
const modalOverlay = document.getElementById('modal-overlay');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
const archiveRecordBtn = document.getElementById('archive-record-btn');
const archiveStatus = document.getElementById('archive-status');

// ── Navigation ────────────────────────────────────────────────
function switchView(viewId) {
    currentView = viewId;
    views.forEach(v => v.classList.toggle('active', v.dataset.view === viewId));
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
}

navBtns.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// ── Dialect Detection ──────────────────────────────────────────
function detectDialectLocal(text) {
    const lower = text.toLowerCase();
    if (lower.match(/\b(lu|ho|boh|wa|si|di|ge|bang-chu|g\u00f3a|b\u00f4|hi\u00e1u)\b/)) return 'hokkien';
    if (lower.match(/\b(sugeng|rawuh|kula|mboten|mangertos)\b/)) return 'javanese';
    if (lower.match(/\b(maayong|adlaw|dili|kahibalo)\b/)) return 'cebuano';
    if (lower.match(/\b(salamat|magandang|araw|hindi)\b/)) return 'tagalog';
    if (lower.match(/\b(selamat|datai|aku|nemu|enda|bisi|makan)\b/)) return 'iban';
    if (lower.match(/\b(tabak|tobilung|montok|tabi)\b/)) return 'kadazan';
    if (lower.match(/\b(apa|khabar|saya|tak|faham|bantuan)\b/)) return 'malay';
    if (lower.match(/\b(hi|hello|how|are|you|help|what|why|where)\b/)) return 'malay';
    return null;
}

function updateDialectUI(dialect) {
    const info = DIALECT_INFO[dialect];
    if (!info) return;
    document.getElementById('status-text').textContent = info.name + ' Mode';
    // Keep selector in sync if user had it on auto
    if (dialectSelect && dialectSelect.value === 'auto') {
        // don't change selector value, just update status text
    }
}

// ── Dialect Selector ──────────────────────────────────────────
if (dialectSelect) {
    dialectSelect.addEventListener('change', () => {
        currentDialect = dialectSelect.value;
        if (currentDialect === 'auto') {
            document.getElementById('status-text').textContent = 'Smart Mode';
        } else {
            document.getElementById('status-text').textContent =
                (DIALECT_INFO[currentDialect]?.name || 'Bahasa Melayu') + ' Mode';
        }
    });
}

// ── Low-bandwidth Mode ────────────────────────────────────────
bwToggle.addEventListener('change', () => {
    isLowBandwidth = bwToggle.checked;
    document.body.classList.toggle('low-bandwidth', isLowBandwidth);
});

// ── Chat Logic ────────────────────────────────────────────────
function formatTime(d = new Date()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function appendMessage(role, text, source = null, isVoice = false) {
    // Remove welcome screen if present
    const welcome = document.getElementById('chat-welcome');
    if (welcome) welcome.remove();

    const msg = document.createElement('div');
    msg.className = `message ${role}`;

    const avatar = role === 'user' ? '👤' : '🦁';
    const sourceBadge = source
        ? `<span class="source-badge ${source}">${source === 'gemini' ? '✦ Gemini' : source === 'demo' ? '◈ Demo' : '⚡ Fallback'}</span>`
        : '';

    // Voice messages show as a voice note bubble (like WhatsApp)
    const bubbleContent = (role === 'user' && isVoice)
        ? `<div class="voice-note-bubble">
            <span class="voice-note-icon">🎤</span>
            <div class="voice-note-waveform">
              ${Array.from({ length: 12 }, (_, i) => `<span class="wave-bar" style="--h:${20 + Math.random() * 60}%"></span>`).join('')}
            </div>
            <span class="voice-note-label">Voice Message</span>
          </div>`
        : `${escapeHtml(text).replace(/\n/g, '<br>')}`;

    msg.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div>
      <div class="message-bubble">${bubbleContent}</div>
      <div class="message-meta">
        ${formatTime()}
        ${sourceBadge}
      </div>
    </div>
  `;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msg;
}

function showTypingIndicator() {
    const el = document.createElement('div');
    el.className = 'message bot';
    el.id = 'typing-msg';
    el.innerHTML = `
    <div class="message-avatar">🦁</div>
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    document.getElementById('typing-msg')?.remove();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function sendMessage(text, fromVoice = false) {
    if (!text.trim() || isBotTyping) return;
    const userText = text.trim();
    chatInput.value = '';
    autoResizeTextarea();

    // Show voice note bubble OR text bubble depending on origin
    appendMessage('user', userText, null, fromVoice);
    chatHistory.push({ role: 'user', text: userText });

    isBotTyping = true;
    sendBtn.disabled = true;
    showTypingIndicator();

    // ── Dialect detection (runs on EVERY message) ──────────────
    let activeDialect = currentDialect;
    if (currentDialect === 'auto') {
        // Use local heuristic first; fall back to Gemini's own detection
        const detected = detectDialectLocal(userText);
        activeDialect = detected || 'auto';
        if (detected) {
            updateDialectUI(detected);
        }
    }

    const { text: response, source } = await askGemini(userText, activeDialect, isLowBandwidth);

    removeTypingIndicator();
    appendMessage('bot', response, source);
    chatHistory.push({ role: 'bot', text: response });

    isBotTyping = false;
    sendBtn.disabled = false;
    chatInput.focus();
}

sendBtn.addEventListener('click', () => sendMessage(chatInput.value));

chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(chatInput.value);
    }
});

function autoResizeTextarea() {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
}
chatInput.addEventListener('input', autoResizeTextarea);

// Quick topic chips
document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        const prompt = chip.dataset.prompt;
        chatInput.value = prompt;
        sendMessage(prompt);
    });
});

// ── Voice Input ────────────────────────────────────────────────
function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        voiceBtn.title = 'Voice input not supported in this browser';
        voiceBtn.style.opacity = '0.4';
        voiceBtn.disabled = true;
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
        // Accumulate transcript internally — do NOT write to chatInput
        voiceTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
            voiceTranscript += event.results[i][0].transcript;
        }
        // Show a subtle hint in the input (italic, greyed)
        chatInput.placeholder = `🎤 ${voiceTranscript}`;
    };

    recognition.onend = () => {
        isRecording = false;
        isVoiceMessage = false;
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = '🎙';
        chatInput.placeholder = 'Type your question in any dialect... or press 🎙 to speak';
        // Send with fromVoice=true so it shows as a voice bubble
        if (voiceTranscript.trim()) {
            sendMessage(voiceTranscript, true);
            voiceTranscript = '';
        }
    };

    recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
        isRecording = false;
        isVoiceMessage = false;
        voiceTranscript = '';
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = '🎙';
        chatInput.placeholder = 'Type your question in any dialect... or press 🎙 to speak';
    };
}

voiceBtn.addEventListener('click', () => {
    if (!recognition) return;
    if (isRecording) {
        recognition.stop();
    } else {
        isRecording = true;
        isVoiceMessage = true;
        voiceTranscript = '';
        voiceBtn.classList.add('recording');
        voiceBtn.innerHTML = '⏹';
        chatInput.value = '';  // clear any typed text
        chatInput.placeholder = '🔴 Listening... speak now';

        // In auto mode, use a broad multilingual hint; otherwise use dialect-specific
        const langMap = {
            iban: 'ms-MY', kadazan: 'ms-MY', javanese: 'id-ID',
            hokkien: 'zh-TW', cebuano: 'fil-PH', tagalog: 'fil-PH', malay: 'ms-MY', auto: 'ms-MY',
        };
        recognition.lang = langMap[currentDialect] || 'ms-MY';
        recognition.start();
    }
});

// ── Education View ─────────────────────────────────────────────
const TOPICS = {
    health: {
        icon: '🏥',
        title: 'Health & Medical',
        desc: 'Learn about common health issues, local clinics, vaccinations, and healthy living tips in your dialect.',
        tags: ['Healthcare', 'Nutrition', 'Vaccines'],
        articles: [
            { icon: '💊', title: 'Common Medicines & When to Use Them', desc: 'Learn about paracetamol, antacids, and ORS for common ailments.' },
            { icon: '🌿', title: 'Traditional vs Modern Medicine', desc: 'Understanding when traditional remedies are safe and when to see a doctor.' },
            { icon: '💉', title: 'Free Vaccinations at Government Clinics', desc: 'Complete list of free vaccines available to all Malaysians.' },
            { icon: '🧘', title: 'Mental Health & Stress Management', desc: 'Simple techniques to manage anxiety and stress in daily life.' },
        ],
    },
    government: {
        icon: '🏛️',
        title: 'Government Services',
        desc: 'Understand how to access government assistance, renew documents, and apply for subsidies.',
        tags: ['Aid & Subsidies', 'Documents', 'Rights'],
        articles: [
            { icon: '💰', title: 'Bantuan Sara Hidup (BSH) – How to Apply', desc: 'Step-by-step guide to applying for household financial assistance.' },
            { icon: '🪪', title: 'Renewing Your IC and Passport', desc: 'Documents needed, fees, and how to make an appointment online.' },
            { icon: '🏠', title: 'Public Housing Programs (PR1MA, PPAM)', desc: 'Eligibility criteria and how to register for affordable housing.' },
            { icon: '⚖️', title: 'Your Legal Rights as a Citizen', desc: 'Understand your basic rights to education, healthcare, and legal aid.' },
        ],
    },
    financial: {
        icon: '💳',
        title: 'Financial Literacy',
        desc: 'Protect yourself from scams, manage your savings, and understand EPF and banking.',
        tags: ['Savings', 'Scam Awareness', 'EPF/ASB'],
        articles: [
            { icon: '🚨', title: 'Common Online Scams in Southeast Asia', desc: 'How to spot Macau scams, love scams, and fake prize notifications.' },
            { icon: '🏦', title: 'How to Open a Bank Account', desc: 'Documents required and choosing the right bank for your needs.' },
            { icon: '📈', title: 'Understanding EPF & ASB', desc: 'How your retirement fund grows and when you can withdraw.' },
            { icon: '💡', title: 'Budgeting for Rural Households', desc: 'Simple methods to track income and expenses for farming families.' },
        ],
    },
    agriculture: {
        icon: '🌾',
        title: 'Agriculture & Farming',
        desc: 'Get tips on crop management, government farming subsidies, pest control, and water management.',
        tags: ['Crops', 'Subsidies', 'Pest Control'],
        articles: [
            { icon: '🌱', title: 'Paddy Farming – Best Practices', desc: 'Seasonal tips for maximizing paddy yield with minimal input.' },
            { icon: '🐛', title: 'Common Crop Pests and How to Control Them', desc: 'Identifying and managing rice blast, leaf blight, and stem borers.' },
            { icon: '💧', title: 'Rainwater Harvesting for Small Farms', desc: 'How to set up a low-cost rainwater collection system.' },
            { icon: '📋', title: 'Fertilizer Subsidy Registration Guide', desc: 'Register for the Subsidi Baja program at your local Department of Agriculture.' },
        ],
    },
    digital: {
        icon: '📱',
        title: 'Digital Literacy',
        desc: 'Learn to use smartphones safely, protect your data, and access government services online.',
        tags: ['Safety', 'Apps', 'Internet'],
        articles: [
            { icon: '🔐', title: 'Creating Strong Passwords', desc: 'Tips for secure passwords and enabling two-factor authentication.' },
            { icon: '📲', title: 'WhatsApp Safety & Privacy Settings', desc: 'Protect your account from unauthorized access and scam messages.' },
            { icon: '🌐', title: 'Accessing Government Services Online', desc: 'MyGov, MySejahtera, and other apps that simplify government transactions.' },
            { icon: '🛒', title: 'Safe Online Shopping Tips', desc: 'How to spot fake websites and shop safely on Lazada, Shopee, and more.' },
        ],
    },
    community: {
        icon: '🤝',
        title: 'Community Programs',
        desc: 'Discover community development programs, NGO services, and local empowerment initiatives.',
        tags: ['NGOs', 'Youth', 'Seniors'],
        articles: [
            { icon: '👵', title: 'Senior Citizen Support Programs', desc: 'Care services, financial aid, and activities available for the elderly.' },
            { icon: '📚', title: 'Free Education Programs for Adults', desc: 'Literacy programs and vocational training offered in rural areas.' },
            { icon: '🏡', title: 'Village Development Committees (JKKK)', desc: 'How your community council works and how to raise local issues.' },
            { icon: '🌍', title: 'SDG Goals and Your Community', desc: 'How UN Sustainable Development Goals relate to rural SEA communities.' },
        ],
    },
};

function renderTopicCards() {
    const grid = document.getElementById('topic-grid');
    grid.innerHTML = '';
    Object.entries(TOPICS).forEach(([key, topic]) => {
        const card = document.createElement('div');
        card.className = 'topic-card';
        card.dataset.topic = key;
        card.innerHTML = `
      <span class="topic-icon">${topic.icon}</span>
      <h3>${topic.title}</h3>
      <p>${topic.desc}</p>
      <div class="topic-tags">${topic.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
    `;
        card.addEventListener('click', () => showTopicDetail(key, topic));
        grid.appendChild(card);
    });
}

function showTopicDetail(key, topic) {
    const detail = document.getElementById('topic-detail');
    const title = document.getElementById('topic-detail-title');
    const articleList = document.getElementById('topic-articles');
    const askBtn = document.getElementById('ask-ai-btn');

    title.textContent = `${topic.icon} ${topic.title}`;
    articleList.innerHTML = topic.articles.map(a => `
    <div class="article-item">
      <div class="article-icon">${a.icon}</div>
      <div class="article-text">
        <h4>${a.title}</h4>
        <p>${a.desc}</p>
      </div>
    </div>
  `).join('');

    askBtn.onclick = () => {
        switchView('chat');
        chatInput.value = `Tell me about ${topic.title.toLowerCase()} in simple language for my community.`;
        sendMessage(chatInput.value);
    };

    detail.classList.add('open');
    detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('close-detail')?.addEventListener('click', () => {
    document.getElementById('topic-detail')?.classList.remove('open');
});

// ── Cultural Archive ───────────────────────────────────────────
const VOCAB_DATA = [
    { native: 'Tabi', dialect: 'Kadazan', english: 'Excuse me / Thank you' },
    { native: 'Bisi ka makan?', dialect: 'Iban', english: 'Have you eaten?' },
    { native: 'Sugeng rawuh', dialect: 'Javanese', english: 'Welcome' },
    { native: 'Lí-hó', dialect: 'Hokkien', english: 'Hello / How are you?' },
    { native: 'Maayong adlaw', dialect: 'Cebuano', english: 'Good day' },
    { native: 'Apa khabar?', dialect: 'Malay', english: 'How are you?' },
    { native: 'Salamat', dialect: 'Tagalog', english: 'Thank you' },
    { native: 'Ampit', dialect: 'Iban', english: 'Carry / Bring' },
];

const STORIES_DATA = [
    { title: 'The Legend of Puteri Santubong', region: 'Sarawak', dialect: 'Iban', preview: 'A tale of two princess sisters whose rivalry shaped the mountains of Sarawak...' },
    { title: 'Hikayat Merong Mahawangsa', region: 'Kedah', dialect: 'Malay', preview: 'The founding epic of the Kedah Sultanate, tracing royal lineage to Alexander the Great...' },
    { title: 'The Orphan Boy and the Magic Rice', region: 'Sabah', dialect: 'Kadazan', preview: 'A Kadazan folk story about the origin of rice and why we must never waste food...' },
    { title: 'Dewi Sri and the Paddy Spirit', region: 'Java', dialect: 'Javanese', preview: 'The Javanese goddess of rice who teaches farmers the wisdom of the harvest cycle...' },
    { title: 'The Fisherman and the Giant Pearl', region: 'Cebu', dialect: 'Cebuano', preview: 'A Bisaya tale about a humble fisherman who discovers a magical pearl that grants wisdom...' },
];

function renderVocabList() {
    const list = document.getElementById('vocab-list');
    if (!list) return;
    list.innerHTML = VOCAB_DATA.map(v => `
    <div class="vocab-entry">
      <div>
        <div class="vocab-native">${v.native}</div>
        <div class="vocab-dialect-tag">${v.dialect}</div>
      </div>
      <div class="vocab-english">${v.english}</div>
    </div>
  `).join('');
}

function renderStories() {
    const list = document.getElementById('stories-list');
    if (!list) return;
    list.innerHTML = STORIES_DATA.map(s => `
    <div class="story-card" onclick="openStoryModal('${s.title}', '${s.preview}', '${s.dialect}', '${s.region}')">
      <h4>${s.title}</h4>
      <p>${s.preview}</p>
      <div class="story-meta">
        <span class="story-chip">📍 ${s.region}</span>
        <span class="story-chip">🗣 ${s.dialect}</span>
      </div>
    </div>
  `).join('');
}

window.openStoryModal = function (title, preview, dialect, region) {
    modalBody.innerHTML = `
    <button class="modal-close" onclick="closeModal()">✕</button>
    <h3>${title}</h3>
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <span class="story-chip">📍 ${region}</span>
      <span class="story-chip">🗣 ${dialect}</span>
    </div>
    <p>${preview}</p>
    <p style="font-style:italic;margin-top:8px;">This is an excerpt from the SEA-LION Cultural Archive. Full recordings and transcriptions are contributed by community members and local researchers. This story has been preserved in both the original dialect and standard language translation.</p>
    <button class="ask-ai-btn" onclick="askAboutStory('${title}'); closeModal();" style="margin-top:4px">
      🦁 Ask SEA-LION about this story
    </button>
  `;
    modalOverlay.classList.add('open');
};

window.askAboutStory = function (title) {
    switchView('chat');
    const prompt = `Tell me more about the traditional story: "${title}" and its cultural significance in Southeast Asia.`;
    chatInput.value = prompt;
    sendMessage(prompt);
};

window.closeModal = function () {
    modalOverlay.classList.remove('open');
};

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

modalClose.addEventListener('click', closeModal);

// Archive recording button
if (archiveRecordBtn) {
    archiveRecordBtn.addEventListener('click', async () => {
        if (!archiveRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                archiveMediaRecorder = new MediaRecorder(stream);
                archiveChunks = [];
                archiveMediaRecorder.ondataavailable = e => archiveChunks.push(e.data);
                archiveMediaRecorder.onstop = () => {
                    stream.getTracks().forEach(t => t.stop());
                    archiveStatus.textContent = '✅ Recording saved to archive! Thank you for your contribution.';
                    archiveStatus.style.color = 'var(--teal-300)';
                    setTimeout(() => { archiveStatus.textContent = ''; }, 4000);
                };
                archiveMediaRecorder.start();
                archiveRecording = true;
                archiveRecordBtn.classList.add('recording');
                archiveRecordBtn.innerHTML = '⏹';
                if (archiveStatus) { archiveStatus.textContent = '🔴 Recording... Speak naturally in your dialect.'; archiveStatus.style.color = 'var(--coral)'; }
            } catch (err) {
                if (archiveStatus) { archiveStatus.textContent = '⚠ Microphone access denied. Please allow microphone to record.'; archiveStatus.style.color = 'var(--gold-300)'; }
            }
        } else {
            archiveMediaRecorder?.stop();
            archiveRecording = false;
            archiveRecordBtn.classList.remove('recording');
            archiveRecordBtn.innerHTML = '🎙';
        }
    });
}

// ── Modal ──────────────────────────────────────────────────────
// (handled above via window.closeModal)

// ── Service Worker ─────────────────────────────────────────────
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.warn('SW registration failed:', err));
}

// ── Init ───────────────────────────────────────────────────────
function init() {
    switchView('chat');
    setupSpeechRecognition();
    renderTopicCards();
    renderVocabList();
    renderStories();
}

document.addEventListener('DOMContentLoaded', init);
