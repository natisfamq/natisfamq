console.log('Admin script loaded');

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDyTpY2vGcvM8Sz5B1TCdDeNUObQ6yZF4o",
    authDomain: "natis-add35.firebaseapp.com",
    databaseURL: "https://natis-add35-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "natis-add35",
    storageBucket: "natis-add35.firebasestorage.app",
    messagingSenderId: "303875422065",
    appId: "1:303875422065:web:c142a191607606e01a28d0"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
let currentUser = null;

async function loadReportsFromFirebase() {
    const snapshot = await get(ref(db, 'reports'));
    const data = snapshot.val();
    if (!data) return [];
    return Object.entries(data)
        .map(([id, report]) => ({ id, ...report }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

async function deleteReportFromFirebase(reportId) {
    await remove(ref(db, `reports/${reportId}`));
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.getElementById('toast-container').appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

async function checkAuth() {
    try {
        const res = await fetch('/api/me', { credentials: 'include' });
        if (!res.ok) {
            window.location.href = '/';
            return;
        }

        currentUser = await res.json();
        if (currentUser.roleLevel < 11) {
            document.body.innerHTML = '<div class="modern-glass-card" style="margin: 40px auto; max-width: 600px; padding: 24px; text-align: center;"><h2>Brak uprawnień</h2><p>Nie masz dostępu do tego panelu.</p><a href="/">Wróć do strony głównej</a></div>';
            return;
        }

        document.getElementById('user-name').textContent = currentUser.username;
        document.getElementById('user-role-text').textContent = `Ranga: ${currentUser.roleName || '-'}`;
        loadReports();
    } catch (error) {
        console.error('Admin auth error:', error);
        window.location.href = '/';
    }
}

async function loadReports() {
    const reports = await loadReportsFromFirebase();
    const list = document.getElementById('admin-list');
    list.innerHTML = reports.map(r => {
        const reportPayload = encodeURIComponent(JSON.stringify(r));
        return `
            <div class="report-item modern-glass-card">
                <div class="report-header">
                    <strong>${r.username}</strong> - ${r.type} - ${r.payout}$
                </div>
                <div class="report-details">
                    ${r.imgur ? `<a href="${r.imgur}" target="_blank" rel="noreferrer">Dowód</a>` : 'Brak dowodu'}
                    ${r.krzaki ? `<br>Krzaki: ${r.krzaki}` : ''}
                    ${r.kille ? `<br>Kille: ${r.kille}, DMG: ${r.dmg}` : ''}
                </div>
                <div class="report-actions">
                    <button class="btn-approve" data-id="${r.id}" data-report="${reportPayload}">Zatwierdź</button>
                    <button class="btn-reject" data-id="${r.id}" data-report="${reportPayload}">Odrzuć</button>
                </div>
            </div>
        `;
    }).join('');
}

async function approveReport(id, reportData) {
    try {
        const res = await fetch('/api/send-webhook', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportData)
        });
        if (res.ok) {
            await deleteReportFromFirebase(id);
            showToast('Raport zatwierdzony!', 'success');
            loadReports();
        } else {
            showToast('Błąd zatwierdzania', 'error');
        }
    } catch (error) {
        showToast('Błąd: ' + error.message, 'error');
    }
}

async function rejectReport(id, reportData) {
    try {
        const res = await fetch('/api/reject-webhook', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reportData)
        });
        if (res.ok) {
            await deleteReportFromFirebase(id);
            showToast('Raport odrzucony!', 'success');
            loadReports();
        } else {
            showToast('Błąd odrzucania', 'error');
        }
    } catch (error) {
        showToast('Błąd: ' + error.message, 'error');
    }
}

function initAdminPage() {
    const adminList = document.getElementById('admin-list');
    adminList.addEventListener('click', async (e) => {
        const approveBtn = e.target.closest('.btn-approve');
        const rejectBtn = e.target.closest('.btn-reject');
        if (!approveBtn && !rejectBtn) return;

        const button = approveBtn || rejectBtn;
        const id = button.dataset.id;
        const reportData = JSON.parse(decodeURIComponent(button.dataset.report));

        if (approveBtn) {
            await approveReport(id, reportData);
        }
        if (rejectBtn) {
            await rejectReport(id, reportData);
        }
    });

    const homeLink = document.getElementById('home-link');
    if (homeLink) {
        homeLink.href = '/';
    }

    checkAuth();
}

initAdminPage();
