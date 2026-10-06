# ai-assistant

A small Express server that puts a browser UI in front of two APIs:

- **Groq** for chat completions, with several models queried **in parallel** so
  you can compare their answers side by side in one request.
- **Replicate** for text-to-image generation.

The whole front end is a single static `public/index.html` — no build step, no
bundler.

## Endpoints

### `POST /api/chat`

```json
{
  "messages": [{ "role": "user", "content": "Explain closures" }],
  "models": ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"]
}
```

Every model in `models` is called concurrently with `Promise.all`, and a
failing model does **not** fail the request — it comes back with its own
`error` field so the UI can show the working answers next to the broken one:

```json
{
  "results": [
    { "model": "llama-3.3-70b-versatile", "reply": "…", "error": null },
    { "model": "mixtral-8x7b-32768", "reply": null, "error": "rate limited" }
  ]
}
```

A system prompt sets the assistant's tone. The UI renders replies as Markdown
and syntax-highlights code blocks (`marked` + `highlight.js`).

### `POST /api/image`

```json
{ "prompt": "a cyberpunk cat", "model": "black-forest-labs/flux-1.1-dev" }
```

`model` is optional and defaults to `black-forest-labs/flux-1.1-dev`. The
response is `{ "imageUrl": "…" }`.

## Setup

```bash
npm install
cp .env.example .env      # then fill in the keys
npm start
```

Then open <http://localhost:3000>.

## Environment

| Variable | Purpose |
| --- | --- |
| `GROQ_API_KEY` | Groq API key — <https://console.groq.com/keys> |
| `REPLICATE_API_TOKEN` | Replicate token — <https://replicate.com/account/api-tokens> |
| `PORT` | HTTP port, default `3000` |

`.env` is gitignored.

## Files

```
├── server.js           # Express app: /api/chat, /api/image, static hosting
├── public/index.html   # chat + image UI (vanilla JS, marked, highlight.js)
├── package.json
└── .env.example
```

## Notes

- `cors()` is enabled for every origin, which is convenient locally and should
  be tightened before exposing the server to the internet.
- There is no authentication and no rate limiting. Keys live only on the
  server, but anyone who can reach the port can spend your quota — keep it on
  localhost or put it behind a proxy.
- `max_tokens` is 2048 and temperature 0.7, hardcoded in `server.js`.

## Requirements

- Node.js 18+ (uses `fetch` internally through the SDKs)

## License

No license file is included. Contact the author before redistributing.
