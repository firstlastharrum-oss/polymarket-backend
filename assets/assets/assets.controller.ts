import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    UseGuards,
    Get,
    Param,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { AssetsService } from './assets.service';
import { JwtCookieAuthGuard } from './assets.guard';
  
  @Controller('assets')
  export class AssetsController {
    constructor(private readonly assetsService: AssetsService) {}

    @UseGuards(JwtCookieAuthGuard)
    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadImage(@UploadedFile() file: Express.Multer.File) {
      if (!file) throw new BadRequestException('No file uploaded');
  
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException('Invalid file type');
      }
  
      const result = await this.assetsService.uploadImage(file);
      return {
        message: 'Image uploaded successfully',
        pubilic_url: result.public_id,
        url: result.secure_url,
      };
    }

    @Get(':publicId')
  async getImage(@Param('publicId') publicId: string) {
    const image = await this.assetsService.getImage(publicId);
    return {
      message: 'Image fetched successfully',
      image,
    };
  }
  @Get('/all')
  async getAllAssets() {
    const assets = await this.assetsService.getAllAssets();
    return {
      success: true,
      assets,
    };
  }
  }
  