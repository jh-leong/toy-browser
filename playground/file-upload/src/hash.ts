import SparkMD5 from 'spark-md5';

export async function calcFileHash(
  file: File,
  chunkSize: number
): Promise<string> {
  console.time('[ calc simple hash ]');
  const hash1 = await calcSimpleHash(file);
  console.timeEnd('[ calc simple hash ]');

  // console.time('[ calc full hash ]');
  // const hash2 = await calcFullHash(file, chunkSize);
  // console.timeEnd('[ calc full hash ]');

  return hash1;
}

function calcFullHash(file: File, chunkSize: number) {
  const chunks: Blob[] = [];

  let cur = 0;
  while (cur < file.size) {
    const next = cur + chunkSize;
    chunks.push(file.slice(cur, next));
    cur = next;
  }

  return calcHashByChunks(chunks);
}

function calcSimpleHash(file: File): Promise<string> {
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

  return calcHashByChunks(chunks);
}

function calcHashByChunks(chunks: Blob[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const spark = new SparkMD5.ArrayBuffer();
    const reader = new FileReader();

    let chunkIdx = 0;

    const readAsArrayBuffer = () => {
      reader.readAsArrayBuffer(chunks[chunkIdx]);
    };

    reader.onload = (e: any) => {
      spark.append(e.target.result);

      if (chunkIdx === chunks.length - 1) {
        resolve(spark.end());
      } else {
        chunkIdx++;
        readAsArrayBuffer();
      }
    };

    reader.onerror = (e) => reject(e);

    readAsArrayBuffer();
  });
}
