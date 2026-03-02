import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesLevelGuard } from './guards/roles-level.guard';
import { RolesLevel } from './decorators/roles-level.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(AuthGuard('local'))
  @Post('login')
  login(@Req() req) {
    return this.authService.login(req.user)
  }

  @UseGuards(RolesLevelGuard)
  @RolesLevel(50)
  @Get('admin-only')
  getAdminData() {
    return 'ADMIN DATA';
  }

  @Get('profile')
  getProfile() {
    return 'ADMIN DATA';
  }
}
