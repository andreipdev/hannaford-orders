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
    
    // Try to extract date from the cache file name
    const hash = file.replace('.json', '');
    const filePath = path.join(cacheDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    try {
      // Try to parse the content
      const content = JSON.parse(fileContent);
      
      // Skip if not an array or empty array
      if (!Array.isArray(content) || content.length === 0) {
        return;
      }

      // Look for a date pattern in the content
      const dateMatch = fileContent.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        const dateStr = dateMatch[0];
        const date = new Date(dateStr);
        const year = date.getFullYear().toString();

        // Add to yearCaches
        if (!metadata.yearCaches[year]) {
          metadata.yearCaches[year] = [];
        }
        if (!metadata.yearCaches[year].includes(dateStr)) {
          metadata.yearCaches[year].push(dateStr);
          console.log(`Added ${dateStr} to year ${year}`);
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
