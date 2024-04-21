import SparkMD5 from 'spark-md5';

export function calcHashByChunks(chunks: Blob[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const spark = new SparkMD5.ArrayBuffer();
    const reader = new FileReader();

    let chunkIdx = 0;

    const loadChunkBlob = () => {
      reader.readAsArrayBuffer(chunks[chunkIdx]);
    };

    reader.onload = () => {
      spark.append(reader.result as ArrayBuffer);

      if (chunkIdx === chunks.length - 1) {
        resolve(spark.end());
      } else {
        chunkIdx++;
        loadChunkBlob();
      }
    };

    reader.onerror = (e) => reject(e);

    loadChunkBlob();
  });
}

export function getFullChunk(file: File, chunkSize: number): Blob[] {
  const chunks: Blob[] = [];

  let cur = 0;
  while (cur < file.size) {
    const next = cur + chunkSize;
    chunks.push(file.slice(cur, next));
    cur = next;
  }

  return chunks;
}

export function getSimpleChunk(file: File): Blob[] {
  const chunkSize = 2 * 1024 * 1024;
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

  return chunks;
}
