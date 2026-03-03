import { Module } from '@nestjs/common';
import { HighAbrasionService } from './high-abrasion.service';
import { HighAbrasionController } from './high-abrasion.controller';

@Module({
  controllers: [HighAbrasionController],
  providers: [HighAbrasionService],
})
export class HighAbrasionModule {}
