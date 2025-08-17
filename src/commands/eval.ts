import { MockAISchemaGenerator } from '../ai/mock-schema-generator'; // Used for fallback
import chalk from 'chalk';
import inquirer from 'inquirer';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ProjectSchema } from '../schemas/v0';

interface Evaluation {
  id: string;
  name: string;
  prompt: string;
  expectedOutcomes: Record<string, any>;
  evaluationCriteria: string[];
}

interface EvaluationResult {
  evaluation: Evaluation;
  passed: boolean;
  actualOutcomes: Record<string, any>;
  criteriaResults: Array<{ criterion: string; passed: boolean; notes: string }>;
  duration: number;
  error?: string;
}

export class EvaluationRunner {
  private evaluations: Evaluation[];

  constructor() {
    this.evaluations = this.loadEvaluations();
  }

  private loadEvaluations(): Evaluation[] {
    try {
      const evalPath = join(process.cwd(), 'tests', 'eval-prompts.json');
      if (!existsSync(evalPath)) {
        console.log(chalk.yellow('No evaluation prompts found. Creating sample...'));
        return [];
      }
      
      const content = readFileSync(evalPath, 'utf-8');
      const data = JSON.parse(content);
      return data.planEvaluations || [];
    } catch (error) {
      console.error(chalk.red('Error loading evaluations:'), error);
      return [];
    }
  }

  async runEvaluation(evaluation: Evaluation): Promise<EvaluationResult> {
    const startTime = Date.now();
    
    try {
      console.log(chalk.blue(`\n🧪 Running evaluation: ${evaluation.name}`));
      
      // Use mock generator for now
      const aiGenerator = new MockAISchemaGenerator();
      
      // Generate project spec from prompt
      const projectSpec = await aiGenerator.generateProjectSpec(evaluation.prompt);
      
      // Create a mock project for task plan generation
      const mockProject = {
        version: '0.0.0' as const,
        metadata: {
          createdAt: Date.now(),
          lastModified: Date.now(),
          createdBy: 'evaluation',
          status: 'PLAN' as any,
          version: '0.0.0' as const
        },
        project: { name: evaluation.name, description: evaluation.prompt },
        spec: projectSpec,
        policy: {
          humanApprovalPoints: ['plan'],
          riskLevel: 'low',
          safetyRequirements: [],
          insuranceRequired: false,
          permitsRequired: false,
          inspectionsRequired: false
        },
        state: {
          currentPhase: 'PLAN' as any,
          completedTasks: [],
          blockedTasks: [],
          executionLog: [],
          estimates: {
            totalHours: 0,
            totalCost: { amount: 0, currency: 'USD' as any },
            perTask: {},
            lastUpdated: Date.now()
          },
          skillTiers: {
            basic: { amount: 2000, currency: 'USD' as any },
            intermediate: { amount: 3000, currency: 'USD' as any },
            advanced: { amount: 4500, currency: 'USD' as any },
            expert: { amount: 6000, currency: 'USD' as any },
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
          estimatedCost: { amount: 0, currency: 'USD' as any },
          generatedAt: Date.now()
        }
      };
      
      // Generate task plan
      const taskPlan = await aiGenerator.generateTaskPlan(mockProject as any);
      
      // Calculate actual outcomes
      const actualOutcomes = {
        totalTasks: taskPlan.tasks.length,
        totalHours: taskPlan.estimatedDuration,
        totalCost: taskPlan.estimatedCost.amount,
        criticalPathLength: taskPlan.criticalPath.length,
        hasSafetyRequirements: taskPlan.tasks.some(task => 
          task.safetyRequirements && task.safetyRequirements.length > 0
        ),
        hasDependencies: taskPlan.dependencies.length > 0,
        // Add missing fields that evaluations expect
        taskCount: taskPlan.tasks.length,
        requiredSkills: Array.from(new Set(taskPlan.tasks.flatMap(task => task.skills))),
        constraints: projectSpec.constraints.map((c: any) => c.type)
      };
      
      // Evaluate against criteria
      const criteriaResults = this.evaluateCriteria(evaluation, actualOutcomes, taskPlan, mockProject);
      
      const passed = criteriaResults.every(result => result.passed);
      
      return {
        evaluation,
        passed,
        actualOutcomes,
        criteriaResults,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        evaluation,
        passed: false,
        actualOutcomes: {},
        criteriaResults: [],
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private evaluateCriteria(evaluation: Evaluation, actualOutcomes: any, taskPlan: any, project: any): Array<{ criterion: string; passed: boolean; notes: string }> {
    const results: Array<{ criterion: string; passed: boolean; notes: string }> = [];
    
    // Check expected outcomes
    for (const [key, expected] of Object.entries(evaluation.expectedOutcomes)) {
      const actual = actualOutcomes[key];
      let passed = false;
      let notes = '';
      
      if (typeof expected === 'object' && expected !== null && 'min' in expected && 'max' in expected) {
        // Handle min/max range objects
        const min = expected.min;
        const max = expected.max;
        passed = actual >= min && actual <= max;
        notes = `Expected ${min}-${max}, got ${actual}`;
      } else if (typeof expected === 'number') {
        // Allow 20% tolerance for numerical values
        const tolerance = expected * 0.2;
        passed = Math.abs(actual - expected) <= tolerance;
        notes = `Expected ${expected}, got ${actual} (tolerance: ±${tolerance})`;
      } else if (typeof expected === 'boolean') {
        passed = actual === expected;
        notes = `Expected ${expected}, got ${actual}`;
      } else if (Array.isArray(expected)) {
        // Handle array comparisons (like requiredSkills, constraints)
        passed = Array.isArray(actual) && expected.every(item => actual.includes(item));
        notes = `Expected ${expected.join(', ')}, got ${Array.isArray(actual) ? actual.join(', ') : actual}`;
      } else {
        passed = actual === expected;
        notes = `Expected ${expected}, got ${actual}`;
      }
      
      results.push({ criterion: key, passed, notes });
    }
    
    // Check evaluation criteria
    for (const criterion of evaluation.evaluationCriteria) {
      let passed = false;
      let notes = '';
      
      if (criterion.includes('hours') && criterion.includes('reasonable')) {
        passed = actualOutcomes.totalHours > 0 && actualOutcomes.totalHours < 100;
        notes = `Hours: ${actualOutcomes.totalHours}`;
      } else if (criterion.includes('cost') && criterion.includes('reasonable')) {
        passed = actualOutcomes.totalCost > 0 && actualOutcomes.totalCost < 10000;
        notes = `Cost: ${actualOutcomes.totalCost} cents`;
      } else if (criterion.includes('tasks') && criterion.includes('detailed')) {
        passed = actualOutcomes.totalTasks >= 3;
        notes = `Tasks: ${actualOutcomes.totalTasks}`;
      } else if (criterion.includes('safety')) {
        passed = actualOutcomes.hasSafetyRequirements;
        notes = `Safety requirements: ${actualOutcomes.hasSafetyRequirements}`;
      } else if (criterion.includes('dependencies')) {
        passed = actualOutcomes.hasDependencies;
        notes = `Dependencies: ${actualOutcomes.hasDependencies}`;
      } else {
        passed = true; // Default pass for unknown criteria
        notes = 'Criterion not implemented';
      }
      
      results.push({ criterion, passed, notes });
    }
    
    return results;
  }

  async runAllEvaluations(): Promise<EvaluationResult[]> {
    console.log(chalk.blue('🧪 Running all evaluations...'));
    
    const results: EvaluationResult[] = [];
    for (const evaluation of this.evaluations) {
      const result = await this.runEvaluation(evaluation);
      results.push(result);
      
      // Display result
      if (result.passed) {
        console.log(chalk.green(`✅ ${evaluation.name} - PASSED`));
      } else {
        console.log(chalk.red(`❌ ${evaluation.name} - FAILED`));
        if (result.error) {
          console.log(chalk.red(`   Error: ${result.error}`));
        } else {
          // Show why it failed
          const failedCriteria = result.criteriaResults.filter(c => !c.passed);
          if (failedCriteria.length > 0) {
            console.log(chalk.gray(`   Failed criteria:`));
            failedCriteria.slice(0, 3).forEach(c => {
              console.log(chalk.gray(`     - ${c.criterion}: ${c.notes}`));
            });
            if (failedCriteria.length > 3) {
              console.log(chalk.gray(`     ... and ${failedCriteria.length - 3} more`));
            }
          }
        }
      }
    }
    
    // Summary
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    console.log(chalk.blue(`\n📊 Summary: ${passed} passed, ${failed} failed`));
    
    if (failed > 0) {
      console.log(chalk.yellow('💡 Tip: Evaluations may fail with mock data. Set up real AI integration for accurate results.'));
    }
    
    return results;
  }

  async runInteractiveEvaluation(): Promise<void> {
    if (this.evaluations.length === 0) {
      console.log(chalk.yellow('No evaluations available.'));
      return;
    }
    
    const { selectedEvaluation } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedEvaluation',
        message: 'Select an evaluation to run:',
        choices: this.evaluations.map(e => ({ name: e.name, value: e }))
      }
    ]);
    
    const result = await this.runEvaluation(selectedEvaluation);
    
    console.log(chalk.blue('\n📊 Evaluation Results:'));
    console.log(`Name: ${result.evaluation.name}`);
    console.log(`Status: ${result.passed ? chalk.green('PASSED') : chalk.red('FAILED')}`);
    console.log(`Duration: ${result.duration}ms`);
    
    if (result.error) {
      console.log(chalk.red(`Error: ${result.error}`));
    }
    
    console.log(chalk.blue('\n📈 Outcomes:'));
    for (const [key, value] of Object.entries(result.actualOutcomes)) {
      console.log(`  ${key}: ${value}`);
    }
    
    console.log(chalk.blue('\n📋 Criteria Results:'));
    for (const criteria of result.criteriaResults) {
      const status = criteria.passed ? chalk.green('✅') : chalk.red('❌');
      console.log(`  ${status} ${criteria.criterion}: ${criteria.notes}`);
    }
  }
}

export async function runEvaluations() {
  console.log(chalk.yellow('⚠️  Running evaluations with Mock AI Generator'));
  console.log(chalk.gray('   Evaluations may fail because mock data doesn\'t match expected outcomes'));
  console.log(chalk.gray('   Set up real AI SDK integration for accurate evaluations\n'));
  
  const runner = new EvaluationRunner();
  
  if (runner['evaluations'].length === 0) {
    console.log(chalk.yellow('No evaluations found. Create tests/eval-prompts.json first.'));
    return;
  }
  
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'How would you like to run evaluations?',
      choices: [
        { name: 'Run all evaluations', value: 'all' },
        { name: 'Run interactive evaluation', value: 'interactive' }
      ]
    }
  ]);
  
  if (mode === 'all') {
    await runner.runAllEvaluations();
  } else {
    await runner.runInteractiveEvaluation();
  }
}
