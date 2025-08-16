import chalk from 'chalk';
import type { Project, Task, Dependency, Requirement, Constraint } from '../types';
import {
  ProjectComplexity,
  ProjectScale,
  ProjectCategory,
  RequirementType,
  RequirementLevel,
  ConstraintType,
  ConstraintSeverity,
  TaskStatus,
  Currency
} from '../types';

// Model configuration - can be easily swapped
const MODEL_CONFIG = {
  // OpenAI models
  'gpt-5': 'gpt-5',
  'gpt-4o': 'gpt-4o',
  'gpt-4o-mini': 'gpt-4o-mini',
  'gpt-4-turbo': 'gpt-4-turbo',
  'gpt-4': 'gpt-4',
  'gpt-3.5-turbo': 'gpt-3.5-turbo',
  
  // Default fallback
  'default': 'gpt-4o-mini'
};

export interface AISchemaGenerator {
  generateProjectSpec(userInput: string): Promise<{
    complexity: ProjectComplexity;
    scale: ProjectScale;
    category: ProjectCategory;
    requirements: Requirement[];
    constraints: Constraint[];
    properties: Record<string, any>;
  }>;

  generateTaskPlan(project: Project): Promise<{
    tasks: Task[];
    dependencies: Dependency[];
    criticalPath: string[];
    estimatedDuration: number;
    estimatedCost: { amount: number; currency: Currency };
    generatedAt: number;
  }>;

  generateFollowUpQuestions(projectSpec: any, siteConditions: any): Promise<{
    questions: Array<{
      type: 'confirm' | 'input' | 'list' | 'number';
      name: string;
      message: string;
      choices?: string[];
      default?: any;
    }>;
    reasoning: string;
  }>;

  generateToolsForProject(projectSpec: any): Promise<Array<{
    id: string;
    name: string;
    description: string;
    required: boolean;
    estimatedCost: number;
    source: string;
  }>>;
}

export class AISchemaGenerator implements AISchemaGenerator {
  private model: string;

  constructor(model: string = 'default') {
    this.model = model;
    console.log(chalk.yellow('⚠️  AI Schema Generator is not yet implemented.'));
    console.log(chalk.gray('Using mock generator instead. Set up AI SDK integration when ready.'));
    throw new Error('AI Schema Generator not implemented. Use MockAISchemaGenerator instead.');
  }

  async generateProjectSpec(userInput: string): Promise<{
    complexity: ProjectComplexity;
    scale: ProjectScale;
    category: ProjectCategory;
    requirements: Requirement[];
    constraints: Constraint[];
    properties: Record<string, any>;
  }> {
    throw new Error('Not implemented');
  }

  async generateTaskPlan(project: Project): Promise<{
    tasks: Task[];
    dependencies: Dependency[];
    criticalPath: string[];
    estimatedDuration: number;
    estimatedCost: { amount: number; currency: Currency };
    generatedAt: number;
  }> {
    throw new Error('Not implemented');
  }

  async generateFollowUpQuestions(projectSpec: any, siteConditions: any): Promise<{
    questions: Array<{
      type: 'confirm' | 'input' | 'list' | 'number';
      name: string;
      message: string;
      choices?: string[];
      default?: any;
    }>;
    reasoning: string;
  }> {
    throw new Error('Not implemented');
  }

  async generateToolsForProject(projectSpec: any): Promise<Array<{
    id: string;
    name: string;
    description: string;
    required: boolean;
    estimatedCost: number;
    source: string;
  }>> {
    throw new Error('Not implemented');
  }
}

// TODO: Implement AI SDK integration when ready
//
// The AI SDK integration is ready but needs:
// 1. Resolve version conflicts between @ai-sdk packages
// 2. Test with latest AI SDK version
// 3. Implement proper model configuration
// 4. Add proper type safety for generateObject results
//
// Example implementation:
// ```typescript
// import { generateObject } from 'ai';
// import { openai } from '@ai-sdk/openai';
//
// // Use like this:
// const result = await generateObject({
//   model: openai.chat('gpt-4o-mini'),
//   prompt: '...',
//   schema: { /* JSON schema */ }
// });
// ```
