interface FlushJobOption {
  limit?: number;
  allowError?: boolean;
}

export type AnyAsyncFunction = (...args: any[]) => Promise<any>;

export async function flushJobs<T extends AnyAsyncFunction>(
  jobs: T[],
  { limit = Infinity, allowError = true }: FlushJobOption = {}
): Promise<{ res: any[]; errors: { job: T; res: any }[] }> {
  return new Promise((resolve, reject) => {
    try {
      const res: any[] = [];
      const errors: { job: T; res: any }[] = [];

      let i = 0;
      let running = 0;

      const run = async () => {
        if (i >= jobs.length && running === 0) {
          return resolve({ res, errors });
        }

        while (running <= limit && i < jobs.length) {
          const jobIdx = i;

          i++;
          running++;

          jobs[jobIdx]?.()
            .then((r) => {
              res.push(r);
            })
            .catch((e) => {
              if (!allowError) return reject(e);
              errors.push({ job: jobs[jobIdx], res: e });
            })
            .finally(() => {
              running--;
              run();
            });
        }
      };

      run();
    } catch (err) {
      reject(err);
    }
  });
}

export async function flushJobsWithRetry(
  jobs: AnyAsyncFunction[],
  options: FlushJobOption & { retry: number },
  _retryCount = 0
) {
  const { retry = 0 } = options;

  const { errors } = await flushJobs(jobs, {
    ...options,
    allowError: _retryCount < retry,
  });

  if (errors.length) {
    console.log('[ flushJobsWithRetry ] _retryCount: ', _retryCount, errors);

    await flushJobsWithRetry(
      errors.map((i) => i.job),
      options,
      _retryCount + 1
    );
  }
}
