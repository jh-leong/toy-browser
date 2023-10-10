const http = require('http');

const PORT = 8088;

const server = http.createServer((req, res) => {
  console.log('now: ', new Date().toLocaleString());
  console.log(req.headers);

  req
    .on('error', (err) => {
      console.error(err);
    })
    .on('data', (chunk) => {
      console.log('chunk', chunk);
      // body.push(chunk);
    })
    .on('end', () => {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('X-Foo', 'fromServer');
      res.writeHead(200, { 'Content-Type': 'text/plain' });

      res.end('ok');
    });
});

server.listen(PORT);

console.log('server start!');
