import { processJobs } from './worker.js';

const processed = await processJobs([
  { id: 'hello', run: async () => console.log('background worker started') },
]);
console.log(`processed ${processed} job(s)`);
