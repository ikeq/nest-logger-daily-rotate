# nest-logger-daily-rotate

Enhancing nest's default logger with winston-daily-rotate-file

## Quick start

### Import `LoggerModule` into `AppModule`

```ts
import { Module } from '@nestjs/common';
import { LoggerModule } from 'nest-logger-daily-rotate';

@Module({
  imports: [
    LoggerModule.forRoot({
      level: 'log',
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
      Logger.getContext('Context', ctx.getRequest()),
    );

    // ...
  }
}
```

### Replace the Nest logger

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nest-logger-daily-rotate';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  await app.listen(3000);
}
bootstrap();
```

## Options

```ts
import * as DailyRotateFile from 'winston-daily-rotate-file';

type ConstructOptions = DailyRotateFile.DailyRotateFileTransportOptions & {
  context?: string;
  level?: 'log' | 'error' | 'warn' | 'debug' | 'verbose';
  logEntries?: Array<
    | 'level'
    | 'ip'
    | 'body'
    | 'method'
    | 'query'
    | 'url'
    | 'message'
    | 'timestamp'
    | 'context'
    | 'trace'
    | 'ua'
  >;
  http?: {
    url: string;
    auth?: {
      username?: string | undefined;
      password?: string | undefined;
      bearer?: string | undefined;
    };
    headers?: Record<string, any>;
    payload?: (payload: LoggerContext) => any;
  };
};
```

## License

MIT
