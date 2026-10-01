// Copies Hardhat-generated contract artifacts (ABI) into the web app so the frontend
// integrates against the exact on-chain interface. Run after `npx hardhat compile`.
// Usage: node scripts/sync-abi.mjs  (npm run sync-abi in apps/web)
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..'); // apps/web
const artifactBase = join(root, '..', '..', 'contracts', 'artifacts', 'contracts');

const targets = [
  {
    artifact: join(artifactBase, 'IdentityRegistry.sol', 'IdentityRegistry.json'),
    out: join(root, 'src', 'identity', 'abi', 'IdentityRegistry.json'),
  },
];

for (const t of targets) {
  if (!existsSync(t.artifact)) {
    console.error(`Missing artifact: ${t.artifact}\nRun "npx hardhat compile" in contracts/ first.`);
    process.exit(1);
  }
  const full = JSON.parse(readFileSync(t.artifact, 'utf8'));
  const slim = { contractName: full.contractName, abi: full.abi };
  mkdirSync(dirname(t.out), { recursive: true });
  writeFileSync(t.out, JSON.stringify(slim, null, 2) + '\n');
  console.log(`Synced ABI -> ${t.out.replace(root + '/', '')} (${slim.abi.length} entries)`);
}
