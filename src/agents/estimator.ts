import type { Project, Task, TaskPlan, Money, SkillTierPricing } from '../types';
import { Currency, RequirementLevel } from '../types';

export class Estimator {
  async estimate(taskPlan: TaskPlan, project: Project): Promise<TaskPlan> {
    const skillTiers = project.state.skillTiers;
    
    const estimatedTasks = taskPlan.tasks.map(task => ({
      ...task,
      estimatedCost: this.estimateTaskCost(task, skillTiers, project.spec.requirements),
    }));
    
    // Calculate total estimated cost
    const totalCost = estimatedTasks.reduce((sum, task) => sum + task.estimatedCost.amount, 0);
    
    return {
      ...taskPlan,
      tasks: estimatedTasks,
      estimatedCost: {
        amount: totalCost,
        currency: project.project.budget.currency,
      },
    };
  }
  
  private estimateTaskCost(task: Task, skillTiers: SkillTierPricing, projectRequirements: any[]): Money {
    // Find the highest skill level required for this task by matching against project requirements
    const taskSkillLevels = task.skills.map(skillName => {
      // Find matching requirement in project spec
      const requirement = projectRequirements.find(req => req.name === skillName);
      if (requirement) {
        return requirement.level;
      }
      
      // Fallback: infer level from skill name (less reliable)
      if (skillName.includes('basic')) return RequirementLevel.BASIC;
      if (skillName.includes('intermediate') || skillName.includes('assembly')) return RequirementLevel.INTERMEDIATE;
      if (skillName.includes('advanced') || skillName.includes('technical')) return RequirementLevel.ADVANCED;
      if (skillName.includes('expert') || skillName.includes('management')) return RequirementLevel.EXPERT;
      return RequirementLevel.INTERMEDIATE; // Default
    });
    
    // Find the highest level required
    const highestLevel = taskSkillLevels.reduce((highest, current) => {
      return current > highest ? current : highest;
    }, RequirementLevel.BASIC);
    
    // Map numeric level to skill tier key
    const skillTierKey = this.getSkillTierKey(highestLevel);
    const skillTier = skillTiers[skillTierKey];
    const hourlyRate = skillTier.amount / 100; // Convert from cents
    const totalCost = hourlyRate * task.estimatedHours;
    
    return {
      amount: Math.round(totalCost * 100), // Convert to cents
      currency: skillTier.currency,
    };
  }
  
  private getSkillTierKey(level: RequirementLevel): 'basic' | 'intermediate' | 'advanced' | 'expert' {
    switch (level) {
      case RequirementLevel.BASIC: return 'basic';
      case RequirementLevel.INTERMEDIATE: return 'intermediate';
      case RequirementLevel.ADVANCED: return 'advanced';
      case RequirementLevel.EXPERT: return 'expert';
      default: return 'intermediate';
    }
  }
}
