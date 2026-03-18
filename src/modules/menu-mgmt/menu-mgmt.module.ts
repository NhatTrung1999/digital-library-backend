import { Module } from '@nestjs/common';
import { MenuMgmtService } from './menu-mgmt.service';
import { MenuMgmtController } from './menu-mgmt.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MenuMgmtController],
  providers: [MenuMgmtService],
})
export class MenuMgmtModule {}
