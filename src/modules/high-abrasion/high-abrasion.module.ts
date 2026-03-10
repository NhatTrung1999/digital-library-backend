import { Module } from '@nestjs/common';
import { HighAbrasionService } from './high-abrasion.service';
import { HighAbrasionController } from './high-abrasion.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [HighAbrasionController],
  providers: [HighAbrasionService],
})
export class HighAbrasionModule {}
