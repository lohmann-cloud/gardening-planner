import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { BedsService } from './beds.service';
import { CreateBedDto } from './dto/create-bed.dto';
import { UpdateBedDto } from './dto/update-bed.dto';

@Controller('gardens/:gardenId/beds')
export class BedsController {
  constructor(private readonly bedsService: BedsService) {}

  @Get()
  findAll(@Param('gardenId') gardenId: string) {
    return this.bedsService.findAllByGarden(gardenId);
  }

  @Post()
  create(@Param('gardenId') gardenId: string, @Body() dto: CreateBedDto) {
    return this.bedsService.create(gardenId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBedDto) {
    return this.bedsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bedsService.remove(id);
  }
}
