# nest-logger-daily-rotate

Enhance nest's default logger with winston-daily-rotate-file

## Quick start

### Import `LoggerModule` into `AppModule`

```ts
import { Module } from '@nestjs/common';
import { LoggerModule } from 'nest-logger-daily-rotate';

@Module({
  imports: [
    LoggerModule.forRoot({
      context(request) {
        return {
          url: request.originalUrl,
        };
      },
      level: 'log',
      dirname: './logs',
      filename: 'application-%DATE%.log',
    }),
  ],
})
export class AppModule {}
```

### Inject into controllers

```ts
import { Controller } from '@nestjs/common';
import { LoggerService } from 'nest-logger-daily-rotate';

@Controller('cats')
export class CatsController {
  constructor(private logger: LoggerService) {}

  @Get()
  findAll(): string {
    // {..., "level":"log","message":"moe","timestamp":"","context":"Context"}
    this.logger.log('moe', 'Context');

    // {..., "level":"log","message":"moe","timestamp":"","context":"CatsController","ext":1}
    this.logger.log('moe', { ext: 1 });

    return 'This action returns all cats';
  }
}
```

### Inject into exception filters

```ts
import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Logger } from 'nest-logger-daily-rotate';

@Catch()
export class ExceptionFilter {
  // `LoggerService` is not available, use `Logger` instead
  constructor(private logger: Logger) {}
  catch(e: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    this.logger.error(
      e.message,
      e.stack,
      // Pass full context manually
      this.logger.getContext('Context', ctx.getRequest()),
    );

    // ...
  }
}
```

### Work with middlewares

```ts
import { NestModule } from '@nestjs/common';
import { LoggerModule } from 'nest-logger-daily-rotate';

@Module()
export class AppModule implements NestModule {
  constructor(private logger: Logger) {}
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((request, response, next) => {
        this.logger.log(req.url, this.logger.getContext('Request', request));
        next();
      })
      .forRoutes('*');
  }
}
```

## Options

```ts
import * as DailyRotateFile from 'winston-daily-rotate-file';

type ConstructOptions = DailyRotateFile.DailyRotateFileTransportOptions & {
  context?: string | ((request: Request) => object);
  level?: 'log' | 'error' | 'warn' | 'debug' | 'verbose';
  http?: {
    url: string;
    auth?: {
      username?: string | undefined;
      password?: string | undefined;
      bearer?: string | undefined;
    };
    headers?: Record<string, any>;
    payload?: (payload: { context?: string; [name: string]: any }) => any;
  };
};
```

## License

MIT
