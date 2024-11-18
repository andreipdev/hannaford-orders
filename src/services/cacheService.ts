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

  private getFilePath(url: string): string {
    const hash = crypto.createHash('md5').update(url).digest('hex');
    return path.join(this.cacheDir, `${hash}.json`);
  }

  has(url: string): boolean {
    return fs.existsSync(this.getFilePath(url));
  }

  get(url: string): any {
    const filePath = this.getFilePath(url);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  }

  set(url: string, data: any): void {
    const filePath = this.getFilePath(url);
    fs.writeFileSync(filePath, JSON.stringify(data));
  }
}
