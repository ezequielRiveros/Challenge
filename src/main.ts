import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
      bufferLogs: true,
    });
    
    app.useLogger(app.get(Logger));
    
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }));

   
    await app.listen(3000);
    logger.log('Application is running on: http://localhost:3000');
  } catch (error) {
    console.log(error);
  }
}
bootstrap(); 