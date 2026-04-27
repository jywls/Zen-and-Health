// Main Application Controller
class ZenPuzzlesApp {
    constructor() {
        this.currentGame = null;
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
    }

    setupEventListeners() {
        // Main menu buttons
        document.querySelectorAll('.game-btn').forEach(btn => {
            btn.addEventListener('click', () => this.startGame(btn.dataset.game));
        });

        document.getElementById('statsBtn').addEventListener('click', () => this.showStats());
        document.getElementById('helpBtn').addEventListener('click', () => this.showHelp());

        // Back buttons
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => this.backToMenu());
        });

        // Color Sort controls
        document.getElementById('colorSortReset')?.addEventListener('click', () => {
            if (colorSortGame) colorSortGame.reset();
        });

        document.getElementById('colorSortUndo')?.addEventListener('click', () => {
            if (colorSortGame) colorSortGame.undo();
        });

        // Paint by Numbers controls
        document.getElementById('paintReset')?.addEventListener('click', () => {
            if (paintNumbersGame) paintNumbersGame.reset();
        });

        document.getElementById('paintUndo')?.addEventListener('click', () => {
            if (paintNumbersGame) paintNumbersGame.undo();
        });

        // Untie Rope controls
        document.getElementById('ropeReset')?.addEventListener('click', () => {
            if (untieRopeGame) untieRopeGame.reset();
        });

        document.getElementById('ropeUndo')?.addEventListener('click', () => {
            if (untieRopeGame) untieRopeGame.undo();
        });

        // Victory modal buttons
        document.getElementById('nextLevelBtn')?.addEventListener('click', () => {
            this.hideVictoryModal();
        });

        document.getElementById('menuFromVictoryBtn')?.addEventListener('click', () => {
            this.hideVictoryModal();
            this.backToMenu();
        });

        // Stats screen
        document.getElementById('clearStatsBtn')?.addEventListener('click', () => {
            if (gameStateManager.clearAll()) {
                setTimeout(() => this.showStats(), 500);
            }
        });
    }

    setupKeyboardShortcuts() {
        keyboardManager.onKey('escape', () => this.backToMenu());
        keyboardManager.onKey('r', () => {
            if (this.currentGame === 'colorSort') colorSortGame.reset();
            else if (this.currentGame === 'paintNumbers') paintNumbersGame.reset();
            else if (this.currentGame === 'untieRope') untieRopeGame.reset();
        });
        keyboardManager.onKey('u', () => {
            if (this.currentGame === 'colorSort') colorSortGame.undo();
            else if (this.currentGame === 'paintNumbers') paintNumbersGame.undo();
            else if (this.currentGame === 'untieRope') untieRopeGame.undo();
        });
    }

    startGame(game) {
        this.currentGame = game;
        const level = gameStateManager.state[game].level;

        if (game === 'colorSort') {
            colorSortGame.initialize(level);
            this.showScreen('colorSortScreen');
        } else if (game === 'paintNumbers') {
            paintNumbersGame.initialize(level);
            this.showScreen('paintNumbersScreen');
        } else if (game === 'untieRope') {
            untieRopeGame.initialize(level);
            this.showScreen('untieRopeScreen');
        }
    }

    showStats() {
        const stats = gameStateManager.getStats();
        const unlocked = GameEngine.getUnlockedAchievements(stats);

        // Update stat cards
        document.getElementById('totalGamesCompleted').textContent = stats.gamesCompleted;
        document.getElementById('totalPlayTime').textContent = GameEngine.formatTime(stats.totalPlayTime);
        document.getElementById('totalAchievements').textContent = `${unlocked.length}/8`;

        // Update achievements list
        const achievementsList = document.getElementById('achievementsList');
        achievementsList.innerHTML = '';

        Object.values(GameEngine.ACHIEVEMENTS).forEach(achievement => {
            const isUnlocked = unlocked.some(a => a.id === achievement.id);
            const item = document.createElement('div');
            item.className = 'achievement-item';
            if (isUnlocked) item.classList.add('unlocked');
            item.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
            `;
            achievementsList.appendChild(item);
        });

        // Update game stats
        const gameStatsDetail = document.getElementById('gameStatsDetail');
        gameStatsDetail.innerHTML = `
            <div class="game-stat-row">
                <span class="game-stat-name">🎨 Color Sort</span>
                <span class="game-stat-value">Level ${stats.colorSortLevel}</span>
            </div>
            <div class="game-stat-row">
                <span class="game-stat-name">🖌️ Paint by Numbers</span>
                <span class="game-stat-value">Level ${stats.paintNumbersLevel}</span>
            </div>
            <div class="game-stat-row">
                <span class="game-stat-name">🪢 Untie the Rope</span>
                <span class="game-stat-value">Level ${stats.untieRopeLevel}</span>
            </div>
        `;

        this.showScreen('statsScreen');
    }

    showHelp() {
        this.showScreen('helpScreen');
    }

    backToMenu() {
        this.currentGame = null;
        this.showScreen('mainMenu');
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('active');
        }
    }

    hideVictoryModal() {
        document.getElementById('victoryModal').style.display = 'none';
    }
}

// Global function for victory modal
function showVictoryModal(message, stats, callback) {
    document.getElementById('victoryMessage').textContent = message;
    document.getElementById('modalStats').innerHTML = `<div class="modal-stat">${stats}</div>`;
    document.getElementById('victoryModal').style.display = 'flex';

    const nextBtn = document.getElementById('nextLevelBtn');
    nextBtn.onclick = () => {
        showVictoryModal.callback?.();
        app.hideVictoryModal();
        callback();
    };
    showVictoryModal.callback = callback;
}

// Initialize app
let app;
window.addEventListener('DOMContentLoaded', () => {
    app = new ZenPuzzlesApp();
    app.showScreen('mainMenu');
});