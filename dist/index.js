"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const batchProcessor_1 = require("./services/batchProcessor");
const analyzer_1 = require("./services/analyzer");
const file_utils_1 = require("./utils/file-utils");
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
(0, batchProcessor_1.processWebsites)(websites)
    .then(async (results) => {
    (0, analyzer_1.analyzeResults)(results);
    await (0, file_utils_1.writeJsonToFile)(results, './scraping_results.json');
    console.log('Batch processing complete.');
})
    .catch(error => {
    console.error('Error during batch processing:', error.message);
});
