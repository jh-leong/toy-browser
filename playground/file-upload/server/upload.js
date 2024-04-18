import path from 'node:path';
import fse from 'fs-extra';
import multiparty from 'multiparty';
import { UPLOAD_DIR } from './constants.js';
import { getFilePath, resWrap } from './utils.js';

export async function handleUpload(req, res) {
  const multipart = new multiparty.Form();

  multipart.parse(req, async (err, field, file) => {
    try {
      if (err) {
        console.log(err);
        return;
      }
      const [chunk] = file.chunk;
      const [hash] = field.hash;
      const [filename] = field.filename;
      const [fileHash] = field.fileHash;

      const filePath = getFilePath(filename, fileHash);

      const chunksDir = path.resolve(UPLOAD_DIR, fileHash);

      const chunkPath = `${chunksDir}/${hash}`;

      // const info = {
      //   chunk,
      //   hash,
      //   filename,
      //   fileHash,
      //   filePath,
      //   chunkPath,
      //   chunksDir,
      // };
      console.warn('🚀 handleUpload:', hash);

      // if (Math.random() < 0.5) {
      //   // 概率报错
      //   console.log('概率报错了');
      //   res.statusCode = 500;
      //   res.end();
      //   return;
      // }

      // 文件存在直接返回
      if (fse.existsSync(filePath)) {
        res.end(resWrap({ msg: 'file exist' }));
        return;
      }

      if (fse.existsSync(chunkPath)) {
        res.end(resWrap({ msg: 'chunk exist' }));
        return;
      }

      if (!fse.existsSync(chunksDir)) {
        await fse.mkdirs(chunksDir);
      }

      await fse.move(chunk.path, chunkPath);

      res.end(resWrap({ msg: 'received file chunk' }));
    } catch (err) {
      console.log('catch error:', err);
      res.statusCode = 500;
      res.end();
      return;
    }
  });
}
