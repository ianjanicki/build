import chalk from 'chalk';
import inquirer from 'inquirer';
import { MockAISchemaGenerator } from '../ai/mock-schema-generator';
import { ProjectManager } from '../utils/project-manager';
import { Estimator } from '../agents/estimator';
import { Engine } from '../engine';
import { ProjectSchema } from '../schemas/v0';
import { ProjectStatus, Currency } from '../types';

interface InteractiveOptions {
  execute?: boolean;
  approveAll?: boolean;
  dryRun?: boolean;
}

export async function interactive(options: InteractiveOptions) {
  console.log(chalk.blue('🏗️  Build Agent Interactive Wizard'));
  console.log(chalk.gray('Let\'s build something amazing together!\n'));

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

  console.log(chalk.green('✓ Basic information collected'));

  // Step 2: Location and access
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
      choices: ['key', 'unlocked', 'code', 'meet_on_site']
    },
    {
      type: 'confirm',
      name: 'parkingAvailable',
      message: 'Is parking available for workers?',
      default: true
    }
  ]);

  console.log(chalk.green('✓ Location information collected'));

  // Step 3: Site conditions and constraints
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

  // Step 4: Budget
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

  console.log(chalk.green('✓ Budget information collected'));

  // Step 5: AI-driven follow-up questions
  console.log(chalk.blue('\n🤖 AI Analysis & Follow-up Questions'));
  console.log(chalk.gray('Analyzing your project requirements...'));

  const aiGenerator = new MockAISchemaGenerator();
  
  // Generate initial spec to determine what questions to ask
  const projectSpec = await aiGenerator.generateProjectSpec(basicInfo.description);
  
  // Ask project-specific follow-up questions based on AI analysis
  const followUpQuestions = await getFollowUpQuestions(projectSpec, siteConditions);
  
  console.log(chalk.green('✓ Follow-up questions completed'));

  // Step 6: Build the project object
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
        constraints: followUpQuestions.constraints || []
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
      ...followUpQuestions.specUpdates
    },
    policy: {
      humanApprovalPoints: ['plan', 'labor_hire'],
      riskLevel: 'low',
      safetyRequirements: followUpQuestions.safetyRequirements || [],
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

  // Step 7: Generate task plan
  console.log(chalk.blue('\n📋 Generating Task Plan'));
  console.log(chalk.gray('Creating detailed task breakdown...'));
  
  const taskPlan = await aiGenerator.generateTaskPlan(project as any);
  project.plan = taskPlan as any;

  // Step 8: Add estimates
  console.log(chalk.blue('\n💰 Calculating Estimates'));
  const estimator = new Estimator();
  const estimatedPlan = await estimator.estimate(taskPlan as any, project as any);

  // Step 9: Save and display
  const projectManager = new ProjectManager();
  const projectDir = projectManager.createProjectDirectory(project.project.name);
  projectManager.saveProjectSchema(projectDir, project as any);

  console.log(chalk.green('\n✅ Project created successfully!'));
  console.log(chalk.cyan(`📁 Project saved to: ${projectDir}`));

  // Display plan summary
  displayPlanSummary(estimatedPlan, project as any);

  if (options.execute) {
    console.log(chalk.blue('\n🚀 Starting execution...'));
    const engine = new Engine();
    await engine.execute(estimatedPlan as any, project as any, {
      approveAll: options.approveAll || false,
      dryRun: options.dryRun || false,
    });
  }
}

async function getFollowUpQuestions(projectSpec: any, siteConditions: any) {
  const questions = [];
  const constraints = [];
  const safetyRequirements = [];
  const specUpdates: any = {};

  // Space-related questions
  if (siteConditions.spaceWidth < 8 || siteConditions.spaceLength < 8) {
    questions.push({
      type: 'confirm',
      name: 'spaceConstraint',
      message: '⚠️  Your workspace is quite small. Should we add a "space preparation" task?',
      default: true
    });
  }

  // Tool-related questions
  questions.push({
    type: 'confirm',
    name: 'hasBasicTools',
    message: 'Do you have basic tools (screwdriver, hammer, etc.)?',
    default: false
  });

  // Access-related questions
  if (siteConditions.indoor) {
    questions.push({
      type: 'confirm',
      name: 'hasElevator',
      message: 'Is there elevator access to your floor?',
      default: false
    });
  }

  // Safety-related questions
  questions.push({
    type: 'confirm',
    name: 'requiresSafety',
    message: 'Does this project require safety equipment (gloves, eye protection, etc.)?',
    default: false
  });

  const answers = await inquirer.prompt(questions);

  // Process answers and create constraints/tasks
  if (answers.spaceConstraint) {
    constraints.push({
      id: 'const_space',
      type: 'physical',
      severity: 'medium',
      description: 'Limited workspace requires preparation',
      impact: 'May affect task efficiency',
      verified: false
    });
  }

  if (!answers.hasBasicTools) {
    specUpdates.requirements = [
      ...(projectSpec.requirements || []),
      {
        id: 'req_tools',
        type: 'tool',
        name: 'basic_tools',
        level: 1,
        description: 'Basic hand tools needed',
        verified: false
      }
    ];
  }

  if (answers.requiresSafety) {
    safetyRequirements.push({
      id: 'safety_001',
      type: 'ppe',
      description: 'Safety equipment required',
      mandatory: true,
      verified: false
    });
  }

  return {
    constraints,
    safetyRequirements,
    specUpdates
  };
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
