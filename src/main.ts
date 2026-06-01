import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type { AppConfig } from '@config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));
  const config = app.get(ConfigService);
  const appCfg = config.getOrThrow<AppConfig>('app');

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  const swaggerDoc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Nibras API')
      .setDescription('Backend services for the Nibras educational platform.')
      .setVersion('0.1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'Session',
          description: 'Opaque web session token (web_{uuid})',
        },
        'session',
      )
      .addCookieAuth('nibras_web_session')
      .build(),
  );
  SwaggerModule.setup(appCfg.swaggerPath, app, swaggerDoc);

  await app.listen(appCfg.port);
}

void bootstrap();
