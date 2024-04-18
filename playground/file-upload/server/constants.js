import path from 'node:path';

const cwd = process.cwd();

/** 文件存储目录 */
export const UPLOAD_DIR = path.resolve(cwd, '..', 'uploaded_files');
