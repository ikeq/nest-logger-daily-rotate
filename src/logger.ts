import winston, { createLogger, format } from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { LoggerService, ConsoleLogger, LogLevel } from '@nestjs/common';
import { pick, isEmpty, omit } from 'lodash';
import { Request } from 'express';
import { HttpTransport, HttpTransportOptions } from './http';

const defauleLogEntries = [
  'timestamp',
  'level',
  'context',
  'message',
  'trace',
  'ip',
  'ua',
  'method',
  'url',
  'query',
  'body',
] as const;

const levelPriorities = {
  error: 0,
  warn: 1,
  log: 2,
  debug: 3,
  verbose: 4,
};

function getWinstonLevel(level: LogLevel) {
  return level === 'log' ? 'info' : level;
}

function getNestLevel(level: string) {
  return level === 'info' ? 'log' : level;
}

function filterEmpty<T extends object>(obj: T) {
  return (Object.keys(obj) as (keyof T)[]).reduce((map, k) => {
    const v = obj[k];
    // lodash.isEmpty can't handle number
    if (typeof v === 'number' || !isEmpty(v)) {
      map[k] = v;
    }
    return map;
  }, {} as T);
}

function getFormat(
  logEntries: LogEntry[],
  fn?: (payload: LoggerContext) => any,
) {
  return format.combine(
    format.timestamp({ format: () => +new Date() as any }),
    format.printf((obj) => {
      obj.level = getNestLevel(obj.level);
      obj.ip = obj.ip || '::1';
      const payload = {
        ...pick(obj, logEntries),
        ...omit(obj, defauleLogEntries),
      };
      return JSON.stringify(fn ? fn(payload) : payload);
    }),
  );
}

export type ConstructOptions =
  DailyRotateFile.DailyRotateFileTransportOptions & {
    context?: string;
    level?: LogLevel;
    logEntries?: LogEntry[];
    http?: HttpTransportOptions;
  };

export type LogEntry = (typeof defauleLogEntries)[number];

export interface LoggerContext {
  context?: string;
  ip?: string;
  ua?: string;
  method?: string;
  url?: string;
  query?: any;
  body?: any;
  [name: string]: any;
}

export class Logger {
  private loggers: {
    winston: winston.Logger;
    nest: LoggerService;
  };
  private level: LogLevel = 'verbose';
  private logEntries: LogEntry[];

  constructor(options: ConstructOptions, private context?: LoggerContext) {
    this.logEntries = options.logEntries || (defauleLogEntries as any);
    this.setLevel(options.level);
    this.loggers = {
      winston: createLogger({
        transports: [
          options.filename && options.dirname
            ? new DailyRotateFile({
                filename: options.filename as any,
                dirname: options.dirname,
                format: getFormat(this.logEntries),
                ...options,
                level: 'silly',
              })
            : [],
          options.http
            ? new HttpTransport({
                format: getFormat(this.logEntries, options.http.payload),
                ...options.http,
                level: 'silly',
              })
            : [],
        ].flat(),
      }),
      nest: new ConsoleLogger(),
    };
  }

  static getContext(
    context: string | { context?: string; [name: string]: any },
    request: Request,
  ): LoggerContext {
    return filterEmpty({
      ...(typeof context === 'object' ? context : { context }),
      ip: request.ip,
      ua: request.get('user-agent'),
      method: request.method,
      url: request.originalUrl,
      query: request.query,
      body: request.body,
    });
  }

  all(
    message: any,
    level: LogLevel,
    context?: LoggerContext,
    trace?: string,
  ): any {
    context = {
      ...this.context,
      ...(typeof context === 'object'
        ? context
        : ({ context: context } as any)),
    } as LoggerContext;

    if (levelPriorities[level] > levelPriorities[this.level]) return;

    (this.loggers.nest[level] as any)(
      message.message || message,
      context.context,
    );

    if (!this.loggers.winston.transports.length) return;

    const winstonLevel = getWinstonLevel(level);

    if (message instanceof Error || message.message) {
      return this.loggers.winston.log({
        level: winstonLevel,
        message: message.message,
        trace: [trace || message.stack],
        ...context,
      });
    }

    return this.loggers.winston.log({
      level: winstonLevel,
      message,
      ...context,
    });
  }

  setLevel(level?: LogLevel) {
    if (!level || levelPriorities[level] === undefined) return;
    this.level = level;
  }

  error(message: any, trace?: string, context?: LoggerContext) {
    this.all(message, 'error', context, trace);
  }

  log(message: any, context?: LoggerContext) {
    this.all(message, 'log', context);
  }

  warn(message: any, context?: LoggerContext) {
    this.all(message, 'warn', context);
  }

  debug(message: any, context?: LoggerContext) {
    this.all(message, 'debug', context);
  }

  verbose(message: any, context?: LoggerContext) {
    this.all(message, 'verbose', context);
  }
}
