import chalk from 'chalk';
import inquirer from 'inquirer';
import { AISchemaGenerator } from '../ai/ai-schema-generator';
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
  
  // Migrate old projects that might be missing required fields
  const migratedData = migrateProjectData(data);
  
  return ProjectSchema.parse(migratedData);
}

function migrateProjectData(data: any): any {
  const migrated = JSON.parse(JSON.stringify(data)); // Deep clone
  
  // Add missing country field if not present
  if (migrated.project?.location?.address && !migrated.project.location.address.country) {
    migrated.project.location.address.country = 'USA';
  }
  
  // Add other missing required fields as needed
  if (migrated.project?.location?.address && !migrated.project.location.address.street) {
    migrated.project.location.address.street = 'Unknown';
  }
  
  return migrated;
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
      
      // Use real AI generator for enhanced planning
      const aiGenerator = new AISchemaGenerator();
      
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
      message: 'What would you like to build? (required):',
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return 'Project name is required';
        }
        if (input.trim().length < 3) {
          return 'Project name must be at least 3 characters';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'description',
      message: 'Describe your project (required):',
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return 'Project description is required';
        }
        if (input.trim().length < 10) {
          return 'Please provide a more detailed description (at least 10 characters)';
        }
        return true;
      }
    }
  ]);

  // Location information
  const locationInfo = await inquirer.prompt([
    {
      type: 'input',
      name: 'street',
      message: 'Street address (required):',
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return 'Street address is required';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'city',
      message: 'City (required):',
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return 'City is required';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'state',
      message: 'State/Province (required):',
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return 'State/Province is required';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'zipCode',
      message: 'ZIP/Postal code (required):',
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return 'ZIP/Postal code is required';
        }
        // Basic ZIP code validation (5 digits or 5+4 format)
        const zipRegex = /^\d{5}(-\d{4})?$/;
        if (!zipRegex.test(input)) {
          return 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'country',
      message: 'Country (required):',
      default: 'USA',
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return 'Country is required';
        }
        return true;
      }
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
      message: 'Workspace width in feet (required):',
      default: '10',
      validate: (input) => {
        const num = parseInt(input);
        if (isNaN(num) || num <= 0) {
          return 'Please enter a valid positive number';
        }
        if (num > 1000) {
          return 'Please enter a reasonable width (less than 1000 feet)';
        }
        return true;
      },
      filter: (input) => parseInt(input) || 10
    },
    {
      type: 'input',
      name: 'spaceLength',
      message: 'Workspace length in feet (required):',
      default: '10',
      validate: (input) => {
        const num = parseInt(input);
        if (isNaN(num) || num <= 0) {
          return 'Please enter a valid positive number';
        }
        if (num > 1000) {
          return 'Please enter a reasonable length (less than 1000 feet)';
        }
        return true;
      },
      filter: (input) => parseInt(input) || 10
    }
  ]);

  // Budget information
  const budgetInfo = await inquirer.prompt([
    {
      type: 'input',
      name: 'budget',
      message: 'What is your total budget in dollars? (required):',
      default: '100',
      validate: (input) => {
        const num = parseFloat(input);
        if (isNaN(num) || num <= 0) {
          return 'Please enter a valid positive number';
        }
        if (num > 1000000) {
          return 'Please enter a reasonable budget (less than $1,000,000)';
        }
        return true;
      },
      filter: (input) => Math.round(parseFloat(input) * 100) // Convert to cents
    }
  ]);

  // Timeline information
  const timelineInfo = await inquirer.prompt([
    {
      type: 'input',
      name: 'startDate',
      message: 'When do you want to start? (days from now, 0 = today):',
      default: '0',
      validate: (input) => {
        const num = parseInt(input);
        if (isNaN(num) || num < 0) {
          return 'Please enter a valid number of days (0 or more)';
        }
        return true;
      },
      filter: (input) => parseInt(input) || 0
    },
    {
      type: 'input',
      name: 'duration',
      message: 'How many days do you want to complete this project? (required):',
      default: '7',
      validate: (input) => {
        const num = parseInt(input);
        if (isNaN(num) || num <= 0) {
          return 'Please enter a valid positive number';
        }
        if (num > 365) {
          return 'Please enter a reasonable duration (less than 1 year)';
        }
        return true;
      },
      filter: (input) => parseInt(input) || 7
    }
  ]);

  // Use real AI generator for project planning
  const aiGenerator = new AISchemaGenerator();
  
  // Generate project spec from description
  const projectSpec = await aiGenerator.generateProjectSpec(basicInfo.description);
  
  // Generate follow-up questions based on spec and site conditions
  const followUpQuestions = await aiGenerator.generateFollowUpQuestions(projectSpec, siteConditions);
  
  // Ask follow-up questions
  const followUpAnswers = await inquirer.prompt(followUpQuestions.questions);
  
  // Generate tools list
  const tools = await aiGenerator.generateToolsForProject(projectSpec);
  
  // Build the project object first (without task plan)
  const projectWithoutPlan = {
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
        address: {
          ...locationInfo,
          country: 'USA'
        },
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
        total: { amount: budgetInfo.budget, currency: Currency.USD },
        allocated: { amount: 0, currency: Currency.USD },
        spent: { amount: 0, currency: Currency.USD },
        currency: Currency.USD,
        breakdown: []
      },
      timeline: {
        startDate: Date.now() + (timelineInfo.startDate * 24 * 60 * 60 * 1000),
        targetEndDate: Date.now() + (timelineInfo.duration * 24 * 60 * 60 * 1000),
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
  
  // Generate task plan
  const taskPlan = await aiGenerator.generateTaskPlan(projectWithoutPlan as any);
  
  // Build the complete project object with task plan
  const project = {
    ...projectWithoutPlan,
    state: {
      ...projectWithoutPlan.state,
      estimates: {
        totalHours: taskPlan.estimatedDuration,
        totalCost: taskPlan.estimatedCost,
        perTask: taskPlan.tasks.reduce((acc: any, task: any) => {
          acc[task.id] = { hours: task.estimatedHours, cost: task.estimatedCost };
          return acc;
        }, {}),
        lastUpdated: Date.now()
      }
    },
    plan: taskPlan
  };

  // Review project before creating
  console.log(chalk.blue('\n📋 Project Review'));
  console.log(chalk.gray('Please review the project details before creating the plan:\n'));
  
  console.log(chalk.cyan('🏗️  Project:'), basicInfo.name);
  console.log(chalk.cyan('📝 Description:'), basicInfo.description);
  console.log(chalk.cyan('📍 Location:'), `${locationInfo.street}, ${locationInfo.city}, ${locationInfo.state} ${locationInfo.zipCode}`);
  console.log(chalk.cyan('💰 Budget:'), `$${(budgetInfo.budget / 100).toFixed(2)}`);
  console.log(chalk.cyan('📅 Timeline:'), `${timelineInfo.duration} days starting ${timelineInfo.startDate === 0 ? 'today' : `in ${timelineInfo.startDate} days`}`);
  console.log(chalk.cyan('🏠 Workspace:'), `${siteConditions.spaceWidth}' x ${siteConditions.spaceLength}' ${siteConditions.indoor ? 'indoor' : 'outdoor'}`);
  console.log(chalk.cyan('⚡ Power:'), siteConditions.powerAvailable ? 'Available' : 'Not available');
  
  console.log(chalk.cyan('\n🔧 Required Tools:'), tools.length > 0 ? tools.map(t => t.name).join(', ') : 'None specified');
  console.log(chalk.cyan('🎯 Project Type:'), `${projectSpec.category} (${projectSpec.complexity} complexity, ${projectSpec.scale} scale)`);
  console.log(chalk.cyan('⚠️  Approval Points:'), project.policy.humanApprovalPoints.join(', '));
  
  console.log(chalk.cyan('\n📋 Generated Tasks:'), `${taskPlan.tasks.length} tasks`);
  taskPlan.tasks.forEach((task: any, index: number) => {
    console.log(chalk.gray(`  ${index + 1}. ${task.name} (${task.estimatedHours}h, $${(task.estimatedCost.amount / 100).toFixed(2)})`));
  });
  
  console.log(chalk.cyan('\n💰 Total Estimate:'), `${taskPlan.estimatedDuration}h, $${(taskPlan.estimatedCost.amount / 100).toFixed(2)}`);

  const { proceed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'proceed',
      message: 'Create this project plan?',
      default: true
    }
  ]);

  if (!proceed) {
    console.log(chalk.yellow('Project creation cancelled.'));
    return;
  }

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
