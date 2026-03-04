import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  Put,
  UseInterceptors,
  BadRequestException,
  UploadedFiles,
} from '@nestjs/common';
import { ColorsService } from './colors.service';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';

@Controller('colors')
export class ColorsController {
  constructor(private readonly colorsService: ColorsService) {}

  @Get()
  findAll() {
    return this.colorsService.findAll();
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 20, {
      storage: diskStorage({
        destination: './uploads/colors',
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
    }),
  )
  create(
    @Body() dto: CreateColorDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req,
  ) {
    return this.colorsService.create(dto, files, req.user.userId);
  }

  @Put(':id')
  @UseInterceptors(
    FilesInterceptor('images', 20, {
      storage: diskStorage({
        destination: './uploads/colors',
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
    }),
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateColorDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req,
  ) {
    return this.colorsService.update(id, dto, files, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.colorsService.remove(id, req.user.userId);
  }
}
