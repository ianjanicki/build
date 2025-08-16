// Core enums for the Build Agent platform

export enum ProjectComplexity {
  EASY = 'easy',
  MEDIUM = 'medium', 
  HARD = 'hard',
  EXPERT = 'expert'
}

export enum ProjectScale {
  SMALL = 'small',      // Furniture, small repairs
  MEDIUM = 'medium',    // Room renovation, deck building
  LARGE = 'large',      // House construction, major renovation
  MASSIVE = 'massive'   // Skyscraper, infrastructure
}

export enum ProjectCategory {
  ASSEMBLY = 'assembly',
  CONSTRUCTION = 'construction', 
  INSTALLATION = 'installation',
  FABRICATION = 'fabrication',
  MAINTENANCE = 'maintenance',
  REPAIR = 'repair',
  DEMOLITION = 'demolition'
}

export enum RequirementType {
  SKILL = 'skill',
  MATERIAL = 'material',
  EQUIPMENT = 'equipment', 
  PERMIT = 'permit',
  SPACE = 'space',
  TIME = 'time',
  BUDGET = 'budget',
  TOOL = 'tool',
  SAFETY = 'safety'
}

export enum RequirementLevel {
  BASIC = 1,           // Basic skills, minimal experience
  INTERMEDIATE = 2,    // Some experience, can work independently
  ADVANCED = 3,        // Significant experience, can train others
  EXPERT = 4           // Master level, can design and innovate
}

// Human-readable mappings
export const RequirementLevelLabels: Record<RequirementLevel, string> = {
  [RequirementLevel.BASIC]: 'basic',
  [RequirementLevel.INTERMEDIATE]: 'intermediate', 
  [RequirementLevel.ADVANCED]: 'advanced',
  [RequirementLevel.EXPERT]: 'expert',
};

export enum ConstraintType {
  PHYSICAL = 'physical',
  REGULATORY = 'regulatory',
  TEMPORAL = 'temporal',
  FINANCIAL = 'financial',
  ENVIRONMENTAL = 'environmental',
  SAFETY = 'safety',
  ACCESS = 'access'
}

export enum ConstraintSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ProjectStatus {
  PLAN = 'PLAN',
  ESTIMATE = 'ESTIMATE',
  APPROVAL_PENDING = 'APPROVAL_PENDING',
  SCHEDULE = 'SCHEDULE',
  EXECUTE = 'EXECUTE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled'
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  CAD = 'CAD',
  AUD = 'AUD'
}
