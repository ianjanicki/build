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
  
  // Start execution with async state machine
  console.log(chalk.blue('🚀 Starting async execution...\n'));
  
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
  async executeAsync(project: any, options: { approveAll?: boolean; dryRun?: boolean; interactive?: boolean; modify?: boolean }): Promise<void> {
    console.log(chalk.blue('🔄 Initializing async execution engine...'));
    
    // Update project state to EXECUTE
    project.state.currentPhase = 'EXECUTE';
    project.metadata.lastModified = Date.now();
    
    // Track execution state
    const executionState = {
      currentTaskIndex: 0,
      completedTasks: new Set<string>(),
      blockedTasks: new Set<string>(),
      pendingApprovals: new Set<string>(),
      executionLog: [] as any[]
    };
    
    // Show initial state
    console.log(chalk.cyan('\n📊 Execution State:'));
    console.log(chalk.gray(`   Phase: ${project.state.currentPhase}`));
    console.log(chalk.gray(`   Tasks: ${project.plan.tasks.length} total`));
    console.log(chalk.gray(`   Ready: ${this.getReadyTasks(project.plan, executionState.completedTasks).length}`));
    console.log(chalk.gray(`   Blocked: ${executionState.blockedTasks.size}`));
    
    // Main execution loop
    while (executionState.completedTasks.size < project.plan.tasks.length) {
      const readyTasks = this.getReadyTasks(project.plan, executionState.completedTasks);
      
      if (readyTasks.length === 0) {
        console.log(chalk.red('\n❌ No tasks ready to execute. Possible circular dependency.'));
        break;
      }
      
      // Show current execution state
      console.log(chalk.blue(`\n🔄 Execution Round ${Math.floor(executionState.completedTasks.size / readyTasks.length) + 1}`));
      console.log(chalk.gray(`   Completed: ${executionState.completedTasks.size}/${project.plan.tasks.length}`));
      console.log(chalk.gray(`   Ready: ${readyTasks.length} tasks`));
      
      // Execute ready tasks
      for (const task of readyTasks) {
        await this.executeTaskWithAsyncFlow(task, project, executionState, options);
      }
      
      // Check for approval points
      await this.checkApprovalPoints(project, executionState, options);
      
      // Small delay to show async nature
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Final state update
    project.state.currentPhase = 'COMPLETED';
    project.state.completedTasks = Array.from(executionState.completedTasks);
    project.metadata.lastModified = Date.now();
    
    console.log(chalk.green('\n✅ Async execution completed!'));
    console.log(chalk.cyan(`   Final Status: ${project.state.currentPhase}`));
    console.log(chalk.cyan(`   Tasks Completed: ${executionState.completedTasks.size}`));
    console.log(chalk.cyan(`   Execution Log Entries: ${executionState.executionLog.length}`));
  }
  
  private async executeTaskWithAsyncFlow(task: any, project: any, executionState: any, options: any): Promise<void> {
    console.log(chalk.cyan(`\n🔄 Executing: ${task.name}`));
    console.log(chalk.gray(`   Status: ${task.status}`));
    console.log(chalk.gray(`   Priority: ${task.priority}`));
    console.log(chalk.gray(`   Dependencies: ${task.dependsOn.length > 0 ? task.dependsOn.join(', ') : 'None'}`));
    
    // Check if task requires approval
    if (this.requiresApproval(task, project) && !options.approveAll) {
      console.log(chalk.yellow(`   ⏸️  Task requires approval`));
      
      const { approved } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'approved',
          message: `Approve execution of "${task.name}"?`,
          default: true
        }
      ]);
      
      if (!approved) {
        console.log(chalk.yellow(`   ❌ Task execution cancelled by user`));
        executionState.blockedTasks.add(task.id);
        return;
      }
    }
    
    // Show task details
    console.log(chalk.gray(`   Estimated: ${task.estimatedHours}h, $${(task.estimatedCost.amount / 100).toFixed(2)}`));
    console.log(chalk.gray(`   Skills: ${task.skills.join(', ')}`));
    
    // Simulate async execution with spinner
    const spinner = this.createSpinner(`Executing ${task.name}...`);
    spinner.start();
    
    try {
      // Simulate task execution time
      const executionTime = Math.min(task.estimatedHours * 1000, 3000); // Max 3 seconds for demo
      await new Promise(resolve => setTimeout(resolve, executionTime));
      
      // Execute the actual task
      await this.executeTask(task, project, options);
      
      spinner.succeed(`✅ ${task.name} completed`);
      
      // Update execution state
      executionState.completedTasks.add(task.id);
      task.status = 'completed';
      task.endTime = Date.now();
      
      // Log execution
      executionState.executionLog.push({
        timestamp: Date.now(),
        taskId: task.id,
        action: 'completed',
        duration: task.endTime - (task.startTime || Date.now())
      });
      
      // Show task completion details
      console.log(chalk.gray(`   Duration: ${((task.endTime - (task.startTime || Date.now())) / 1000).toFixed(1)}s`));
      console.log(chalk.gray(`   Progress: ${executionState.completedTasks.size}/${project.plan.tasks.length} tasks completed`));
      
    } catch (error) {
      spinner.fail(`❌ ${task.name} failed`);
      console.log(chalk.red(`   Error: ${error}`));
      task.status = 'failed';
      executionState.blockedTasks.add(task.id);
    }
  }
  
  private async checkApprovalPoints(project: any, executionState: any, options: any): Promise<void> {
    const approvalPoints = project.policy.humanApprovalPoints;
    
    for (const approvalPoint of approvalPoints) {
      if (executionState.pendingApprovals.has(approvalPoint)) {
        continue; // Already handled
      }
      
      // Check if this approval point should be triggered
      if (this.shouldTriggerApproval(approvalPoint, project, executionState)) {
        console.log(chalk.yellow(`\n⚠️  Approval Point: ${approvalPoint}`));
        
        if (!options.approveAll) {
          const { approved } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'approved',
              message: `Approve ${approvalPoint}?`,
              default: true
            }
          ]);
          
          if (!approved) {
            console.log(chalk.yellow(`   ❌ ${approvalPoint} rejected by user`));
            // Handle rejection - could pause execution or modify plan
            return;
          }
        }
        
        console.log(chalk.green(`   ✅ ${approvalPoint} approved`));
        executionState.pendingApprovals.add(approvalPoint);
        
        // Log approval
        executionState.executionLog.push({
          timestamp: Date.now(),
          action: 'approval',
          approvalPoint,
          approved: true
        });
      }
    }
  }
  
  private requiresApproval(task: any, project: any): boolean {
    // Check if task requires specific approval
    return task.priority === 'critical' || 
           task.estimatedCost.amount > 5000 || // High cost tasks
           task.skills.includes('specialized');
  }
  
  private shouldTriggerApproval(approvalPoint: string, project: any, executionState: any): boolean {
    // Logic to determine when approval points should be triggered
    switch (approvalPoint) {
      case 'plan':
        return executionState.completedTasks.size === 0; // At start
      case 'labor_hire':
        return project.plan.tasks.some((t: any) => 
          t.skills.includes('labor') && !executionState.completedTasks.has(t.id)
        );
      default:
        return false;
    }
  }
  
  private createSpinner(text: string): any {
    // Simple spinner implementation
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    let interval: NodeJS.Timeout | null = null;
    
    const spinner = {
      start: () => {
        interval = setInterval(() => {
          process.stdout.write(`\r${frames[i]} ${text}`);
          i = (i + 1) % frames.length;
        }, 80);
      },
      succeed: (message: string) => {
        if (interval) clearInterval(interval);
        process.stdout.write(`\r${message}\n`);
      },
      fail: (message: string) => {
        if (interval) clearInterval(interval);
        process.stdout.write(`\r${message}\n`);
      }
    };
    
    return spinner;
  }
}
