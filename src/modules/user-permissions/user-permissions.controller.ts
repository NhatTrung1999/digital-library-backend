import { Controller, Get, Query, Req } from '@nestjs/common';
import { UserPermissionsService } from './user-permissions.service';

@Controller('user-permissions')
export class UserPermissionsController {
  constructor(
    private readonly userPermissionsService: UserPermissionsService,
  ) {}

  @Get()
  findAll(@Query('userId') userId: string) {
    return this.userPermissionsService.findAll(userId);
  }
}
