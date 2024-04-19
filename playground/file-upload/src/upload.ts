import SparkMD5 from 'spark-md5';
import { CusAbortController, post } from '@/request';
import { flushJobs } from '@/utils';

export interface FileChunk {
  file: Blob;
  chunkHash: string;
}

const MAX_CHUNK_SIZE = 0.2 * 1024 * 1024;

export type ChunkUploadProgress = Record<string, number>;

interface UploadOption {
  onProgress?: (progress: ChunkUploadProgress) => void;
  onChunkComplete?: (chunks: FileChunk[]) => void;
}

export enum UploadState {
  UPLOADED,
  PENDING,
  UPLOADING,
  PAUSED,
  SUCCESS,
  FAILED,
}

export class FileUploader {
  private file: File;

  state = UploadState.PENDING;
  fileHash = '';
  chunkSize = 0;
  chunks: FileChunk[] = [];
  uploadedChunks: string[] = [];
  abortList: CusAbortController[] = [];
  progressMap: ChunkUploadProgress = {};
  options: UploadOption = {};

  constructor(file: File) {
    this.file = file;
  }

  get filename() {
    return this.file.name;
  }

  get fileSize() {
    return this.file.size;
  }

  async upload(options: UploadOption) {
    this.options = options;
    this.chunkSize = getChunkSize(this.fileSize);

    // 1. 计算 hash
    this.fileHash = await calculateHashSample(this.file, this.chunkSize);

    // 2. 校验文件是否已上传
    const { uploaded, uploadedChunks } = await verifyFile(
      this.filename,
      this.fileHash
    );

    if (uploaded) {
      this.state = UploadState.UPLOADED;
      return;
    }

    // 3. 分块
    this.chunks = createFileChunk({
      file: this.file,
      size: this.chunkSize,
      fileHash: this.fileHash,
    });
    options.onChunkComplete?.(this.chunks);

    // 4. 分片上传
    await this.doChunksUpload(uploadedChunks);

    // 5. 合并文件
    await this.doMerge();

    this.onUploadSuccess();
  }

  pause() {
    this.state = UploadState.PAUSED;
    this.abortList.forEach((ctrl) => ctrl.abort());
    // release abortList
    this.abortList = [];
  }

  async resume() {
    if (this.state !== UploadState.PAUSED) return;

    const { uploadedChunks } = await verifyFile(this.filename, this.fileHash);
    this.uploadedChunks = uploadedChunks;

    await this.doChunksUpload(uploadedChunks);
    await this.doMerge();
  }

  private onUploadSuccess() {
    this.state = UploadState.SUCCESS;
    // release memory
    this.chunks = [];
  }

  private async doMerge() {
    if (this.state !== UploadState.UPLOADING) return;

    await doMerge({
      filename: this.filename,
      fileHash: this.fileHash,
      chunkSize: this.chunkSize,
    });
  }

  private async doChunksUpload(uploadedChunks: string[]) {
    this.state = UploadState.UPLOADING;

    const seen = new Set(uploadedChunks);

    this.initProgress(seen);

    const onChunkProgress = (chunkHash: string, percent: number) => {
      this.progressMap[chunkHash] = percent;
      this.options?.onProgress?.(this.progressMap);
    };

    const chunks = this.chunks.filter((i) => !seen.has(i.chunkHash));

    await doChunksUpload({
      chunks,
      fileHash: this.fileHash,
      filename: this.filename,
      abortList: this.abortList,
      onProgress: onChunkProgress,
    });
  }

  private initProgress(seen: Set<string>) {
    this.progressMap = this.chunks.reduce((acc, chunk) => {
      acc[chunk.chunkHash] = seen.has(chunk.chunkHash) ? 100 : 0;
      return acc;
    }, {});
    this.options?.onProgress?.(this.progressMap);
  }
}

async function verifyFile(
  filename: string,
  fileHash: string
): Promise<{ uploaded: boolean; uploadedChunks: string[] }> {
  const formData = new FormData();
  formData.append('fileHash', fileHash);
  formData.append('filename', filename);

  const { data = {} } = await post('/verify', formData);
  const { uploaded = false, uploadedChunks = [] } = data;

  return { uploaded, uploadedChunks };
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
  abortList,
}: {
  chunks: FileChunk[];
  fileHash: string;
  filename: string;
  onProgress?: OnChunkProgress;
  abortList?: CusAbortController[];
}) {
  // todo 失败自动重传

  const jobs = chunks.map((chunk) => () => {
    const abortController = { abort: () => void 0 };
    abortList?.push(abortController);
    return doUpload({ chunk, filename, fileHash, onProgress, abortController });
  });

  await flushJobs(jobs, { limit: 6 });
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

type OnChunkProgress = (chunkHash: string, percent: number) => void;

interface UploadData {
  chunk: FileChunk;
  filename: string;
  fileHash: string;
  onProgress?: OnChunkProgress;
  abortController?: CusAbortController;
}

async function doUpload({
  fileHash,
  filename,
  chunk,
  onProgress,
  abortController,
}: UploadData) {
  const formData = new FormData();
  formData.append('chunk', chunk.file);
  formData.append('hash', chunk.chunkHash);
  formData.append('fileHash', fileHash);
  formData.append('filename', filename);

  await post('/upload', formData, {
    abortController,
    onProgress: onProgress
      ? (e) => {
          const progress = parseInt(String((e.loaded / e.total) * 100));
          onProgress(chunk.chunkHash, progress);
        }
      : undefined,
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
