// PaintNumbers.js - Pixel Art Paint by Numbers Game

class PaintNumbersGame {
    constructor() {
        this.level = 1;
        this.currentPattern = null;
        this.selectedColorIndex = null;
        this.paintedPixels = new Set();
        this.history = [];
        this.canvas = null;
        this.ctx = null;
        this.cellSize = 30;
    }

    initialize(level) {
        this.level = level;
        this.currentPattern = PIXEL_PATTERNS[(level - 1) % PIXEL_PATTERNS.length];
        this.paintedPixels = new Set();
        this.selectedColorIndex = null;
        this.history = [];
        this.setupUI();
        this.render();
    }

    setupUI() {
        const container = document.getElementById('paintNumbersCanvas');
        container.innerHTML = '<canvas id="pixelCanvas"></canvas>';
        this.canvas = document.getElementById('pixelCanvas');
        this.ctx = this.canvas.getContext('2d');

        const paletteContainer = document.getElementById('colorPalette');
        paletteContainer.innerHTML = '';

        Object.entries(this.currentPattern.palette).forEach(([index, color]) => {
            const btn = document.createElement('button');
            btn.className = 'color-btn';
            btn.style.backgroundColor = color;
            btn.dataset.index = index;
            btn.innerHTML = `<span class="color-number">${index}</span><span class="check-mark" style="display:none;">✓</span>`;
            btn.onclick = () => this.selectColor(index);
            paletteContainer.appendChild(btn);
        });

        this.canvas.width = this.currentPattern.width * this.cellSize;
        this.canvas.height = this.currentPattern.height * this.cellSize;

        this.canvas.onclick = (e) => this.handleCanvasClick(e);
        
        document.getElementById('paintNumbersLevel').textContent = this.level;
        this.updateProgress();
    }

    selectColor(index) {
        this.selectedColorIndex = parseInt(index);
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.index == index);
        });
    }

    handleCanvasClick(e) {
        if (!this.selectedColorIndex) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.cellSize);
        const y = Math.floor((e.clientY - rect.top) / this.cellSize);

        if (x >= 0 && x < this.currentPattern.width && y >= 0 && y < this.currentPattern.height) {
            const targetColor = this.currentPattern.data[y][x];
            const pixelId = `${x},${y}`;

            if (targetColor === this.selectedColorIndex && !this.paintedPixels.has(pixelId)) {
                this.paintedPixels.add(pixelId);
                this.history.push(pixelId);
                this.render();
                this.updateProgress();
                this.checkWin();
            }
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let y = 0; y < this.currentPattern.height; y++) {
            for (let x = 0; x < this.currentPattern.width; x++) {
                const colorIndex = this.currentPattern.data[y][x];
                const pixelId = `${x},${y}`;
                
                this.ctx.strokeStyle = '#ddd';
                this.ctx.strokeRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);

                if (colorIndex === 0) {
                    this.ctx.fillStyle = '#f9f9f9';
                    this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                } else if (this.paintedPixels.has(pixelId)) {
                    this.ctx.fillStyle = this.currentPattern.palette[colorIndex];
                    this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                } else {
                    this.ctx.fillStyle = '#fff';
                    this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                    this.ctx.fillStyle = '#aaa';
                    this.ctx.font = '12px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(colorIndex, x * this.cellSize + this.cellSize / 2, y * this.cellSize + this.cellSize / 2);
                }
            }
        }
    }

    updateProgress() {
        const totalToPaint = this.currentPattern.data.flat().filter(c => c !== 0).length;
        const progress = Math.round((this.paintedPixels.size / totalToPaint) * 100);
        document.getElementById('paintProgress').textContent = progress;

        // Update palette checkmarks
        Object.keys(this.currentPattern.palette).forEach(index => {
            const colorIdx = parseInt(index);
            const pixelsOfColor = this.currentPattern.data.flat().filter(c => c === colorIdx).length;
            const paintedOfColor = Array.from(this.paintedPixels).filter(id => {
                const [px, py] = id.split(',').map(Number);
                return this.currentPattern.data[py][px] === colorIdx;
            }).length;

            const btn = document.querySelector(`.color-btn[data-index="${index}"]`);
            if (btn) {
                const check = btn.querySelector('.check-mark');
                check.style.display = paintedOfColor === pixelsOfColor ? 'inline' : 'none';
            }
        });
    }

    checkWin() {
        const totalToPaint = this.currentPattern.data.flat().filter(c => c !== 0).length;
        if (this.paintedPixels.size === totalToPaint) {
            setTimeout(() => {
                showVictoryModal("You've completed the pixel art!", "Progress: 100%", () => {
                    this.level++;
                    gameStateManager.updateGameLevel('paintNumbers', this.level);
                    this.initialize(this.level);
                });
            }, 300);
        }
    }

    reset() {
        this.paintedPixels.clear();
        this.history = [];
        this.render();
        this.updateProgress();
    }

    undo() {
        if (this.history.length > 0) {
            const last = this.history.pop();
            this.paintedPixels.delete(last);
            this.render();
            this.updateProgress();
        }
    }
}

const paintNumbersGame = new PaintNumbersGame();
