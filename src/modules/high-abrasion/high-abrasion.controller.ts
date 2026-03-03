import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HighAbrasionService } from './high-abrasion.service';
import { CreateHighAbrasionDto } from './dto/create-high-abrasion.dto';
import { UpdateHighAbrasionDto } from './dto/update-high-abrasion.dto';

@Controller('high-abrasion')
export class HighAbrasionController {
  constructor(private readonly highAbrasionService: HighAbrasionService) {}

  @Post()
  create(@Body() createHighAbrasionDto: CreateHighAbrasionDto) {
    return this.highAbrasionService.create(createHighAbrasionDto);
  }

  @Get()
  findAll() {
    return this.highAbrasionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.highAbrasionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateHighAbrasionDto: UpdateHighAbrasionDto) {
    return this.highAbrasionService.update(+id, updateHighAbrasionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.highAbrasionService.remove(+id);
  }
}
