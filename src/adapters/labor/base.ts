import type { LaborAdapter, LaborBid } from '../../types';

export abstract class BaseLaborAdapter implements LaborAdapter {
  abstract postJob(description: string, photos: string[]): Promise<string>;
  abstract listBids(jobId: string): Promise<LaborBid[]>;
  abstract acceptBid(jobId: string, provider: string): Promise<any>;
  abstract markDone(jobId: string, evidence: any): Promise<boolean>;
}
