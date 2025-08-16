import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export class VersionManager {
  private static readonly TYPES_DIR = join(process.cwd(), 'types');
  
  /**
   * Get the latest version from the types directory
   */
  static getLatestVersion(): string {
    try {
      const versions = readdirSync(this.TYPES_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .filter(name => /^\d+\.\d+\.\d+$/.test(name)) // Only semantic versions
        .sort((a, b) => {
          const aParts = a.split('.').map(Number);
          const bParts = b.split('.').map(Number);
          
          for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aPart = aParts[i] || 0;
            const bPart = bParts[i] || 0;
            if (aPart !== bPart) {
              return bPart - aPart; // Descending order
            }
          }
          return 0;
        });
      
      if (versions.length === 0) {
        throw new Error('No version directories found in types/');
      }
      
      return versions[0]; // Latest version
    } catch (error) {
      console.warn('Could not determine latest version, using 0.0.0 as fallback');
      return '0.0.0';
    }
  }
  
  /**
   * Get the schema for a specific version
   */
  static getSchemaForVersion(version: string): any {
    try {
      const schemaPath = join(this.TYPES_DIR, version, 'index.d.ts');
      // Note: In a real implementation, we'd need to parse the .d.ts file
      // For now, we'll return the version string
      return { version };
    } catch (error) {
      throw new Error(`Schema not found for version ${version}`);
    }
  }
  
  /**
   * Validate that a version exists
   */
  static isValidVersion(version: string): boolean {
    try {
      const versionDir = join(this.TYPES_DIR, version);
      const indexFile = join(versionDir, 'index.d.ts');
      return require('fs').existsSync(indexFile);
    } catch {
      return false;
    }
  }
}
