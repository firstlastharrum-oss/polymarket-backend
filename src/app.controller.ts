import {
  Controller,
  Get,
  Post,
  Body,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AppService } from './app.service';
import { OracleService } from './oracle/oracle.service';
import type { Response } from 'express';
interface AdapterBody {
  id?: string;
}

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly oracleService: OracleService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async adapter(
    @Body() body: AdapterBody,
    @Res({ passthrough: true }) res: Response,
  ) {
    const jobId = body?.id ?? '1';
    try {
      const response = await fetch(
        'https://jsonplaceholder.typicode.com/posts/1',
      );
      type PlaceholderPost = {
        userId: number;
        id: number;
        title: string;
        body: string;
      };
      const data = (await response.json()) as PlaceholderPost;
      return {
        jobRunID: jobId,
        data,
        result: data,
        statusCode: 200,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500);
      return {
        jobRunID: jobId,
        status: 'errored',
        error: message,
      };
    }
  }

  @Post('oracle/request')
  @HttpCode(HttpStatus.OK)
  async requestOracle() {
    const { txHash, result } = await this.oracleService.requestOracleData();
    return { success: true, txHash, result };
  }

  @Get('oracle/test')
  getOracleTest() {
    return { ok: true };
  }
}
