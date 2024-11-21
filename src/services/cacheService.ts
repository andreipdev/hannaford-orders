import fs from 'fs';
import path from 'path';

export class CacheService {
  private cacheDir: string;

  constructor() {
    this.cacheDir = path.join(process.cwd(), '.cache');
    this.ensureCacheDirectory();
  }

  private ensureCacheDirectory() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getFilePath(filename: string): string {
    return path.join(this.cacheDir, `${filename}.json`);
  }

  has(filename: string): boolean {
    return fs.existsSync(this.getFilePath(filename));
  }

  get(filename: string): any {
    const filePath = this.getFilePath(filename);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  }

  set(filename: string, data: any): void {
    const filePath = this.getFilePath(filename);
    fs.writeFileSync(filePath, JSON.stringify(data));
  }
}
