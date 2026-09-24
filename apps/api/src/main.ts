import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  if (process.env.STELLAR_NETWORK && process.env.STELLAR_NETWORK !== 'testnet') {
    throw new Error('PagaJusto solo admite Stellar Testnet.');
  }

  // CORS — permite peticiones desde el frontend (Vite dev server)
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost:3001',
    ],
    credentials: true,
  });

  // Prefijo global /api
  app.setGlobalPrefix('api');

  // Validación automática de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Prisma shutdown hooks
  app.enableShutdownHooks();

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 PagaJusto API corriendo en http://localhost:${port}/api`);
  console.log(`📡 Red: ${process.env.STELLAR_NETWORK ?? 'testnet'}`);
  console.log('Base de datos: PostgreSQL. Pagos web pendientes de integración Soroban.');
}

bootstrap();
