import {
  ProjectComplexity,
  ProjectScale,
  ProjectCategory,
  RequirementType,
  RequirementLevel,
  ConstraintType,
  ConstraintSeverity,
  ProjectStatus,
  TaskStatus,
  Currency
} from './enums';

// Core project structure
export interface Project {
  version: '0.0.0';
  metadata: ProjectMetadata;
  project: ProjectInfo;
  spec: ProjectSpec;
  policy: ProjectPolicy;
  state: ProjectState;
  plan: TaskPlan;
}

// Project metadata with timestamps
export interface ProjectMetadata {
  createdAt: number;        // Unix timestamp
  lastModified: number;     // Unix timestamp
  createdBy: string;        // User ID or email
  status: ProjectStatus;
  version: string;          // Semantic version of the project
}

// Project basic information
export interface ProjectInfo {
  name: string;
  description: string;
  location: Location;
  budget: Budget;
  timeline: Timeline;
}

// Comprehensive location information
export interface Location {
  address: Address;
  access: AccessInfo;
  siteConditions: SiteConditions;
  constraints: Constraint[];
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;  // Made optional for backward compatibility
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface AccessInfo {
  entryMethod: 'key' | 'code' | 'call' | 'meet' | 'unlocked';
  entryInstructions?: string;
  parkingAvailable: boolean;
  parkingInstructions?: string;
  elevatorAccess: boolean;
  floorNumber?: number;
  specialAccess?: string;
}

export interface SiteConditions {
  indoor: boolean;
  climateControlled: boolean;
  lighting: 'natural' | 'artificial' | 'mixed';
  powerAvailable: boolean;
  waterAvailable: boolean;
  spaceDimensions?: {
    width: number;
    length: number;
    height: number;
    unit: 'feet' | 'meters';
  };
  existingStructures?: string[];
  hazards?: string[];
}

// Budget with specific amounts
export interface Budget {
  total: Money;
  allocated: Money;
  spent: Money;
  currency: Currency;
  breakdown: BudgetBreakdown[];
}

export interface Money {
  amount: number;           // In cents to avoid floating point issues
  currency: Currency;
}

export interface BudgetBreakdown {
  category: 'labor' | 'materials' | 'equipment' | 'permits' | 'other';
  estimated: Money;
  actual?: Money;
  description: string;
}

// Timeline with specific dates
export interface Timeline {
  startDate: number;        // Unix timestamp
  targetEndDate: number;    // Unix timestamp
  actualEndDate?: number;   // Unix timestamp
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  name: string;
  targetDate: number;       // Unix timestamp
  actualDate?: number;      // Unix timestamp
  description: string;
  tasks: string[];          // Task IDs that must be completed
}

// Project specification
export interface ProjectSpec {
  complexity: ProjectComplexity;
  scale: ProjectScale;
  category: ProjectCategory;
  requirements: Requirement[];
  constraints: Constraint[];
  properties: Record<string, any>; // Flexible schema for project-specific data
}

export interface Requirement {
  id: string;
  type: RequirementType;
  name: string;
  level: RequirementLevel;
  description: string;
  quantity?: number;
  unit?: string;
  cost?: Money;
  source?: string;          // Where to get this requirement
  verified: boolean;        // Has this requirement been verified/obtained
}

export interface Constraint {
  id: string;
  type: ConstraintType;
  severity: ConstraintSeverity;
  description: string;
  impact: string;           // How this constraint affects the project
  mitigation?: string;      // How to work around this constraint
  verified: boolean;        // Has this constraint been verified
}

// Project policy and approvals
export interface ProjectPolicy {
  humanApprovalPoints: string[];  // Points requiring human approval
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  safetyRequirements: SafetyRequirement[];
  insuranceRequired: boolean;
  permitsRequired: boolean;
  inspectionsRequired: boolean;
}

export interface SafetyRequirement {
  id: string;
  type: 'ppe' | 'training' | 'equipment' | 'procedure';
  description: string;
  mandatory: boolean;
  verified: boolean;
}

// Project state - tracks current progress
export interface ProjectState {
  currentPhase: 'planning' | 'execution' | 'completion';
  completedTasks: string[];        // Task IDs
  currentTask?: string;            // Current task ID
  blockedTasks: string[];          // Task IDs that are blocked
  executionLog: ExecutionLogEntry[];
  estimates: TaskEstimates;
  skillTiers: SkillTierPricing;
  approvals: Approval[];
  issues: Issue[];
}

export interface ExecutionLogEntry {
  id: string;
  timestamp: number;               // Unix timestamp
  taskId: string;
  action: 'started' | 'completed' | 'failed' | 'paused' | 'resumed';
  description: string;
  evidence?: string[];             // URLs to photos, documents, etc.
  worker?: string;                 // Who performed this action
  duration?: number;               // Duration in seconds
}

export interface TaskEstimates {
  totalHours: number;
  totalCost: Money;
  perTask: Record<string, { hours: number; cost: Money }>;
  lastUpdated: number;             // Unix timestamp
}

export interface SkillTierPricing {
  [skillLevel: string]: Money;     // Dynamic skill tiers based on project requirements
  lastUpdated: number;             // Unix timestamp
}

export interface Approval {
  id: string;
  type: 'plan' | 'labor_hire' | 'purchase' | 'safety' | 'permit';
  requestedAt: number;             // Unix timestamp
  requestedBy: string;
  approvedAt?: number;             // Unix timestamp
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  description: string;
  amount?: Money;
}

export interface Issue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  reportedAt: number;              // Unix timestamp
  reportedBy: string;
  resolvedAt?: number;             // Unix timestamp
  resolvedBy?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  affectedTasks: string[];         // Task IDs
  resolution?: string;
}

// Robust task plan with detailed task structure
export interface TaskPlan {
  tasks: Task[];
  dependencies: Dependency[];
  criticalPath: string[];          // Task IDs in critical path
  estimatedDuration: number;       // Total estimated hours
  estimatedCost: Money;
  generatedAt: number;             // Unix timestamp
}

export interface Task {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Time estimates
  estimatedHours: number;
  actualHours?: number;
  startTime?: number;              // Unix timestamp
  endTime?: number;                // Unix timestamp
  
  // Cost estimates
  estimatedCost: Money;
  actualCost?: Money;
  
  // Requirements
  skills: string[];
  materials: Material[];
  tools: Tool[];
  safetyRequirements: string[];
  
  // Dependencies and relationships
  dependsOn: string[];             // Task IDs
  blocks: string[];                // Task IDs that depend on this task
  
  // Execution details
  assignedTo?: string;             // Worker ID
  location?: string;               // Specific location on site
  instructions: string;            // Detailed instructions
  checkpoints: Checkpoint[];
  
  // Progress tracking
  progress: number;                // 0-100 percentage
  notes: TaskNote[];
  evidence: string[];              // URLs to photos, documents, etc.
}

export interface Material {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  cost: Money;
  source: string;
  status: 'needed' | 'ordered' | 'received' | 'used';
}

export interface Tool {
  id: string;
  name: string;
  required: boolean;
  provided: boolean;
  source: string;
  status: 'needed' | 'available' | 'in_use' | 'returned';
}

export interface Checkpoint {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  completedAt?: number;            // Unix timestamp
  completedBy?: string;
  evidence?: string[];             // URLs to photos, documents, etc.
}

export interface TaskNote {
  id: string;
  timestamp: number;               // Unix timestamp
  author: string;
  content: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export interface Dependency {
  id: string;
  from: string;                    // Task ID
  to: string;                      // Task ID
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  lag?: number;                    // Lag time in hours
}
