import winston, { createLogger, format } from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { LoggerService, ConsoleLogger, LogLevel } from '@nestjs/common';
import { isEmpty } from 'lodash';
import { Request } from 'express';
import { HttpTransport, HttpTransportOptions } from './http';

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

function getFormat(fn?: (payload: LoggerContext) => any) {
  return format.combine(
    format.timestamp({ format: () => +new Date() as any }),
    format.printf((obj: any) => {
      obj.level = getNestLevel(obj.level);
      return JSON.stringify(fn ? fn(obj) : obj);
    }),
  );
}

export type ConstructOptions =
  DailyRotateFile.DailyRotateFileTransportOptions & {
    context?: string | ((request: Request) => object);
    level?: LogLevel;
    http?: HttpTransportOptions;
  };

export interface LoggerContext {
  context?: string;
  [name: string]: any;
}

export class Logger {
  private loggers: {
    winston: winston.Logger;
    nest: LoggerService;
  };
  private level: LogLevel = 'verbose';

  constructor(
    private options: ConstructOptions,
    private context?: LoggerContext,
  ) {
    this.setLevel(options.level);
    this.loggers = {
      winston: createLogger({
        transports: [
          options.filename && options.dirname
            ? new DailyRotateFile({
                filename: options.filename as any,
                dirname: options.dirname,
                format: getFormat(),
                ...options,
                level: 'silly',
              })
            : [],
          options.http
            ? new HttpTransport({
                format: getFormat(options.http.payload),
                ...options.http,
                level: 'silly',
              })
            : [],
        ].flat(),
      }),
      nest: new ConsoleLogger(),
    };
  }

  getContext(
    context: string | { context?: string; [name: string]: any },
    request?: Request,
  ): LoggerContext {
    const userContext = ((typeof this.options.context === 'function'
      ? this.options.context(request || ({} as any))
      : { context: this.options.context }) || {}) as LoggerContext;

    if (typeof context === 'object') {
      Object.assign(userContext, context);
    } else if (context) {
      userContext.context = context;
    }

    return filterEmpty(userContext);
  }

  all(
    level: LogLevel,
    message: any,
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
    this.all('error', message, context, trace);
  }

  log(message: any, context?: LoggerContext) {
    this.all('log', message, context);
  }

  warn(message: any, context?: LoggerContext) {
    this.all('warn', message, context);
  }

  debug(message: any, context?: LoggerContext) {
    this.all('debug', message, context);
  }

  verbose(message: any, context?: LoggerContext) {
    this.all('verbose', message, context);
  }
}
