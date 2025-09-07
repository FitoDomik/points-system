document.addEventListener('DOMContentLoaded', function() {
    initializeAdmin();
});
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('show');
}
document.addEventListener('click', function(event) {
    const sidebar = document.querySelector('.sidebar');
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    if (!sidebar.contains(event.target) && !mobileToggle.contains(event.target)) {
        sidebar.classList.remove('show');
    }
});
function initializeAdmin() {
    const requiredElements = [
        'add-user-modal',
        'add-achievement-modal',
        'users-grid',
        'achievements-grid'
    ];
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    if (missingElements.length > 0) {
        console.warn('Отсутствуют элементы:', missingElements);
    }
    initializeNavigation();
    initializeForms();
    loadInitialData();
    initializeCalculator();
}
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            navItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            loadTabData(targetTab);
            const sidebar = document.querySelector('.sidebar');
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('show');
            }
        });
    });
}
function initializeForms() {
    const addPointsForm = document.getElementById('add-points-form');
    if (addPointsForm) {
        addPointsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleAddPoints();
        });
    }
    const removePointsForm = document.getElementById('remove-points-form');
    if (removePointsForm) {
        removePointsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleRemovePoints();
        });
    }
}
function loadInitialData() {
    loadUsers();
    loadHistory();
    loadAchievements();
    loadSystemSettings();
}
function loadTabData(tabName) {
    switch(tabName) {
        case 'users':
            loadUsers();
            break;
        case 'admins':
            loadUsers(); 
            break;
        case 'history':
            loadHistory();
            break;
        case 'achievements':
            loadAchievements();
            break;
        case 'settings':
            loadSystemSettings();
            break;
        case 'calculator':
            calculateUniversalSimple();
            break;
    }
}
async function loadUsers() {
    try {
        const response = await fetch('api.php?action=get_users');
        const data = await response.json();
        if (data.success) {
            renderUsers(data.data);
            renderAdmins(data.data);
            populateUserSelects(data.data);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Ошибка загрузки пользователей', 'error');
    }
}
function renderUsers(users) {
    const usersGrid = document.getElementById('users-grid');
    if (!usersGrid) return;
    const regularUsers = users.filter(user => user.role === 'user');
    usersGrid.innerHTML = regularUsers.map(user => `
        <div class="user-card">
            <div class="user-avatar">${user.avatar && user.avatar.startsWith('uploads/') ? '🙉' : (user.avatar || '🙉')}</div>
            <div class="user-info">
                <h3>${user.username}</h3>
                <p class="user-role">Участник</p>
            </div>
            <div class="user-points">
                <span class="points-value ${user.total_points >= 0 ? 'positive' : 'negative'}">
                    ${user.total_points >= 0 ? '+' : ''}${user.total_points}
                </span>
                <span class="points-label">очков</span>
            </div>
            <div class="user-actions">
                <button class="btn btn-small btn-success" onclick="showQuickActionModal('add', ${user.id}, '${user.username}')">➕</button>
                <button class="btn btn-small btn-danger" onclick="showQuickActionModal('remove', ${user.id}, '${user.username}')">➖</button>
            </div>
        </div>
    `).join('');
}
function renderAdmins(users) {
    const adminsGrid = document.getElementById('admins-grid');
    if (!adminsGrid) return;
    const admins = users.filter(user => user.role === 'admin');
    adminsGrid.innerHTML = admins.map(user => `
        <div class="user-card admin-card">
            <div class="user-avatar">${user.avatar && user.avatar.startsWith('uploads/') ? '🙉' : (user.avatar || '🙉')}</div>
            <div class="user-info">
                <h3>${user.username}</h3>
                <p class="user-role">Администратор</p>
            </div>
            <div class="user-actions">
                <button class="btn btn-secondary btn-small" disabled>Нет доступа</button>
            </div>
        </div>
    `).join('');
}
function populateUserSelects(users) {
    const selects = ['user-select-add', 'user-select-remove'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Выберите участника...</option>' + 
                users.filter(user => user.role === 'user').map(user => 
                    `<option value="${user.id}">${user.username}</option>`
                ).join('');
        }
    });
}
async function loadHistory() {
    try {
        const response = await fetch('api.php?action=get_history');
        const data = await response.json();
        if (data.success) {
            renderHistory(data.data);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Ошибка загрузки истории', 'error');
    }
}
function renderHistory(history) {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    historyList.innerHTML = history.map(item => `
        <div class="history-item ${item.operation_type === 'add' ? 'positive' : 'negative'}">
            <div class="history-icon">${item.operation_type === 'add' ? '➕' : '➖'}</div>
            <div class="history-content">
                <h4>${item.username}</h4>
                <p>${item.operation_type === 'add' ? '+' : '-'}${Math.abs(item.points)} очков ${item.reason}</p>
                <span class="history-date">${formatDate(item.created_at)}</span>
            </div>
            <div class="history-amount">
                ${item.operation_type === 'add' ? '+' : '-'}${Math.abs(item.points)}
            </div>
        </div>
    `).join('');
}
async function loadAchievements() {
    try {
        const response = await fetch('api.php?action=get_achievements');
        const data = await response.json();
        if (data.success) {
            renderAchievements(data.data);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Ошибка загрузки достижений', 'error');
    }
}
function renderAchievements(achievements) {
    const achievementsGrid = document.getElementById('achievements-grid');
    if (!achievementsGrid) return;
    achievementsGrid.innerHTML = achievements.map(achievement => `
        <div class="achievement-card">
            <div class="achievement-icon">${achievement.icon}</div>
            <h3>${achievement.name}</h3>
            <p>${achievement.description}</p>
            <div class="achievement-requirements">
                <span>Требуется: ${achievement.points_required} очков</span>
            </div>
            <div class="achievement-actions">
                <button class="btn btn-small btn-danger" onclick="deleteAchievement(${achievement.id})">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
}
async function loadSystemSettings() {
    try {
        const response = await fetch('api.php?action=get_system_settings');
        const data = await response.json();
        if (data.success) {
            populateSettings(data.data);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Ошибка загрузки настроек', 'error');
    }
}
function populateSettings(settings) {
    if (settings.music_enabled !== undefined) {
        const musicSelect = document.getElementById('music-enabled');
        if (musicSelect) musicSelect.value = settings.music_enabled;
    }
}
async function handleAddPoints() {
    const userId = document.getElementById('user-select-add').value;
    const points = document.getElementById('points-amount-add').value;
    const reason = document.getElementById('reason-add').value;
    if (!userId || !points || !reason) {
        showNotification('Пожалуйста, заполните все поля', 'error');
        return;
    }
    try {
        const response = await fetch('api.php?action=add_points', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                points: parseInt(points),
                reason: reason,
                admin_id: 1
            })
        });
        const data = await response.json();
        if (data.success) {
            showNotification(data.message, 'success');
            document.getElementById('add-points-form').reset();
            loadUsers();
            loadHistory();
            updateUserDataForGraph(userId);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Ошибка добавления очков', 'error');
    }
}
async function handleRemovePoints() {
    const userId = document.getElementById('user-select-remove').value;
    const points = document.getElementById('points-amount-remove').value;
    const reason = document.getElementById('reason-remove').value;
    if (!userId || !points || !reason) {
        showNotification('Пожалуйста, заполните все поля', 'error');
        return;
    }
    try {
        const response = await fetch('api.php?action=remove_points', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                points: parseInt(points),
                reason: reason,
                admin_id: 1
            })
        });
        const data = await response.json();
        if (data.success) {
            showNotification(data.message, 'success');
            document.getElementById('remove-points-form').reset();
            loadUsers();
            loadHistory();
            updateUserDataForGraph(userId);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Ошибка списания очков', 'error');
    }
}
async function updateUserDataForGraph(userId) {
    try {
        localStorage.setItem('user_data_updated', Date.now().toString());
        console.log('Данные пользователя обновлены, график будет обновлен');
    } catch (error) {
        console.log('График будет обновлен при следующем обновлении страницы');
    }
}
function showAddUserModal() {
    const modal = document.getElementById('add-user-modal');
    if (!modal) {
        console.error('Модальное окно add-user-modal не найдено');
        showNotification('Ошибка: модальное окно не найдено', 'error');
        return;
    }
    const usernameInput = document.getElementById('new-username');
    const avatarInput = document.getElementById('new-avatar');
    const roleInput = document.getElementById('new-role');
    if (usernameInput) usernameInput.value = '';
    if (avatarInput) avatarInput.value = '';
    if (roleInput) roleInput.value = 'user';
    modal.style.display = 'flex';
}
function showAddAchievementModal() {
    const modal = document.getElementById('add-achievement-modal');
    if (!modal) {
        console.error('Модальное окно add-achievement-modal не найдено');
        showNotification('Ошибка: модальное окно не найдено', 'error');
        return;
    }
    const nameInput = document.getElementById('achievement-name');
    const descriptionInput = document.getElementById('achievement-description');
    const iconInput = document.getElementById('achievement-icon');
    const pointsInput = document.getElementById('achievement-points');
    if (nameInput) nameInput.value = '';
    if (descriptionInput) descriptionInput.value = '';
    if (iconInput) iconInput.value = '';
    if (pointsInput) pointsInput.value = '0';
    modal.style.display = 'flex';
}
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`Модальное окно ${modalId} не найдено`);
        return;
    }
    modal.style.display = 'none';
    if (modalId === 'add-user-modal') {
        const usernameInput = document.getElementById('new-username');
        const avatarInput = document.getElementById('new-avatar');
        const roleInput = document.getElementById('new-role');
        if (usernameInput) usernameInput.value = '';
        if (avatarInput) avatarInput.value = '';
        if (roleInput) roleInput.value = 'user';
    } else if (modalId === 'add-achievement-modal') {
        const nameInput = document.getElementById('achievement-name');
        const descriptionInput = document.getElementById('achievement-description');
        const iconInput = document.getElementById('achievement-icon');
        const pointsInput = document.getElementById('achievement-points');
        if (nameInput) nameInput.value = '';
        if (descriptionInput) descriptionInput.value = '';
        if (iconInput) iconInput.value = '';
        if (pointsInput) pointsInput.value = '0';
    }
}
async function addUser() {
    const usernameInput = document.getElementById('new-username');
    const avatarInput = document.getElementById('new-avatar');
    const roleInput = document.getElementById('new-role');
    if (!usernameInput) {
        showNotification('Ошибка: поля формы не найдены', 'error');
        return;
    }
    const username = usernameInput.value;
    const avatar = avatarInput ? avatarInput.value : '👤';
    const role = roleInput ? roleInput.value : 'user';
    if (!username) {
        showNotification('Имя пользователя обязательно', 'error');
        return;
    }
    try {
        const response = await fetch('api.php?action=add_user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                avatar: avatar,
                role: role
            })
        });
        const data = await response.json();
        if (data.success) {
            showNotification(data.message, 'success');
            closeModal('add-user-modal');
            document.getElementById('new-username').value = '';
            document.getElementById('new-avatar').value = '';
            document.getElementById('new-role').value = 'user';
            loadUsers();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Ошибка добавления пользователя', 'error');
    }
}
async function addAchievement() {
    const nameInput = document.getElementById('achievement-name');
    const descriptionInput = document.getElementById('achievement-description');
    const iconInput = document.getElementById('achievement-icon');
    const pointsInput = document.getElementById('achievement-points');
    if (!nameInput || !descriptionInput) {
        showNotification('Ошибка: поля формы не найдены', 'error');
        return;
    }
    const name = nameInput.value;
    const description = descriptionInput.value;
    const icon = iconInput ? iconInput.value : '🏆';
    const pointsRequired = pointsInput ? pointsInput.value : '0';
    if (!name || !description) {
        showNotification('Название и описание обязательны', 'error');
        return;
    }
    try {
        const response = await fetch('api.php?action=add_achievement', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                description: description,
                icon: icon,
                points_required: parseInt(pointsRequired) || 0
            })
        });
        const data = await response.json();
        if (data.success) {
            showNotification(data.message, 'success');
            closeModal('add-achievement-modal');
            document.getElementById('achievement-name').value = '';
            document.getElementById('achievement-description').value = '';
            document.getElementById('achievement-icon').value = '';
            document.getElementById('achievement-points').value = '0';
            loadAchievements();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Ошибка добавления достижения', 'error');
    }
}
async function deleteAchievement(achievementId) {
    if (!confirm('Вы уверены, что хотите удалить это достижение?')) {
        return;
    }
    try {
        const response = await fetch('api.php?action=delete_achievement', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: achievementId
            })
        });
        const data = await response.json();
        if (data.success) {
            showNotification(data.message, 'success');
            loadAchievements();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Ошибка удаления достижения', 'error');
    }
}
async function saveSettings() {
    const musicEnabled = document.getElementById('music-enabled').value;
    try {
        const response = await fetch('api.php?action=update_system_settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                settings: {
                    music_enabled: musicEnabled
                }
            })
        });
        const data = await response.json();
        if (data.success) {
            showNotification(data.message, 'success');
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Ошибка сохранения настроек', 'error');
    }
}
function initializeCalculator() {
    const ids = [
        'base-points', 'completion', 'quality', 'timeliness',
        'helpers-count'
    ];
    const recalc = () => calculateUniversalSimple();
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', recalc);
            el.addEventListener('change', recalc);
        }
    });
    calculateUniversalSimple();
    if (!window.__calcIntervalSet) {
        window.__calcIntervalSet = true;
        setInterval(calculateUniversalSimple, 500);
    }
}
function calculateUniversalSimple() {
    const num = (id, def=0) => {
        const el = document.getElementById(id);
        if (!el) return def;
        const raw = (el.value || '').toString().replace(',', '.');
        const n = parseFloat(raw);
        return isNaN(n) ? def : n;
    };
    const intNum = (id, def=0) => {
        const el = document.getElementById(id);
        if (!el) return def;
        const raw = (el.value || '').toString().replace(',', '.');
        const n = parseInt(raw, 10);
        return isNaN(n) ? def : n;
    };
    const P = num('base-points', 0);
    const c = Math.min(1, Math.max(0, num('completion', 0)));
    const q = Math.max(0, num('quality', 1));
    const t = Math.max(0, num('timeliness', 1));
    const helpers = Math.max(0, intNum('helpers-count', 0));
    const participants = 1 + helpers;
    const base = P * c * q * t;
    let per = participants > 0 ? Math.floor(base / participants) : 0;
    if (!isFinite(per) || isNaN(per)) per = 0;
    const total = per * participants;
    const outMain = document.getElementById('calc-main');
    if (outMain) outMain.textContent = String(per);
}
function showQuickActionModal(action, userId, userName) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${action === 'add' ? 'Добавить' : 'Списать'} очки</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <p><strong>Пользователь:</strong> ${userName}</p>
                <div class="form-group">
                    <label>Количество очков:</label>
                    <input type="number" class="form-control" id="quick-points" min="1" placeholder="Введите количество">
                </div>
                <div class="form-group">
                    <label>Причина:</label>
                    <textarea class="form-control" id="quick-reason" rows="3" placeholder="Укажите причину"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Отмена</button>
                <button class="btn ${action === 'add' ? 'btn-success' : 'btn-danger'}" onclick="handleQuickAction('${action}', ${userId})">
                    ${action === 'add' ? '➕ Добавить' : '➖ Списать'}
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}
async function handleQuickAction(action, userId) {
    const points = document.getElementById('quick-points').value;
    const reason = document.getElementById('quick-reason').value;
    if (!points || !reason.trim()) {
        showNotification('Пожалуйста, заполните все поля', 'error');
        return;
    }
    try {
        const apiAction = action === 'add' ? 'add_points' : 'remove_points';
        const response = await fetch(`api.php?action=${apiAction}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                points: parseInt(points),
                reason: reason,
                admin_id: 1
            })
        });
        const data = await response.json();
        if (data.success) {
            showNotification(data.message, 'success');
            document.querySelector('.modal').remove();
            loadUsers();
            loadHistory();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification(`Ошибка ${action === 'add' ? 'добавления' : 'списания'} очков`, 'error');
    }
}
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    if (!document.querySelector('#notification-styles')) {
        const notificationStyles = document.createElement('style');
        notificationStyles.id = 'notification-styles';
        notificationStyles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 1001;
                animation: slideIn 0.3s ease;
            }
            .notification-success {
                background: #28a745;
            }
            .notification-error {
                background: #dc3545;
            }
            .notification-info {
                background: #17a2b8;
            }
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(notificationStyles);
    }
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
    if (!document.querySelector('#notification-slideout')) {
        const slideOutStyles = document.createElement('style');
        slideOutStyles.id = 'notification-slideout';
        slideOutStyles.textContent = `
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(slideOutStyles);
    }
}
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
        return 'Сегодня, ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 2) {
        return 'Вчера, ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays <= 7) {
        return `${diffDays - 1} дня назад, ` + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString('ru-RU') + ', ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
}