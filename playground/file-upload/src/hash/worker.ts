import { calcHashByChunks, getFullChunk, getSimpleChunk } from '@/hash/md5';

onmessage = async (e: MessageEvent<{ file: File; chunkSize: number }>) => {
  const { file, chunkSize } = e.data;

  const chunks = getSimpleChunk(file);
  // const chunks = getFullChunk(file, chunkSize);

  const hash = await calcHashByChunks(chunks);

  postMessage(hash);
};
