# Omni Chat — Powered by Puter.js

A modern, serverless AI chat application built with **[Puter.js](https://docs.puter.com/llms.txt)**. Access 500+ AI models (OpenAI, Anthropic, Google, Meta Llama, DeepSeek, Mistral, xAI) directly in the browser with real-time streaming, Puter cloud persistence, and zero API key management.

> Powered by [Puter](https://developer.puter.com).

---

## ✨ Features

- 🧠 **500+ AI Models Supported**: Switch on-the-fly between Claude 3.5 Sonnet, GPT-4o, Gemini 2.0 Flash, DeepSeek R1/V3, Llama 3.3 70B, and more.
- ⚡ **Real-Time Streaming**: Live streaming with `puter.ai.chat(..., { stream: true })`.
- 💭 **Extended Thinking / Reasoning Visualization**: Live collapsible thinking process display for reasoning models (DeepSeek R1, OpenAI o1/o3-mini, Gemini thinking).
- 🔐 **Puter Authentication**: One-click Sign-In with Puter (`puter.auth.signIn()`) with profile and avatar integration.
- ☁️ **Cloud Chat Sync via Puter KV**: Automatically saves and syncs conversation histories across devices using Puter's key-value database (`puter.kv.set()` / `puter.kv.get()`), with local fallback.
- 🎨 **Rich Formatting & Syntax Highlighting**: Client-side Markdown rendering with Marked.js and syntax-highlighted code blocks with a one-click "Copy Code" button.
- 🖼️ **Multimodal Support**: Attach images directly to prompts for visual analysis with supported vision models.
- ⚙️ **Custom System Prompts & Temperature**: Customize the assistant persona and creativity directly in the settings modal.
- 🌓 **Dark & Light Mode**: Clean, responsive design optimized for mobile and desktop.
- 🛑 **Stop Generation**: Cancel generation in real-time with `AbortController`.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer)

### Run Locally

1. Clone or open the repository:
   ```bash
   git clone <repo-url>
   cd llm-chat-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```
   Or use any local static file server:
   ```bash
   npx serve public
   ```

4. Open `http://localhost:8787` (or `http://localhost:3000`) in your browser.

> **Note**: An application using Puter.js must be served by an HTTP server (not a `file://` URL) to run properly, as per Puter security requirements.

---

## 📁 Project Structure

```text
├── public/
│   ├── index.html       # Semantic HTML layout with Puter attribution
│   ├── style.css        # Modern, responsive theme and component styles
│   └── chat.js          # Puter.js SDK logic (streaming, KV, auth, models)
├── src/
│   ├── index.ts         # Cloudflare Worker static asset server & API handler
│   └── types.ts         # TypeScript type definitions
├── .agents/
│   └── hooks.json       # Security & tooling hooks
├── wrangler.jsonc       # Cloudflare Worker configuration
└── README.md
```

---

## 🛠️ How Puter.js is Used

- **AI Chat Streaming**:
  ```javascript
  const response = await puter.ai.chat(messages, {
    model: selectedModel,
    stream: true,
    signal: abortController.signal,
    temperature: 0.7
  });

  for await (const part of response) {
    if (part?.type === 'text') appendText(part.text);
    if (part?.type === 'reasoning') updateReasoning(part.reasoning);
  }
  ```

- **Dynamic Model Catalog**:
  ```javascript
  const models = await puter.ai.listModels();
  ```

- **Puter Cloud KV Persistence**:
  ```javascript
  // Save chat sessions
  await puter.kv.set('puter_llm_chat_sessions', JSON.stringify(sessions));

  // Retrieve chat sessions
  const saved = await puter.kv.get('puter_llm_chat_sessions');
  ```

- **Puter Auth**:
  ```javascript
  if (!puter.auth.isSignedIn()) {
    await puter.auth.signIn();
  }
  const user = await puter.auth.getUser();
  ```

---

## 📄 License
MIT
