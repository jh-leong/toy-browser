import fse from 'fs-extra';
import multiparty from 'multiparty';
import { getChunkDir, getFilePath, resWrap } from './utils.js';

export async function handleVerify(req, res) {
  new multiparty.Form().parse(req, async (err, field) => {
    if (err) {
      console.log(err);
      return;
    }

    const [filename] = field.filename;
    const [fileHash] = field.fileHash;

    const uploaded = fse.existsSync(getFilePath(filename, fileHash));
    const uploadedChunks = uploaded ? [] : await getUploadedChunks(fileHash);

    res.end(resWrap({ msg: 'ok', data: { uploaded, uploadedChunks } }));
  });
}

async function getUploadedChunks(fileHash) {
  const chunkDir = getChunkDir(fileHash);
  return fse.existsSync(chunkDir)
    ? (await fse.readdir(chunkDir)).filter((name) => name[0] !== '.')
    : [];
}
