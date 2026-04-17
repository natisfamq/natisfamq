// Stabilna logika logowania
function login() {
    localStorage.setItem('is_logged', 'true');
    checkAuth();
}

function checkAuth() {
    if (localStorage.getItem('is_logged') === 'true') {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
    }
}

// Obsługa zakładek
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active-tab'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active-tab');
    });
});

// Uruchomienie na starcie
window.onload = checkAuth;