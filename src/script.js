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

async function getLastActivity() {
    if (!currentUser) return;
    
    const snapshot = await get(ref(db, 'reports'));
    const data = snapshot.val();
    if (!data) return;
    
    const userReports = Object.values(data)
        .filter(report => report.username === currentUser.username)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (userReports.length > 0) {
        const lastReport = userReports[0];
        const date = new Date(lastReport.timestamp);
        const formattedDate = date.toLocaleString('pl-PL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        document.getElementById('last-act-text').textContent = formattedDate;
        
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const weeklyReports = userReports.filter(report => new Date(report.timestamp) >= startOfWeek);
        document.getElementById('reports-count').textContent = weeklyReports.length;
    }
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
    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        adminLink.style.display = currentUser.roleLevel >= 11 && currentUser.roleLevel <= 15 ? 'inline-flex' : 'none';
    }
    getLastActivity();
}

async function verifyAdminRoleAndRedirect() {
    try {
        const res = await fetch('/api/me', { credentials: 'include' });
        if (!res.ok) {
            showToast('Brak dostępu admina.', 'error');
            return;
        }

        const user = await res.json();
        if (user.roleLevel >= 11 && user.roleLevel <= 15) {
            window.location.href = '/api/admin';
        } else {
            showToast('Brak uprawnień admina.', 'error');
        }
    } catch (error) {
        console.error('Admin redirect verification failed:', error);
        showToast('Błąd weryfikacji admina.', 'error');
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



function initApp() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';

    checkAuth();

    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).style.display = 'block';
            
            if (tab.dataset.tab === 'members') {
                loadMembers();
            }
        };
    });

    const btn = document.getElementById('login-btn');
    if(btn) btn.onclick = () => window.location.href = '/api/login';

    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        adminLink.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!currentUser) {
                showToast('Musisz być zalogowany!', 'error');
                return;
            }
            await verifyAdminRoleAndRedirect();
        });
    }

    const select = document.getElementById('contract-type');
    select.onchange = (e) => {
        document.getElementById('grover-fields').style.display = e.target.value === 'grover' ? 'block' : 'none';
        document.getElementById('capt-fields').style.display = e.target.value === 'capt' ? 'block' : 'none';
    };

    const reportForm = document.getElementById('report-form');
    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Form submit triggered');
        
        if (!currentUser) {
            showToast('Musisz być zalogowany!', 'error');
            return;
        }
        
        const type = document.getElementById('contract-type').value;
        let imgur = document.getElementById('imgur-link').value.trim();
        if (imgur && !/^https?:\/\//i.test(imgur)) {
            imgur = `https://${imgur}`;
        }
        
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
            console.log('Saving to database...');
            const reportId = await addReportToFirebase({
                ...reportData,
                timestamp: new Date().toISOString()
            });
            console.log('Firebase report ID:', reportId);
            
            console.log('Sending webhook...');
            const webhookRes = await fetch('/api/new-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    ...reportData,
                    id: reportId
                })
            });
            console.log('Webhook response:', webhookRes.status);
            
            if (webhookRes.ok) {
                showToast('Raport wysłany pomyślnie!', 'success');
                reportForm.reset();
                document.getElementById('grover-fields').style.display = 'none';
                document.getElementById('capt-fields').style.display = 'none';
                getLastActivity();
            } else {
                showToast('Błąd wysyłania webhooka', 'error');
            }
        } catch (error) {
            console.log('Error:', error);
            showToast('Błąd wysyłania raportu: ' + error.message, 'error');
        }
    });
}

initApp();
