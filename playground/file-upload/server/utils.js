import path from 'node:path';
import { UPLOAD_DIR } from './constants.js';

export function extractExt(name) {
  return path.extname(name);
}

export function getFilePath(name, hash) {
  return path.resolve(UPLOAD_DIR, `${hash}${extractExt(name)}`);
}

export const resWrap = ({ msg }) => JSON.stringify({ msg });
