export async function calcFileHashByWorker(
  file: File,
  chunkSize: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = new URL('./worker.ts', import.meta.url);
    const worker = new Worker(url, { type: 'module' });

    worker.onerror = (e: ErrorEvent) => reject(e);

    worker.postMessage({ file, chunkSize });

    worker.onmessage = (e: MessageEvent<string>) => {
      resolve(e.data);
    };
  });
}
