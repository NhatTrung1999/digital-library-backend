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
import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { editFileName, fileFilter } from 'src/utils/file-upload.util';
import { type Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';

@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  findAll(@Query() query) {
    return this.materialsService.findAll(query);
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
          destination: './uploads/materials',
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
    @Body() dto: CreateMaterialDto,
    @UploadedFiles()
    files: {
      topImage?: Express.Multer.File[];
      bottomImage?: Express.Multer.File[];
    },
    @Req() req,
  ) {
    return this.materialsService.create(dto, files, req.user.userId);
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
          destination: './uploads/materials',
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
    @Body() dto: UpdateMaterialDto,
    @UploadedFiles()
    files: {
      topImage?: Express.Multer.File[];
      bottomImage?: Express.Multer.File[];
    },
    @Req() req,
  ) {
    return this.materialsService.update(id, dto, files, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.materialsService.remove(id, req.user.userId);
  }

  @Delete('images/:imageId')
  removeImage(@Param('imageId') imageId: string) {
    return this.materialsService.removeImage(imageId);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: Express.Multer.File, @Req() req) {
    return this.materialsService.importExcel(file, req.user.userId);
  }

  @Get('export-excel')
  exportExcel(@Query() query, @Res() res) {
    return this.materialsService.exportExcel(query, res);
  }

  @Post('attach-file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/materialtestreport',
        filename: editFileName,
      }),
      fileFilter: fileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async addFile(@UploadedFile() file: Express.Multer.File, @Body() body) {
    return this.materialsService.addFile(file, body);
  }

  @Get('export-excel-qr')
  async exportExcelQR(@Query() query, @Res() res: Response) {
    return this.materialsService.exportExcelQR(query, res);
  }

  @Get('show-info/:id')
  async showInfo(@Param('id') id: string) {
    return this.materialsService.showInfo(id);
  }

  @Public()
  @Get('redirect')
  async redirectToLink(@Query('id') id: string, @Res() res: Response) {
    const result = await this.materialsService.redirectToLink(id);
    return res.redirect(result);
  }
}
