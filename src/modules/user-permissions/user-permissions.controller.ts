import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { UserPermissionsService } from './user-permissions.service';

@Controller('user-permissions')
export class UserPermissionsController {
  constructor(
    private readonly userPermissionsService: UserPermissionsService,
  ) {}

  @Get()
  findAll(
    @Query('userId') userId: string,
    @Query('moduleID') moduleID: string,
  ) {
    return this.userPermissionsService.findAll(userId, moduleID);
  }

  @Post('save')
  savePermission(
    @Body()
    dto: { userId: string; menuId: string; moduleId: string; level: number },
    @Req() req: any,
  ) {
    return this.userPermissionsService.savePermission(dto, req.user?.userId);
  }
}
