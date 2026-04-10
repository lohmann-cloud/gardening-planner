import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@org/database';
import { CreateObstacleDto } from './dto/create-obstacle.dto';
import { UpdateObstacleDto } from './dto/update-obstacle.dto';

@Injectable()
export class ObstaclesService {
  constructor(private prisma: PrismaService) {}

  async findAllByGarden(gardenId: string) {
    return this.prisma.obstacle.findMany({
      where: { gardenId },
    });
  }

  async findOne(id: string) {
    const obstacle = await this.prisma.obstacle.findUnique({ where: { id } });
    if (!obstacle) throw new NotFoundException(`Obstacle ${id} not found`);
    return obstacle;
  }

  async create(gardenId: string, dto: CreateObstacleDto) {
    return this.prisma.obstacle.create({
      data: { ...dto, gardenId },
    });
  }

  async update(id: string, dto: UpdateObstacleDto) {
    await this.findOne(id);
    return this.prisma.obstacle.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.obstacle.delete({ where: { id } });
  }
}
