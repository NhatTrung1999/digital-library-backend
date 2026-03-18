import { Module } from '@nestjs/common';
import { ModuleMgmtService } from './module-mgmt.service';
import { ModuleMgmtController } from './module-mgmt.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ModuleMgmtController],
  providers: [ModuleMgmtService],
})
export class ModuleMgmtModule {}
