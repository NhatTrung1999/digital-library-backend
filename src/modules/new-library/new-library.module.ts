import { Module } from '@nestjs/common';
import { NewLibraryService } from './new-library.service';
import { NewLibraryController } from './new-library.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [NewLibraryController],
  providers: [NewLibraryService],
})
export class NewLibraryModule {}
