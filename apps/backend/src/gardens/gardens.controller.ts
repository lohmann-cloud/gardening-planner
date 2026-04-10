import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { GardensService } from './gardens.service';
import { CreateGardenDto } from './dto/create-garden.dto';
import { UpdateGardenDto } from './dto/update-garden.dto';

@Controller('gardens')
export class GardensController {
  constructor(private readonly gardensService: GardensService) {}

  @Get()
  findAll() {
    return this.gardensService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gardensService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateGardenDto) {
    return this.gardensService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGardenDto) {
    return this.gardensService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.gardensService.remove(id);
  }
}
