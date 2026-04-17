import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const userId = req.cookies.user_id;
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

        // Zapisujemy na początku listy 'reports_list' w Redis
        await kv.lpush('reports_list', newReport);
        
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Błąd bazy danych" });
    }
}