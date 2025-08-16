import chalk from 'chalk';
import inquirer from 'inquirer';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { plan } from './plan';
import { run } from './run';
import { test } from './test';
import { ProjectStatus } from '../types';

interface PlanInfo {
  name: string;
  path: string;
  status: ProjectStatus;
  lastModified: number;
  description: string;
}

export async function dev() {
  console.log(chalk.blue('🏗️  Build Agent'));
  console.log(chalk.gray('Agent orchestration platform for physical world tasks\n'));

  const plans = getAvailablePlans();
  
  if (plans.length === 0) {
    console.log(chalk.yellow('No plans found. Create your first plan:'));
    await plan(undefined, { interactive: true });
    return;
  }

  const choices = [
    { name: '📋 Create new plan', value: 'new' },
    ...plans.map(p => ({
      name: `[${p.status}] ${p.name} - ${p.description}`,
      value: { plan: p, action: 'execute' }
    })),
    { name: '🧪 Run evaluations', value: 'test' }
  ];

  const { selected } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selected',
      message: 'Select a plan or action:',
      choices
    }
  ]);

  if (selected === 'new') {
    await plan(undefined, { interactive: true });
  } else if (selected === 'test') {
    await test();
  } else {
    const { plan: selectedPlan, action } = selected;
    await executePlan(selectedPlan);
  }
}



async function executePlan(planInfo: PlanInfo) {
  console.log(chalk.blue(`\n🚀 Executing: ${planInfo.name}`));
  
  // Handle different plan statuses
  if (planInfo.status === ProjectStatus.EXECUTE) {
    console.log(chalk.yellow('⚠️  Plan is currently in progress.'));
    const { shouldContinue } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldContinue',
        message: 'Continue from where left off?',
        default: true
      }
    ]);
    if (!shouldContinue) return;
  }
  
  if (planInfo.status === ProjectStatus.COMPLETED) {
    const { restartType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'restartType',
        message: 'Plan is completed. How to proceed?',
        choices: [
          { name: 'Start from beginning (reset progress)', value: 'beginning' },
          { name: 'Continue from where left off', value: 'continue' },
          { name: 'Cancel', value: 'cancel' }
        ]
      }
    ]);
    
    if (restartType === 'cancel') return;
    if (restartType === 'beginning') {
      try {
        const planData = JSON.parse(readFileSync(planInfo.path, 'utf-8'));
        planData.state.currentPhase = ProjectStatus.PLAN;
        planData.state.completedTasks = [];
        planData.state.executionLog = [];
        
        const fs = await import('fs');
        fs.writeFileSync(planInfo.path, JSON.stringify(planData, null, 2));
        console.log(chalk.green('Plan reset to beginning.'));
      } catch (error) {
        console.error(chalk.red('Failed to reset plan:', error));
        return;
      }
    }
  }
  
  const { options } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'options',
      message: 'Execution options:',
      choices: [
        { name: 'Dry run (no side effects)', value: 'dryRun' },
        { name: 'Interactive mode (choose tasks manually)', value: 'interactive' },
        { name: 'Allow in-flight modifications', value: 'modify' },
        { name: 'Auto-approve all decisions', value: 'approveAll' }
      ]
    }
  ]);

  const runOptions = {
    dryRun: options.includes('dryRun'),
    interactive: options.includes('interactive'),
    modify: options.includes('modify'),
    approveAll: options.includes('approveAll')
  };

  await run(planInfo.path, runOptions);
}



function getAvailablePlans(): PlanInfo[] {
  const outputDir = join(process.cwd(), '.output');
  
  if (!readdirSync(outputDir, { withFileTypes: true }).some(d => d.isDirectory())) {
    return [];
  }

  const plans: PlanInfo[] = [];

  try {
    const projectDirs = readdirSync(outputDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const dir of projectDirs) {
      const projectPath = join(outputDir, dir, 'project.json');
      
      try {
        const projectData = JSON.parse(readFileSync(projectPath, 'utf-8'));
        
        plans.push({
          name: projectData.project.name,
          path: projectPath,
          status: projectData.state.currentPhase,
          lastModified: projectData.metadata.lastModified,
          description: projectData.project.description.substring(0, 50) + '...'
        });
      } catch (error) {
        // Skip invalid project files
        console.warn(chalk.yellow(`Warning: Invalid project file in ${dir}`));
      }
    }

    // Sort by last modified (newest first)
    return plans.sort((a, b) => b.lastModified - a.lastModified);
  } catch (error) {
    console.error(chalk.red('Error reading plans:', error));
    return [];
  }
}
