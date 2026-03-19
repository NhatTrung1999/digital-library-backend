import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Req,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { LastLibraryService } from './last-library.service';
import { CreateLastLibraryDto } from './dto/create-last-library.dto';
import { UpdateLastLibraryDto } from './dto/update-last-library.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { editFileName, fileFilter } from 'src/utils/file-upload.util';

@Controller('last-library')
export class LastLibraryController {
  constructor(private readonly lastLibraryService: LastLibraryService) {}

  @Get()
  findAll(@Query() query) {
    return this.lastLibraryService.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateLastLibraryDto, @Req() req) {
    return this.lastLibraryService.create(dto, req.user.userId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLastLibraryDto,
    @Req() req,
  ) {
    return this.lastLibraryService.update(id, dto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.lastLibraryService.remove(id, req.user.userId);
  }

  @Post(':id/3dm')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/lastlibrary3dm',
        filename: editFileName,
      }),
      fileFilter: fileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async add3DMFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.lastLibraryService.add3DMFile(file, id, req.user?.userId);
  }
}
