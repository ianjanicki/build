import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
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
  'gpt-4o': openai.gpt4o,
  'gpt-4o-mini': openai.gpt4oMini,
  'gpt-4-turbo': openai.gpt4Turbo,
  
  // Default fallback
  'default': openai.gpt4oMini
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
  private apiKey: string;

  constructor(model: string = 'default') {
    this.model = model;
    this.apiKey = this.getApiKey();
    
    if (!this.apiKey) {
      throw new Error('No API key found. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or OLLAMA_HOST environment variable.');
    }
  }

  private getApiKey(): string {
    // Check for different API keys based on model
    if (this.model.startsWith('openai/') || this.model.startsWith('gpt-')) {
      return process.env.OPENAI_API_KEY || '';
    }
    if (this.model.startsWith('anthropic/') || this.model.startsWith('claude-')) {
      return process.env.ANTHROPIC_API_KEY || '';
    }
    if (this.model.startsWith('ollama/')) {
      return process.env.OLLAMA_HOST || 'http://localhost:11434';
    }
    
    // Default to OpenAI
    return process.env.OPENAI_API_KEY || '';
  }

  private getModelId(): string {
    return MODEL_CONFIG[this.model as keyof typeof MODEL_CONFIG] || MODEL_CONFIG.default;
  }

  async generateProjectSpec(userInput: string): Promise<{
    complexity: ProjectComplexity;
    scale: ProjectScale;
    category: ProjectCategory;
    requirements: Requirement[];
    constraints: Constraint[];
    properties: Record<string, any>;
  }> {
    console.log(chalk.gray(`🤖 Generating project spec using ${this.model}...`));

    const result = await generateObject({
      model: this.getModelId(),
      prompt: `Analyze this project description and generate a comprehensive project specification:

Project: ${userInput}

Generate a JSON object with the following structure:
- complexity: "easy", "medium", "hard", or "expert"
- scale: "small", "medium", "large", or "massive" 
- category: "assembly", "construction", "installation", "fabrication", "maintenance", "repair", or "demolition"
- requirements: Array of requirement objects with id, type, name, level, description, verified fields
- constraints: Array of constraint objects with id, type, severity, description, impact, verified fields
- properties: Object with estimatedDuration, workspaceRequired, materials array

Base your analysis on the project description and typical requirements for similar projects.`,
      schema: {
        type: 'object',
        properties: {
          complexity: { type: 'string', enum: ['easy', 'medium', 'hard', 'expert'] },
          scale: { type: 'string', enum: ['small', 'medium', 'large', 'massive'] },
          category: { type: 'string', enum: ['assembly', 'construction', 'installation', 'fabrication', 'maintenance', 'repair', 'demolition'] },
          requirements: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string', enum: ['skill', 'material', 'equipment', 'permit', 'space', 'time', 'budget', 'tool', 'safety'] },
                name: { type: 'string' },
                level: { type: 'number', enum: [1, 2, 3, 4] },
                description: { type: 'string' },
                verified: { type: 'boolean' }
              }
            }
          },
          constraints: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string', enum: ['physical', 'regulatory', 'temporal', 'financial', 'environmental', 'safety', 'access'] },
                severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                description: { type: 'string' },
                impact: { type: 'string' },
                verified: { type: 'boolean' }
              }
            }
          },
          properties: {
            type: 'object',
            properties: {
              estimatedDuration: { type: 'string' },
              workspaceRequired: { type: 'string' },
              materials: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    });

    return {
      complexity: result.object.complexity as ProjectComplexity,
      scale: result.object.scale as ProjectScale,
      category: result.object.category as ProjectCategory,
      requirements: result.object.requirements as Requirement[],
      constraints: result.object.constraints as Constraint[],
      properties: result.object.properties as Record<string, any>
    };
  }

  async generateTaskPlan(project: Project): Promise<{
    tasks: Task[];
    dependencies: Dependency[];
    criticalPath: string[];
    estimatedDuration: number;
    estimatedCost: { amount: number; currency: Currency };
    generatedAt: number;
  }> {
    console.log(chalk.gray(`🤖 Generating task plan using ${this.model}...`));

    const result = await generateObject({
      model: this.getModelId(),
      prompt: `Generate a detailed task plan for this project:

Project: ${project.project.name}
Description: ${project.project.description}
Category: ${project.spec.category}
Complexity: ${project.spec.complexity}
Scale: ${project.spec.scale}

Requirements: ${JSON.stringify(project.spec.requirements)}
Constraints: ${JSON.stringify(project.spec.constraints)}

Generate a JSON object with:
- tasks: Array of task objects with id, name, description, status, priority, estimatedHours, estimatedCost, skills, materials, tools, safetyRequirements, dependsOn, blocks, instructions, checkpoints, progress, notes, evidence
- dependencies: Array of dependency objects with id, from, to, type
- criticalPath: Array of task IDs representing the critical path
- estimatedDuration: Total estimated hours
- estimatedCost: Total estimated cost in cents with currency

Create realistic tasks based on the project type and requirements.`,
      schema: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'failed', 'blocked', 'cancelled'] },
                priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                estimatedHours: { type: 'number' },
                estimatedCost: {
                  type: 'object',
                  properties: {
                    amount: { type: 'number' },
                    currency: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] }
                  }
                },
                skills: { type: 'array', items: { type: 'string' } },
                materials: { type: 'array', items: { type: 'object' } },
                tools: { type: 'array', items: { type: 'object' } },
                safetyRequirements: { type: 'array', items: { type: 'string' } },
                dependsOn: { type: 'array', items: { type: 'string' } },
                blocks: { type: 'array', items: { type: 'string' } },
                instructions: { type: 'string' },
                checkpoints: { type: 'array', items: { type: 'object' } },
                progress: { type: 'number' },
                notes: { type: 'array', items: { type: 'string' } },
                evidence: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          dependencies: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                from: { type: 'string' },
                to: { type: 'string' },
                type: { type: 'string', enum: ['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'] }
              }
            }
          },
          criticalPath: { type: 'array', items: { type: 'string' } },
          estimatedDuration: { type: 'number' },
          estimatedCost: {
            type: 'object',
            properties: {
              amount: { type: 'number' },
              currency: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] }
            }
          }
        }
      }
    });

    return {
      tasks: result.object.tasks as Task[],
      dependencies: result.object.dependencies as Dependency[],
      criticalPath: result.object.criticalPath as string[],
      estimatedDuration: result.object.estimatedDuration as number,
      estimatedCost: result.object.estimatedCost as { amount: number; currency: Currency },
      generatedAt: Date.now()
    };
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
    console.log(chalk.gray(`🤖 Generating follow-up questions using ${this.model}...`));

    const result = await generateObject({
      model: this.getModelId(),
      prompt: `Based on this project specification and site conditions, generate relevant follow-up questions:

Project Spec: ${JSON.stringify(projectSpec)}
Site Conditions: ${JSON.stringify(siteConditions)}

Generate a JSON object with:
- questions: Array of question objects with type, name, message, choices (if applicable), default
- reasoning: String explaining why these questions are important

Question types: "confirm", "input", "list", "number"
Focus on safety, tools, materials, access, and project-specific requirements.`,
      schema: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['confirm', 'input', 'list', 'number'] },
                name: { type: 'string' },
                message: { type: 'string' },
                choices: { type: 'array', items: { type: 'string' } },
                default: { type: 'boolean' }
              }
            }
          },
          reasoning: { type: 'string' }
        }
      }
    });

    return {
      questions: result.object.questions,
      reasoning: result.object.reasoning
    };
  }

  async generateToolsForProject(projectSpec: any): Promise<Array<{
    id: string;
    name: string;
    description: string;
    required: boolean;
    estimatedCost: number;
    source: string;
  }>> {
    console.log(chalk.gray(`🤖 Generating tool requirements using ${this.model}...`));

    const result = await generateObject({
      model: this.getModelId(),
      prompt: `Based on this project specification, generate a list of required tools:

Project Spec: ${JSON.stringify(projectSpec)}

Generate a JSON array of tool objects with:
- id: Unique identifier
- name: Tool name
- description: Brief description
- required: Boolean indicating if tool is essential
- estimatedCost: Estimated cost in dollars
- source: Where to obtain the tool

Focus on tools that are actually needed for this specific project type and complexity.`,
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            required: { type: 'boolean' },
            estimatedCost: { type: 'number' },
            source: { type: 'string' }
          }
        }
      }
    });

    return result.object;
  }
}
