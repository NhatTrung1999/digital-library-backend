import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/auth.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Req() req) {
    return this.authService.login(req.user)
  }

  // @UseGuards(RolesLevelGuard)
  // @RolesLevel(50)
  // @Get('admin-only')
  // getAdminData() {
  //   return 'ADMIN DATA';
  // }

  // @Get('profile')
  // getProfile() {
  //   return 'ADMIN DATA';
  // }
}
