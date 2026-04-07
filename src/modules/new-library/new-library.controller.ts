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
import { NewLibraryService } from './new-library.service';
import { CreateNewLibraryDto } from './dto/create-new-library.dto';
import { UpdateNewLibraryDto } from './dto/update-new-library.dto';
import {
  FileInterceptor,
} from '@nestjs/platform-express';
import { type Response } from 'express';
import {
  NewLibraryAttachFileInterceptor,
  NewLibraryInterceptor,
} from 'src/interceptors/multer.interceptor';

@Controller('new-library')
export class NewLibraryController {
  constructor(private readonly newLibraryService: NewLibraryService) {}

  @Get()
  findAll(@Query() query) {
    return this.newLibraryService.findAll(query);
  }

  @Post()
  @UseInterceptors(NewLibraryInterceptor())
  create(
    @Body() dto: CreateNewLibraryDto,
    @UploadedFiles()
    files: {
      topImage?: Express.Multer.File[];
      bottomImage?: Express.Multer.File[];
    },
    @Req() req,
  ) {
    return this.newLibraryService.create(dto, files, req.user.userId);
  }

  @Put(':id')
  @UseInterceptors(NewLibraryInterceptor())
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNewLibraryDto,
    @UploadedFiles()
    files: {
      topImage?: Express.Multer.File[];
      bottomImage?: Express.Multer.File[];
    },
    @Req() req,
  ) {
    return this.newLibraryService.update(id, dto, files, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.newLibraryService.remove(id, req.user.userId);
  }

  @Delete('images/:imageId')
  removeImage(@Param('imageId') imageId: string) {
    return this.newLibraryService.removeImage(imageId);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: Express.Multer.File, @Req() req) {
    return this.newLibraryService.importExcel(file, req.user.userId);
  }

  @Get('export-excel')
  exportExcel(@Query() query, @Res() res) {
    return this.newLibraryService.exportExcel(query, res);
  }

  @Post('attach-file')
  @UseInterceptors(NewLibraryAttachFileInterceptor())
  async addFile(@UploadedFile() file: Express.Multer.File, @Body() body) {
    return this.newLibraryService.addFile(file, body);
  }

  @Get('export-excel-qr')
  async exportExcelQR(@Query() query, @Res() res: Response) {
    return this.newLibraryService.exportExcelQR(query, res);
  }

  @Get('show-info/:id')
  async showInfo(@Param('id') id: string) {
    return this.newLibraryService.showInfo(id);
  }
}
