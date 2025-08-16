import chalk from 'chalk';
import inquirer from 'inquirer';
import { MockAISchemaGenerator } from '../ai/mock-schema-generator';
import { ProjectManager } from '../utils/project-manager';
import { Estimator } from '../agents/estimator';
import { ProjectStatus, Currency } from '../types';

interface PlanOptions {
  interactive?: boolean;
  output?: string;
}

export async function plan(projectPath: string | undefined, options: PlanOptions) {
  console.log(chalk.blue('📋 Build Agent - Plan Generator'));
  console.log(chalk.gray('Creating detailed project plans...\n'));

  let project: any;

  if (options.interactive) {
    project = await createProjectInteractively();
  } else if (projectPath) {
    // Load existing project and enhance it
    project = await loadAndEnhanceProject(projectPath);
  } else {
    throw new Error('Please provide a project file path or use --interactive');
  }

  // Generate enhanced plan
  // For now, use mock generator until AI SDK integration is complete
  const aiGenerator = new MockAISchemaGenerator();
  const projectManager = new ProjectManager();

  console.log(chalk.blue('🤖 Generating enhanced project specification...'));
  const enhancedSpec = await aiGenerator.generateProjectSpec(project.project.description);
  project.spec = { ...project.spec, ...enhancedSpec };

  console.log(chalk.blue('📋 Generating detailed task plan...'));
  const taskPlan = await aiGenerator.generateTaskPlan(project as any);
  project.plan = taskPlan as any;

  console.log(chalk.blue('💰 Calculating estimates...'));
  const estimator = new Estimator();
  const estimatedPlan = await estimator.estimate(taskPlan as any, project as any);
  project.plan = estimatedPlan as any;

  // Update project state
  project.state.currentPhase = ProjectStatus.PLAN;
  project.state.estimates = {
    totalHours: estimatedPlan.estimatedDuration,
    totalCost: estimatedPlan.estimatedCost,
    perTask: estimatedPlan.tasks.reduce((acc: any, task: any) => {
      acc[task.id] = { hours: task.estimatedHours, cost: task.estimatedCost };
      return acc;
    }, {}),
    lastUpdated: Date.now()
  };

  // Save plan
  const projectDir = projectManager.createProjectDirectory(project.project.name);
  const planPath = projectManager.saveProjectSchema(projectDir, project as any);

  console.log(chalk.green('\n✅ Plan generated successfully!'));
  console.log(chalk.cyan(`📁 Plan saved to: ${planPath}`));

  // Display plan summary
  displayPlanSummary(estimatedPlan, project as any);

  console.log(chalk.yellow('\n💡 Next steps:'));
  console.log(chalk.gray('  • Review the plan in the generated JSON file'));
  console.log(chalk.gray('  • Use "build run <plan-file>" to execute the plan'));
  console.log(chalk.gray('  • Use "build modify <plan-file>" to adjust the plan'));
}

async function createProjectInteractively(): Promise<any> {
  console.log(chalk.blue('🏗️  Interactive Project Planning'));
  console.log(chalk.gray('Let\'s create a detailed project plan...\n'));

  // For now, use mock generator until AI SDK integration is complete
  const aiGenerator = new MockAISchemaGenerator();

  // Step 1: Basic project information
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
      message: 'Describe your project in detail:',
      default: 'A simple assembly project'
    }
  ]);

  // Step 2: Generate initial spec
  console.log(chalk.blue('\n🤖 Analyzing project requirements...'));
  const projectSpec = await aiGenerator.generateProjectSpec(basicInfo.description);

  // Step 3: Location and access
  console.log(chalk.blue('\n📍 Location & Access'));
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
      default: 'Your City'
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
      message: 'ZIP Code:',
      default: '90210'
    },
    {
      type: 'list',
      name: 'entryMethod',
      message: 'How can workers access the site?',
      choices: [
        { name: 'Key provided', value: 'key' },
        { name: 'Door unlocked', value: 'unlocked' },
        { name: 'Access code', value: 'code' },
        { name: 'Meet on site', value: 'meet' },
        { name: 'Call when arriving', value: 'call' }
      ]
    },
    {
      type: 'confirm',
      name: 'parkingAvailable',
      message: 'Is parking available for workers?',
      default: true
    }
  ]);

  // Step 4: Site conditions
  console.log(chalk.blue('\n🏠 Site Conditions'));
  const siteConditions = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'indoor',
      message: 'Is this an indoor project?',
      default: true
    },
    {
      type: 'confirm',
      name: 'climateControlled',
      message: 'Is the space climate controlled?',
      default: true
    },
    {
      type: 'input',
      name: 'spaceWidth',
      message: 'Available workspace width (feet):',
      default: '10',
      filter: (input) => parseInt(input) || 10
    },
    {
      type: 'input',
      name: 'spaceLength',
      message: 'Available workspace length (feet):',
      default: '10',
      filter: (input) => parseInt(input) || 10
    },
    {
      type: 'confirm',
      name: 'powerAvailable',
      message: 'Is electrical power available?',
      default: true
    },
    {
      type: 'confirm',
      name: 'waterAvailable',
      message: 'Is water available?',
      default: true
    }
  ]);

  // Step 5: AI-generated follow-up questions
  console.log(chalk.blue('\n🤖 AI-Generated Follow-up Questions'));
  const followUpQuestions = await aiGenerator.generateFollowUpQuestions(projectSpec, siteConditions);
  
  console.log(chalk.gray(`\nAI Reasoning: ${followUpQuestions.reasoning}`));
  
  const answers = await inquirer.prompt(followUpQuestions.questions);

  // Step 6: Budget
  console.log(chalk.blue('\n💰 Budget'));
  const budgetInfo = await inquirer.prompt([
    {
      type: 'number',
      name: 'budget',
      message: 'What\'s your total budget (in dollars)?',
      default: 100,
      filter: (input) => Math.round(input * 100) // Convert to cents
    }
  ]);

  // Step 7: Generate tools list
  console.log(chalk.blue('\n🔧 Analyzing tool requirements...'));
  const tools = await aiGenerator.generateToolsForProject(projectSpec);

  // Build the project object
  const project = {
    version: '0.0.0',
    metadata: {
      createdAt: Date.now(),
      lastModified: Date.now(),
      createdBy: 'interactive-user',
      status: ProjectStatus.PLAN,
      version: '0.0.0'
    },
    project: {
      name: basicInfo.name,
      description: basicInfo.description,
      location: {
        address: {
          street: locationInfo.street,
          city: locationInfo.city,
          state: locationInfo.state,
          zipCode: locationInfo.zipCode,
          country: 'USA'
        },
        access: {
          entryMethod: locationInfo.entryMethod,
          parkingAvailable: locationInfo.parkingAvailable,
          elevatorAccess: false
        },
        siteConditions: {
          indoor: siteConditions.indoor,
          climateControlled: siteConditions.climateControlled,
          lighting: 'natural',
          powerAvailable: siteConditions.powerAvailable,
          waterAvailable: siteConditions.waterAvailable,
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
        startDate: Date.now(),
        targetEndDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // 1 week from now
        milestones: []
      }
    },
    spec: {
      ...projectSpec,
      tools: tools
    },
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
