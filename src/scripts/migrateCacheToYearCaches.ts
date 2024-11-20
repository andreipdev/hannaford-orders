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

console.log(cacheFiles);

// Process each cache file
cacheFiles.forEach(file => {
  try {

    // The filename itself is the date in ISO format (YYYY-MM-DD)
    const dateStr = file.replace('.json', '');
    
    // Validate that it matches a date format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
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
      console.log(`Skipping file ${file} - not a date format`);
    }
    }
  } catch (error) {
    console.error(`Error processing file ${file}:`, error);
  }
});

// Save updated metadata
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

console.log('Migration complete. Updated yearCaches:', metadata.yearCaches);
