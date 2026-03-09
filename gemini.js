/**
 * SEA-LION Gemini API Wrapper
 * Handles all AI API calls with dialect-aware system prompting.
 */

// Replace with your actual Gemini API key
const GEMINI_API_KEY = 'AIzaSyANPXH-6V3w3vHXCXP6HIA6Y10khnn8HdE';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const DIALECT_INFO = {
    iban: {
        name: 'Iban',
        region: 'Sarawak, Malaysia / Borneo',
        standard: 'Bahasa Malaysia',
        greeting: 'Selamat datai',
        sample: 'Aku nemu diri aku enda nemu...',
    },
    kadazan: {
        name: 'Kadazan-Dusun',
        region: 'Sabah, Malaysia',
        standard: 'Bahasa Malaysia',
        greeting: 'Tabak tobilung',
        sample: 'Montok id miampai...',
    },
    javanese: {
        name: 'Javanese (Basa Jawa)',
        region: 'Java, Indonesia',
        standard: 'Bahasa Indonesia',
        greeting: 'Sugeng rawuh',
        sample: 'Kula mboten mangertos...',
    },
    hokkien: {
        name: 'Hokkien (Minnan)',
        region: 'Fujian origin, widely spoken in SEA',
        standard: 'Mandarin / Malay',
        greeting: 'Lí-hó',
        sample: 'Góa bô hiáu...',
    },
    cebuano: {
        name: 'Cebuano (Bisaya)',
        region: 'Visayas & Mindanao, Philippines',
        standard: 'Filipino / English',
        greeting: 'Maayong adlaw',
        sample: 'Dili ko kahibalo...',
    },
    tagalog: {
        name: 'Tagalog',
        region: 'Luzon, Philippines',
        standard: 'Filipino',
        greeting: 'Magandang araw',
        sample: 'Hindi ko alam...',
    },
    malay: {
        name: 'Bahasa Melayu',
        region: 'Malaysia, Brunei, Indonesia',
        standard: 'Bahasa Malaysia',
        greeting: 'Selamat datang',
        sample: 'Saya tak faham...',
    },
};

// Simulated offline/demo responses when no API key or no network
const DEMO_RESPONSES = {
    health: [
        "For general health queries, it's important to consult a doctor. In the meantime, staying hydrated, eating nutritious meals, and getting enough rest are key. If you're experiencing fever, headache, or body aches, you can take paracetamol and rest. If symptoms persist more than 3 days, please visit your nearest clinic.",
        "Eating a balanced diet with vegetables, fruits, and protein is very important. Try to reduce processed foods and sugary drinks. Regular exercise, even 30 minutes of walking per day, greatly improves your health.",
        "Vaccination protects you and your community. Common vaccines available for free at government clinics include those for influenza, Hepatitis B, and COVID-19. Ask the clinic staff for your vaccination record.",
    ],
    government: [
        "To apply for government aid like Bantuan Sara Hidup (BSH), you can visit your nearest district office or apply online at the official government portal. Bring your IC/identity document, proof of income, and household details. The staff at the district office can help you complete the form in your language.",
        "Your birth certificate, IC (identity card), and marriage certificate are key government documents. If lost, you can apply for a replacement at the National Registration Department (Jabatan Pendaftaran Negara). Bring two passport-sized photos and the applicable fee.",
        "For land and property registration queries, visit your local Land Registry Office (Pejabat Tanah). They can explain your rights as a landowner and help with title transfers.",
    ],
    financial: [
        "A scam often promises easy money, prizes you didn't win, or urgently asks for bank transfers. If someone calls asking for your bank account number, OTP code, or personal IC number — this is likely a scam. Hang up and report it to your bank or the police.",
        "To open a savings account, visit any bank branch with your IC. Bank Rakyat and Agrobank offer services and staff who can assist rural communities. Savings earn interest and protect your money better than keeping cash at home.",
        "KWSP (EPF) is your retirement savings fund. If you are employed, your employer must contribute to your EPF. You can check your balance using the KWSP app or website. Withdrawals are allowed for housing, education, and medical purposes.",
    ],
    agriculture: [
        "For crop disease, you can contact MARDI (Malaysian Agricultural Research) or your local Department of Agriculture for free consultation. Common issues like leaf blight can be treated with approved fungicides. Always use protective gear when applying pesticides.",
        "Subsidi Baja (fertilizer subsidy) from the government can reduce your farming costs. Visit your nearest FELDA or Department of Agriculture to register. Eligible farmers receive fertilizer vouchers for paddy and other crops.",
        "Rainwater harvesting is an effective way to manage water supply for your farm during dry seasons. Simple rooftop collection systems can store thousands of liters of rainwater cheaply.",
    ],
    digital: [
        "A strong password uses at least 8 characters with a mix of letters, numbers, and symbols. Never share your password with anyone, even family members. Enable two-factor authentication (2FA) on important apps like your banking app.",
        "To stay safe on WhatsApp: don't click links from unknown numbers, don't share your OTP code with anyone, and enable 'Two-Step Verification' in WhatsApp Settings > Account.",
        "Smartphones can be very useful for accessing government services, learning, and connecting with family. If you need help learning how to use a smartphone, many community centres and libraries offer free digital literacy classes.",
    ],
    general: [
        "Thank you for your question! I'm SEA-LION, your local language AI assistant. I'm here to help with health advice, government services, financial guidance, farming tips, and digital literacy — all in your preferred dialect.",
        "That's a great question! I'd be happy to help. Could you provide a bit more detail so I can give you the most accurate information? I'm here to assist you in your language.",
        "I understand your concern. Let me help you find the right information. SEA-LION is designed to support communities in Southeast Asia by providing reliable information in local languages and dialects.",
    ]
};

function getDemoResponse(message) {
    const lower = message.toLowerCase();
    if (lower.includes('health') || lower.includes('sick') || lower.includes('doctor') || lower.includes('vaccine') || lower.includes('sakit') || lower.includes('doktor')) {
        return DEMO_RESPONSES.health[Math.floor(Math.random() * DEMO_RESPONSES.health.length)];
    }
    if (lower.includes('government') || lower.includes('aid') || lower.includes('bantuan') || lower.includes('ic') || lower.includes('kad')) {
        return DEMO_RESPONSES.government[Math.floor(Math.random() * DEMO_RESPONSES.government.length)];
    }
    if (lower.includes('money') || lower.includes('scam') || lower.includes('bank') || lower.includes('wang') || lower.includes('duit') || lower.includes('epf') || lower.includes('kwsp')) {
        return DEMO_RESPONSES.financial[Math.floor(Math.random() * DEMO_RESPONSES.financial.length)];
    }
    if (lower.includes('farm') || lower.includes('crop') || lower.includes('paddy') || lower.includes('fertilizer') || lower.includes('padi')) {
        return DEMO_RESPONSES.agriculture[Math.floor(Math.random() * DEMO_RESPONSES.agriculture.length)];
    }
    if (lower.includes('phone') || lower.includes('whatsapp') || lower.includes('password') || lower.includes('internet') || lower.includes('online')) {
        return DEMO_RESPONSES.digital[Math.floor(Math.random() * DEMO_RESPONSES.digital.length)];
    }
    return DEMO_RESPONSES.general[Math.floor(Math.random() * DEMO_RESPONSES.general.length)];
}

function buildSystemPrompt(dialect) {
    const info = DIALECT_INFO[dialect] || DIALECT_INFO.malay;
    return `You are SEA-LION, a friendly and helpful AI assistant for Southeast Asian communities. You specialize in helping people who speak ${info.name}, spoken in ${info.region}.

Your role is to:
1. Understand questions that may be written in ${info.name} dialect or ${info.standard}
2. Provide clear, simple, and accurate information on health, government services, financial literacy, agriculture, and digital literacy
3. Respond in a warm, respectful, and community-focused manner
4. Use simple language that elderly and rural users can understand
5. When possible, acknowledge cultural context and local resources available in ${info.region}
6. If the user writes in ${info.name}, respond in both the dialect and the standard language (${info.standard}) for clarity

Always be encouraging, patient, and culturally sensitive. Your goal is to bridge the digital divide and help communities access important information in their native language.

Start your response naturally without meta-commentary. Be concise but thorough.`;
}

async function askGemini(userMessage, dialect = 'malay', isLowBandwidth = false) {
    // Low bandwidth or demo mode: return simulated response
    if (isLowBandwidth || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        await new Promise(r => setTimeout(r, 800 + Math.random() * 700)); // simulate delay
        return { text: getDemoResponse(userMessage), source: 'demo' };
    }

    try {
        const systemPrompt = buildSystemPrompt(dialect);
        const payload = {
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 512,
                topP: 0.9,
            },
        };

        const response = await fetch(GEMINI_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || getDemoResponse(userMessage);
        return { text, source: 'gemini' };
    } catch (err) {
        console.warn('Gemini API failed, using demo response:', err);
        return { text: getDemoResponse(userMessage), source: 'fallback' };
    }
}

export { askGemini, DIALECT_INFO, getDemoResponse };
