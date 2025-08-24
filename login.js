document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const error = document.createElement('div');
    error.className = 'error-msg';
    error.id = 'error';
    
    // Remove any existing error message
    const existingError = document.getElementById('error');
    if (existingError) existingError.remove();

    if (!username || !password) {
        error.textContent = 'Please fill in all fields';
        document.querySelector('.login-container').insertBefore(error, document.getElementById('loginForm'));
        return;
    }

    try {
        const response = await fetch('login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
        });

        if (response.ok) {
            window.location.href = 'index.php';
        } else {
            error.textContent = 'Invalid username or password';
            document.querySelector('.login-container').insertBefore(error, document.getElementById('loginForm'));
        }
    } catch (err) {
        error.textContent = 'Error connecting to server';
        document.querySelector('.login-container').insertBefore(error, document.getElementById('loginForm'));
    }
});