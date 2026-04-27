// Game Engine - Core utilities and classes
class GameEngine {
    static COLORS = {
        red: '#ef4444',
        blue: '#3b82f6',
        green: '#10b981',
        yellow: '#fbbf24',
        purple: '#a855f7',
        pink: '#ec4899',
        cyan: '#06b6d4',
        orange: '#f97316'
    };

    static ACHIEVEMENTS = {
        firstStep: {
            id: 'firstStep',
            name: 'First Step',
            icon: '🎮',
            description: 'Complete your first game',
            condition: (stats) => stats.gamesCompleted >= 1
        },
        dedicated: {
            id: 'dedicated',
            name: 'Dedicated',
            icon: '🔟',
            description: 'Complete 10 games total',
            condition: (stats) => stats.gamesCompleted >= 10
        },
        perfectSort: {
            id: 'perfectSort',
            name: 'Perfect Sort',
            icon: '💎',
            description: 'Complete Color Sort in minimum moves',
            condition: (stats) => stats.perfectSortMoves && Object.values(stats.perfectSortMoves).some(v => v)
        },
        artist: {
            id: 'artist',
            name: 'Artist',
            icon: '🖼️',
            description: 'Complete a painting quickly',
            condition: (stats) => stats.artistPaintTime && Object.values(stats.artistPaintTime).some(v => v)
        },
        ropeMaster: {
        id: 'ropeMaster',
        name: 'Rope Master',
        icon: '🧗',
        description: 'Complete Untie the Rope with minimal moves',
        condition: (stats) => stats.ropeMasterMoves && Object.values(stats.ropeMasterMoves).some(v => v)
    },
        anxietyRelief: {
            id: 'anxietyRelief',
            name: 'Anxiety Relief',
            icon: '😌',
            description: 'Play for 30 minutes',
            condition: (stats) => (stats.totalPlayTime || 0) >= 1800
        },
        mindful: {
            id: 'mindful',
            name: 'Mindful',
            icon: '🧘',
            description: 'Complete tutorials',
            condition: (stats) => stats.tutorialCompleted
        },
        zenMaster: {
            id: 'zenMaster',
            name: 'Zen Master',
            icon: '👑',
            description: 'Reach level 8 in all games',
            condition: (stats) => (stats.colorSortLevel >= 8 && stats.paintNumbersLevel >= 8 && stats.untieRopeLevel >= 8)
        }
    };

    static saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('LocalStorage save failed:', e);
        }
    }

    static loadFromLocalStorage(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('LocalStorage load failed:', e);
            return defaultValue;
        }
    }

    static getColorByName(name) {
        return this.COLORS[name] || '#3b82f6';
    }

    static getRandomColor() {
        const colors = Object.keys(this.COLORS);
        return colors[Math.floor(Math.random() * colors.length)];
    }

    static createNotification(message, duration = 3000) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    static formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    static calculateStats(gamesData) {
        const stats = {
            gamesCompleted: 0,
            totalPlayTime: 0,
            colorSortLevel: 1,
            paintNumbersLevel: 1,
            untieRopeLevel: 1,
            perfectSortMoves: {},
            artistPaintTime: {},
            ropeMasterCuts: {},
            tutorialCompleted: false
        };

        if (gamesData.colorSort) {
            stats.colorSortLevel = gamesData.colorSort.level || 1;
            stats.gamesCompleted += gamesData.colorSort.completed || 0;
            stats.totalPlayTime += gamesData.colorSort.playTime || 0;
        }

        if (gamesData.paintNumbers) {
            stats.paintNumbersLevel = gamesData.paintNumbers.level || 1;
            stats.gamesCompleted += gamesData.paintNumbers.completed || 0;
            stats.totalPlayTime += gamesData.paintNumbers.playTime || 0;
        }

        if (gamesData.untieRope) {
            stats.untieRopeLevel = gamesData.untieRope.level || 1;
            stats.gamesCompleted += gamesData.untieRope.completed || 0;
            stats.totalPlayTime += gamesData.untieRope.playTime || 0;
        }

        return stats;
    }

    static getUnlockedAchievements(stats) {
        const unlocked = [];
        for (const achievement of Object.values(this.ACHIEVEMENTS)) {
            if (achievement.condition(stats)) {
                unlocked.push(achievement);
            }
        }
        return unlocked;
    }
}

// Game State Manager
class GameStateManager {
    constructor() {
        this.state = GameEngine.loadFromLocalStorage('zenPuzzlesState', {
            colorSort: { level: 1, completed: 0, playTime: 0, bestMoves: {} },
            paintNumbers: { level: 1, completed: 0, playTime: 0, bestTime: {} },
            untieRope: { level: 1, completed: 0, playTime: 0, bestCuts: {} }
        });
        this.sessionStartTime = Date.now();
    }

    saveState() {
        const sessionDuration = (Date.now() - this.sessionStartTime) / 1000;
        this.state.colorSort.playTime = (this.state.colorSort.playTime || 0) + sessionDuration;
        GameEngine.saveToLocalStorage('zenPuzzlesState', this.state);
    }

    updateGameLevel(game, level) {
        if (this.state[game]) {
            this.state[game].level = Math.max(this.state[game].level, level);
            this.state[game].completed = (this.state[game].completed || 0) + 1;
            this.saveState();
        }
    }

    recordBestScore(game, metric, level, value) {
        if (this.state[game]) {
            if (!this.state[game][metric]) {
                this.state[game][metric] = {};
            }
            if (!this.state[game][metric][level] || value < this.state[game][metric][level]) {
                this.state[game][metric][level] = value;
            }
            this.saveState();
        }
    }

    getStats() {
        return GameEngine.calculateStats(this.state);
    }

    clearAll() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            localStorage.removeItem('zenPuzzlesState');
            this.state = {
                colorSort: { level: 1, completed: 0, playTime: 0, bestMoves: {} },
                paintNumbers: { level: 1, completed: 0, playTime: 0, bestTime: {} },
                untieRope: { level: 1, completed: 0, playTime: 0, bestCuts: {} }
            };
            GameEngine.createNotification('All data cleared');
            return true;
        }
        return false;
    }
}

// Keyboard Manager
class KeyboardManager {
    constructor() {
        this.keys = {};
        this.listeners = {};
        this.setupListener();
    }

    setupListener() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (this.listeners[e.key.toLowerCase()]) {
                this.listeners[e.key.toLowerCase()].forEach(cb => cb());
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    isPressed(key) {
        return this.keys[key.toLowerCase()] || false;
    }

    onKey(key, callback) {
        const k = key.toLowerCase();
        if (!this.listeners[k]) {
            this.listeners[k] = [];
        }
        this.listeners[k].push(callback);
    }
}

// Global instances
const gameEngine = new GameEngine();
const gameStateManager = new GameStateManager();
const keyboardManager = new KeyboardManager();

// Add styles for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);
