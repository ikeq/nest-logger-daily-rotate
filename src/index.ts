import { DynamicModule, Inject, Injectable, Scope } from '@nestjs/common';
import { INQUIRER, REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { ConstructOptions, Logger, LoggerContext } from './logger';

export { Logger };

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService {
  constructor(
    @Inject(REQUEST) private request: Request,
    @Inject(INQUIRER) private inquier: any,
    @Inject(Logger) private logger: Logger,
  ) {}

  getContext(context?: any): LoggerContext {
    context = typeof context === 'object' ? context : { context };

    if (!context.context) {
      context.context = this.inquier?.constructor.name;
    }

    return this.logger.getContext(context, this.request);
  }

  log(message: any, context?: any) {
    this.logger.log(message, this.getContext(context));
  }

  error(message: any, trace?: string, context?: any) {
    this.logger.error(message, trace, this.getContext(context));
  }

  warn(message: any, context?: any) {
    this.logger.warn(message, this.getContext(context));
  }

  debug(message: any, context?: any) {
    this.logger.debug(message, this.getContext(context));
  }

  verbose(message: any, context?: any) {
    this.logger.verbose(message, this.getContext(context));
  }
}

export class LoggerModule {
  static forRoot(
    options: ConstructOptions | (() => ConstructOptions),
  ): DynamicModule {
    let logger: Logger;

    return {
      global: true,
      module: LoggerModule,
      providers: [
        {
          provide: Logger,
          useFactory: () => {
            if (!logger) {
              logger = new Logger(
                typeof options === 'function' ? options() : options,
              );
            }
            return logger;
          },
        },
        LoggerService,
      ],
      exports: [LoggerService, Logger],
    };
  }
}
