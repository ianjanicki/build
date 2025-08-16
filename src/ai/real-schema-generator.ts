import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
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

export class RealAISchemaGenerator implements AISchemaGenerator {
  private model: any;

  constructor() {
    // Check if OpenAI API key is available
    if (process.env.OPENAI_API_KEY) {
      this.model = openai('gpt-4o');
    } else {
      console.log(chalk.yellow('⚠️  No OpenAI API key found. Using mock generator.'));
      console.log(chalk.gray('Set OPENAI_API_KEY environment variable to use real AI.'));
      throw new Error('OpenAI API key not configured');
    }
  }

  async generateProjectSpec(userInput: string): Promise<{
    complexity: ProjectComplexity;
    scale: ProjectScale;
    category: ProjectCategory;
    requirements: Requirement[];
    constraints: Constraint[];
    properties: Record<string, any>;
  }> {
    const { object } = await generateObject({
      model: this.model,
      schema: {
        type: 'object',
        properties: {
          complexity: {
            type: 'string',
            enum: ['easy', 'medium', 'hard', 'expert'],
            description: 'Project complexity level'
          },
          scale: {
            type: 'string',
            enum: ['small', 'medium', 'large', 'massive'],
            description: 'Project scale'
          },
          category: {
            type: 'string',
            enum: ['assembly', 'construction', 'installation', 'fabrication', 'maintenance', 'repair', 'demolition'],
            description: 'Project category'
          },
          requirements: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { 
                  type: 'string',
                  enum: ['skill', 'material', 'equipment', 'permit', 'space', 'time', 'budget', 'tool', 'safety']
                },
                name: { type: 'string' },
                level: { type: 'number', minimum: 1, maximum: 4 },
                description: { type: 'string' },
                verified: { type: 'boolean' }
              },
              required: ['id', 'type', 'name', 'level', 'description', 'verified']
            }
          },
          constraints: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: {
                  type: 'string',
                  enum: ['physical', 'regulatory', 'temporal', 'financial', 'environmental', 'safety', 'access']
                },
                severity: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'critical']
                },
                description: { type: 'string' },
                impact: { type: 'string' },
                verified: { type: 'boolean' }
              },
              required: ['id', 'type', 'severity', 'description', 'impact', 'verified']
            }
          },
          properties: {
            type: 'object',
            description: 'Additional project-specific properties'
          }
        },
        required: ['complexity', 'scale', 'category', 'requirements', 'constraints', 'properties']
      },
      prompt: `Analyze this project description and generate a comprehensive project specification:

Project: ${userInput}

Consider:
- What skills are required?
- What tools and materials are needed?
- What constraints might exist?
- What permits or safety requirements?
- What is the appropriate complexity and scale?

Generate realistic requirements and constraints based on the project type.`
    });

    return object;
  }

  async generateTaskPlan(project: Project): Promise<{
    tasks: Task[];
    dependencies: Dependency[];
    criticalPath: string[];
    estimatedDuration: number;
    estimatedCost: { amount: number; currency: Currency };
    generatedAt: number;
  }> {
    const { object } = await generateObject({
      model: this.model,
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
                skills: { type: 'array', items: { type: 'string' } },
                materials: { type: 'array', items: { type: 'object' } },
                tools: { type: 'array', items: { type: 'object' } },
                safetyRequirements: { type: 'array', items: { type: 'string' } },
                dependsOn: { type: 'array', items: { type: 'string' } },
                blocks: { type: 'array', items: { type: 'string' } },
                instructions: { type: 'string' },
                checkpoints: { type: 'array', items: { type: 'object' } },
                progress: { type: 'number' },
                notes: { type: 'array', items: { type: 'object' } },
                evidence: { type: 'array', items: { type: 'string' } }
              },
              required: ['id', 'name', 'description', 'status', 'priority', 'estimatedHours', 'skills', 'dependsOn', 'instructions']
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
              },
              required: ['id', 'from', 'to', 'type']
            }
          },
          criticalPath: {
            type: 'array',
            items: { type: 'string' }
          },
          estimatedDuration: { type: 'number' },
          estimatedCost: {
            type: 'object',
            properties: {
              amount: { type: 'number' },
              currency: { type: 'string', enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] }
            },
            required: ['amount', 'currency']
          }
        },
        required: ['tasks', 'dependencies', 'criticalPath', 'estimatedDuration', 'estimatedCost']
      },
      prompt: `Generate a detailed task plan for this project:

Project: ${project.project.name}
Description: ${project.project.description}
Category: ${project.spec.category}
Scale: ${project.spec.scale}
Complexity: ${project.spec.complexity}
Requirements: ${JSON.stringify(project.spec.requirements, null, 2)}
Constraints: ${JSON.stringify(project.spec.constraints, null, 2)}

Create a realistic task breakdown with:
- Logical task dependencies
- Appropriate time estimates
- Required skills for each task
- Safety considerations
- Quality checkpoints

Consider the project type and requirements when generating tasks.`
    });

    return {
      ...object,
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
    const { object } = await generateObject({
      model: this.model,
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
                default: { type: 'string' }
              },
              required: ['type', 'name', 'message']
            }
          },
          reasoning: { type: 'string' }
        },
        required: ['questions', 'reasoning']
      },
      prompt: `Based on this project specification and site conditions, generate relevant follow-up questions:

Project Spec: ${JSON.stringify(projectSpec, null, 2)}
Site Conditions: ${JSON.stringify(siteConditions, null, 2)}

Generate questions that will help:
- Identify missing requirements
- Assess site-specific constraints
- Determine tool and material needs
- Evaluate safety requirements
- Understand access and logistics

Ask only the most relevant questions that will significantly impact the project plan.`
    });

    return object;
  }

  async generateToolsForProject(projectSpec: any): Promise<Array<{
    id: string;
    name: string;
    description: string;
    required: boolean;
    estimatedCost: number;
    source: string;
  }>> {
    const { object } = await generateObject({
      model: this.model,
      schema: {
        type: 'object',
        properties: {
          tools: {
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
              },
              required: ['id', 'name', 'description', 'required', 'estimatedCost', 'source']
            }
          }
        },
        required: ['tools']
      },
      prompt: `Based on this project specification, generate a list of required tools:

Project Spec: ${JSON.stringify(projectSpec, null, 2)}

Consider:
- What tools are essential for this type of project?
- What tools might be optional but helpful?
- Realistic cost estimates for tool rental or purchase
- Where tools can be sourced (hardware store, rental, etc.)

Generate only tools that are actually relevant to this specific project.`
    });

    return object.tools;
  }
}
