import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('base64-to-image-colors')
  getBase64ToImageColor() {
    return this.appService.getBase64ToImageColor();
  }

  @Get('base64-to-image-materials')
  getBase64ToImageMaterial() {
    return this.appService.getBase64ToImageMaterial();
  }
}
