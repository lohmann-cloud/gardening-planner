import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from '@org/database';
import { GardensModule } from '../gardens/gardens.module';
import { BedsModule } from '../beds/beds.module';
import { ObstaclesModule } from '../obstacles/obstacles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    GardensModule,
    BedsModule,
    ObstaclesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
