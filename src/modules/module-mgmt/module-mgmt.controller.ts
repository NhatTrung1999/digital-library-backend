import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Req,
} from '@nestjs/common';
import { ModuleMgmtService } from './module-mgmt.service';
import { CreateModuleMgmtDto } from './dto/create-module-mgmt.dto';
import { UpdateModuleMgmtDto } from './dto/update-module-mgmt.dto';

@Controller('module-mgmt')
export class ModuleMgmtController {
  constructor(private readonly moduleMgmtService: ModuleMgmtService) {}

  @Get()
  findAll() {
    return this.moduleMgmtService.findAll();
  }

  @Post()
  create(@Body() dto: CreateModuleMgmtDto, @Req() req) {
    return this.moduleMgmtService.create(dto, req.user.userId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateModuleMgmtDto,
    @Req() req,
  ) {
    return this.moduleMgmtService.update(id, dto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.moduleMgmtService.remove(id, req.user.userId);
  }
}
