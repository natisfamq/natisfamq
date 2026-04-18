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

async function checkAuth() {
    try {
        const res = await fetch('/api/me');
        if (res.ok) {
            currentUser = await res.json();
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            updateUI();
            loadMembers();
        } else {
            document.getElementById('login-screen').style.display = 'flex';
        }
    } catch (e) {
        document.getElementById('login-screen').style.display = 'flex';
    }
}

function updateUI() {
    if(!currentUser) return;
    document.getElementById('user-name').innerText = currentUser.username;
    document.getElementById('user-avatar').src = currentUser.avatar || 'logo.jpg';
    document.getElementById('user-role-text').innerText = `Ranga: ${currentUser.roleName || '-'}`;
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
        };
    });

    // Przycisk logowania
    const btn = document.getElementById('login-btn');
    if(btn) btn.onclick = () => window.location.href = '/api/login';

    // Obsługa formularza (Grover/Capt)
    const select = document.getElementById('contract-type');
    select.onchange = (e) => {
        document.getElementById('grover-fields').style.display = e.target.value === 'grover' ? 'block' : 'none';
        document.getElementById('capt-fields').style.display = e.target.value === 'capt' ? 'block' : 'none';
    };
});