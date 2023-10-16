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

      res.end(`
<html name=tycho>
  <head>
    <style>
      #container {
        width: 500px;
        height: 300px;
        display: flex;
        background-color: rgb(255,255,255);
      }

      #container #foo{
        width: 200px;
        height: 100px;
        background-color: rgb(255,0,0);
      }

      #container .c1{
        flex: 1;
        background-color: rgb(0,255,0);
      }
    </style>
  </head>

  <body style="background: black">
    <div id="container">
      <div id="foo"></div>
      <div class="c1"></div>
    </div>
  </body>
</html>
`);

      //       res.end(`
      // <body style="background: black">
      //   <div id="container">
      //     <div id="myid"></div>
      //     <div class="c1"></div>
      //   </div>
      // </body>
      // `);
    });
});

server.listen(PORT);

console.log('server start!');
