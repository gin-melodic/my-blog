---
title: "Resolving Tool-Use Compatibility for Qwen3-Coder on OpenClaw"
pubDate: '2026-02-17'
description: 'A technical guide on configuring Qwen3-Coder with OpenClaw by enforcing OpenAI-compatible JSON tool calls via custom Modelfiles.'
tags: ["Ollama", "OpenClaw", "LLM", "Qwen", "DevOps"]
---

## Abstract
This document details the successful integration of the `qwen3-coder:30b` model (hosted via Ollama) with the OpenClaw agent platform. The primary challenge involved incompatible tool-calling formats: Qwen3-Coder natively outputs XML-wrapped tool calls, whereas OpenClaw expects standard OpenAI JSON formats. The solution involved a two-layer strategy: customizing the Ollama Modelfile to enforce JSON output and configuring OpenClaw to treat the Ollama endpoint as a native OpenAI provider.

## 1. Problem Statement

When deploying `qwen3-coder:30b` for OpenClaw's `agent-browser` skill, the following issues were observed:

1.  **Format Mismatch:** The model outputted tool calls in XML format (e.g., `<tools>...</tools>`), which OpenClaw parsed as plain text content rather than executable instructions.
2.  **Execution Failure:** OpenClaw displayed the raw JSON/XML to the user but failed to trigger the actual tool execution logic.
3.  **Context Pollution:** Failed attempts left the conversation context in a state where the model refused to attempt further tool calls.

## 2. Solution Architecture
The final working configuration relies on "deceiving" OpenClaw into treating the Ollama endpoint as a standard OpenAI API, while simultaneously forcing the underlying model to adhere to OpenAI's strict JSON schema for tool calls.

### 2.1 Ollama Modelfile Configuration

We created a custom model variant, `qwen3-coder-json`, which overrides the default System Prompt and Template to strictly enforce JSON output without XML wrappers.

**Final Modelfile Content:**

```dockerfile
FROM qwen3-coder:30b
PARAMETER num_ctx 65536
PARAMETER temperature 0.1
PARAMETER top_p 0.9

# Critical: Remove XML-related stop sequences to prevent premature truncation
PARAMETER stop <|im_end|>

# Custom Template to ensure clean message formatting
TEMPLATE """{{ if .System }}<|im_start|>system
{{ .System }}<|im_end|>
{{ end }}{{ if .Prompt }}<|im_start|>user
{{ .Prompt }}<|im_end|>
{{ end }}<|im_start|>assistant
"""

# System Prompt to enforce OpenAI-compatible JSON structure
SYSTEM """You are a function calling AI.
When the user asks you to do something that requires a tool:
1. DO NOT explain what you are doing.
2. DO NOT output XML tags like <tools>.
3. OUTPUT ONLY a raw JSON object matching this schema:
{"tool_calls": [{"id": "call_unique_id", "type": "function", "function": {"name": "tool_name", "arguments": "{\"arg_name\": \"value\"}"}}]}

Example:
User: Search for apple
Assistant: {"tool_calls": [{"id": "call_123", "type": "function", "function": {"name": "web_search", "arguments": "{\"query\": \"apple\"}"}}]}
"""
```

**Deployment Command:**
```bash
ollama create qwen3-coder-json -f ~/Modelfile
```

### 2.2 OpenClaw Configuration

The `openclaw.json` configuration was adjusted to use the `openai` provider type instead of `ollama`. This bypasses OpenClaw's Ollama-specific logic (which might not support tool calls fully) and uses the standard OpenAI SDK path.

**File Path:** `~/.openclaw/openclaw.json`

```json
{
  "provider": "openai",
  "base_url": "https://ollama.gindody.com/v1",
  "api_key": "ollama",
  "model": {
    "id": "qwen3-coder-json",
    "name": "Qwen3 Coder JSON"
  }
}
```

## 3. Implementation Steps
1.  **Model Creation:**
    Execute the `ollama create` command with the Modelfile above to generate the `qwen3-coder-json` model.

2.  **Configuration Update:**
    Modify `~/.openclaw/openclaw.json` to point to this new model using the `openai` provider.

3.  **Context Reset (Crucial):**
    Before testing, clear any polluted conversation history that might contain failed XML outputs.
    -   Command: `/new` in the OpenClaw chat interface.
    -   Alternative: `rm ~/.openclaw/agents/main/sessions/*.jsonl`

4.  **Verification:**
    -   **Prompt:** "Use Agent Browser to search for Shanghai weather."
    -   **Expected Behavior:** The agent should not output JSON code blocks. Instead, it should silently execute the tool and return the natural language result (e.g., "Shanghai is currently clear with a temperature of 4°C").

## 4. Key Learnings
-   **Prompt Engineering for Infrastructure:** When middleware (like OpenClaw) lacks specific parsers, the model's output format must be engineered to match the middleware's expectations.
-   **Provider Aliasing:** Treating local LLM endpoints (Ollama/vLLM) as "OpenAI" is often more robust than using their specific integrations, provided the API signature is compatible.
-   **State Management:** LLMs are stateless, but conversation history is not. Persistent failures can "poison" the context window, making a working configuration appear broken until a hard reset is performed.
