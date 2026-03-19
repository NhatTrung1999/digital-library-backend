import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { ColorsModule } from './modules/colors/colors.module';
import { StorageModule } from './storage/storage.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { HighAbrasionModule } from './modules/high-abrasion/high-abrasion.module';
import { NewLibraryModule } from './modules/new-library/new-library.module';
import { ModuleMgmtModule } from './modules/module-mgmt/module-mgmt.module';
import { MenuMgmtModule } from './modules/menu-mgmt/menu-mgmt.module';
import { LastLibraryModule } from './modules/last-library/last-library.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'frontend', 'dist'),
    }),
    StorageModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ColorsModule,
    MaterialsModule,
    HighAbrasionModule,
    NewLibraryModule,
    ModuleMgmtModule,
    MenuMgmtModule,
    LastLibraryModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
