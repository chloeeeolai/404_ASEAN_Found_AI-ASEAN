# 🦁 SEA-LION
### Southeast Asian Language Intelligence Online Network

> An AI-powered conversational platform that empowers rural and elderly communities in Southeast Asia by providing access to information, education, and government services in their **native dialects**.

---

## 🌏 Problem

Many rural and elderly communities in Southeast Asia communicate primarily in **local dialects** such as Iban, Kadazan-Dusun, Javanese, Hokkien, and Cebuano — but most digital platforms and government services are only available in standard languages or English.

This creates a critical language barrier that prevents people from accessing:
- 🏥 Healthcare guidance
- 🏛️ Government aid and services
- 💳 Financial literacy resources
- 🌾 Agricultural support
- 📱 Digital literacy tools

At the same time, many local dialects are **disappearing** because they are not documented digitally.

---

## 💡 Solution

SEA-LION is a **single-page web application** that allows citizens to interact with AI in their native dialect — through voice or text — and receive helpful, accessible responses.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 💬 **AI Chat Assistant** | Ask questions in any supported dialect via text or voice |
| 🌐 **Dialect-Aware AI** | Gemini 2.0 Flash responds with culturally relevant, dialect-aware answers |
| 🎙️ **Voice Input** | Speak naturally using the Web Speech API |
| 📚 **Education Hub** | Topics covering health, government services, finance, farming, and digital literacy |
| 🏛️ **Cultural Archive** | Dialect map, vocabulary dictionary, traditional stories, and community recordings |
| 📶 **Low-Bandwidth Mode** | Reduced animations and cached responses for poor connectivity areas |
| 🔌 **Offline Support** | Service Worker pre-caches assets for offline access |

---

## 🗣️ Supported Dialects

| Dialect | Region |
|---------|--------|
| 🇲🇾 Bahasa Melayu | Malaysia / Brunei |
| 🌿 Iban | Sarawak, Malaysia |
| 🏔️ Kadazan-Dusun | Sabah, Malaysia |
| 🇮🇩 Javanese (Basa Jawa) | Java, Indonesia |
| 🎋 Hokkien / Minnan | SEA Chinese communities |
| 🌊 Cebuano (Bisaya) | Visayas, Philippines |
| 🇵🇭 Tagalog | Luzon, Philippines |

---

## 🚀 Getting Started

### Run Locally
No build step needed — just serve the files with any HTTP server:

```bash
# Python (recommended)
python -m http.server 8765 --directory ./Hackathon/AI_ASEAN
# Then open: http://localhost:8765
```

### Add Your Gemini API Key
Open `gemini.js` and replace the placeholder:

```js
// Line 9 in gemini.js
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';
```

Get a free key at [aistudio.google.com](https://aistudio.google.com/apikey).

> Without an API key, the app runs in **Demo Mode** with pre-written responses — still fully functional for demos!

---

## 🗂️ Project Structure

```
Hackathon/AI_ASEAN/
├── index.html      # Main app — all 4 views
├── styles.css      # Premium dark theme (glassmorphism + animations)
├── app.js          # Core logic — chat, voice, navigation, archive
├── gemini.js       # Gemini AI wrapper with dialect-aware prompting
└── sw.js           # Service Worker for offline support
```

---

## 🌍 SDG Alignment

- **SDG 4** — Quality Education: Accessible information in native dialects
- **SDG 10** — Reduced Inequalities: Bridging the digital divide for rural communities
- **SDG 17** — Partnerships: Collaboration with linguists, universities, and cultural orgs

---

## 👥 Team

**Team Need Sleep Kia** — UMDAC Datathon 2025

---

*Built with ❤️ for Southeast Asia's diverse communities.*
