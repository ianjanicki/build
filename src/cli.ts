#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { build } from './commands/build';
import { test } from './commands/test';
import { interactive } from './commands/interactive';
import { plan } from './commands/plan';
import { run } from './commands/run';
import { dev } from './commands/dev';

const program = new Command();

program
  .name('build')
  .description('Agent orchestration platform for physical world tasks')
  .version('0.1.0');

program
  .command('test')
  .description('Run automated tests')
  .action(async () => {
    try {
      await test();
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('build')
  .description('Build a project from instructions')
  .argument('[instructions]', 'Path to instructions JSON file (optional if using --interactive)')
  .option('-p, --plan', 'Generate plan only, do not execute')
  .option('-e, --execute', 'Execute the plan')
  .option('-a, --approve-all', 'Auto-approve all human approval points')
  .option('-d, --dry-run', 'Simulate execution without side effects')
  .option('-i, --interactive', 'Interactive mode - prompts for missing information')
  .action(async (instructions, options) => {
    try {
      if (options.interactive) {
        await interactive(options);
      } else {
        await build(instructions, options);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('interactive')
  .description('Start interactive project creation wizard')
  .option('-e, --execute', 'Execute the plan after creation')
  .option('-a, --approve-all', 'Auto-approve all human approval points')
  .option('-d, --dry-run', 'Simulate execution without side effects')
  .action(async (options) => {
    try {
      await interactive(options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('plan')
  .description('Create a detailed project plan')
  .argument('[project]', 'Path to existing project JSON file (optional if using --interactive)')
  .option('-i, --interactive', 'Interactive mode - prompts for project details')
  .option('-o, --output <path>', 'Output path for the plan')
  .action(async (project, options) => {
    try {
      await plan(project, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('run')
  .description('Execute a project plan')
  .argument('<plan>', 'Path to plan JSON file')
  .option('-a, --approve-all', 'Auto-approve all human approval points')
  .option('-d, --dry-run', 'Simulate execution without side effects')
  .option('-i, --interactive', 'Interactive execution - choose tasks manually')
  .option('-m, --modify', 'Allow in-flight task modifications')
  .action(async (plan, options) => {
    try {
      await run(plan, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('dev')
  .description('Start interactive development mode')
  .action(async () => {
    try {
      await dev();
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
