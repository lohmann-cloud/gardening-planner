import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@org/database';
import { CreateGardenDto } from './dto/create-garden.dto';
import { UpdateGardenDto } from './dto/update-garden.dto';

@Injectable()
export class GardensService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.garden.findMany({
      include: { beds: true, obstacles: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const garden = await this.prisma.garden.findUnique({
      where: { id },
      include: { beds: true, obstacles: true },
    });
    if (!garden) throw new NotFoundException(`Garden ${id} not found`);
    return garden;
  }

  async create(dto: CreateGardenDto) {
    return this.prisma.garden.create({ data: dto });
  }

  async update(id: string, dto: UpdateGardenDto) {
    await this.findOne(id);
    return this.prisma.garden.update({
      where: { id },
      data: dto,
      include: { beds: true, obstacles: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.garden.delete({ where: { id } });
  }
}
