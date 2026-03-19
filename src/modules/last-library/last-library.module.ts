import { Module } from '@nestjs/common';
import { LastLibraryService } from './last-library.service';
import { LastLibraryController } from './last-library.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [LastLibraryController],
  providers: [LastLibraryService],
})
export class LastLibraryModule {}
