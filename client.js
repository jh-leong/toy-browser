const net = require('net');

const PORT = 8088;
const HOST = '127.0.0.1';

const ContentType = {
  FORM: 'application/x-www-form-urlencoded',
  JSON: 'application/json',
};

const Method = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
};

class Request {
  constructor(options) {
    const {
      host,
      port = 80,
      body = {},
      headers = {},
      method = Method.GET,
    } = options;

    this.host = host;
    this.port = port;
    this.body = body;
    this.headers = headers;
    this.method = method;

    if (!headers['Content-Type']) {
      headers['Content-Type'] = ContentType.FORM;
    }

    this.bodyText = this.getBodyText(body, headers['Content-Type']);

    this.headers['Content-Length'] = this.bodyText.length;
  }

  getBodyText(body, contentType) {
    switch (contentType) {
      case ContentType.JSON:
        return JSON.stringify(body);

      case ContentType.FORM:
        return Object.entries(body)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&');

      default:
        return '';
    }
  }

  toString() {
    //     const temp = `
    // POST / HTTP/1.1\r
    // Content-Type: ${ContentType.FORM}\r
    // Content-Length: 11\r
    // \r
    // name=tycho`;

    /**
     * 模拟发送 HTTP
     *
     * 只需要发送符合 HTTP 格式的 *文本* 就是一个 HTTP 请求
     *
     * 注意格式, 中间只有 '\n', 不能包含空格
     */
    return `${this.method} / HTTP/1.1\r
${Object.entries(this.headers)
  .map(([key, value]) => `${key}: ${value}`)
  .join('\r\n')}\r
\r
${this.bodyText}`;
  }

  send(connection) {
    return new Promise((resolve, reject) => {
      connection.write(this.toString());

      connection.on('data', (data) => {
        const dataIfy = data.toString();
        resolve(dataIfy);
        connection.end();
      });

      connection.on('error', (err) => {
        console.log(err);
        reject(err);
        connection.end();
      });

      connection.on('end', () => {
        console.log('disconnected from server');
      });
    });
  }
}

class Response {
  //
}

net.connect({
  host: HOST,
  port: PORT,
  onread: {
    buffer: Buffer.alloc(4 * 1024),
    callback: function (nread, buf) {
      console.log(buf.toString('utf8', 0, nread));
    },
  },
});

const client = net.createConnection({
  host: HOST,
  port: PORT,
});

void (async function () {
  const request = new Request({
    method: Method.POST,
    host: HOST,
    port: PORT,
    body: {
      name: 'tycho',
    },
    headers: {
      ['X-Foo2']: 'customed',
    },
  });

  const res = await request.send(client);
  console.warn('🚀\n ~ file: client.js:139 ~ res:', res);
})();
