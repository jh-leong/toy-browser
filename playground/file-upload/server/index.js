import http from 'node:http';
import { handleUpload } from './upload.js';
import { handleMerge } from './merge.js';
import { handleVerify } from './verify.js';

const server = http.createServer();

server.on('request', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    // @ts-ignore
    res.status = 200;
    res.end();
    return;
  }

  if (req.method === 'POST') {
    if (req.url == '/upload') {
      await handleUpload(req, res);
      return;
    }

    if (req.url == '/merge') {
      await handleMerge(req, res);
      return;
    }

    if (req.url == '/verify') {
      await handleVerify(req, res);
      return;
    }
  }

  // @ts-ignore
  res.status = 500;
  res.end();
});

server.listen(3000, () => console.log('正在监听 3000 端口'));
