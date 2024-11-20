import fs from 'fs';
import path from 'path';

const cacheDir = path.join(process.cwd(), '.cache');
const metadataPath = path.join(cacheDir, 'scraper_metadata.json');

// Read existing metadata
let metadata = {
  lastFetchTimestamp: 0,
  yearCaches: {}
};

if (fs.existsSync(metadataPath)) {
  metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
}

// Get all .json files from cache directory
const cacheFiles = fs.readdirSync(cacheDir)
  .filter(file => file.endsWith('.json'))
  .filter(file => file !== 'scraper_metadata.json');

// Process each cache file
cacheFiles.forEach(file => {
  try {
    const filePath = path.join(cacheDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // If the file contains an array (order items), it's likely a date cache
    if (Array.isArray(content)) {
      // Extract date from the file content
      // The file name is an MD5 hash, so we need to look at the content
      // to determine if it's a date cache
      const firstItem = content[0];
      if (firstItem && typeof firstItem === 'object' && 'name' in firstItem) {
        // This looks like an order items cache
        // Use file modification time as a fallback date
        const stats = fs.statSync(filePath);
        const date = new Date(stats.mtime);
        const year = date.getFullYear().toString();
        const dateStr = date.toISOString().split('T')[0];

        // Add to yearCaches
        if (!metadata.yearCaches[year]) {
          metadata.yearCaches[year] = [];
        }
        if (!metadata.yearCaches[year].includes(dateStr)) {
          metadata.yearCaches[year].push(dateStr);
        }
      }
    }
  } catch (error) {
    console.error(`Error processing file ${file}:`, error);
  }
});

// Save updated metadata
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

console.log('Migration complete. Updated yearCaches:', metadata.yearCaches);
