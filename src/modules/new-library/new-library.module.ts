import { Module } from '@nestjs/common';
import { NewLibraryService } from './new-library.service';
import { NewLibraryController } from './new-library.controller';

@Module({
  controllers: [NewLibraryController],
  providers: [NewLibraryService],
})
export class NewLibraryModule {}
