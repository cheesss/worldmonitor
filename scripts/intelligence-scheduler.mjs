#!/usr/bin/env node

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const [rawKey, inlineValue] = token.slice(2).split('=');
    const key = rawKey.trim();
    if (!key) continue;
    if (inlineValue != null) {
      args[key] = inlineValue;
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const automation = await import('../src/services/server/intelligence-automation.ts');
  const registryPath = args.registry ? String(args.registry) : undefined;
  const statePath = args.state ? String(args.state) : undefined;
  const pollIntervalMinutes = Number(args.poll || args['poll-minutes'] || 5);
  const action = String(args.action || args._[0] || 'run').trim().toLowerCase();

  if (action === 'status') {
    const payload = await automation.getIntelligenceAutomationStatus({ registryPath, statePath });
    process.stdout.write(JSON.stringify({ ok: true, ...payload }, null, 2));
    return;
  }

  if (action === 'once' || args.once) {
    const result = await automation.runIntelligenceAutomationCycle({ registryPath, statePath });
    process.stdout.write(JSON.stringify({ ok: true, result }, null, 2));
    return;
  }

  await automation.runIntelligenceAutomationWorker({
    registryPath,
    statePath,
    pollIntervalMinutes: Number.isFinite(pollIntervalMinutes) ? pollIntervalMinutes : 5,
  });
}

main().catch((error) => {
  process.stderr.write(String(error?.stack || error?.message || error));
  process.exitCode = 1;
});
