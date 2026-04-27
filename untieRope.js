// Untie the Rope Game Implementation
class UntieRopeGame {
    constructor() {
        this.level = 1;
        this.maxLevel = 8;
        this.segments = [];
        this.cutSegments = new Set();
        this.history = [];
        this.canvas = null;
        this.ctx = null;
    }

    initialize(level = 1) {
        this.level = Math.min(level, this.maxLevel);
        this.segments = [];
        this.cutSegments = new Set();
        this.history = [];

        this.canvas = document.getElementById('ropeCanvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;

        this.generateRopes();
        this.setupCanvasEvents();
        this.render();
    }

    generateRopes() {
        const configs = [
            { ropes: 2, complexity: 1 },
            { ropes: 2, complexity: 2 },
            { ropes: 3, complexity: 2 },
            { ropes: 3, complexity: 3 },
            { ropes: 4, complexity: 3 },
            { ropes: 4, complexity: 4 },
            { ropes: 5, complexity: 4 },
            { ropes: 5, complexity: 5 }
        ];

        const config = configs[this.level - 1];
        this.segments = [];
        let segmentId = 0;

        for (let ropeIndex = 0; ropeIndex < config.ropes; ropeIndex++) {
            const startX = 100 + ropeIndex * 150;
            const startY = 100;
            const points = this.generateRopePath(startX, startY, config.complexity);

            for (let i = 0; i < points.length - 1; i++) {
                this.segments.push({
                    id: segmentId++,
                    ropeIndex,
                    startX: points[i].x,
                    startY: points[i].y,
                    endX: points[i + 1].x,
                    endY: points[i + 1].y,
                    width: 4 + Math.floor(Math.random() * 3)
                });
            }
        }

        document.getElementById('ropeCutsRequired').textContent = Math.ceil(this.segments.length * 0.6);
    }

    generateRopePath(startX, startY, complexity) {
        const points = [{ x: startX, y: startY }];
        let x = startX;
        let y = startY;

        const segmentLength = 40;
        const totalSegments = 3 + complexity * 2;

        for (let i = 0; i < totalSegments; i++) {
            const angle = (Math.random() - 0.5) * Math.PI;
            x += Math.cos(angle) * segmentLength;
            y += Math.sin(angle) * segmentLength;
            points.push({ x, y });
        }

        return points;
    }

    setupCanvasEvents() {
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const clickRadius = 15;
            this.segments.forEach(seg => {
                const distance = this.distanceToSegment(x, y, seg);
                if (distance < clickRadius && !this.cutSegments.has(seg.id)) {
                    this.cutSegment(seg.id);
                }
            });
        });
    }

    distanceToSegment(x, y, segment) {
        const dx = segment.endX - segment.startX;
        const dy = segment.endY - segment.startY;
        const t = Math.max(0, Math.min(1, ((x - segment.startX) * dx + (y - segment.startY) * dy) / (dx * dx + dy * dy)));
        const px = segment.startX + t * dx;
        const py = segment.startY + t * dy;
        return Math.hypot(x - px, y - py);
    }

    cutSegment(segmentId) {
        if (this.cutSegments.has(segmentId)) return;

        // Save to history
        this.history.push(new Set(this.cutSegments));

        this.cutSegments.add(segmentId);
        const cutsRequired = parseInt(document.getElementById('ropeCutsRequired').textContent);

        document.getElementById('ropeCuts').textContent = this.cutSegments.size;

        if (this.cutSegments.size >= cutsRequired) {
            this.levelComplete();
        }

        this.render();
    }

    undo() {
        if (this.history.length > 0) {
            this.cutSegments = this.history.pop();
            document.getElementById('ropeCuts').textContent = this.cutSegments.size;
            this.render();
        }
    }

    reset() {
        this.initialize(this.level);
    }

    levelComplete() {
        gameStateManager.updateGameLevel('untieRope', this.level + 1);
        setTimeout(() => this.showVictory(), 500);
    }

    showVictory() {
        const message = `Level ${this.level} Complete!`;
        const stats = `Cuts: ${this.cutSegments.size}`;
        showVictoryModal(message, stats, () => this.nextLevel());
    }

    nextLevel() {
        this.initialize(this.level + 1);
    }

    render() {
        if (!this.ctx) return;

        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw segments
        this.segments.forEach(seg => {
            const isCut = this.cutSegments.has(seg.id);

            this.ctx.strokeStyle = isCut ? '#cbd5e1' : '#3b82f6';
            this.ctx.lineWidth = seg.width;
            this.ctx.globalAlpha = isCut ? 0.3 : 1;
            this.ctx.lineCap = 'round';

            this.ctx.beginPath();
            this.ctx.moveTo(seg.startX, seg.startY);
            this.ctx.lineTo(seg.endX, seg.endY);
            this.ctx.stroke();

            this.ctx.globalAlpha = 1;
        });

        document.getElementById('untieRopeLevel').textContent = this.level;
    }
}

const untieRopeGame = new UntieRopeGame();