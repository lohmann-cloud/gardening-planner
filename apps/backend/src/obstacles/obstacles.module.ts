import { Module } from '@nestjs/common';
import { ObstaclesController } from './obstacles.controller';
import { ObstaclesService } from './obstacles.service';

@Module({
  controllers: [ObstaclesController],
  providers: [ObstaclesService],
  exports: [ObstaclesService],
})
export class ObstaclesModule {}
