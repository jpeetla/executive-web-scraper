import { processWebsites } from './services/batchProcessor';
import { analyzeResults } from './services/analyzer';
import { writeJsonToFile } from './utils/file-utils';

const websites = [
    // 'https://www.adroit-tt.com/',
    // 'https://www.acclinate.com/',
    // 'https://adhdonline.com/',
    // 'https://www.adaptx.com/careers',
    // 'https://jobs.lever.co/WisprAI',
    // 'https://www.amidetech.com/',
    // 'https://www.replo.app/'
    'https://www.intro.co/'
    ];

processWebsites(websites)
    .then(async results => {
        analyzeResults(results);
        await writeJsonToFile(results, './scraping_results.json');
        console.log('Batch processing complete.');
    })
    .catch(error => {
        console.error('Error during batch processing:', error.message);
    }); 