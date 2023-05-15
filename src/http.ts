import { URL } from 'node:url';
import * as http from 'node:http';
import * as https from 'node:https';
import * as Transport from 'winston-transport';

import { LoggerContext } from './logger';

export interface HttpTransportOptions extends Transport.TransportStreamOptions {
  url: string;
  auth?: {
    username?: string | undefined;
    password?: string | undefined;
    bearer?: string | undefined;
  };
  headers?: Record<string, any>;
  payload?: (payload: LoggerContext) => any;
}

function getServer(url: string) {
  const info = new URL(url);
  return {
    ssl: info.protocol === 'https:',
    host: info.hostname,
    port: info.port ? Number(info.port) : undefined,
    path: info.pathname,
  };
}

export class HttpTransport extends Transport {
  constructor(private options: HttpTransportOptions) {
    super(options);
  }

  log(info: any, next: () => void) {
    this.request(info, (err, res) => {
      if (res && res.statusCode !== 200) {
        err = new Error(`Invalid HTTP Status Code: ${res.statusCode}`);
      }

      if (err) {
        this.emit('warn', err);
      } else {
        this.emit('logged', info);
      }
    });

    if (next) {
      setImmediate(next);
    }
  }
  private request(
    info: any,
    callback: (err: Error | null, res: http.IncomingMessage) => void,
  ) {
    const server = getServer(this.options.url);
    const headers = Object.assign(
      {
        'Content-Type': 'application/json; charset=utf-8',
      },
      this.options.headers,
    );
    const auth = this.options.auth;
    if (auth && auth.bearer) {
      headers.Authorization = `Bearer ${auth.bearer}`;
    }
    const req = (server.ssl ? https : http).request({
      method: 'POST',
      host: server.host,
      port: server.port,
      path: server.path,
      headers,
      auth:
        auth && auth.username && auth.password
          ? `${auth.username}:${auth.password}`
          : '',
    });

    req.on('error', callback);
    req.on('response', (res) =>
      res.on('end', () => callback(null, res)).resume(),
    );
    req.end(Buffer.from(info[Symbol.for('message')], 'utf8'));
  }
}
