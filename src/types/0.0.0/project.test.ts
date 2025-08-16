import { describe, it, expect } from 'vitest';
import { ProjectSchema } from '../../schemas/v0';
import { ProjectStatus, Currency } from '../../types';

describe('Project Schema', () => {
  it('should validate a minimal project', () => {
    const minimalProject = {
      version: '0.0.0',
      metadata: {
        createdAt: Date.now(),
        lastModified: Date.now(),
        createdBy: 'test',
        status: ProjectStatus.PLAN,
        version: '0.0.0'
      },
      project: {
        name: 'Test Project',
        description: 'A test project',
        location: {
          address: {
            street: '123 Test St',
            city: 'Test City',
            state: 'CA',
            zipCode: '90210',
            country: 'USA'
          },
          access: {
            entryMethod: 'key',
            parkingAvailable: true,
            elevatorAccess: false
          },
          siteConditions: {
            indoor: true,
            climateControlled: true,
            lighting: 'natural',
            powerAvailable: true,
            waterAvailable: true,
            spaceDimensions: {
              width: 10,
              length: 10,
              height: 8,
              unit: 'feet'
            }
          },
          constraints: []
        },
        budget: {
          total: { amount: 10000, currency: Currency.USD },
          allocated: { amount: 0, currency: Currency.USD },
          spent: { amount: 0, currency: Currency.USD },
          currency: Currency.USD,
          breakdown: []
        },
        timeline: {
          startDate: Date.now(),
          targetEndDate: Date.now() + (7 * 24 * 60 * 60 * 1000),
          milestones: []
        }
      },
      spec: {
        complexity: 'easy',
        scale: 'small',
        category: 'assembly',
        requirements: [],
        constraints: [],
        properties: {}
      },
      policy: {
        humanApprovalPoints: ['plan'],
        riskLevel: 'low',
        safetyRequirements: [],
        insuranceRequired: false,
        permitsRequired: false,
        inspectionsRequired: false
      },
      state: {
        currentPhase: ProjectStatus.PLAN,
        completedTasks: [],
        blockedTasks: [],
        executionLog: [],
        estimates: {
          totalHours: 0,
          totalCost: { amount: 0, currency: Currency.USD },
          perTask: {},
          lastUpdated: Date.now()
        },
        skillTiers: {
          basic: { amount: 2000, currency: Currency.USD },
          intermediate: { amount: 3000, currency: Currency.USD },
          advanced: { amount: 4500, currency: Currency.USD },
          expert: { amount: 6000, currency: Currency.USD },
          lastUpdated: Date.now()
        },
        approvals: [],
        issues: []
      },
      plan: {
        tasks: [],
        dependencies: [],
        criticalPath: [],
        estimatedDuration: 0,
        estimatedCost: { amount: 0, currency: Currency.USD },
        generatedAt: Date.now()
      }
    };

    const result = ProjectSchema.safeParse(minimalProject);
    expect(result.success).toBe(true);
  });

  it('should reject invalid project status', () => {
    const invalidProject = {
      version: '0.0.0',
      metadata: {
        createdAt: Date.now(),
        lastModified: Date.now(),
        createdBy: 'test',
        status: 'INVALID_STATUS', // Invalid status
        version: '0.0.0'
      },
      // ... rest of project structure
    };

    const result = ProjectSchema.safeParse(invalidProject);
    expect(result.success).toBe(false);
  });
});
