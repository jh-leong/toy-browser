import SparkMD5 from 'spark-md5';
import { post } from '@/request';

export interface FileChunk {
  file: Blob;
  chunkHash: string;
}

const MAX_CHUNK_SIZE = 0.2 * 1024 * 1024;

export type ChunkUploadProgress = Record<string, number>;

interface UploadOption {
  onProgress?: (progress: ChunkUploadProgress) => void;
  onChunkComplete?: (
    chunks: FileChunk[],
    progress: ChunkUploadProgress
  ) => void;
}

export async function doUploadFlow(file: File, options: UploadOption = {}) {
  const chunkSize = getChunkSize(file.size);

  // 1. 计算 hash
  const fileHash = await calculateHashSample(file, chunkSize);

  // 2. 分块
  const chunks: FileChunk[] = createFileChunk({
    file,
    size: chunkSize,
    fileHash,
  });

  const { handler: onProgress, progress } = getProgressHandler(
    chunks,
    options.onProgress
  );

  options.onChunkComplete?.(chunks, progress);

  // 3. 校验文件是否已上传

  // 4. 分片上传
  const filename = file.name;
  await doChunksUpload({ chunks, fileHash, filename, onProgress });

  // 5. 合并文件
  await doMerge({ filename, fileHash, chunkSize });
}

function getProgressHandler(
  chunks: FileChunk[],
  onProgress?: UploadOption['onProgress']
) {
  const progress: ChunkUploadProgress = chunks.reduce((acc, chunk) => {
    acc[chunk.chunkHash] = 0;
    return acc;
  }, {});

  const handler = (chunkHash: string, percent: number) => {
    progress[chunkHash] = percent;
    onProgress?.(progress);
  };

  return { handler, progress };
}

function getChunkSize(fileSize: number) {
  // must be integer: fse.createWriteStream need it
  return Math.ceil(Math.min(fileSize, MAX_CHUNK_SIZE));
}

async function doChunksUpload({
  chunks,
  fileHash,
  filename,
  onProgress,
}: {
  chunks: FileChunk[];
  fileHash: string;
  filename: string;
  onProgress: (chunkHash: string, percent: number) => void;
}) {
  // todo 失败自动重传

  const jobs = chunks.map(
    (chunk) => () => doUpload({ chunk, filename, fileHash, onProgress })
  );

  await flushJobs(jobs, { limit: 6 });
}

interface FlushJobOption {
  limit?: number;
  allowError?: boolean;
}

type AnyAsyncFunction = (...args: any[]) => Promise<any>;

async function flushJobs<T extends AnyAsyncFunction>(
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

function createFileChunk({
  size,
  file,
  fileHash,
}: {
  file: File;
  size: number;
  fileHash: string;
}) {
  const chunks: FileChunk[] = [];

  let cur = 0;
  let idx = 0;

  while (cur < file.size) {
    const chunkHash = `${fileHash}_${idx++}`;
    chunks.push({ chunkHash, file: file.slice(cur, cur + size) });
    cur += size;
  }

  return chunks;
}

async function calculateHashSample(
  file: File,
  chunkSize: number
): Promise<string> {
  // todo yieldToMain ?
  return new Promise((resolve) => {
    const spark = new SparkMD5.ArrayBuffer();
    const reader = new FileReader();
    const chunks = [file.slice(0, chunkSize)];

    let cur = chunkSize;
    while (cur < file.size) {
      const next = cur + chunkSize;

      if (next >= file.size) {
        chunks.push(file.slice(cur));
      } else {
        const mid = cur + ~~(next / 2);
        chunks.push(
          file.slice(cur, cur + 2),
          file.slice(mid, mid + 2),
          file.slice(next - 2, next)
        );
      }

      cur = next;
    }

    reader.readAsArrayBuffer(new Blob(chunks));

    reader.onload = (e: any) => {
      spark.append(e.target.result);
      resolve(spark.end());
    };
  });
}

interface UploadData {
  chunk: FileChunk;
  filename: string;
  fileHash: string;
  onProgress: (chunkHash: string, percent: number) => void;
}

async function doUpload({ fileHash, filename, chunk, onProgress }: UploadData) {
  const formData = new FormData();

  formData.append('chunk', chunk.file);
  formData.append('hash', chunk.chunkHash);
  formData.append('fileHash', fileHash);
  formData.append('filename', filename);

  await post('/upload', formData, {
    onProgress: (e) => {
      const progress = parseInt(String((e.loaded / e.total) * 100));
      onProgress(chunk.chunkHash, progress);
    },
  });
}

async function doMerge({
  filename,
  fileHash,
  chunkSize,
}: {
  filename: string;
  fileHash: string;
  chunkSize: number;
}) {
  const formData = new FormData();

  formData.append('chunkSize', String(chunkSize));
  formData.append('fileHash', fileHash);
  formData.append('filename', filename);

  await post('/merge', formData);
}
