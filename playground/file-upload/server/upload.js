import fse from 'fs-extra';
import multiparty from 'multiparty';
import { getChunkDir, getFilePath, resWrap } from './utils.js';

export async function handleUpload(req, res) {
  const multipart = new multiparty.Form();

  multipart.parse(req, async (err, field, file) => {
    try {
      if (err) throw new Error(err);

      const [chunk] = file.chunk;
      const [hash] = field.hash;
      const [filename] = field.filename;
      const [fileHash] = field.fileHash;

      const filePath = getFilePath(filename, fileHash);
      const chunkDir = getChunkDir(fileHash);
      const chunkPath = `${chunkDir}/${hash}`;

      // const info = {
      //   chunk,
      //   hash,
      //   filename,
      //   fileHash,
      //   filePath,
      //   chunkPath,
      //   chunksDir,
      // };

      const errorRate = 0.5;
      if (Math.random() < errorRate) {
        const msg = `${errorRate} 概率报错: ${hash}`;
        console.log(msg);
        res.statusCode = 500;
        res.end(resWrap({ msg }));
        return;
      }

      console.warn('🚀 handleUpload:', hash);

      // 文件存在直接返回
      if (fse.existsSync(filePath)) {
        res.end(resWrap({ msg: 'file exist' }));
        return;
      }

      if (fse.existsSync(chunkPath)) {
        res.end(resWrap({ msg: 'chunk exist' }));
        return;
      }

      if (!fse.existsSync(chunkDir)) {
        await fse.mkdirs(chunkDir);
      }

      await fse.move(chunk.path, chunkPath);

      res.end(resWrap({ msg: 'received file chunk' }));
    } catch (err) {
      console.log('[ handleUpload ]: ', err);
      res.statusCode = 500;
      res.end();
      return;
    }
  });
}
