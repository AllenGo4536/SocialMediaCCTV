import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const profileId = process.argv[2];

const { syncProfileAiSignals } = await import(path.resolve(__dirname, '../src/lib/ai-profile-sync.ts'));

const result = await syncProfileAiSignals(profileId ? [profileId] : undefined);
console.log(JSON.stringify(result, null, 2));
