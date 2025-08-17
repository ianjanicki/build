import chalk from 'chalk';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
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
    this.model = MODEL_CONFIG[model as keyof typeof MODEL_CONFIG] || MODEL_CONFIG.default;
    console.log(chalk.blue(`🤖 AI Schema Generator initialized with ${this.model}`));
  }

  async generateProjectSpec(userInput: string): Promise<{
    complexity: ProjectComplexity;
    scale: ProjectScale;
    category: ProjectCategory;
    requirements: Requirement[];
    constraints: Constraint[];
    properties: Record<string, any>;
  }> {
    console.log(chalk.blue('🧠 Generating project specification...'));
    
    const projectSpecSchema = z.object({
      complexity: z.enum(['simple', 'moderate', 'complex', 'expert']),
      scale: z.enum(['small', 'medium', 'large', 'enterprise']),
      category: z.enum(['furniture_assembly', 'home_improvement', 'landscaping', 'renovation', 'maintenance', 'installation', 'repair', 'construction', 'other']),
      requirements: z.array(z.object({
        id: z.string(),
        type: z.enum(['skill', 'material', 'tool', 'permit', 'safety', 'quality', 'timeline', 'budget']),
        level: z.enum(['basic', 'intermediate', 'advanced', 'expert']),
        description: z.string(),
        critical: z.boolean()
      })),
      constraints: z.array(z.object({
        id: z.string(),
        type: z.enum(['budget', 'timeline', 'space', 'access', 'noise', 'safety', 'permit', 'weather', 'skill', 'material']),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        description: z.string(),
        impact: z.string()
      })),
      properties: z.record(z.any())
    });
    
    const result = await generateObject({
      model: openai(this.model),
      schema: projectSpecSchema,
      prompt: `Analyze this project description and generate a comprehensive project specification:

PROJECT: ${userInput}

Generate a detailed project specification including:
1. Complexity level (simple/moderate/complex/expert)
2. Scale (small/medium/large/enterprise) 
3. Category (furniture_assembly/home_improvement/landscaping/etc.)
4. Requirements (skills, materials, tools, permits, safety, quality, timeline, budget)
5. Constraints (budget, timeline, space, access, noise, safety, permits, weather, skills, materials)
6. Additional properties specific to this project type

Be realistic and thorough. Consider safety, permits, skill requirements, and practical constraints.`
    });

    console.log(chalk.green('✅ Project specification generated'));
    return result;
  }

  async generateTaskPlan(project: Project): Promise<{
    tasks: Task[];
    dependencies: Dependency[];
    criticalPath: string[];
    estimatedDuration: number;
    estimatedCost: { amount: number; currency: Currency };
    generatedAt: number;
  }> {
    console.log(chalk.blue('🧠 Generating task plan...'));
    
    const taskPlanSchema = z.object({
      tasks: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']),
        priority: z.enum(['low', 'medium', 'high', 'critical']),
        estimatedHours: z.number(),
        estimatedCost: z.object({
          amount: z.number(),
          currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'])
        }),
        skills: z.array(z.string()),
        materials: z.array(z.any()),
        tools: z.array(z.any()),
        safetyRequirements: z.array(z.string()),
        dependsOn: z.array(z.string()),
        blocks: z.array(z.string()),
        instructions: z.string(),
        checkpoints: z.array(z.any()),
        progress: z.number(),
        notes: z.array(z.any()),
        evidence: z.array(z.string())
      })),
      dependencies: z.array(z.object({
        id: z.string(),
        fromTask: z.string(),
        toTask: z.string(),
        type: z.enum(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish']),
        lag: z.number()
      })),
      criticalPath: z.array(z.string()),
      estimatedDuration: z.number(),
      estimatedCost: z.object({
        amount: z.number(),
        currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'])
      }),
      generatedAt: z.number()
    });
    
    const result = await generateObject({
      model: openai(this.model),
      schema: taskPlanSchema,
      prompt: `Generate a detailed task plan for this project:

PROJECT: ${project.project.name}
DESCRIPTION: ${project.project.description}
CATEGORY: ${project.spec.category}
COMPLEXITY: ${project.spec.complexity}
SCALE: ${project.spec.scale}
BUDGET: $${(project.project.budget.total.amount / 100).toFixed(2)}
TIMELINE: ${Math.ceil((project.project.timeline.targetEndDate - project.project.timeline.startDate) / (24 * 60 * 60 * 1000))} days
LOCATION: ${project.project.location.address.street}, ${project.project.location.address.city}

REQUIREMENTS: ${project.spec.requirements.map(r => `${r.type}: ${r.description}`).join(', ')}
CONSTRAINTS: ${project.spec.constraints.map(c => `${c.type}: ${c.description}`).join(', ')}

Generate a comprehensive task plan with:
1. Detailed tasks with realistic time/cost estimates
2. Proper task dependencies and critical path
3. Required skills, materials, and tools
4. Safety requirements and checkpoints
5. Clear instructions for each task

Be realistic about time, cost, and skill requirements. Consider the project complexity and constraints.`
    });

    console.log(chalk.green('✅ Task plan generated'));
    return result;
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
    console.log(chalk.blue('🧠 Generating follow-up questions...'));
    
    const questionsSchema = z.object({
      questions: z.array(z.object({
        type: z.enum(['confirm', 'input', 'list', 'number']),
        name: z.string(),
        message: z.string(),
        choices: z.array(z.string()).optional(),
        default: z.any().optional()
      })),
      reasoning: z.string()
    });
    
    const result = await generateObject({
      model: openai(this.model),
      schema: questionsSchema,
      prompt: `Generate follow-up questions to gather missing information for this project:

PROJECT SPEC: ${JSON.stringify(projectSpec, null, 2)}
SITE CONDITIONS: ${JSON.stringify(siteConditions, null, 2)}

Generate 3-5 specific questions to gather missing critical information. Focus on:
1. Safety requirements and permits
2. Material specifications and quantities
3. Access and logistics details
4. Quality and timeline preferences
5. Budget constraints and priorities

Make questions specific and actionable. Include reasoning for why each question is important.`
    });

    console.log(chalk.green('✅ Follow-up questions generated'));
    return result;
  }

  async generateToolsForProject(projectSpec: any): Promise<Array<{
    id: string;
    name: string;
    description: string;
    required: boolean;
    estimatedCost: number;
    source: string;
  }>> {
    console.log(chalk.blue('🧠 Generating tools list...'));
    
    const toolsSchema = z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      required: z.boolean(),
      estimatedCost: z.number(),
      source: z.string()
    }));
    
    const result = await generateObject({
      model: openai(this.model),
      schema: toolsSchema,
      prompt: `Generate a list of tools required for this project:

PROJECT SPEC: ${JSON.stringify(projectSpec, null, 2)}

Generate a realistic list of tools needed, including:
1. Basic hand tools (screwdrivers, hammers, etc.)
2. Power tools if required
3. Safety equipment
4. Specialized tools for the project type
5. Estimated costs for each tool
6. Where to source each tool (Home Depot, Lowe's, Amazon, etc.)

Be realistic about what tools are actually needed and their costs.`
    });

    console.log(chalk.green('✅ Tools list generated'));
    return result;
  }
}
