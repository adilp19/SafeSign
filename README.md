# SafeSign

**Know what you're signing, privately.**

SafeSign reads leases, job offers, and terms of service and explains them in plain English: what you're agreeing to, which clauses are risky, how much the hidden fees add up to, and what to ask before you sign.

It runs on **open-weight Llama** through [Ollama](https://ollama.com) on your own computer, so your document never leaves your device.

> Not legal advice. It helps you understand what you're signing and what to ask.

## Features
- PDF, .txt, or pasted text (PDF text is extracted in the browser)
- Plain-English summary and key terms
- Every clause rated 🔴 risky / 🟡 unusual / 🟢 standard, with explanation and the original text
- Hidden-cost total (upfront and monthly)
- "Ask the document" chat with clickable clause citations
- Questions to ask before signing, with copy button
- **Private mode** (local Llama) and **Cloud demo** mode (Llama on Groq) for people without Ollama

## Why open-source AI
Leases and offer letters contain your address, income, and personal details. A cloud AI means sending all of that to someone else's server. Running an open-weight model locally makes privacy the default: the website has no backend that ever sees your document.

## Run it locally
```bash
ollama pull llama3.1:8b
npm install
npm run dev        # open http://localhost:5173
```
Try `samples/sketchy-lease.txt` (fictional, with planted red flags).

## Deploy (Vercel)
1. Push to GitHub and import the repo in Vercel (framework: Vite).
2. Add env vars `GROQ_API_KEY` (and optionally `GROQ_MODEL`) for Cloud demo mode.
3. To use Private mode from the deployed site, start Ollama with your domain allowed:
   `OLLAMA_ORIGINS="https://your-app.vercel.app" ollama serve`

## How it works
1. `src/lib/pdf.js` extracts text in the browser with pdf.js.
2. `src/lib/decode.js` sends the text (split into chunks if long) to Llama with the prompt in `src/lib/prompts.js`, asking for strict JSON.
3. The JSON is validated, merged, and sorted by risk, then rendered by the React components.
4. Cloud mode goes through `api/decode.js`, a Vercel function that keeps the Groq key server-side and stores nothing.

## Roadmap
- Chrome extension: "decode this page" for terms of service
- Compare two leases or offers side by side
- Fully in-browser Llama with WebLLM (no install)

## License
MIT
