import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UnauthorizedException,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ListingService } from './listing.service';
import { JwtCookieAuthGuard } from './listing.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

enum Status {
  Crypto = 'Crypto',
  Sports = 'Sports',
  Politics = 'Politics',
}

@Controller('listing')
export class ListingController {
  constructor(private readonly listingService: ListingService) {}

  @UseGuards(JwtCookieAuthGuard)
  @Post('create')
  @UseInterceptors(
    FileInterceptor('asset', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      fileFilter: (_, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async createListing(
    @UploadedFile() file: Express.Multer.File,
    @Body('price') price: string,
    @Body('currency') currency: string,
    @Body('status') status: string,
    @Body('title') title: string,
    @Body('description') description: string,
    @Req() req: any,
  ) {
    const seller_id = req.user?.id;
    if (!seller_id) throw new UnauthorizedException('User not authenticated');
    if (!file) throw new BadRequestException('Asset image is required');
    if (!title?.trim()) throw new BadRequestException('Title is required');
    if (!price || isNaN(parseFloat(price))) throw new BadRequestException('Valid price is required');

    return this.listingService.createListing({
      seller_id,
      price: parseFloat(price),
      currency,
      status: status as Status,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      title,
      description,
    });
  }

  @Get('all') 
  async getAllListings() {
    return this.listingService.getListing();
  }

  @Get(':id')
  async getListingById(@Param('id', ParseIntPipe) id: number) {
    return this.listingService.getListingById(id);
  }
}