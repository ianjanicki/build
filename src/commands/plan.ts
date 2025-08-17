import chalk from 'chalk';
import inquirer from 'inquirer';
import { MockAISchemaGenerator } from '../ai/mock-schema-generator';
import { ProjectManager } from '../utils/project-manager';
import { Estimator } from '../agents/estimator';
import { ProjectSchema } from '../schemas/v0';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { ProjectStatus, Currency } from '../types';

interface PlanOptions {
  interactive?: boolean;
  output?: string;
}

function loadProject(projectPath: string): any {
  const content = readFileSync(projectPath, 'utf-8');
  const data = JSON.parse(content);
  return ProjectSchema.parse(data);
}

function saveProject(project: any, outputPath: string): void {
  // Ensure directory exists
  const dir = dirname(outputPath);
  mkdirSync(dir, { recursive: true });
  
  // Save project
  writeFileSync(outputPath, JSON.stringify(project, null, 2));
}

export async function plan(projectPath: string | undefined, options: PlanOptions) {
  // If project path is provided, load and enhance existing project
  if (projectPath) {
    try {
      const project = loadProject(projectPath);
      console.log(chalk.blue(`📋 Enhancing existing project: ${project.project.name}`));
      
      // For now, use mock generator until AI SDK integration is complete
      const aiGenerator = new MockAISchemaGenerator();
      
      // Generate enhanced task plan
      const taskPlan = await aiGenerator.generateTaskPlan(project);
      project.plan = taskPlan;
      project.state.currentPhase = ProjectStatus.PLAN;
      project.metadata.lastModified = Date.now();
      
      // Save enhanced project
      const outputPath = options.output || projectPath;
      saveProject(project, outputPath);
      
      console.log(chalk.green(`✅ Project enhanced and saved to: ${outputPath}`));
      return;
    } catch (error) {
      console.error(chalk.red('Error loading project:'), error);
      process.exit(1);
    }
  }

  // Interactive project creation
  if (options.interactive) {
    const project = await createProjectInteractively();
    const outputPath = options.output || `./.output/${project.project.name.toLowerCase().replace(/\s+/g, '_')}/project.json`;
    saveProject(project, outputPath);
    
    console.log(chalk.green(`✅ Project created and saved to: ${outputPath}`));
    return;
  }

  // Non-interactive mode requires project path
  console.error(chalk.red('Error: Project path required for non-interactive mode'));
  process.exit(1);
}

async function createProjectInteractively(): Promise<any> {
  // Basic project information
  const basicInfo = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'What would you like to build?',
      default: 'My Project'
    },
    {
      type: 'input',
      name: 'description',
      message: 'Describe your project:',
      default: 'A new project'
    }
  ]);

  // Location information
  const locationInfo = await inquirer.prompt([
    {
      type: 'input',
      name: 'street',
      message: 'Street address:',
      default: '123 Main St'
    },
    {
      type: 'input',
      name: 'city',
      message: 'City:',
      default: 'Anytown'
    },
    {
      type: 'input',
      name: 'state',
      message: 'State:',
      default: 'CA'
    },
    {
      type: 'input',
      name: 'zipCode',
      message: 'ZIP code:',
      default: '90210'
    }
  ]);

  // Site conditions
  const siteConditions = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'indoor',
      message: 'Is this an indoor project?',
      default: true
    },
    {
      type: 'confirm',
      name: 'powerAvailable',
      message: 'Is power available?',
      default: true
    },
    {
      type: 'input',
      name: 'spaceWidth',
      message: 'Workspace width (feet):',
      default: '10',
      filter: (input) => parseInt(input) || 10
    },
    {
      type: 'input',
      name: 'spaceLength',
      message: 'Workspace length (feet):',
      default: '10',
      filter: (input) => parseInt(input) || 10
    }
  ]);

  // For now, use mock generator until AI SDK integration is complete
  const aiGenerator = new MockAISchemaGenerator();
  
  // Generate project spec from description
  const projectSpec = await aiGenerator.generateProjectSpec(basicInfo.description);
  
  // Generate follow-up questions based on spec and site conditions
  const followUpQuestions = await aiGenerator.generateFollowUpQuestions(projectSpec, siteConditions);
  
  // Ask follow-up questions
  const followUpAnswers = await inquirer.prompt(followUpQuestions.questions);
  
  // Generate tools list
  const tools = await aiGenerator.generateToolsForProject(projectSpec);
  
  // Build the complete project object
  const project = {
    version: '0.0.0' as const,
    metadata: {
      createdAt: Date.now(),
      lastModified: Date.now(),
      createdBy: 'interactive',
      status: ProjectStatus.PLAN,
      version: '0.0.0' as const
    },
    project: {
      name: basicInfo.name,
      description: basicInfo.description,
      location: {
        address: locationInfo,
        access: {
          entryMethod: 'key',
          parkingAvailable: true,
          elevatorAccess: false
        },
        siteConditions: {
          indoor: siteConditions.indoor,
          climateControlled: true,
          lighting: 'natural',
          powerAvailable: siteConditions.powerAvailable,
          waterAvailable: true,
          spaceDimensions: {
            width: siteConditions.spaceWidth,
            length: siteConditions.spaceLength,
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
    spec: projectSpec,
    policy: {
      humanApprovalPoints: ['plan', 'labor_hire'],
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

  return project;
}

async function loadAndEnhanceProject(projectPath: string): Promise<any> {
  // Load existing project and enhance it
  // This would load from JSON and then enhance with AI
  throw new Error('Loading and enhancing existing projects not yet implemented');
}

function displayPlanSummary(taskPlan: any, project: any) {
  console.log(chalk.cyan('\n📋 Plan Summary'));
  console.log(chalk.cyan('='.repeat(50)));

  console.log(chalk.white(`Project: ${project.project.name}`));
  console.log(chalk.white(`Description: ${project.project.description}`));
  console.log(chalk.white(`Category: ${project.spec.category}`));
  console.log(chalk.white(`Scale: ${project.spec.scale}`));
  console.log(chalk.white(`Complexity: ${project.spec.complexity}`));
  console.log(chalk.white(`Budget: $${project.project.budget.total.amount / 100} ${project.project.budget.currency}`));

  let totalHours = 0;
  let totalCost = 0;

  console.log(chalk.cyan('\nTasks:'));
  for (const task of taskPlan.tasks) {
    const cost = `$${task.estimatedCost.amount / 100}`;
    const dependencies = task.dependsOn.length > 0 ? task.dependsOn.join(', ') : 'None';
    const skills = task.skills.join(', ');

    console.log(chalk.white(`  • ${task.name} (${task.estimatedHours}h, ${cost})`));
    console.log(chalk.gray(`    Skills: ${skills}`));
    console.log(chalk.gray(`    Dependencies: ${dependencies}`));

    totalHours += task.estimatedHours;
    totalCost += task.estimatedCost.amount / 100;
  }

  console.log(chalk.cyan('\nSummary:'));
  console.log(chalk.white(`  Total Hours: ${totalHours}h`));
  console.log(chalk.white(`  Total Cost: $${totalCost} ${project.project.budget.currency}`));
  console.log(chalk.white(`  Budget Remaining: $${(project.project.budget.total.amount / 100) - totalCost} ${project.project.budget.currency}`));
  console.log(chalk.white(`  Critical Path: ${taskPlan.criticalPath.join(' → ')}`));

  if (totalCost > (project.project.budget.total.amount / 100)) {
    console.log(chalk.red(`  ⚠️  Cost exceeds budget by $${totalCost - (project.project.budget.total.amount / 100)}`));
  }

  console.log(chalk.cyan('='.repeat(50)));
}
