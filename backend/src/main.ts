import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const prisma = app.get(PrismaService);

  await prisma.onModuleInit();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 PagaJusto backend running on http://localhost:${port}`);
}

bootstrap();