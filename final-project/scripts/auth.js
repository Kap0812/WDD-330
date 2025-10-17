// Authentication Management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.loadCurrentUser();
        this.setupEventListeners();
    }

    loadCurrentUser() {
        this.currentUser = storage.getCurrentUser();
        ui.updateAuthUI();
    }

    setupEventListeners() {
        // Auth modal triggers
        document.getElementById('loginBtn')?.addEventListener('click', () => this.showAuthModal('login'));
        document.getElementById('registerBtn')?.addEventListener('click', () => this.showAuthModal('register'));

        // Auth modal close
        document.getElementById('authModalClose')?.addEventListener('click', () => ui.hideAuthModal());

        // Auth form submissions
        document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm')?.addEventListener('submit', (e) => this.handleRegister(e));

        // Auth tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchAuthTab(e.target));
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.handleLogout());
    }

    showAuthModal(defaultTab = 'login') {
        ui.showAuthModal();
        this.switchAuthTab(document.querySelector(`.auth-tab[data-tab="${defaultTab}"]`));
    }

    switchAuthTab(tabElement) {
        if (!tabElement) return;

        const targetTab = tabElement.dataset.tab;
        
        // Update active tab
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        tabElement.classList.add('active');

        // Show corresponding form
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        document.getElementById(`${targetTab}Form`).classList.add('active');
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        if (!this.validateCredentials(username, password)) {
            this.showAuthError('login', 'Please fill in all fields');
            return;
        }

        const user = this.authenticateUser(username, password);
        if (user) {
            this.currentUser = user;
            storage.setCurrentUser(user);
            ui.updateAuthUI();
            ui.hideAuthModal();
            this.clearAuthForms();
            
            // Reload current page to update content
            ui.loadPageContent(ui.currentPage);
            
            this.showNotification('Login successful!', 'success');
        } else {
            this.showAuthError('login', 'Invalid username or password');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;

        if (!this.validateRegistration(username, email, password, confirmPassword)) {
            return;
        }

        if (this.userExists(username)) {
            this.showAuthError('register', 'Username already exists');
            return;
        }

        const newUser = this.createUser(username, email, password);
        this.currentUser = newUser;
        storage.setCurrentUser(newUser);
        ui.updateAuthUI();
        ui.hideAuthModal();
        this.clearAuthForms();
        
        // Redirect to profile page
        ui.showPage('profile');
        this.showNotification('Registration successful!', 'success');
    }

    handleLogout() {
        this.currentUser = null;
        storage.clearCurrentUser();
        ui.updateAuthUI();
        
        // Redirect to home page
        ui.showPage('home');
        this.showNotification('Logged out successfully', 'info');
    }

    validateCredentials(username, password) {
        return username.trim() && password.trim();
    }

    validateRegistration(username, email, password, confirmPassword) {
        if (!username.trim() || !email.trim() || !password || !confirmPassword) {
            this.showAuthError('register', 'Please fill in all fields');
            return false;
        }

        if (password !== confirmPassword) {
            this.showAuthError('register', 'Passwords do not match');
            return false;
        }

        if (password.length < 6) {
            this.showAuthError('register', 'Password must be at least 6 characters long');
            return false;
        }

        if (!this.isValidEmail(email)) {
            this.showAuthError('register', 'Please enter a valid email address');
            return false;
        }

        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    userExists(username) {
        const users = storage.getUsers();
        return users.some(user => user.username === username);
    }

    authenticateUser(username, password) {
        const users = storage.getUsers();
        return users.find(user => user.username === username && user.password === password);
    }

    createUser(username, email, password) {
        const users = storage.getUsers();
        
        const newUser = {
            id: Date.now().toString(),
            username: username.trim(),
            email: email.trim(),
            password: password, // In a real app, this would be hashed
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        storage.saveUsers(users);

        // Initialize user data
        storage.savePreferences(username, {
            favoriteGenres: [],
            preferredLanguages: ['en'],
            minRating: 6,
            adultContent: false
        });

        return newUser;
    }

    showAuthError(formType, message) {
        // Clear existing errors
        document.querySelectorAll('.auth-error').forEach(error => error.remove());

        const form = document.getElementById(`${formType}Form`);
        const errorElement = document.createElement('div');
        errorElement.className = 'auth-error';
        errorElement.style.cssText = `
            color: var(--danger);
            background: rgba(220, 53, 69, 0.1);
            padding: 0.75rem;
            border-radius: var(--border-radius);
            margin-bottom: 1rem;
            text-align: center;
            font-weight: 600;
        `;
        errorElement.textContent = message;

        form.insertBefore(errorElement, form.firstChild);
    }

    clearAuthForms() {
        // Clear all auth form inputs
        document.querySelectorAll('.auth-form input').forEach(input => {
            input.value = '';
        });

        // Clear any error messages
        document.querySelectorAll('.auth-error').forEach(error => error.remove());
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--accent)'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--border-radius);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null;
    }
}

// Create global instance
const auth = new AuthManager();