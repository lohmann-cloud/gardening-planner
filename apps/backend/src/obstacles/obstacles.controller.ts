import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ObstaclesService } from './obstacles.service';
import { CreateObstacleDto } from './dto/create-obstacle.dto';
import { UpdateObstacleDto } from './dto/update-obstacle.dto';

@Controller('gardens/:gardenId/obstacles')
export class ObstaclesController {
  constructor(private readonly obstaclesService: ObstaclesService) {}

  @Get()
  findAll(@Param('gardenId') gardenId: string) {
    return this.obstaclesService.findAllByGarden(gardenId);
  }

  @Post()
  create(@Param('gardenId') gardenId: string, @Body() dto: CreateObstacleDto) {
    return this.obstaclesService.create(gardenId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateObstacleDto) {
    return this.obstaclesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.obstaclesService.remove(id);
  }
}
