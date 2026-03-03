import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { NewLibraryService } from './new-library.service';
import { CreateNewLibraryDto } from './dto/create-new-library.dto';
import { UpdateNewLibraryDto } from './dto/update-new-library.dto';

@Controller('new-library')
export class NewLibraryController {
  constructor(private readonly newLibraryService: NewLibraryService) {}

  @Post()
  create(@Body() createNewLibraryDto: CreateNewLibraryDto) {
    return this.newLibraryService.create(createNewLibraryDto);
  }

  @Get()
  findAll() {
    return this.newLibraryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.newLibraryService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateNewLibraryDto: UpdateNewLibraryDto) {
    return this.newLibraryService.update(+id, updateNewLibraryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.newLibraryService.remove(+id);
  }
}
