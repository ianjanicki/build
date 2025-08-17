import chalk from 'chalk';
import inquirer from 'inquirer';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { plan } from './plan';
import { run } from './run';
import { runEvaluations } from './eval';
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
  console.log(chalk.gray('Agent orchestration platform\n'));

  const plans = getAvailablePlans();
  
  if (plans.length === 0) {
    console.log(chalk.yellow('No plans found. Create your first plan:'));
    await plan(undefined, { interactive: true });
    return;
  }

  const choices = [
    { name: '📋 Create new plan', value: 'new' },
    ...plans.map(p => ({
      name: `[${p.status}] ${p.name}`,
      value: { plan: p, action: 'execute' }
    })),
    { name: '🧪 Run evaluations', value: 'test' }
  ];

  const { selected } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selected',
      message: 'Select action:',
      choices
    }
  ]);

  if (selected === 'new') {
    await plan(undefined, { interactive: true });
  } else if (selected === 'test') {
    await runEvaluations();
  } else {
    const { plan: selectedPlan, action } = selected;
    await executePlan(selectedPlan);
  }
}



async function executePlan(planInfo: PlanInfo) {
  console.log(chalk.blue(`\n📋 ${planInfo.name}`));
  
  if (planInfo.status === ProjectStatus.COMPLETED) {
    console.log(chalk.gray('This plan has been completed.'));
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '🔄 Restart execution', value: 'restart' },
          { name: '⬅️  Back to menu', value: 'back' }
        ]
      }
    ]);
    
    if (action === 'restart') {
      await run(planInfo.path, { approveAll: true, dryRun: false });
    }
  } else if (planInfo.status === ProjectStatus.EXECUTE) {
    console.log(chalk.yellow('⚠️  This plan is currently executing.'));
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '▶️  Continue execution', value: 'continue' },
          { name: '🔄 Restart from beginning', value: 'restart' },
          { name: '⬅️  Back to menu', value: 'back' }
        ]
      }
    ]);
    
    if (action === 'continue') {
      await run(planInfo.path, { approveAll: true, dryRun: false });
    } else if (action === 'restart') {
      await run(planInfo.path, { approveAll: true, dryRun: false });
    }
  } else {
    // PLAN status - ready to execute
    await run(planInfo.path, { approveAll: true, dryRun: false });
  }
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
