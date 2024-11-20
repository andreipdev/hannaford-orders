import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

  private getFilePath(key: string, customFilename?: string): string {
    if (customFilename) {
      return path.join(this.cacheDir, `${customFilename}.json`);
    }
    const hash = crypto.createHash('md5').update(key).digest('hex');
    return path.join(this.cacheDir, `${hash}.json`);
  }

  has(key: string, customFilename?: string): boolean {
    return fs.existsSync(this.getFilePath(key, customFilename));
  }

  get(key: string, customFilename?: string): any {
    const filePath = this.getFilePath(key, customFilename);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  }

  set(key: string, data: any, customFilename?: string): void {
    const filePath = this.getFilePath(key, customFilename);
    fs.writeFileSync(filePath, JSON.stringify(data));
  }
}
