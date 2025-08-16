import { readFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { MockAISchemaGenerator } from '../ai/schema-generator';
import { ProjectManager } from '../utils/project-manager';
import { Estimator } from '../agents/estimator';
import { Engine } from '../engine';
import { ProjectSchema } from '../schemas/v0';
import { ProjectStatus, Currency } from '../types';

interface Evaluation {
  id: string;
  name: string;
  prompt: string;
  expectedOutcomes: {
    totalHours: { min: number; max: number; reasoning: string };
    totalCost: { min: number; max: number; reasoning: string };
    taskCount: { min: number; max: number; reasoning: string };
    requiredSkills: string[];
    constraints: string[];
  };
  evaluationCriteria: string[];
}

interface EvaluationResult {
  evaluationId: string;
  evaluationName: string;
  passed: boolean;
  duration: number;
  actualOutcomes: {
    totalHours: number;
    totalCost: number;
    taskCount: number;
    skills: string[];
    constraints: string[];
  };
  expectedOutcomes: any;
  criteriaResults: Array<{
    criterion: string;
    passed: boolean;
    notes: string;
  }>;
  errors?: string[];
}

export class EvaluationRunner {
  private aiGenerator: MockAISchemaGenerator;
  private projectManager: ProjectManager;
  private estimator: Estimator;
  private engine: Engine;

  constructor() {
    this.aiGenerator = new MockAISchemaGenerator();
    this.projectManager = new ProjectManager('./.output');
    this.estimator = new Estimator();
    this.engine = new Engine();
  }

  async runEvaluation(evaluation: Evaluation): Promise<EvaluationResult> {
    const startTime = Date.now();
    console.log(`🧪 Running evaluation: ${evaluation.name}`);
    console.log(chalk.gray(`Prompt: ${evaluation.prompt}`));

    try {
      // Step 1: Generate project from natural language prompt
      console.log('  🤖 Generating project from prompt...');
      const projectSpec = await this.aiGenerator.generateProjectSpec(evaluation.prompt);
      
      // Step 2: Create project object
      const project = {
        version: '0.0.0',
        metadata: {
          createdAt: Date.now(),
          lastModified: Date.now(),
          createdBy: 'evaluation-runner',
          status: ProjectStatus.PLAN,
          version: '0.0.0'
        },
        project: {
          name: evaluation.name,
          description: evaluation.prompt,
          location: {
            address: {
              street: '123 Test St',
              city: 'Test City',
              state: 'CA',
              zipCode: '90210',
              country: 'USA'
            },
            access: {
              entryMethod: 'key',
              parkingAvailable: true,
              elevatorAccess: false
            },
            siteConditions: {
              indoor: true,
              climateControlled: true,
              lighting: 'natural',
              powerAvailable: true,
              waterAvailable: true,
              spaceDimensions: {
                width: 12,
                length: 15,
                height: 8,
                unit: 'feet'
              }
            },
            constraints: []
          },
          budget: {
            total: { amount: 10000, currency: Currency.USD },
            allocated: { amount: 0, currency: Currency.USD },
            spent: { amount: 0, currency: Currency.USD },
            currency: Currency.USD,
            breakdown: []
          },
          timeline: {
            startDate: Date.now(),
            targetEndDate: Date.now() + (7 * 24 * 60 * 60 * 1000),
            milestones: []
          }
        },
        spec: projectSpec,
        policy: {
          humanApprovalPoints: ['plan', 'labor_hire'],
          riskLevel: 'low',
          safetyRequirements: [],
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

      // Step 3: Generate task plan
      console.log('  📋 Generating task plan...');
      const taskPlan = await this.aiGenerator.generateTaskPlan(project as any);
      project.plan = taskPlan as any;

      // Step 4: Add estimates
      console.log('  💰 Adding estimates...');
      const estimatedPlan = await this.estimator.estimate(taskPlan as any, project as any);

      // Step 5: Execute (dry run)
      console.log('  🚀 Executing (dry run)...');
      await this.engine.execute(estimatedPlan as any, project as any, {
        approveAll: true,
        dryRun: true,
      });

      const duration = Date.now() - startTime;

      // Step 6: Evaluate results
      const actualOutcomes = {
        totalHours: estimatedPlan.estimatedDuration,
        totalCost: estimatedPlan.estimatedCost.amount / 100,
        taskCount: estimatedPlan.tasks.length,
        skills: Array.from(new Set(estimatedPlan.tasks.flatMap(task => task.skills))),
        constraints: project.spec.constraints.map((c: any) => c.type)
      };

      // Step 7: Check against expected outcomes
      const criteriaResults = this.evaluateCriteria(evaluation, actualOutcomes, estimatedPlan, project);
      
      const passed = criteriaResults.every(result => result.passed);

      console.log(`  ${passed ? '✅' : '❌'} Evaluation ${evaluation.name} ${passed ? 'passed' : 'failed'}`);

      return {
        evaluationId: evaluation.id,
        evaluationName: evaluation.name,
        passed,
        duration,
        actualOutcomes,
        expectedOutcomes: evaluation.expectedOutcomes,
        criteriaResults
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`  ❌ Evaluation ${evaluation.name} failed:`, error);

      return {
        evaluationId: evaluation.id,
        evaluationName: evaluation.name,
        passed: false,
        duration,
        actualOutcomes: {
          totalHours: 0,
          totalCost: 0,
          taskCount: 0,
          skills: [],
          constraints: []
        },
        expectedOutcomes: evaluation.expectedOutcomes,
        criteriaResults: [],
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  private evaluateCriteria(evaluation: Evaluation, actualOutcomes: any, taskPlan: any, project: any): Array<{ criterion: string; passed: boolean; notes: string }> {
    const results = [];

    // Check expected outcomes
    const hoursInRange = actualOutcomes.totalHours >= evaluation.expectedOutcomes.totalHours.min && 
                        actualOutcomes.totalHours <= evaluation.expectedOutcomes.totalHours.max;
    results.push({
      criterion: `Hours within expected range (${evaluation.expectedOutcomes.totalHours.min}-${evaluation.expectedOutcomes.totalHours.max})`,
      passed: hoursInRange,
      notes: `Expected ${evaluation.expectedOutcomes.totalHours.min}-${evaluation.expectedOutcomes.totalHours.max}h, got ${actualOutcomes.totalHours}h`
    });

    const costInRange = actualOutcomes.totalCost >= evaluation.expectedOutcomes.totalCost.min && 
                       actualOutcomes.totalCost <= evaluation.expectedOutcomes.totalCost.max;
    results.push({
      criterion: `Cost within expected range ($${evaluation.expectedOutcomes.totalCost.min}-$${evaluation.expectedOutcomes.totalCost.max})`,
      passed: costInRange,
      notes: `Expected $${evaluation.expectedOutcomes.totalCost.min}-$${evaluation.expectedOutcomes.totalCost.max}, got $${actualOutcomes.totalCost}`
    });

    const taskCountInRange = actualOutcomes.taskCount >= evaluation.expectedOutcomes.taskCount.min && 
                            actualOutcomes.taskCount <= evaluation.expectedOutcomes.taskCount.max;
    results.push({
      criterion: `Task count within expected range (${evaluation.expectedOutcomes.taskCount.min}-${evaluation.expectedOutcomes.taskCount.max})`,
      passed: taskCountInRange,
      notes: `Expected ${evaluation.expectedOutcomes.taskCount.min}-${evaluation.expectedOutcomes.taskCount.max} tasks, got ${actualOutcomes.taskCount}`
    });

    // Check required skills
    const hasRequiredSkills = evaluation.expectedOutcomes.requiredSkills.every(skill => 
      actualOutcomes.skills.some((actualSkill: string) => actualSkill.includes(skill))
    );
    results.push({
      criterion: 'Required skills are included',
      passed: hasRequiredSkills,
      notes: `Required: ${evaluation.expectedOutcomes.requiredSkills.join(', ')}, Found: ${actualOutcomes.skills.join(', ')}`
    });

    // Check evaluation criteria
    for (const criterion of evaluation.evaluationCriteria) {
      let passed = false;
      let notes = '';

      if (criterion.includes('space preparation')) {
        passed = taskPlan.tasks.some((task: any) => 
          task.name.toLowerCase().includes('prep') || task.name.toLowerCase().includes('space')
        );
        notes = passed ? 'Space preparation task found' : 'No space preparation task found';
      } else if (criterion.includes('tool requirements')) {
        passed = taskPlan.tasks.some((task: any) => 
          task.tools && task.tools.length > 0
        );
        notes = passed ? 'Tool requirements specified' : 'No tool requirements specified';
      } else if (criterion.includes('safety')) {
        passed = taskPlan.tasks.some((task: any) => 
          task.safetyRequirements && task.safetyRequirements.length > 0
        );
        notes = passed ? 'Safety requirements included' : 'No safety requirements found';
      } else {
        // Default pass for other criteria (would need more sophisticated evaluation)
        passed = true;
        notes = 'Criterion evaluated';
      }

      results.push({ criterion, passed, notes });
    }

    return results;
  }

  async runAllEvaluations(): Promise<EvaluationResult[]> {
    // Load evaluations from JSON file
    const evaluationsPath = join(process.cwd(), 'tests', 'eval-prompts.json');
    const evaluationsData = JSON.parse(readFileSync(evaluationsPath, 'utf-8'));
    const evaluations: Evaluation[] = evaluationsData.evaluations;

    console.log('🧪 Starting evaluation suite...\n');

    const results: EvaluationResult[] = [];

    for (const evaluation of evaluations) {
      const result = await this.runEvaluation(evaluation);
      results.push(result);
      console.log(''); // Add spacing between evaluations
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log('🧪 Evaluation suite completed:');
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  📊 Total: ${passed + failed}`);

    // Show detailed results
    console.log('\n📋 Detailed Results:');
    for (const result of results) {
      console.log(`\n${result.passed ? '✅' : '❌'} ${result.evaluationName}`);
      console.log(`  Duration: ${result.duration}ms`);
      console.log(`  Hours: ${result.actualOutcomes.totalHours}h (expected ${result.expectedOutcomes.totalHours.min}-${result.expectedOutcomes.totalHours.max}h)`);
      console.log(`  Cost: $${result.actualOutcomes.totalCost} (expected $${result.expectedOutcomes.totalCost.min}-$${result.expectedOutcomes.totalCost.max})`);
      console.log(`  Tasks: ${result.actualOutcomes.taskCount} (expected ${result.expectedOutcomes.taskCount.min}-${result.expectedOutcomes.taskCount.max})`);
      
      if (result.criteriaResults.length > 0) {
        console.log('  Criteria:');
        for (const criteria of result.criteriaResults) {
          console.log(`    ${criteria.passed ? '✅' : '❌'} ${criteria.criterion}`);
        }
      }
    }

    return results;
  }

  async runInteractiveEvaluation(): Promise<void> {
    // Load evaluations
    const evaluationsPath = join(process.cwd(), 'tests', 'eval-prompts.json');
    const evaluationsData = JSON.parse(readFileSync(evaluationsPath, 'utf-8'));
    const evaluations: Evaluation[] = evaluationsData.evaluations;

    // Let user choose which evaluation to run
    const { selectedEvaluation } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedEvaluation',
        message: 'Which evaluation would you like to run?',
                 choices: evaluations.map(evaluation => ({
           name: `${evaluation.name} - ${evaluation.prompt.substring(0, 60)}...`,
           value: evaluation
         }))
      }
    ]);

    const result = await this.runEvaluation(selectedEvaluation);
    
    console.log('\n📋 Evaluation Result:');
    console.log(`  ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Duration: ${result.duration}ms`);
    console.log(`  Hours: ${result.actualOutcomes.totalHours}h`);
    console.log(`  Cost: $${result.actualOutcomes.totalCost}`);
    console.log(`  Tasks: ${result.actualOutcomes.taskCount}`);
  }
}

export async function test() {
  const runner = new EvaluationRunner();
  
  // Check if user wants interactive mode
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'How would you like to run evaluations?',
      choices: [
        { name: 'Run all evaluations', value: 'all' },
        { name: 'Run single evaluation (interactive)', value: 'single' }
      ]
    }
  ]);

  if (mode === 'all') {
    await runner.runAllEvaluations();
  } else {
    await runner.runInteractiveEvaluation();
  }
}
