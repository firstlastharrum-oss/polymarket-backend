"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OracleService = void 0;
const common_1 = require("@nestjs/common");
const ethers_1 = require("ethers");
const oracle_json_1 = __importDefault(require("../config/oracle.json"));
let OracleService = class OracleService {
    constructor() {
        const cfg = oracle_json_1.default;
        const rpcUrl = cfg.rpcUrl || 'http://127.0.0.1:8546';
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        const address = cfg.address;
        this.contract = new ethers_1.ethers.Contract(address, cfg.abi, this.provider);
    }
    async triggerRequest() {
        const signer = await this.provider.getSigner(0);
        const connected = this.contract.connect(signer);
        const typedConnected = connected;
        const tx = await typedConnected.requestResult();
        await tx.wait();
        return tx.hash;
    }
    async requestOracleData() {
        const txHash = await this.triggerRequest();
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timed out waiting for RequestFulfilled')), 10000);
            this.contract.once('RequestFulfilled', (result) => {
                clearTimeout(timeout);
                resolve({ txHash, result });
            });
        });
    }
};
exports.OracleService = OracleService;
exports.OracleService = OracleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], OracleService);
//# sourceMappingURL=oracle.service.js.map