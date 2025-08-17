import chalk from 'chalk';
import inquirer from 'inquirer';
import { readdirSync, readFileSync, rmSync } from 'fs';
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
    { name: '🧪 Run evaluations', value: 'test' },
    { name: '🧹 Clean output files', value: 'clean' }
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
  } else if (selected === 'clean') {
    rmSync(join(process.cwd(), '.output'), { recursive: true, force: true });
    console.log(chalk.green('🧹 Cleaned output directory'));
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
  
  try {
    if (!readdirSync(outputDir)) {
      return [];
    }
  } catch (error) {
    // Directory doesn't exist, return empty array
    return [];
  }
  
  const plans: PlanInfo[] = [];
  
  try {
    const projectDirs = readdirSync(outputDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const dir of projectDirs) {
      const projectPath = join(outputDir, dir, 'project.json');
      try {
        const content = readFileSync(projectPath, 'utf-8');
        const data = JSON.parse(content);
        
        plans.push({
          name: data.project.name,
          path: projectPath,
          status: data.state.currentPhase,
          lastModified: data.metadata.lastModified,
          description: data.project.description
        });
      } catch (error) {
        // Skip invalid project files
        continue;
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
    return [];
  }
  
  return plans.sort((a, b) => b.lastModified - a.lastModified);
}
