import type { LaborBid, Money } from '../types';
import { BaseLaborAdapter } from '../src/adapters/labor/base';

export class MockLaborAdapter extends BaseLaborAdapter {
  private jobs = new Map<string, any>();
  private jobCounter = 0;
  
  async postJob(description: string, photos: string[]): Promise<string> {
    this.jobCounter++;
    const jobId = `mock_job_${this.jobCounter}`;
    
    this.jobs.set(jobId, {
      id: jobId,
      description,
      photos,
      status: 'posted',
      createdAt: new Date().toISOString(),
    });
    
    return jobId;
  }
  
  async listBids(jobId: string): Promise<LaborBid[]> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    const description = job.description;
    
    // Simulate receiving bids with realistic variations
    const mockProviders = [
      'HandyHelper Pro',
      'QuickAssemble Co',
      'FurnitureMaster',
      'DIY Expert',
      'Assembly Ace',
    ];
    
    const basePrice = 35; // Base hourly rate
    const numBids = Math.floor(Math.random() * 3) + 2; // 2-4 bids
    
    const bids: LaborBid[] = [];
    
    for (let i = 0; i < numBids; i++) {
      const provider = mockProviders[i % mockProviders.length];
      const priceVariation = (Math.random() - 0.5) * 20; // ±$10 variation
      const hourlyRate = Math.max(20, basePrice + priceVariation);
      
      // Estimate hours based on description
      const estimatedHours = this.estimateHoursFromDescription(description);
      const totalPrice = hourlyRate * estimatedHours;
      
      bids.push({
        provider,
        price: {
          amount: Math.round(totalPrice * 100) / 100,
          currency: 'USD',
        },
        estimated_hours: estimatedHours,
        earliest_start: this.getRandomStartTime(),
        qualifications: this.getRandomQualifications(),
        rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
      });
    }
    
    // Sort by price (lowest first)
    return bids.sort((a, b) => a.price.amount - b.price.amount);
  }
  
  async acceptBid(jobId: string, provider: string): Promise<any> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    job.status = 'accepted';
    job.selectedProvider = provider;
    job.acceptedAt = new Date().toISOString();
    
    return { success: true, provider };
  }
  
  async markDone(jobId: string, evidence: any): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    job.status = 'completed';
    job.completedAt = new Date().toISOString();
    job.evidence = evidence;
    
    return true;
  }
  
  private estimateHoursFromDescription(description: string): number {
    // Simple heuristic to estimate hours from description
    if (description.includes('assembly')) {
      return 2.0; // Default assembly time
    }
    if (description.includes('prep') || description.includes('clean')) {
      return 0.5;
    }
    if (description.includes('check') || description.includes('verify')) {
      return 0.25;
    }
    return 1.0; // Default
  }
  
  private getRandomStartTime(): string {
    const now = new Date();
    const hoursToAdd = Math.floor(Math.random() * 48) + 2; // 2-50 hours from now
    const startTime = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
    return startTime.toISOString();
  }
  
  private getRandomQualifications(): string[] {
    const allQualifications = [
      'Certified Professional',
      '5+ years experience',
      'Tools provided',
      'Insured',
      'Background checked',
      'Same-day service',
      'Weekend available',
    ];
    
    const numQualifications = Math.floor(Math.random() * 3) + 2; // 2-4 qualifications
    const shuffled = [...allQualifications].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numQualifications);
  }
}
