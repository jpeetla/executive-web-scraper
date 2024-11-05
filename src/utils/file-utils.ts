import * as fs from 'fs/promises';
import { Logger } from './logger';

export async function writeJsonToFile(data: any, filename: string): Promise<void> {
    try {
        await fs.writeFile(filename, JSON.stringify(data, null, 2));
        Logger.info(`Results written to ${filename}`);
    } catch (error) {
        Logger.error(`Failed to write results to ${filename}`, error as Error);
        throw error;
    }
}