import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFiles,
  Req,
  Put,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { HighAbrasionService } from './high-abrasion.service';
import { CreateHighAbrasionDto } from './dto/create-high-abrasion.dto';
import { UpdateHighAbrasionDto } from './dto/update-high-abrasion.dto';
import {
  FileInterceptor,
} from '@nestjs/platform-express';
import { type Response } from 'express';
import {
  AttachFileInterceptor,
  HighAbrasionInterceptor,
} from 'src/interceptors/multer.interceptor';

@Controller('high-abrasion')
export class HighAbrasionController {
  constructor(private readonly highAbrasionService: HighAbrasionService) {}

  @Get()
  findAll(@Query() query) {
    return this.highAbrasionService.findAll(query);
  }

  @Post()
  @UseInterceptors(HighAbrasionInterceptor())
  create(
    @Body() dto: CreateHighAbrasionDto,
    @UploadedFiles()
    files: {
      topImage?: Express.Multer.File[];
      bottomImage?: Express.Multer.File[];
    },
    @Req() req,
  ) {
    return this.highAbrasionService.create(dto, files, req.user.userId);
  }

  @Put(':id')
  @UseInterceptors(HighAbrasionInterceptor())
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHighAbrasionDto,
    @UploadedFiles()
    files: {
      topImage?: Express.Multer.File[];
      bottomImage?: Express.Multer.File[];
    },
    @Req() req,
  ) {
    return this.highAbrasionService.update(id, dto, files, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.highAbrasionService.remove(id, req.user.userId);
  }

  @Delete('images/:imageId')
  removeImage(@Param('imageId') imageId: string) {
    return this.highAbrasionService.removeImage(imageId);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: Express.Multer.File, @Req() req) {
    return this.highAbrasionService.importExcel(file, req.user.userId);
  }

  @Get('export-excel')
  exportExcel(@Query() query, @Res() res) {
    return this.highAbrasionService.exportExcel(query, res);
  }

  @Post('attach-file')
  @UseInterceptors(AttachFileInterceptor())
  async addFile(@UploadedFile() file: Express.Multer.File, @Body() body) {
    return this.highAbrasionService.addFile(file, body);
  }

  @Get('export-excel-qr')
  async exportExcelQR(@Query() query, @Res() res: Response) {
    return this.highAbrasionService.exportExcelQR(query, res);
  }

  @Get('show-info/:id')
  async showInfo(@Param('id') id: string) {
    return this.highAbrasionService.showInfo(id);
  }
}
