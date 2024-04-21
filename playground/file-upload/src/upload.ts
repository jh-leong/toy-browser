import { flushJobsWithRetry } from '@/utils';
import { CusAbortController, post } from '@/request';
import { calcFileHash } from '@/hash';

export interface FileChunk {
  file: Blob;
  chunkHash: string;
}

const MAX_CHUNK_SIZE = 5 * 1024 * 1024;

export type ChunkUploadProgress = Record<string, number>;

interface UploadOption {
  onProgress?: (progress: ChunkUploadProgress) => void;
  onChunkComplete?: (chunks: FileChunk[]) => void;
}

export enum UploadState {
  INIT,
  PENDING,
  UPLOADING,
  PAUSED,
  SUCCESS,
  FAILED,
  UPLOADED,
}

export class FileUploader {
  private file: File;

  state = UploadState.INIT;
  fileHash = '';
  chunkSize = 0;
  chunks: FileChunk[] = [];
  abortList: CusAbortController[] = [];
  progressMap: ChunkUploadProgress = {};
  options: UploadOption = {};

  constructor(file: File, options: UploadOption = {}) {
    this.file = file;
    this.options = options;
  }

  get filename() {
    return this.file.name;
  }

  get fileSize() {
    return this.file.size;
  }

  async upload() {
    this.state = UploadState.PENDING;

    this.chunkSize = getChunkSize(this.fileSize);

    // 1. 计算 hash
    const timeKey = '[ calc hash ]';
    console.time(timeKey);
    this.fileHash = await calcFileHash(this.file, this.chunkSize);
    console.timeEnd(timeKey);

    // 2. 校验文件是否已上传
    const { uploadedChunks } = await this.verifyFile();

    // 已上传, 秒传
    // @ts-ignore
    if (this.state === UploadState.UPLOADED) return;

    // 3. 分块
    //  - 测试 4.94GB 耗时 91ms
    const chunksTimeKey = '[ create chunks ]';
    console.time(chunksTimeKey);
    this.chunks = createFileChunk({
      file: this.file,
      size: this.chunkSize,
      fileHash: this.fileHash,
    });
    console.timeEnd(chunksTimeKey);

    this.options.onChunkComplete?.(this.chunks);

    // 4. 分片上传
    await this.doChunksUpload(uploadedChunks);

    // 5. 合并文件
    await this.doMerge();

    this.onUploadSuccess();
  }

  pause() {
    if (this.state !== UploadState.UPLOADING) return;

    this.state = UploadState.PAUSED;
    this.abortList.forEach((ctrl) => ctrl.abort());
    // release abortList
    this.abortList = [];
  }

  async resume() {
    if (this.state !== UploadState.PAUSED) return;

    this.state = UploadState.PENDING;

    const { uploadedChunks } = await this.verifyFile();

    await this.doChunksUpload(uploadedChunks);
    await this.doMerge();
    this.onUploadSuccess();
  }

  private async verifyFile() {
    const { uploaded, uploadedChunks } = await verifyFile(
      this.filename,
      this.fileHash
    );

    if (uploaded) this.state = UploadState.UPLOADED;

    return { uploaded, uploadedChunks };
  }

  private onUploadSuccess() {
    this.state = UploadState.SUCCESS;
    // release memory
    this.chunks = [];
  }

  private onUploadFailed(err: any) {
    this.state = UploadState.FAILED;
    this.syncProgress();
    throw err;
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
    try {
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
    } catch (err) {
      this.onUploadFailed(err);
    }
  }

  private initProgress(seen: Set<string>) {
    this.progressMap = this.chunks.reduce((acc, chunk) => {
      acc[chunk.chunkHash] = seen.has(chunk.chunkHash) ? 100 : 0;
      return acc;
    }, {});
    this.options?.onProgress?.(this.progressMap);
  }

  private async syncProgress() {
    let seen = new Set<string>();
    try {
      const { uploadedChunks } = await this.verifyFile();
      seen = new Set(uploadedChunks);
    } catch (err) {
      console.error('[ syncProgress ]: ', err);
    }
    this.initProgress(seen);
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

interface ChunksUploadConfig {
  chunks: FileChunk[];
  fileHash: string;
  filename: string;
  limit?: number;
  retry?: number;
  onProgress?: OnChunkProgress;
  abortList?: CusAbortController[];
}

async function doChunksUpload({
  chunks,
  fileHash,
  filename,
  onProgress,
  abortList,
  retry = 3,
  limit = 3,
}: ChunksUploadConfig) {
  const jobs = chunks.map((chunk) => () => {
    const abortController = { abort: () => void 0 };
    abortList?.push(abortController);
    return doUpload({ chunk, filename, fileHash, onProgress, abortController });
  });

  await flushJobsWithRetry(jobs, { retry, limit });
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
