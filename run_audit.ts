import { runAudit } from './lib/audit';

async function main() {
  console.log('Running audit against https://infrasity.com...');
  try {
    const result = await runAudit('https://infrasity.com');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Audit failed:', err);
  }
}

main();
