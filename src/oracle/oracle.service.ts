import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import oracleConfig from '../config/oracle.json';

interface OracleConfig {
  rpcUrl: string;
  address: string;
  abi: ethers.ContractInterface;
  network?: string;
  chainId?: number;
  currency?: string;
}

@Injectable()
export class OracleService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;

  constructor() {
    const cfg = oracleConfig as unknown as OracleConfig;
    const rpcUrl = cfg.rpcUrl || 'http://127.0.0.1:8546';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    const address = cfg.address;
    this.contract = new ethers.Contract(address, cfg.abi as any, this.provider);
  }

  /** Calls requestResult() on the oracle contract and waits for tx confirmation */
  private async triggerRequest(): Promise<string> {
    const signer = await this.provider.getSigner(0);
    const connected = this.contract.connect(signer);
    type Tx = { hash: string; wait: (confirms?: number) => Promise<unknown> };
    const typedConnected = connected as unknown as {
      requestResult: () => Promise<Tx>;
    };
    const tx = await typedConnected.requestResult();
    await tx.wait();
    return tx.hash;
  }

  /**
   * requestOracleData triggers the on-chain oracle request and resolves once the
   * RequestFulfilled event is emitted.
   */
  async requestOracleData(): Promise<{ txHash: string; result: string }> {
    const txHash = await this.triggerRequest();

    return new Promise<{ txHash: string; result: string }>(
      (resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Timed out waiting for RequestFulfilled')),
          10000,
        );

        this.contract.once('RequestFulfilled', (result: string) => {
          clearTimeout(timeout);
          resolve({ txHash, result });
        });
      },
    );
  }
}
