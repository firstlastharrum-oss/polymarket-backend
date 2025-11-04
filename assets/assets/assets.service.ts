import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConnectionService } from 'src/connection/connection.service';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class AssetsService {
  constructor(private readonly connectionService: ConnectionService) {
    cloudinary.config({
      cloud_name: 'dj3l7qar9',
      api_key: '648656716361129',
      api_secret: '6VQgYOrLijMX3nJlljAaLYSjDT4',
    });
  }

  async uploadImage(file: Express.Multer.File): Promise<any> {
    try {
      return await new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
          { folder: 'uploads' }, 
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          },
        );
        upload.end(file.buffer);
      });
    } catch (err) {
      console.error('Error in AssetsService.uploadImage:', err.message);
      throw new InternalServerErrorException('Failed to upload image to Cloudinary');
    }
  }

  async getImage(publicId: string): Promise<any> {
    try {
      const imageUrl = cloudinary.url(publicId, {
        secure: true,
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
        ],
      });

      return { imageUrl };
    } catch (err: any) {
      console.error('Cloudinary Error:', err);
      throw new InternalServerErrorException('Failed to fetch image from Cloudinary');
    }
  }

  async getAllAssets() {
    try {
      const assets = await this.connectionService.asset.findMany({
        orderBy: {
          created_at: 'desc',
        },
      });
      
      return assets;
    } catch (err: any) {
      console.error('Database Error:', err);
      throw new InternalServerErrorException('Failed to fetch assets from database');
    }
  }
}