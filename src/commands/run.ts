import chalk from 'chalk';
import inquirer from 'inquirer';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Engine } from '../engine';
import { ProjectManager } from '../utils/project-manager';
import { ProjectSchema } from '../schemas/v0';
import { ProjectStatus } from '../types';

interface RunOptions {
  approveAll?: boolean;
  dryRun?: boolean;
  interactive?: boolean;
  modify?: boolean;
}

export async function run(planPath: string, options: RunOptions) {
  const project = loadPlan(planPath);
  
  // Display project essentials
  console.log(chalk.blue('\n🏗️  Project Execution'));
  console.log(chalk.gray('Starting execution with state machine workflow...\n'));
  
  console.log(chalk.cyan('📋 Project:'), project.project.name);
  console.log(chalk.cyan('📍 Location:'), `${project.project.location.address.street}, ${project.project.location.address.city}`);
  console.log(chalk.cyan('💰 Budget:'), `$${(project.project.budget.total.amount / 100).toFixed(2)}`);
  console.log(chalk.cyan('📅 Timeline:'), `${Math.ceil((project.project.timeline.targetEndDate - project.project.timeline.startDate) / (24 * 60 * 60 * 1000))} days`);
  console.log(chalk.cyan('📊 Status:'), project.state.currentPhase);
  
  console.log(chalk.cyan('\n📋 Tasks:'), `${project.plan.tasks.length} tasks to execute`);
  console.log(chalk.cyan('💰 Estimate:'), `${project.plan.estimatedDuration}h, $${(project.plan.estimatedCost.amount / 100).toFixed(2)}`);
  console.log(chalk.cyan('⚠️  Approval Points:'), project.policy.humanApprovalPoints.join(', '));
  
  // Pre-execution checks
  console.log(chalk.blue('\n🔍 Pre-execution checks...'));
  
  // Check budget
  if (project.plan.estimatedCost.amount > project.project.budget.total.amount) {
    console.log(chalk.red('❌ Budget exceeded!'));
    console.log(chalk.gray(`   Estimated: $${(project.plan.estimatedCost.amount / 100).toFixed(2)}`));
    console.log(chalk.gray(`   Budget: $${(project.project.budget.total.amount / 100).toFixed(2)}`));
    
    if (!options.approveAll) {
      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Proceed despite budget overrun?',
          default: false
        }
      ]);
      if (!proceed) {
        console.log(chalk.yellow('Execution cancelled.'));
        return;
      }
    }
  } else {
    console.log(chalk.green('✓ Budget check passed'));
  }
  
  // Check timeline
  const daysToComplete = Math.ceil(project.plan.estimatedDuration / 8); // Assume 8 hours per day
  const availableDays = Math.ceil((project.project.timeline.targetEndDate - Date.now()) / (24 * 60 * 60 * 1000));
  
  if (daysToComplete > availableDays) {
    console.log(chalk.red('❌ Timeline exceeded!'));
    console.log(chalk.gray(`   Required: ${daysToComplete} days`));
    console.log(chalk.gray(`   Available: ${availableDays} days`));
    
    if (!options.approveAll) {
      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Proceed despite timeline overrun?',
          default: false
        }
      ]);
      if (!proceed) {
        console.log(chalk.yellow('Execution cancelled.'));
        return;
      }
    }
  } else {
    console.log(chalk.green('✓ Timeline check passed'));
  }
  
  console.log(chalk.green('✓ Pre-execution checks passed\n'));
  
  // Start execution
  console.log(chalk.blue('🚀 Starting execution...'));
  
  const engine = new AsyncEngine();
  await engine.executeAsync(project, options);
}

function loadPlan(planPath: string): any {
  try {
    // Handle both relative and absolute paths
    const filePath = planPath.startsWith('/') || planPath.startsWith('./') || planPath.startsWith('../') 
      ? planPath 
      : join(process.cwd(), planPath);
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    return ProjectSchema.parse(data);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load plan from ${planPath}: ${error.message}`);
    }
    throw error;
  }
}

async function performPreExecutionChecks(project: any, options: RunOptions): Promise<void> {
  console.log(chalk.blue('\n🔍 Pre-execution checks...'));

  // Check budget
  const totalCost = project.state.estimates.totalCost.amount / 100;
  const budget = project.project.budget.total.amount / 100;
  
  if (totalCost > budget) {
    console.log(chalk.red(`⚠️  Cost exceeds budget by $${totalCost - budget}`));
    
    if (!options.approveAll) {
      const { shouldContinue } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldContinue',
          message: 'Do you want to continue despite budget overrun?',
          default: false
        }
      ]);

      if (!shouldContinue) {
        throw new Error('Execution cancelled due to budget overrun');
      }
    }
  }

  // Check for required approvals
  const pendingApprovals = project.state.approvals.filter((a: any) => a.status === 'pending');
  if (pendingApprovals.length > 0 && !options.approveAll) {
    console.log(chalk.yellow(`⚠️  ${pendingApprovals.length} pending approvals found`));
    
    for (const approval of pendingApprovals) {
      const { approved } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'approved',
          message: `Approve: ${approval.description}?`,
          default: false
        }
      ]);

      if (approved) {
        approval.status = 'approved';
        approval.approvedAt = Date.now();
        approval.approvedBy = 'user';
      } else {
        throw new Error(`Execution cancelled: ${approval.description} not approved`);
      }
    }
  }

  console.log(chalk.green('✓ Pre-execution checks passed'));
}

class AsyncEngine extends Engine {
  async executeAsync(project: any, options: {
    approveAll: boolean;
    dryRun: boolean;
    interactive: boolean;
    modify: boolean;
  }): Promise<void> {
    console.log(chalk.blue('🔧 Starting async execution engine...'));

    if (options.dryRun) {
      console.log(chalk.yellow('🧪 DRY RUN MODE - No side effects will be performed'));
    }

    // Update project state
    project.state.currentPhase = ProjectStatus.EXECUTE;
    project.metadata.lastModified = Date.now();

    const taskPlan = project.plan;
    const executedTasks = new Set<string>();
    const taskMap = new Map(taskPlan.tasks.map((task: any) => [task.id, task]));

    while (executedTasks.size < taskPlan.tasks.length) {
      const readyTasks = this.getReadyTasks(taskPlan, executedTasks);

      if (readyTasks.length === 0) {
        console.log(chalk.red('❌ Circular dependency detected in task graph'));
        return;
      }

      // Execute tasks in parallel (or sequentially if interactive)
      if (options.interactive) {
        // Interactive mode - ask user which task to execute next
        const { selectedTaskId } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedTaskId',
            message: 'Which task would you like to execute next?',
            choices: readyTasks.map(task => ({
              name: `${task.name} (${task.estimatedHours}h, $${task.estimatedCost.amount / 100})`,
              value: task.id
            }))
          }
        ]);

        const selectedTask = taskMap.get(selectedTaskId);
        await this.executeTaskAsync(selectedTask, project, options);
        executedTasks.add(selectedTaskId);
      } else {
        // Parallel execution
        const executionPromises = readyTasks.map(task => 
          this.executeTaskAsync(task, project, options)
        );

        await Promise.all(executionPromises);
        readyTasks.forEach(task => executedTasks.add(task.id));
      }

      // Check for modifications if enabled
      if (options.modify && !options.dryRun) {
        const { shouldModify } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldModify',
            message: 'Do you want to modify the remaining tasks?',
            default: false
          }
        ]);

        if (shouldModify) {
          await this.modifyRemainingTasks(project, executedTasks);
        }
      }
    }

    // Update final state
    project.state.currentPhase = ProjectStatus.COMPLETED;
    project.metadata.lastModified = Date.now();

    console.log(chalk.green('✅ All tasks completed successfully!'));
  }

  private async executeTaskAsync(task: any, project: any, options: any): Promise<void> {
    console.log(chalk.cyan(`\n🔄 Executing: ${task.name}`));
    console.log(chalk.gray(`   ${task.description}`));

    if (options.dryRun) {
      console.log(chalk.gray(`   [DRY RUN] Would execute task: ${task.id}`));
      return;
    }

    // Update task status
    task.status = 'in_progress';
    task.startTime = Date.now();

    // Log execution start
    project.state.executionLog.push({
      id: `log_${Date.now()}`,
      timestamp: Date.now(),
      taskId: task.id,
      action: 'started',
      description: `Started executing ${task.name}`,
      worker: 'system'
    });

    try {
      // Execute the task (using existing logic)
      await this.executeTask(task, project, options);

      // Update task status
      task.status = 'completed';
      task.endTime = Date.now();
      task.actualHours = (task.endTime - task.startTime) / (1000 * 60 * 60); // Convert to hours

      // Update project state
      project.state.completedTasks.push(task.id);
      project.state.executionLog.push({
        id: `log_${Date.now()}`,
        timestamp: Date.now(),
        taskId: task.id,
        action: 'completed',
        description: `Completed ${task.name}`,
        worker: 'system',
        duration: task.actualHours * 3600 // Convert to seconds
      });

      console.log(chalk.green(`   ✅ Completed: ${task.name}`));

    } catch (error) {
      // Handle task failure
      task.status = 'failed';
      task.endTime = Date.now();

      project.state.executionLog.push({
        id: `log_${Date.now()}`,
        timestamp: Date.now(),
        taskId: task.id,
        action: 'failed',
        description: `Failed to execute ${task.name}: ${error}`,
        worker: 'system'
      });

      console.log(chalk.red(`   ❌ Failed: ${task.name}`));
      throw error;
    }
  }

  private async modifyRemainingTasks(project: any, executedTasks: Set<string>): Promise<void> {
    const remainingTasks = project.plan.tasks.filter((task: any) => !executedTasks.has(task.id));
    
    if (remainingTasks.length === 0) {
      console.log(chalk.gray('No remaining tasks to modify'));
      return;
    }

    console.log(chalk.blue('\n🔧 Task Modification'));
    console.log(chalk.gray('Remaining tasks:'));
    
    for (const task of remainingTasks) {
      console.log(chalk.white(`  • ${task.name} (${task.estimatedHours}h)`));
    }

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Skip a task', value: 'skip' },
          { name: 'Modify task estimates', value: 'estimate' },
          { name: 'Add new task', value: 'add' },
          { name: 'Continue without changes', value: 'continue' }
        ]
      }
    ]);

    switch (action) {
      case 'skip':
        await this.skipTask(remainingTasks);
        break;
      case 'estimate':
        await this.modifyTaskEstimates(remainingTasks);
        break;
      case 'add':
        await this.addNewTask(project);
        break;
      case 'continue':
        console.log(chalk.gray('Continuing without modifications'));
        break;
    }
  }

  private async skipTask(remainingTasks: any[]): Promise<void> {
    const { taskId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'taskId',
        message: 'Which task would you like to skip?',
        choices: remainingTasks.map(task => ({
          name: task.name,
          value: task.id
        }))
      }
    ]);

    const task = remainingTasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'cancelled';
      console.log(chalk.yellow(`Skipped task: ${task.name}`));
    }
  }

  private async modifyTaskEstimates(remainingTasks: any[]): Promise<void> {
    const { taskId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'taskId',
        message: 'Which task would you like to modify?',
        choices: remainingTasks.map(task => ({
          name: `${task.name} (currently ${task.estimatedHours}h)`,
          value: task.id
        }))
      }
    ]);

    const { newHours } = await inquirer.prompt([
      {
        type: 'number',
        name: 'newHours',
        message: 'New estimated hours:',
        default: remainingTasks.find(t => t.id === taskId)?.estimatedHours
      }
    ]);

    const task = remainingTasks.find(t => t.id === taskId);
    if (task) {
      task.estimatedHours = newHours;
      console.log(chalk.green(`Updated ${task.name} to ${newHours}h`));
    }
  }

  private async addNewTask(project: any): Promise<void> {
    const { taskName, taskDescription, estimatedHours } = await inquirer.prompt([
      {
        type: 'input',
        name: 'taskName',
        message: 'Task name:'
      },
      {
        type: 'input',
        name: 'taskDescription',
        message: 'Task description:'
      },
      {
        type: 'number',
        name: 'estimatedHours',
        message: 'Estimated hours:',
        default: 1
      }
    ]);

    const newTask = {
      id: `task_${Date.now()}`,
      name: taskName,
      description: taskDescription,
      status: 'pending',
      priority: 'medium',
      estimatedHours,
      estimatedCost: { amount: estimatedHours * 3000, currency: 'USD' }, // $30/hour default
      skills: ['general'],
      materials: [],
      tools: [],
      safetyRequirements: [],
      dependsOn: [],
      blocks: [],
      instructions: taskDescription,
      checkpoints: [],
      progress: 0,
      notes: [],
      evidence: []
    };

    project.plan.tasks.push(newTask);
    console.log(chalk.green(`Added new task: ${taskName}`));
  }
}
