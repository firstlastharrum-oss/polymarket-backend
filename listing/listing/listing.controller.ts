import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
  ParseIntPipe,
  UseGuards,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ListingService } from './listing.service';
import { Status } from '../../generated/prisma'; // Make sure "active" exists in enum
import { JwtCookieAuthGuard } from './listing.guard';

@Controller('listing')
export class ListingController {
  constructor(private readonly listingService: ListingService) {}

  @Post('create')
  @UseGuards(JwtCookieAuthGuard)
  @UseInterceptors(
    FileInterceptor('asset', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @UseGuards(JwtCookieAuthGuard)
  async createListing(
    @UploadedFile() file: Express.Multer.File,
    @Body('price') price: string,
    @Body('currency') currency: string,
    @Body('status') status: Status,
    @Body('title') title: string,
    @Body('description') description: string,
    @Body('marketId') marketId: string,
    @Body('expiresAt') expiresAt: string,
    @Req() req: any,
  ) {
    console.log('Creating listing:', { title, price, currency, status, marketId });
    console.log('User:', req.user);
    console.log('File:', file?.filename);

    if (!req.user?.id) {
      throw new UnauthorizedException('User must be authenticated to create listings');
    }

    let fileData = file;
    if (!fileData && process.env.NODE_ENV !== 'production') {
        fileData = {
             filename: `default-asset-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`,
             mimetype: 'image/png',
            size: 1024,
            originalname: 'default.png',
            path: 'uploads/default.png',
            fieldname: 'asset',
            encoding: '7bit',
            destination: './uploads',
            buffer: Buffer.from('')
        } as any;
    }

    if (!fileData) {
      throw new BadRequestException('Asset file is required');
    }

    if (!title?.trim()) {
      throw new BadRequestException('Market title is required');
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      throw new BadRequestException('Valid price is required');
    }

    if (!currency?.trim()) {
      throw new BadRequestException('Currency is required');
    }

    // Market ethics analysis
    try {
      const analysis = await this.listingService.analyzeMarket(
        title.trim(),
        description?.trim(),
      );

      if (!analysis.isEthical) {
        throw new BadRequestException(
          `Market rejected: ${analysis.reason || 'Content may be unethical or inappropriate'}`,
        );
      }

      console.log('✅ Market analysis passed:', analysis);
    } catch (error) {
      console.warn('⚠️ Market analysis error:', error);
    }

    const sellerId = req.user.id;

    try {
      const result = await this.listingService.createListing({
        seller_id: sellerId,
        price: parsedPrice,
        currency: currency.trim(),
        status: status || Status.Politics, // FIXED: must exist in prisma enum
        filename: fileData.filename,
        mimetype: fileData.mimetype,
        size: fileData.size,
        title: title.trim(),
        description: description?.trim() || '',
        marketId: marketId,
        expires_at: expiresAt ? new Date(expiresAt) : undefined,
      });

      // FIXED: result.data.id instead of result.id
      console.log('✅ Listing created:', result.data.id);

      return {
        success: true,
        data: result.data,
        message: 'Listing created successfully',
      };
    } catch (error) {
      console.error('❌ Listing creation error:', error);
      throw new BadRequestException('Failed to create listing: ' + error.message);
    }
  }

  @UseGuards(JwtCookieAuthGuard)
  @Get('admin/all')
  async getAdminListings() {
    try {
      const result = await this.listingService.getListing();
      return {
        success: true,
        data: result.data,
        count: result.data.length,
      };
    } catch (error) {
      console.error('❌ Error fetching admin listings:', error);
      throw new BadRequestException('Failed to fetch admin listings');
    }
  }

  @UseGuards(JwtCookieAuthGuard)
  @Get()
  async getAllListings() {
    try {
      const result = await this.listingService.getListing();

      // FIXED: result.data is an array → use result.data.length
      return {
        success: true,
        data: result.data,
        count: result.data.length,
      };
    } catch (error) {
      console.error('❌ Error fetching listings:', error);
      throw new BadRequestException('Failed to fetch listings');
    }
  }

  @Post('analyze')
  async analyzeMarket(
    @Body('title') title: string,
    @Body('description') description?: string,
  ) {
    if (!title?.trim()) {
      throw new BadRequestException('Market title is required');
    }

    try {
      const analysis = await this.listingService.analyzeMarket(
        title.trim(),
        description?.trim(),
      );
      return {
        success: true,
        data: analysis,
      };
    } catch (error) {
      console.error('❌ Analysis error:', error);
      throw new BadRequestException('Failed to analyze market: ' + error.message);
    }
  }

  @UseGuards(JwtCookieAuthGuard)
  @Get(':id')
  async getListingById(@Param('id', ParseIntPipe) id: number) {
    console.log('🔍 Fetching listing:', id);

    try {
      const result = await this.listingService.getListingById(id);

      if (!result.data) {
        throw new NotFoundException(`Listing with ID ${id} not found`);
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error('❌ Error fetching listing:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Failed to fetch listing: ' + error.message);
    }
  }
}
