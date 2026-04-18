console.log('Script loaded');

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, get, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

async function addReportToFirebase(report) {
    const reportsRef = ref(db, 'reports');
    const newReportRef = await push(reportsRef, report);
    return newReportRef.key;
}

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
        console.log('Checking auth...');
        const res = await fetch('/api/me', { credentials: 'include' });
        console.log('Auth response:', res.status);
        if (res.ok) {
            currentUser = await res.json();
            console.log('User logged in:', currentUser);
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            updateUI();
            loadMembers();
        } else {
            console.log('Not logged in, showing login screen');
            document.getElementById('login-screen').style.display = 'flex';
        }
    } catch (e) {
        console.log('Auth check error:', e);
        document.getElementById('login-screen').style.display = 'flex';
    }
}

function updateUI() {
    if(!currentUser) return;
    document.getElementById('user-name').innerText = currentUser.username;
    document.getElementById('user-avatar').src = currentUser.avatar || 'logo.jpg';
    document.getElementById('user-role-text').innerText = `Ranga: ${currentUser.roleName || '-'}`;
    const adminTab = document.querySelector('.tab-btn[data-tab="admin"]');
    if (adminTab) {
        adminTab.style.display = currentUser.roleLevel >= 11 ? 'inline-block' : 'none';
    }
}

async function loadMembers() {
    const res = await fetch('/api/members', { credentials: 'include' });
    if (res.ok) {
        const m = await res.json();
        const list = document.getElementById('members-list');
        list.innerHTML = m.map(u => `
            <div class="member-item">
                <img src="${u.avatar}" class="member-avatar" onerror="this.src='logo.jpg'">
                <div class="member-info">
                    <span class="member-name">${u.displayName}</span>
                    <span class="member-rank">${u.rankName || 'Członek'}</span>
                </div>
            </div>
        `).join('');
    }
}

async function loadReports() {
    if (!currentUser || currentUser.roleLevel < 11) {
        document.getElementById('admin-list').innerHTML = '<p>Brak uprawnień do przeglądania raportów.</p>';
        return;
    }

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
                    ${r.imgur ? `<a href="${r.imgur}" target="_blank">Dowód</a>` : 'Brak dowodu'}
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

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    // Obsługa zakładek
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).style.display = 'block';
            
            // Ładuj dane dla odpowiedniej zakładki
            if (tab.dataset.tab === 'members') {
                loadMembers();
            } else if (tab.dataset.tab === 'admin') {
                loadReports();
            }
        };
    });

    // Przycisk logowania
    const btn = document.getElementById('login-btn');
    if(btn) btn.onclick = () => window.location.href = '/api/login';

    // Obsługa admina (approve / reject)
    const adminList = document.getElementById('admin-list');
    if (adminList) {
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
    }

    // Obsługa formularza (Grover/Capt)
    const select = document.getElementById('contract-type');
    select.onchange = (e) => {
        document.getElementById('grover-fields').style.display = e.target.value === 'grover' ? 'block' : 'none';
        document.getElementById('capt-fields').style.display = e.target.value === 'capt' ? 'block' : 'none';
    };

    // Obsługa wysyłania raportu
    const reportForm = document.getElementById('report-form');
    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Form submit triggered');
        
        if (!currentUser) {
            showToast('Musisz być zalogowany!', 'error');
            return;
        }
        
        const type = document.getElementById('contract-type').value;
        const imgur = document.getElementById('imgur-link').value;
        
        let payout = 0;
        let details = {};
        
        if (type === 'paczki' || type === 'cenna') {
            payout = 10000;
        } else if (type === 'grover') {
            const count = parseInt(document.getElementById('krzaki-count').value) || 0;
            payout = count * 1000;
            details.krzaki = count;
        } else if (type === 'capt') {
            const kille = parseInt(document.getElementById('kille-count').value) || 0;
            const dmg = parseInt(document.getElementById('dmg-count').value) || 0;
            payout = 2500 + (kille * 500) + (dmg * 100);
            details.kille = kille;
            details.dmg = dmg;
        }
        
        const reportData = {
            username: currentUser.username,
            type: type,
            payout: payout,
            imgur: imgur,
            ...details
        };
        
        console.log('Sending report:', reportData);
        
        try {
            // Najpierw zapisz w bazie
            console.log('Saving to database...');
            const reportId = await addReportToFirebase({
                ...reportData,
                timestamp: new Date().toISOString()
            });
            console.log('Firebase report ID:', reportId);
            
            // Potem wyślij webhook
            console.log('Sending webhook...');
            const webhookRes = await fetch('/api/new-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(reportData)
            });
            console.log('Webhook response:', webhookRes.status);
            
            if (webhookRes.ok) {
                showToast('Raport wysłany pomyślnie!', 'success');
                reportForm.reset();
                // Ukryj pola dodatkowe
                document.getElementById('grover-fields').style.display = 'none';
                document.getElementById('capt-fields').style.display = 'none';
            } else {
                showToast('Błąd wysyłania webhooka', 'error');
            }
        } catch (error) {
            console.log('Error:', error);
            showToast('Błąd wysyłania raportu: ' + error.message, 'error');
        }
    });
});