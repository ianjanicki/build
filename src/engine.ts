import chalk from 'chalk';
import { type Project, type TaskPlan, type Task } from './types';
import { MockLaborAdapter } from '../tests/mock-labor-adapter';

interface ExecutionOptions {
  approveAll: boolean;
  dryRun: boolean;
}

export class Engine {
  private laborAdapter: MockLaborAdapter;
  
  constructor() {
    this.laborAdapter = new MockLaborAdapter();
  }
  
  async execute(taskPlan: TaskPlan, project: Project, options: ExecutionOptions): Promise<void> {
    console.log(chalk.blue('🔧 Starting execution engine...'));
    
    if (options.dryRun) {
      console.log(chalk.yellow('🧪 DRY RUN MODE - No side effects will be performed'));
    }
    
    // Check for human approval requirements
    if (project.policy.humanApprovalPoints.includes('labor_hire') && !options.approveAll) {
      console.log(chalk.yellow('⏸️  Human approval required for labor hire'));
      console.log(chalk.white('Use --approve-all to auto-approve or implement approval flow'));
      return;
    }
    
    // Execute tasks in dependency order
    const executedTasks = new Set<string>();
    const taskMap = new Map(taskPlan.tasks.map(task => [task.id, task]));
    
    while (executedTasks.size < taskPlan.tasks.length) {
      const readyTasks = this.getReadyTasks(taskPlan, executedTasks);
      
      if (readyTasks.length === 0) {
        console.log(chalk.red('❌ Circular dependency detected in task graph'));
        return;
      }
      
      for (const task of readyTasks) {
        await this.executeTask(task, project, options);
        executedTasks.add(task.id);
      }
    }
    
    console.log(chalk.green('✅ All tasks completed successfully!'));
  }
  
  private getReadyTasks(taskPlan: TaskPlan, executedTasks: Set<string>): Task[] {
    return taskPlan.tasks.filter(task => {
      // Task is ready if all dependencies are executed
      return !executedTasks.has(task.id) && 
             task.dependsOn.every(dep => executedTasks.has(dep));
    });
  }
  
  private async executeTask(task: Task, project: Project, options: ExecutionOptions): Promise<void> {
    console.log(chalk.cyan(`\n🔄 Executing: ${task.name}`));
    console.log(chalk.gray(`   ${task.description}`));
    
    if (options.dryRun) {
      console.log(chalk.gray(`   [DRY RUN] Would execute task: ${task.id}`));
      return;
    }
    
    // Simulate task execution with mock adapters
    if (task.skills.includes('assembly') || task.skills.includes('basic_tools')) {
      // This would be a labor task
      await this.executeLaborTask(task, project);
    } else {
      // This would be a preparation or verification task
      await this.executePreparationTask(task);
    }
    
    console.log(chalk.green(`   ✅ Completed: ${task.name}`));
  }
  
  private async executeLaborTask(task: Task, project: Project): Promise<void> {
    console.log(chalk.blue(`   📞 Posting job to labor marketplace...`));
    
    const jobDescription = `${task.description}\n\nProject: ${project.project.name}\nLocation: ${project.project.location.address.street}\nEstimated hours: ${task.estimatedHours}h\nBudget: $${task.estimatedCost?.amount || 0}`;
    
    const jobId = await this.laborAdapter.postJob(jobDescription, []);
    console.log(chalk.gray(`   Job posted with ID: ${jobId}`));
    
    // Simulate getting bids
    const bids = await this.laborAdapter.listBids(jobId);
    console.log(chalk.gray(`   Received ${bids.length} bids`));
    
    if (bids.length > 0) {
      // Select the best bid (lowest price for now)
      const bestBid = bids.reduce((best, current) => 
        current.price.amount < best.price.amount ? current : best
      );
      
      console.log(chalk.blue(`   📋 Selected bid from ${bestBid.provider} for $${bestBid.price.amount}`));
      
      await this.laborAdapter.acceptBid(jobId, bestBid.provider);
      console.log(chalk.gray(`   Bid accepted`));
      
      // Simulate task completion
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work time
      
      await this.laborAdapter.markDone(jobId, {
        photos: ['mock_photo_1.jpg', 'mock_photo_2.jpg'],
        notes: 'Task completed successfully',
      });
      console.log(chalk.gray(`   Task marked as complete`));
    }
  }
  
  private async executePreparationTask(task: Task): Promise<void> {
    // Simulate preparation/verification tasks
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate work time
    console.log(chalk.gray(`   Task completed`));
  }
}
