// Core types for the Build Agent platform
// This file exports the latest version of types

// Export the latest version (0.0.0) - direct exports to avoid module resolution issues
export * from './0.0.0/project.d.ts';
export * from './0.0.0/enums.d.ts';

// Legacy types for backward compatibility (deprecated)
export interface Money {
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';
}

export interface LaborBid {
  provider: string;
  price: Money;
  estimated_hours: number;
  earliest_start: string;
  qualifications: string[];
  rating?: number;
}

// Adapter interfaces
export interface LaborAdapter {
  postJob(description: string, photos: string[]): Promise<string>;
  listBids(jobId: string): Promise<LaborBid[]>;
  acceptBid(jobId: string, provider: string): Promise<any>;
  markDone(jobId: string, evidence: any): Promise<boolean>;
}

export interface ProcurementAdapter {
  getPrices(items: string[]): Promise<Record<string, Money>>;
  placeOrder(items: Array<{sku: string, quantity: number}>): Promise<string>;
  trackOrder(orderId: string): Promise<{status: string, eta?: string}>;
}

export interface PaymentAdapter {
  reserve(amount: Money): Promise<string>;
  release(reservationId: string): Promise<boolean>;
  payMilestone(amount: Money, description: string): Promise<string>;
}
