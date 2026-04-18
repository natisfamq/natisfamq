import { readFile, writeFile } from 'fs/promises';

const reportsFile = new URL('../reports.json', import.meta.url);

export async function readReports() {
    try {
        const data = await readFile(reportsFile, 'utf8');
        return JSON.parse(data || '[]');
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
}

export async function writeReports(reports) {
    await writeFile(reportsFile, JSON.stringify(reports, null, 2), 'utf8');
}
