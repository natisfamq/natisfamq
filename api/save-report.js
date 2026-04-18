import { readReports, writeReports } from './report-store.js';
import { getCookieValue } from './utils.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const userId = getCookieValue(req, 'user_id');
    if (!userId) return res.status(401).json({ error: "Zaloguj się ponownie" });

    try {
        const reportData = req.body;
        const reportId = `rep_${Date.now()}`;
        
        const newReport = {
            id: reportId,
            ...reportData,
            senderId: userId,
            timestamp: new Date().toISOString()
        };

        const reports = await readReports();
        reports.unshift(newReport);
        await writeReports(reports);
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('save-report error:', error);
        res.status(500).json({ error: "Błąd zapisu raportu" });
    }
}