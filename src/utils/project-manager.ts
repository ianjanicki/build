import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export class ProjectManager {
  private outputDir: string;
  
  constructor(outputDir: string = './.output') {
    this.outputDir = outputDir;
  }
  
  createProjectDirectory(projectName: string): string {
    // Sanitize project name for filesystem
    const sanitizedName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    const projectDir = join(this.outputDir, sanitizedName);
    
    if (!existsSync(projectDir)) {
      mkdirSync(projectDir, { recursive: true });
    }
    
    return projectDir;
  }
  
  saveProjectSchema(projectDir: string, project: any): string {
    const projectPath = join(projectDir, 'project.json');
    writeFileSync(projectPath, JSON.stringify(project, null, 2));
    return projectPath;
  }
  
  saveExecutionLog(projectDir: string, log: any): string {
    const logPath = join(projectDir, 'execution-log.json');
    const logData = {
      ...log,
      completedAt: new Date().toISOString(),
    };
    
    writeFileSync(logPath, JSON.stringify(logData, null, 2));
    return logPath;
  }
}
