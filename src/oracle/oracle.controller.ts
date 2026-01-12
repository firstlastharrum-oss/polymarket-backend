import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { OracleService } from './oracle.service';

@Controller('oracle')
export class OracleController {
  constructor(private readonly oracleService: OracleService) {}

  /** POST /oracle/request — trigger requestResult() and return oracle result */
  @Post('request')
  @HttpCode(HttpStatus.OK)
  async request() {
    const { txHash, result } = await this.oracleService.requestOracleData();
    return { success: true, txHash, result };
  }
}
