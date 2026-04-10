import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@org/database';
import { CreateBedDto } from './dto/create-bed.dto';
import { UpdateBedDto } from './dto/update-bed.dto';

@Injectable()
export class BedsService {
  constructor(private prisma: PrismaService) {}

  async findAllByGarden(gardenId: string) {
    return this.prisma.gardenBed.findMany({
      where: { gardenId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const bed = await this.prisma.gardenBed.findUnique({ where: { id } });
    if (!bed) throw new NotFoundException(`Bed ${id} not found`);
    return bed;
  }

  async create(gardenId: string, dto: CreateBedDto) {
    return this.prisma.gardenBed.create({
      data: { ...dto, gardenId },
    });
  }

  async update(id: string, dto: UpdateBedDto) {
    await this.findOne(id);
    return this.prisma.gardenBed.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.gardenBed.delete({ where: { id } });
  }
}
