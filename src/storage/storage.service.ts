import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService implements OnModuleInit {
  onModuleInit() {
    const folders = [
      './uploads/colors',
      './uploads/materials',
      './uploads/materialtestreport',
      './uploads/highabrasion',
      './uploads/newlibrary',
      './uploads/lastlibrary3dm',
    ];

    folders.forEach((dir) => {
      const fullPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }
}
