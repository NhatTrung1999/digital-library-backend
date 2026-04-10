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
import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { type Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import {
  MaterialAttachFileInterceptor,
  MaterialsInterceptor,
} from 'src/interceptors/multer.interceptor';

@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  findAll(@Query() query) {
    return this.materialsService.findAll(query);
  }

  @Post()
  @UseInterceptors(MaterialsInterceptor())
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
  @UseInterceptors(MaterialsInterceptor())
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
  @UseInterceptors(MaterialAttachFileInterceptor())
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
  @Post('redirect')
  async redirectToLink(@Body() body: { id: string }) {
    const result = await this.materialsService.redirectToLink(body.id);
    return result;
  }
}
