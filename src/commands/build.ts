import { readFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import { ProjectSchema, type ProjectType } from '../schemas/v0';
import { MockAISchemaGenerator } from '../ai/schema-generator';
import { ProjectManager } from '../utils/project-manager';
import { Estimator } from '../agents/estimator';
import { Engine } from '../engine';

interface BuildOptions {
  plan?: boolean;
  execute?: boolean;
  approveAll?: boolean;
  dryRun?: boolean;
  interactive?: boolean;
}

export async function build(projectPath: string | undefined, options: BuildOptions) {
  console.log(chalk.blue('🏗️  Build Agent Starting...'));
  
  let project: ProjectType;
  
  if (projectPath) {
    // Load and validate project from file
    project = loadProject(projectPath);
    console.log(chalk.green('✓ Project loaded and validated'));
  } else if (options.interactive) {
    // TODO: Implement interactive mode
    throw new Error('Interactive mode not yet implemented');
  } else {
    throw new Error('Please provide a project file path or use --interactive');
  }
  
  // Initialize AI schema generator and project manager
  const aiGenerator = new MockAISchemaGenerator();
  const projectManager = new ProjectManager();
  
  // Create project directory
  const projectDir = projectManager.createProjectDirectory(project.project.name);
  console.log(chalk.green('✓ Project directory created'));
  
  // Generate project specification using AI
  console.log(chalk.blue('🤖 Generating project specification with AI...'));
  const projectSpec = await aiGenerator.generateProjectSpec(project.project.description);
  
  // Update project with AI-generated spec
  project.spec = projectSpec as any;
  
  // Generate task plan using AI
  console.log(chalk.blue('📋 Generating task plan...'));
  const taskPlan = await aiGenerator.generateTaskPlan(project as any);
  
  // Update project with task plan
  project.plan = taskPlan as any;
  
  // Save updated project
  const projectFilePath = projectManager.saveProjectSchema(projectDir, project);
  console.log(chalk.green('✓ Project specification and plan generated'));
  
  // Create estimator and add estimates
  const estimator = new Estimator();
  const estimatedPlan = await estimator.estimate(taskPlan as any, project as any);
  console.log(chalk.green('✓ Estimates added'));
  
  // Display plan summary with tables
  displayPlanSummary(estimatedPlan, project as any);
  
  if (options.plan && !options.execute) {
    console.log(chalk.yellow('📋 Plan generated. Use --execute to run.'));
    return;
  }
  
  if (options.execute) {
    console.log(chalk.blue('🚀 Starting execution...'));
    
    const engine = new Engine();
    await engine.execute(estimatedPlan as any, project as any, {
      approveAll: options.approveAll || false,
      dryRun: options.dryRun || false,
    });
  } else if (options.plan) {
    console.log(chalk.yellow('📋 Plan generated. Use --execute to run.'));
  }
}

function loadProject(path: string): ProjectType {
  try {
    const filePath = join(process.cwd(), path);
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    return ProjectSchema.parse(data);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load project from ${path}: ${error.message}`);
    }
    throw error;
  }
}

function displayPlanSummary(taskPlan: any, project: ProjectType) {
  console.log(chalk.cyan('\n📋 Plan Summary'));
  console.log(chalk.cyan('='.repeat(50)));
  
  console.log(chalk.white(`Project: ${project.project.name}`));
  console.log(chalk.white(`Description: ${project.project.description}`));
  console.log(chalk.white(`Category: ${project.spec.category}`));
  console.log(chalk.white(`Scale: ${project.spec.scale}`));
  console.log(chalk.white(`Complexity: ${project.spec.complexity}`));
  console.log(chalk.white(`Budget: $${project.project.budget.total.amount / 100} ${project.project.budget.currency}`));
  
  // Create tasks table
  const tasksTable = new Table({
    head: ['Task', 'Hours', 'Skills', 'Dependencies', 'Cost'],
    colWidths: [25, 8, 20, 15, 10],
  });
  
  let totalHours = 0;
  let totalCost = 0;
  
  for (const task of taskPlan.tasks) {
    const cost = `$${task.estimatedCost.amount / 100}`;
    const dependencies = task.dependsOn.length > 0 ? task.dependsOn.join(', ') : 'None';
    const skills = task.skills.join(', ');
    
    tasksTable.push([
      task.name,
      `${task.estimatedHours}h`,
      skills,
      dependencies,
      cost,
    ]);
    
    totalHours += task.estimatedHours;
    totalCost += task.estimatedCost.amount / 100;
  }
  
  console.log(chalk.cyan('\nTasks:'));
  console.log(tasksTable.toString());
  
  // Create summary table
  const summaryTable = new Table({
    head: ['Metric', 'Value'],
    colWidths: [20, 30],
  });
  
  summaryTable.push(
    ['Total Hours', `${totalHours}h`],
    ['Total Cost', `$${totalCost} ${project.project.budget.currency}`],
    ['Budget', `$${project.project.budget.total.amount / 100} ${project.project.budget.currency}`],
    ['Remaining', `$${(project.project.budget.total.amount / 100) - totalCost} ${project.project.budget.currency}`],
    ['Critical Path', taskPlan.criticalPath.join(' → ')]
  );
  
  console.log(chalk.cyan('\nSummary:'));
  console.log(summaryTable.toString());
  
  if (totalCost > (project.project.budget.total.amount / 100)) {
    console.log(chalk.red(`  ⚠️  Cost exceeds budget by $${totalCost - (project.project.budget.total.amount / 100)}`));
  }
  
  console.log(chalk.cyan('='.repeat(50)));
}
