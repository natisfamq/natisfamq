import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

function showToast(msg) {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

document.addEventListener('DOMContentLoaded', async () => {
    // Tab switching
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).style.display = 'block';
        };
    });

    // Login button
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.onclick = () => window.location.href = '/api/login';

    // Check session
    if (document.cookie.includes('user_id')) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        await fetchUserInfo();
        loadMembers();
    }

    // Report Form
    const contractSelect = document.getElementById('contract-type');
    contractSelect.onchange = (e) => {
        document.getElementById('grover-fields').style.display = e.target.value === 'grover' ? 'block' : 'none';
        document.getElementById('capt-fields').style.display = e.target.value === 'capt' ? 'block' : 'none';
    };

    document.getElementById('report-form').onsubmit = async (e) => {
        e.preventDefault();
        const imgur = document.getElementById('imgur-link').value;
        if (!imgur) return showToast("Podaj link do dowodu!");

        const reportData = {
            username: currentUser.username,
            type: document.getElementById('contract-type').value,
            imgur: imgur,
            timestamp: Date.now(),
            date: new Date().toLocaleString('pl-PL')
        };

        await set(push(ref(db, 'reports')), reportData);
        showToast("Raport wysłany pomyślnie!");
        e.target.reset();
    };
});

async function fetchUserInfo() {
    const res = await fetch('/api/me');
    if (res.ok) {
        currentUser = await res.json();
        document.getElementById('user-name').innerText = currentUser.username;
        document.getElementById('user-avatar').src = currentUser.avatar || 'logo.jpg';
        document.getElementById('user-role-text').innerText = `Ranga: ${currentUser.roleName || '-'}`;
    }
}

async function loadMembers() {
    const res = await fetch('/api/members');
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