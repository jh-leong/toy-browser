import path from 'node:path';
import fse from 'fs-extra';
import multiparty from 'multiparty';
import { getChunkDir, getFilePath, resWrap } from './utils.js';

export async function handleMerge(req, res) {
  new multiparty.Form().parse(req, async (err, field) => {
    if (err) {
      console.log(err);
      return;
    }

    const [filename] = field.filename;
    const [fileHash] = field.fileHash;
    const [_chunkSize] = field.chunkSize;

    const chunkSize = Number(_chunkSize);
    const filePath = getFilePath(filename, fileHash);
    const chunkDir = getChunkDir(fileHash);

    console.warn('🚀\n merge:', {
      fileHash,
      filename,
      chunkSize,
      filePath,
      chunkDir,
    });

    if (fse.existsSync(filePath)) {
      res.end(resWrap({ msg: 'file exist' }));
      return;
    }

    const chunkPaths = (await fse.readdir(chunkDir))
      .sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]))
      .map((p) => path.resolve(chunkDir, p));

    await mergeChunk({ chunkPaths, chunkSize, filePath });

    res.end(resWrap({ msg: 'file merged success' }));
  });
}

async function mergeChunk({ chunkPaths, chunkSize, filePath }) {
  return Promise.all(
    chunkPaths.map((chunkPath, idx) => {
      const start = idx * chunkSize;

      return doWriteFileStream(
        chunkPath,
        fse.createWriteStream(filePath, { start })
      );
    })
  );
}

function doWriteFileStream(chunkPath, writeStream) {
  return new Promise((res) => {
    const readStream = fse.createReadStream(chunkPath);

    readStream.pipe(writeStream);

    // 写入完成后删除 chunk
    readStream.on('end', () => {
      fse.unlinkSync(chunkPath);
      res(null);
    });
  });
}
