#!/usr/bin/env python3
"""List GigaChat models and test chat on VPS via API env."""
from __future__ import annotations

import json
import sys
import uuid

from trassa_ssh import connect_trassa_ssh

NODE = r"""
import 'dotenv/config';
import { getGigachatAccessToken, fetchGigachat } from './dist/gigachatAuth.js';

const token = await getGigachatAccessToken();
const models = await fetchGigachat('https://gigachat.devices.sberbank.ru/api/v1/models', {
  method: 'GET',
  headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  signal: AbortSignal.timeout(30000),
});
console.log('MODELS', models.status, await models.text());

for (const model of ['GigaChat', 'GigaChat-Pro', 'GigaChat-2', 'GigaChat-2-Pro', 'GigaChat-2-Lite']) {
  const res = await fetchGigachat('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'ok' }],
      max_tokens: 10,
    }),
    signal: AbortSignal.timeout(30000),
  });
  const body = await res.text();
  console.log('CHAT', model, res.status, body.slice(0, 200));
}
"""


def main() -> int:
    ssh = connect_trassa_ssh()
    sftp = ssh.open_sftp()
    remote = "/root/trassa-server/_giga_test.mjs"
    sftp.open(remote, "w").write(NODE.encode("utf-8"))
    sftp.close()
    _, stdout, stderr = ssh.exec_command(
        f"cd /root/trassa-server && node {remote}",
        timeout=120,
    )
    code = stdout.channel.recv_exit_status()
    sys.stdout.buffer.write(stdout.read())
    sys.stdout.buffer.write(stderr.read())
    print("exit", code)
    ssh.close()
    return code


if __name__ == "__main__":
    raise SystemExit(main())
