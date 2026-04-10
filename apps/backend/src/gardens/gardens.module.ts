import { Module } from '@nestjs/common';
import { GardensController } from './gardens.controller';
import { GardensService } from './gardens.service';

@Module({
  controllers: [GardensController],
  providers: [GardensService],
  exports: [GardensService],
})
export class GardensModule {}
