import { connect, createConnection } from 'net';
import { parseHTML } from './parser.js';

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

        const parser = new ResponseParser();

        parser.receive(dataIfy);

        if (parser.isFinished) {
          resolve(parser.response);
        } else {
          reject('parser error: ', dataIfy);
        }

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

class ResponseParser {
  constructor() {
    this.WAITING_STATUS_LINE = 0;
    this.WAITING_STATUS_LINE_END = 1;

    this.WAITING_HEADER_NAME = 2;
    this.WAITING_HEADER_SPACE = 3;

    this.WAITING_HEADER_VALUE = 4;
    this.WAITING_HEADER_LINE_END = 5;

    this.WAITING_HEADER_BLOCK_END = 6;

    this.WAITING_BODY = 7;

    this.current = this.WAITING_STATUS_LINE;

    this.statusLine = '';
    this.headers = {};
    this.headerName = '';
    this.headerValue = '';

    this.bodyParser = null;
  }

  get isFinished() {
    return !!this.bodyParser?.isFinished;
  }

  get response() {
    this.statusLine.match(/HTTP\/1.1 ([0-9]+) ([\s\S]+)/);

    return {
      statusCode: RegExp.$1,
      statusText: RegExp.$2,
      headers: this.headers,
      body: this.bodyParser.content.join(''),
    };
  }

  receive(string) {
    for (let i = 0; i < string.length; i++) {
      this.receiverChar(string.charAt(i));
    }
  }

  receiverChar(char) {
    if (this.current === this.WAITING_STATUS_LINE) {
      if (char === '\r') {
        this.current = this.WAITING_STATUS_LINE_END;
      } else {
        this.statusLine += char;
      }
    } else if (this.current === this.WAITING_STATUS_LINE_END) {
      if (char === '\n') {
        this.current = this.WAITING_HEADER_NAME;
      }
    } else if (this.current === this.WAITING_HEADER_NAME) {
      if (char === ':') {
        this.current = this.WAITING_HEADER_SPACE;
      } else if (char === '\r') {
        this.current = this.WAITING_HEADER_BLOCK_END;

        if (this.headers['Transfer-Encoding'] === 'chunked') {
          this.bodyParser = new TrunkedBodyParser();
        }
      } else {
        this.headerName += char;
      }
    } else if (this.current === this.WAITING_HEADER_SPACE) {
      if (char === ' ') {
        this.current = this.WAITING_HEADER_VALUE;
      }
    } else if (this.current === this.WAITING_HEADER_VALUE) {
      if (char === '\r') {
        this.current = this.WAITING_HEADER_LINE_END;
        this.headers[this.headerName] = this.headerValue;

        this.headerName = '';
        this.headerValue = '';
      } else {
        this.headerValue += char;
      }
    } else if (this.current === this.WAITING_HEADER_LINE_END) {
      if (char === '\n') {
        this.current = this.WAITING_HEADER_NAME;
      }
    } else if (this.current === this.WAITING_HEADER_BLOCK_END) {
      if (char === '\n') {
        this.current = this.WAITING_BODY;
      }
    } else if (this.current === this.WAITING_BODY) {
      this.bodyParser.receiveChar(char);
    }
  }
}

class TrunkedBodyParser {
  constructor() {
    this.WAITING_LENGTH = 0;
    this.WAITING_LENGTH_LINE_END = 1;

    this.READING_TRUNK = 2;
    this.WAITING_NEW_LINE = 3;

    this.WAITING_NEW_LINE_END = 4;

    this.length = 0;
    this.content = [];

    this.isFinished = false;

    this.current = this.WAITING_LENGTH;
  }

  receiveChar(char) {
    if (this.current === this.WAITING_LENGTH) {
      if (char === '\r') {
        if (this.length === 0) {
          this.isFinished = true;
        }

        this.current = this.WAITING_LENGTH_LINE_END;
      } else {
        // 进一位
        this.length *= 16;
        this.length += parseInt(char, 16);
      }
    } else if (this.current === this.WAITING_LENGTH_LINE_END) {
      if (char === '\n') {
        this.current = this.READING_TRUNK;
      }
    } else if (this.current === this.READING_TRUNK) {
      this.content.push(char);
      this.length--;

      if (this.length === 0) {
        this.current = this.WAITING_NEW_LINE;
      }
    } else if (this.current === this.WAITING_NEW_LINE) {
      if (char === '\r') {
        this.current = this.WAITING_NEW_LINE_END;
      }
    } else if (this.current === this.WAITING_NEW_LINE_END) {
      if (char === '\n') {
        this.current = this.WAITING_LENGTH;
      }
    }
  }
}

connect({
  host: HOST,
  port: PORT,
  onread: {
    buffer: Buffer.alloc(4 * 1024),
    callback: function (nread, buf) {
      console.log(buf.toString('utf8', 0, nread));
    },
  },
});

const client = createConnection({
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

  const response = await request.send(client);

  const dom = parseHTML(response.body);

  console.warn(
    '🚀\n ~ file: client.js:298 ~ dom:',
    JSON.stringify(dom, null, '  ')
  );
  // console.warn('🚀 ~ file: client.js:139 ~ send resolve: \n', response);
})();
