import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  BadRequestException,
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
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { editFileName, fileFilter } from 'src/utils/file-upload.util';
import { type Response } from 'express';

@Controller('high-abrasion')
export class HighAbrasionController {
  constructor(private readonly highAbrasionService: HighAbrasionService) {}

  @Get()
  findAll(@Query() query) {
    return this.highAbrasionService.findAll(query);
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'topImage', maxCount: 1 },
        { name: 'bottomImage', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: './uploads/highabrasion',
          filename: (_, file, cb) => {
            cb(null, `${randomUUID()}${extname(file.originalname)}`);
          },
        }),
        limits: { fileSize: 2 * 1024 * 1024 },
        fileFilter: (_, file, cb) => {
          if (!file.mimetype.startsWith('image/')) {
            cb(new BadRequestException('Only image allowed'), false);
          }
          cb(null, true);
        },
      },
    ),
  )
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
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'topImage', maxCount: 1 },
        { name: 'bottomImage', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: './uploads/highabrasion',
          filename: (_, file, cb) => {
            cb(null, `${randomUUID()}${extname(file.originalname)}`);
          },
        }),
        limits: { fileSize: 2 * 1024 * 1024 },
        fileFilter: (_, file, cb) => {
          if (!file.mimetype.startsWith('image/')) {
            cb(new BadRequestException('Only image allowed'), false);
          }
          cb(null, true);
        },
      },
    ),
  )
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
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/highabrasiontestreport',
        filename: editFileName,
      }),
      fileFilter: fileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
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
