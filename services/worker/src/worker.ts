export type Job = { id: string; run: () => Promise<void> };

export async function processJobs(jobs: Job[]): Promise<number> {
  let done = 0;
  for (const job of jobs) {
    await job.run();
    done += 1;
  }
  return done;
}
