# 街角詩境 · Street Poetry Studio

A React frontend with a CopilotKit sidebar and FastAPI backend for original Traditional Chinese modern poetry (新詩). The sidebar opens on arrival and displays poems only. The main gallery starts empty; after a poem is generated, an OpenAI image model creates a street graffiti mural inspired by its imagery and mood. FastAPI serves the built frontend and API on one port, including Segma-style URL prefixes.

## Layout

```text
haiku-generator/
├── main.py                    # FastAPI: /health, /agent (AG-UI), and the built frontend
├── agent.py                   # Pydantic AI agent and instructions
├── illustration.py            # Image model client and prompt
├── requirements.txt
├── requirements-dev.txt
├── .env.example               # Backend model settings
├── tests/backend/             # Python tests and simulated model services
└── frontend/
    ├── index.html             # Vite entry page
    ├── src/
    │   ├── poem-app.tsx       # Studio page and poem collection
    │   ├── chat.tsx           # CopilotKit sidebar and frontend tool registration
    │   ├── poem-card.tsx
    │   └── lib/               # Poem schema, frontend tool, illustrations, backend URLs and readiness
    ├── public/images/         # Legacy assets; not displayed by the studio
    ├── tests/                 # TypeScript unit tests and browser tests
    ├── package.json
    ├── package-lock.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── playwright.config.ts
```

## Setup

Requires Python 3.10 or newer with venv support, Node.js 22 or newer, and npm. Run these commands from the repository root:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env.local
npm --prefix frontend ci
```

Set `OPENAI_API_KEY` in the root `.env.local`. Exported environment variables take precedence over the file. The key stays in the backend; the frontend has no configuration.

| Variable | Default | Meaning |
| --- | --- | --- |
| `HAIKU_MODEL` | `openai:gpt-4.1-mini` | Chat model that writes Chinese modern poetry |
| `HAIKU_IMAGE_MODEL` | `gpt-image-1-mini` | OpenAI image model that paints graffiti for each poem; empty turns illustrations off |
| `HAIKU_IMAGE_QUALITY` | `low` | `low`, `medium`, `high` or `auto`; higher is slower and costs more |

## Run

Build the frontend, then start FastAPI from the repository root:

```sh
npm --prefix frontend run build
source .venv/bin/activate
python main.py
```

Open http://127.0.0.1:8000. The sidebar opens automatically; choose 城市夜色, 雨後街角, or 想念一個人, or enter your own theme. Poems appear in the sidebar and gallery; only the gallery shows generated artwork. 上一首 and 下一首 browse your collection. On mobile, close the sidebar to view the mural. Interactive API docs are at http://127.0.0.1:8000/docs.

Rebuild the frontend after changing its source; restart FastAPI after changing `.env.local`. Before the first build, `/` returns 503 with build instructions. If FastAPI has no API key, the page shows setup instructions and an empty studio. No sample poem or painting is shown.

### Development

For automatic reload, run the backend with `python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000` and, in a second terminal, the Vite dev server:

```sh
cd frontend
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies `/agent`, `/health`, and `/illustration` to FastAPI; set `API_URL` to use a backend elsewhere.

## Segma deployment

The repository matches the Segma FastAPI container's contract:

- The container builds the frontend with `npm ci` and `npm run build` in `frontend/` (its defaults), and runs only Uvicorn with `main.py`'s `app`. No Node process runs at runtime.
- `main.py` serves `frontend/dist`. The build uses relative URLs (`base: "./"`), and the page gets a `<base>` for the prefix Segma strips (for example `/fastapi-prod/<id>/api/`), so assets and API calls stay under that prefix, with or without a trailing slash.
- `GET /health` returns 200 for the container health check.
- Set `OPENAI_API_KEY` (and optionally the model variables above) in the app's environment variables.
- `fastapi` and `uvicorn` are not pinned exactly, so the versions in the base image are kept.

To call `/agent` from a page on another website through a Segma webhook URL, add that site under the webhook's allowed websites.

## Request flow

```text
Browser → FastAPI /agent (AG-UI) → chat model
Browser ← streamed text and generate_poem tool calls ← FastAPI
Browser → FastAPI /illustration (poem) → image model
Browser ← WebP image ← FastAPI
```

`frontend/src/chat.tsx` uses `CopilotKitProvider` and `CopilotSidebar` from `@copilotkit/react-core/v2`, connected to `/agent` with `@ag-ui/client`'s `HttpAgent`. `useFrontendTool` advertises `generate_poem`, validates arguments with `frontend/src/lib/poem.ts`, and adds each valid call to the collection once. CopilotKit records tool results in the conversation and renders poem cards without images in the sidebar; invalid calls show a validation error. `followUp: false` prevents an unnecessary second model run after displaying a poem. `main.py` uses [Pydantic AI's AG-UI adapter](https://pydantic.dev/docs/ai/integrations/ui/ag-ui/) to expose the agent in `agent.py`.

The provider uses CopilotKit's direct-agent option (`agents__unsafe_dev_only`) to preserve the FastAPI-only deployment. [CopilotKit documents direct connections](https://docs.copilotkit.ai/strands/copilot-runtime) as a development/prototyping path with limited support. This app does not use Copilot Runtime, Intelligence, or persistent threads. A runtime-backed integration would require changing the deployment architecture.

For each validated poem, the browser posts `{title, lines}` to `/illustration`. Both the frontend and backend require a nonempty title of at most 80 characters and 2–16 nonempty lines of at most 200 characters each. The agent writes free verse rather than haiku or fixed-meter verse. FastAPI builds the image prompt itself (`illustration.py`), using the poem's title and all lines to guide light-toned California coastal graffiti: sun-washed peach, coral, sandy yellow, sky blue, seafoam and pale lavender, soft daylight, spray-painted gradients, stencil silhouettes, and cream concrete textures. It asks for no lettering inside the mural; the poem is rendered separately as accessible text.

No artwork is requested or displayed before a poem is generated. While painting, the main gallery shows the poem and a progress message. If illustrations are off or generation fails, the poem stays with an unavailable-artwork message; no local placeholder painting appears. The returned WebP is shown uncropped in the main gallery only.

The `HAIKU_*` environment variable names remain compatible with existing deployments even though the app now generates Chinese modern poetry.

## Tests

Backend tests, from the repository root:

```sh
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m pytest tests/backend -q
```

Frontend checks, from `frontend/`:

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests run against the built frontend served by FastAPI, so run `npm run build` first. They start the FastAPI test services automatically, using the root `.venv` with `requirements-dev.txt`. They cover missing-key setup, the automatically opened sidebar, an empty initial gallery with no image requests, streamed poem calls, collection navigation, artwork restricted to the main gallery, painting progress/failure, serving under a Segma-style URL prefix, and mobile layout. Only the models are simulated; live generation requires your own API key.

## Current limits

The browser retains the latest 50 poems and their illustrations in memory; refresh clears the collection and the conversation. Each illustration is one image-model call, billed by OpenAI. The schema enforces a title and 2–16 nonempty lines; poetic quality depends on the model. Model calls may incur provider usage charges. Add authentication, usage limits, and persistence as needed before public deployment.
