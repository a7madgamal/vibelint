# @vibelint/roasted-commit

AI-powered commit message generator using Ollama.

## Install

```bash
npm install -D @vibelint/roasted-commit
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
- Recommended model: `ollama pull deepseek-v3.1:671b-cloud`
- Staged git changes

## Config

- `VIBELINT_OLLAMA_URL` - Ollama URL (default: `http://127.0.0.1:11434`)
- Will automatically use `deepseek-v3.1:671b-cloud` if installed
- Otherwise, prompts to install it or select from available models
- Config and cache stored in `node_modules/.cache/vibelint/` (automatically gitignored)
