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
      // The file name is the date in YYYY-MM-DD format
      const urlMatch = file.match(/([0-9]{4}-[0-9]{2}-[0-9]{2})/);
      if (urlMatch) {
        const dateStr = urlMatch[1];
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
      } else {
        // Try to extract date from the content itself
        const firstItem = content[0];
        if (firstItem && typeof firstItem === 'object' && 'date' in firstItem) {
          const date = new Date(firstItem.date);
          const year = date.getFullYear().toString();
          const dateStr = date.toISOString().split('T')[0];

          // Add to yearCaches
          if (!metadata.yearCaches[year]) {
            metadata.yearCaches[year] = [];
          }
          if (!metadata.yearCaches[year].includes(dateStr)) {
            metadata.yearCaches[year].push(dateStr);
            console.log(`Added ${dateStr} to year ${year} (from content)`);
          }
        }
      }

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
