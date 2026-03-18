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
import { MenuMgmtService } from './menu-mgmt.service';
import { CreateMenuMgmtDto } from './dto/create-menu-mgmt.dto';
import { UpdateMenuMgmtDto } from './dto/update-menu-mgmt.dto';

@Controller('menu-mgmt')
export class MenuMgmtController {
  constructor(private readonly menuMgmtService: MenuMgmtService) {}

  @Get()
  findAll() {
    return this.menuMgmtService.findAll();
  }

  @Post()
  create(@Body() dto: CreateMenuMgmtDto, @Req() req) {
    return this.menuMgmtService.create(dto, req.user.userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMenuMgmtDto, @Req() req) {
    return this.menuMgmtService.update(id, dto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.menuMgmtService.remove(id, req.user.userId);
  }
}
