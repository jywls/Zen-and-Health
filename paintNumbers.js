// Paint by Numbers Game Implementation
class PaintNumbersGame {
    constructor() {
        this.level = 1;
        this.maxLevel = 8;
        this.regions = [];
        this.colorMap = {};
        this.history = [];
        this.selectedColor = null;
    }

    initialize(level = 1) {
        this.level = Math.min(level, this.maxLevel);
        this.regions = [];
        this.colorMap = {};
        this.history = [];
        this.selectedColor = 'red';
        this.generatePainting();
        this.renderColorPalette();
        this.renderPainting();
    }

    generatePainting() {
        const paintings = [
            { regions: 6, colors: ['red', 'blue', 'green'] },
            { regions: 8, colors: ['red', 'blue', 'green', 'yellow'] },
            { regions: 10, colors: ['red', 'blue', 'green', 'yellow', 'purple'] },
            { regions: 12, colors: ['red', 'blue', 'green', 'yellow', 'purple', 'pink'] },
            { regions: 14, colors: ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'cyan'] },
            { regions: 16, colors: ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'cyan', 'orange'] },
            { regions: 18, colors: ['red', 'blue', 'green', 'yellow', 'purple', 'pink'] },
            { regions: 20, colors: ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'cyan', 'orange'] }
        ];

        const config = paintings[this.level - 1];
        this.regions = [];
        this.colorMap = {};

        for (let i = 0; i < config.regions; i++) {
            const color = config.colors[i % config.colors.length];
            const region = {
                id: i + 1,
                assignedColor: color,
                currentColor: null,
                x: (i % 4) * 150 + 50,
                y: Math.floor(i / 4) * 150 + 50,
                size: 120
            };
            this.regions.push(region);
        }
    }

    paintRegion(regionId) {
        if (!this.selectedColor) return;

        const region = this.regions.find(r => r.id === regionId);
        if (!region) return;

        // Save to history
        this.history.push(JSON.parse(JSON.stringify(this.regions)));

        region.currentColor = this.selectedColor;

        if (this.isLevelComplete()) {
            this.levelComplete();
        } else {
            this.updateProgress();
        }
    }

    selectColor(color) {
        this.selectedColor = color;
        this.renderColorPalette();
    }

    undo() {
        if (this.history.length > 0) {
            this.regions = this.history.pop();
            this.updateProgress();
            this.renderPainting();
        }
    }

    reset() {
        this.initialize(this.level);
    }

    updateProgress() {
        const painted = this.regions.filter(r => r.currentColor).length;
        const progress = Math.round((painted / this.regions.length) * 100);
        document.getElementById('paintProgress').textContent = progress;
    }

    isLevelComplete() {
        return this.regions.every(r => r.currentColor && r.currentColor === r.assignedColor);
    }

    levelComplete() {
        gameStateManager.updateGameLevel('paintNumbers', this.level + 1);
        setTimeout(() => this.showVictory(), 500);
    }

    showVictory() {
        const message = `Painting ${this.level} Complete!`;
        showVictoryModal(message, 'Beautiful artwork!', () => this.nextLevel());
    }

    nextLevel() {
        this.initialize(this.level + 1);
    }

    renderColorPalette() {
        const palette = document.getElementById('colorPalette');
        if (!palette) return;

        palette.innerHTML = '';

        const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'cyan', 'orange'];

        colors.forEach(color => {
            const btn = document.createElement('div');
            btn.className = 'color-btn';
            if (this.selectedColor === color) btn.classList.add('selected');
            btn.style.backgroundColor = GameEngine.getColorByName(color);
            btn.addEventListener('click', () => this.selectColor(color));
            palette.appendChild(btn);
        });

        document.getElementById('paintNumbersLevel').textContent = this.level;
    }

    renderPainting() {
        const svg = document.getElementById('paintSvg');
        if (!svg) return;

        svg.innerHTML = '';

        this.regions.forEach(region => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', region.x);
            circle.setAttribute('cy', region.y);
            circle.setAttribute('r', region.size / 2);
            circle.setAttribute('fill', region.currentColor ? GameEngine.getColorByName(region.currentColor) : '#334155');
            circle.setAttribute('stroke', '#475569');
            circle.setAttribute('stroke-width', '2');
            circle.setAttribute('cursor', 'pointer');

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', region.x);
            text.setAttribute('y', region.y);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('fill', '#f1f5f9');
            text.setAttribute('font-size', '20');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('pointer-events', 'none');
            text.textContent = region.id;

            circle.addEventListener('click', () => this.paintRegion(region.id));
            svg.appendChild(circle);
            svg.appendChild(text);
        });

        this.updateProgress();
    }
}

const paintNumbersGame = new PaintNumbersGame();