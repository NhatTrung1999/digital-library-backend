import {
  Injectable,
  mixin,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { editFileName, fileFilter } from 'src/utils/file-upload.util';

export function HighAbrasionInterceptor() {
  @Injectable()
  class MixinInterceptor implements NestInterceptor {
    uploadInterceptor: NestInterceptor;

    constructor(configService: ConfigService) {
      const uploadsPath = configService.get<string>(
        'UPLOADS_PATH',
        'D:\\uploads',
      );
      const FileInterceptorClass = FileFieldsInterceptor(
        [
          { name: 'topImage', maxCount: 1 },
          { name: 'bottomImage', maxCount: 1 },
        ],
        {
          storage: diskStorage({
            destination: join(uploadsPath, 'highabrasion'),
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
      );
      this.uploadInterceptor = new FileInterceptorClass();
    }

    intercept(context: ExecutionContext, next: CallHandler) {
      return this.uploadInterceptor.intercept(context, next);
    }
  }
  return mixin(MixinInterceptor);
}

export function LastLibrary3DMInterceptor() {
  @Injectable()
  class MixinInterceptor implements NestInterceptor {
    uploadInterceptor: NestInterceptor;

    constructor(configService: ConfigService) {
      const uploadsPath = configService.get<string>(
        'UPLOADS_PATH',
        'D:\\uploads',
      );
      const FileInterceptorClass = FileInterceptor('file', {
        storage: diskStorage({
          destination: join(uploadsPath, 'lastlibrary3dm'),
          filename: editFileName,
        }),
        fileFilter: fileFilter,
        limits: { fileSize: 10 * 1024 * 1024 },
      });
      this.uploadInterceptor = new FileInterceptorClass();
    }

    intercept(context: ExecutionContext, next: CallHandler) {
      return this.uploadInterceptor.intercept(context, next);
    }
  }
  return mixin(MixinInterceptor);
}

export function AttachFileInterceptor() {
  @Injectable()
  class MixinInterceptor implements NestInterceptor {
    uploadInterceptor: NestInterceptor;

    constructor(configService: ConfigService) {
      const uploadsPath = configService.get<string>(
        'UPLOADS_PATH',
        'D:\\uploads',
      );
      const FileInterceptorClass = FileInterceptor('file', {
        storage: diskStorage({
          destination: join(uploadsPath, 'highabrasiontestreport'),
          filename: editFileName,
        }),
        fileFilter: fileFilter,
        limits: { fileSize: 10 * 1024 * 1024 },
      });
      this.uploadInterceptor = new FileInterceptorClass();
    }

    intercept(context: ExecutionContext, next: CallHandler) {
      return this.uploadInterceptor.intercept(context, next);
    }
  }
  return mixin(MixinInterceptor);
}

export function MaterialsInterceptor() {
  @Injectable()
  class MixinInterceptor implements NestInterceptor {
    uploadInterceptor: NestInterceptor;

    constructor(configService: ConfigService) {
      const uploadsPath = configService.get<string>(
        'UPLOADS_PATH',
        'D:\\uploads',
      );
      const FileInterceptorClass = FileFieldsInterceptor(
        [
          { name: 'topImage', maxCount: 1 },
          { name: 'bottomImage', maxCount: 1 },
        ],
        {
          storage: diskStorage({
            destination: join(uploadsPath, 'materials'),
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
      );
      this.uploadInterceptor = new FileInterceptorClass();
    }

    intercept(context: ExecutionContext, next: CallHandler) {
      return this.uploadInterceptor.intercept(context, next);
    }
  }
  return mixin(MixinInterceptor);
}

export function MaterialAttachFileInterceptor() {
  @Injectable()
  class MixinInterceptor implements NestInterceptor {
    uploadInterceptor: NestInterceptor;

    constructor(configService: ConfigService) {
      const uploadsPath = configService.get<string>(
        'UPLOADS_PATH',
        'D:\\uploads',
      );
      const FileInterceptorClass = FileInterceptor('file', {
        storage: diskStorage({
          destination: join(uploadsPath, 'materialtestreport'),
          filename: editFileName,
        }),
        fileFilter: fileFilter,
        limits: { fileSize: 10 * 1024 * 1024 },
      });
      this.uploadInterceptor = new FileInterceptorClass();
    }

    intercept(context: ExecutionContext, next: CallHandler) {
      return this.uploadInterceptor.intercept(context, next);
    }
  }
  return mixin(MixinInterceptor);
}

export function NewLibraryInterceptor() {
  @Injectable()
  class MixinInterceptor implements NestInterceptor {
    uploadInterceptor: NestInterceptor;

    constructor(configService: ConfigService) {
      const uploadsPath = configService.get<string>(
        'UPLOADS_PATH',
        'D:\\uploads',
      );
      const FileInterceptorClass = FileFieldsInterceptor(
        [
          { name: 'topImage', maxCount: 1 },
          { name: 'bottomImage', maxCount: 1 },
        ],
        {
          storage: diskStorage({
            destination: join(uploadsPath, 'newlibrary'),
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
      );
      this.uploadInterceptor = new FileInterceptorClass();
    }

    intercept(context: ExecutionContext, next: CallHandler) {
      return this.uploadInterceptor.intercept(context, next);
    }
  }
  return mixin(MixinInterceptor);
}

export function NewLibraryAttachFileInterceptor() {
  @Injectable()
  class MixinInterceptor implements NestInterceptor {
    uploadInterceptor: NestInterceptor;

    constructor(configService: ConfigService) {
      const uploadsPath = configService.get<string>(
        'UPLOADS_PATH',
        'D:\\uploads',
      );
      const FileInterceptorClass = FileInterceptor('file', {
        storage: diskStorage({
          destination: join(uploadsPath, 'newlibrarytestreport'),
          filename: editFileName,
        }),
        fileFilter: fileFilter,
        limits: { fileSize: 10 * 1024 * 1024 },
      });
      this.uploadInterceptor = new FileInterceptorClass();
    }

    intercept(context: ExecutionContext, next: CallHandler) {
      return this.uploadInterceptor.intercept(context, next);
    }
  }
  return mixin(MixinInterceptor);
}
