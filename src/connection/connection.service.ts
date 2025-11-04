import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';



@Injectable()
export class ConnectionService extends PrismaClient{
    async onModule(){
        return this.$connect();
    }
}
