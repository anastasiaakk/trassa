#!/usr/bin/env python3
"""Compare OpenRouter free model latency on VPS."""
from __future__ import annotations

import json
import sys
import time
import uuid

from trassa_ssh import connect_trassa_ssh

MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen-2.5-7b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
    "deepseek/deepseek-r1:free",
    "deepseek/deepseek-chat-v3-0324:free",
    "google/gemma-3-27b-it:free",
    "openrouter/free",
    "openai/gpt-oss-120b:free",
]

PROMPT = "Ответь одним коротким предложением: привет."


def main() -> int:
    ssh = connect_trassa_ssh()
    for model in MODELS:
        body = json.dumps(
            {
                "model": model,
                "messages": [{"role": "user", "content": PROMPT}],
                "max_tokens": 80,
                "provider": {"sort": "latency"},
            },
            ensure_ascii=False,
        )
        cmd = f"""
set -a; source /root/trassa-server/.env 2>/dev/null; set +a
start=$(date +%s%3N)
code=$(curl -s -o /tmp/or.json -w '%{{http_code}}' -X POST 'https://openrouter.ai/api/v1/chat/completions' \\
  -H 'Content-Type: application/json' \\
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \\
  -H 'HTTP-Referer: https://trassa.duckdns.org' \\
  -H 'X-Title: Trassa Portal' \\
  -d {json.dumps(body)} )
end=$(date +%s%3N)
echo "$model|$code|$((end-start))ms|$(head -c 120 /tmp/or.json)"
"""
        cmd = cmd.replace("$model", model)
        _, stdout, _ = ssh.exec_command(cmd, timeout=120)
        stdout.channel.recv_exit_status()
        print(stdout.read().decode("utf-8", errors="replace").strip())
    ssh.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
