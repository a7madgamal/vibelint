# @vibelint/roastedCommit

AI-powered commit message generator using Ollama.

## Install

```bash
npm install -D @vibelint/roastedCommit
```

## Usage

```json
{
  "scripts": {
    "commit": "vibelint-roasted-commit"
  }
}
```

```bash
npm run commit
```

## Requirements

- Ollama running locally
- Ollama model installed: `ollama pull mistral-openorca`
- Staged git changes

## Config

- `VIBELINT_OLLAMA_URL` - Ollama URL (default: `http://127.0.0.1:11434`)
- Model selection saved to `.commit-config.json`
