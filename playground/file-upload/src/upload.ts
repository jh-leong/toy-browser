import SparkMD5 from 'spark-md5';
import { post } from '@/request';
import { flushJobs } from '@/utils';

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
  onProgress: (chunkHash: string, percent: number) => void = () => void 0;

  constructor(file: File) {
    this.file = file;
  }

  get filename() {
    return this.file.name;
  }

  async upload(options: UploadOption) {
    const { uploaded, chunks, chunkSize, fileHash, uploadedChunks } =
      await prepareUpload(this.file);

    Object.assign(this, {
      chunks,
      chunkSize,
      fileHash,
      uploadedChunks,
      options,
    });

    if (uploaded) {
      this.state = UploadState.UPLOADED;
      return;
    }

    const { handler: onProgress, progress } = getProgressHandler(
      chunks,
      options.onProgress
    );
    this.onProgress = onProgress;

    options.onChunkComplete?.(chunks, progress);

    // 4. 分片上传
    await this.doChunksUpload();

    // 5. 合并文件
    await this.doMerge();

    this.onUploadSuccess();
  }

  onUploadSuccess() {
    this.state = UploadState.SUCCESS;
  }

  async doMerge() {
    if (this.state !== UploadState.UPLOADING) return;

    await doMerge({
      filename: this.filename,
      fileHash: this.fileHash,
      chunkSize: this.chunkSize,
    });
  }

  async doChunksUpload() {
    this.state = UploadState.UPLOADING;

    await doChunksUpload({
      chunks: this.chunks,
      fileHash: this.fileHash,
      filename: this.filename,
      onProgress: this.onProgress,
    });
  }
}

export async function doUploadFlow(
  file: File,
  options: UploadOption = {}
): Promise<UploadFileInfo | undefined> {
  const uploadFileInfo = await prepareUpload(file);

  if (uploadFileInfo.uploaded) return uploadFileInfo;

  const { chunks, chunkSize, fileHash } = uploadFileInfo;

  const { handler: onProgress, progress } = getProgressHandler(
    chunks,
    options.onProgress
  );

  options.onChunkComplete?.(chunks, progress);

  // 4. 分片上传
  const filename = file.name;
  await doChunksUpload({ chunks, fileHash, filename, onProgress });

  // 5. 合并文件
  await doMerge({ filename, fileHash, chunkSize });
}

interface UploadFileInfo {
  chunks: FileChunk[];
  chunkSize: number;
  fileHash: string;
  uploadedChunks: string[];
  uploaded: boolean;
}

async function prepareUpload(file: File): Promise<UploadFileInfo> {
  const ret: UploadFileInfo = {
    chunks: [],
    chunkSize: 0,
    fileHash: '',
    uploadedChunks: [],
    uploaded: false,
  };

  ret.chunkSize = getChunkSize(file.size);

  // 1. 计算 hash
  ret.fileHash = await calculateHashSample(file, ret.chunkSize);

  // 2. 校验文件是否已上传
  const { uploaded, uploadedChunks } = await verifyFile(
    file.name,
    ret.fileHash
  );

  ret.uploaded = uploaded;
  ret.uploadedChunks = uploadedChunks;

  if (uploaded) return ret;

  // 3. 分块
  ret.chunks = createFileChunk({
    file,
    size: ret.chunkSize,
    fileHash: ret.fileHash,
  });

  return ret;
}

async function verifyFile(filename: string, fileHash: string) {
  const formData = new FormData();
  formData.append('fileHash', fileHash);
  formData.append('filename', filename);

  const { data = {} } = await post('/verify', formData);
  const { uploaded = false, uploadedChunks = [] } = data;

  return { uploaded, uploadedChunks };
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
  onProgress?: FileUploader['onProgress'];
}) {
  // todo 失败自动重传

  const jobs = chunks.map(
    (chunk) => () => doUpload({ chunk, filename, fileHash, onProgress })
  );

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

interface UploadData {
  chunk: FileChunk;
  filename: string;
  fileHash: string;
  onProgress?: (chunkHash: string, percent: number) => void;
}

async function doUpload({ fileHash, filename, chunk, onProgress }: UploadData) {
  const formData = new FormData();
  formData.append('chunk', chunk.file);
  formData.append('hash', chunk.chunkHash);
  formData.append('fileHash', fileHash);
  formData.append('filename', filename);

  await post('/upload', formData, {
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
