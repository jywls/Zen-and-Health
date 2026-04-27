// Untie the Rope Game - Polished Version
class UntieRopeGame {
    constructor() {
        this.level = 1;
        this.maxLevel = 8;
        this.canvas = null;
        this.ctx = null;
        this.ropes = [];
        this.pins = [];
        this.selectedRope = null;
        this.dragStart = null;
        this.history = [];
        this.boardSize = 800;
        this.cellSize = 50;
        this.pinRadius = 8;
        this.ropeWidth = 4;
        this.moves = 0;
    }

    initialize(level = 1) {
        this.level = Math.min(level, this.maxLevel);
        this.moves = 0;
        this.history = [];
        this.selectedRope = null;
        this.dragStart = null;

        this.canvas = document.getElementById('ropeCanvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.boardSize;
        this.canvas.height = this.boardSize;

        this.setupBoard();
        this.generatePuzzle();
        this.setupCanvasEvents();
        this.render();
    }

    setupBoard() {
        this.boardSlots = [];
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                this.boardSlots.push({
                    row,
                    col,
                    x: col * this.cellSize + this.cellSize / 2 + 50,
                    y: row * this.cellSize + this.cellSize / 2 + 50,
                    occupied: false,
                    occupiedBy: null
                });
            }
        }
    }

    generatePuzzle() {
        const configs = [
            { ropes: 2, pins: 6, complexity: 'simple' },
            { ropes: 2, pins: 8, complexity: 'easy' },
            { ropes: 3, pins: 10, complexity: 'medium' },
            { ropes: 3, pins: 12, complexity: 'medium' },
            { ropes: 4, pins: 14, complexity: 'hard' },
            { ropes: 4, pins: 16, complexity: 'hard' },
            { ropes: 5, pins: 18, complexity: 'expert' },
            { ropes: 5, pins: 20, complexity: 'expert' }
        ];

        const config = configs[this.level - 1];
        this.ropes = [];
        this.pins = [];

        const ropeColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#a855f7'];
        const usedSlots = new Set();

        // Generate pins
        for (let i = 0; i < config.pins; i++) {
            let slot;
            let attempts = 0;
            do {
                slot = this.boardSlots[Math.floor(Math.random() * this.boardSlots.length)];
                attempts++;
            } while (usedSlots.has(`${slot.row},${slot.col}`) && attempts < 20);

            if (attempts < 20) {
                usedSlots.add(`${slot.row},${slot.col}`);
                this.pins.push({ id: i, x: slot.x, y: slot.y, ropeLoops: [] });
            }
        }

        // Generate ropes
        for (let ropeIndex = 0; ropeIndex < config.ropes; ropeIndex++) {
            const color = ropeColors[ropeIndex % ropeColors.length];
            const startSlot = this.boardSlots[Math.floor(Math.random() * this.boardSlots.length)];
            const endSlot = this.boardSlots[Math.floor(Math.random() * this.boardSlots.length)];

            if (startSlot !== endSlot) {
                usedSlots.add(`${startSlot.row},${startSlot.col}`);
                usedSlots.add(`${endSlot.row},${endSlot.col}`);

                const rope = {
                    id: ropeIndex,
                    color,
                    startX: startSlot.x,
                    startY: startSlot.y,
                    endX: endSlot.x,
                    endY: endSlot.y,
                    loops: this.generateRopeLoops(config.complexity)
                };
                this.ropes.push(rope);
            }
        }
    }

    generateRopeLoops(complexity) {
        const loopCount = complexity === 'simple' ? 2 :
                         complexity === 'easy' ? 3 :
                         complexity === 'medium' ? 4 :
                         complexity === 'hard' ? 5 : 6;

        const loops = [];
        const shuffledPins = [...this.pins].sort(() => Math.random() - 0.5);

        for (let i = 0; i < Math.min(loopCount, shuffledPins.length); i++) {
            loops.push({ pinId: shuffledPins[i].id, pinX: shuffledPins[i].x, pinY: shuffledPins[i].y });
        }
        return loops;
    }

    setupCanvasEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        for (let i = 0; i < this.ropes.length; i++) {
            const rope = this.ropes[i];
            if (this.isPointNearRope(x, y, rope)) {
                this.selectedRope = i;
                this.dragStart = { x, y, startX: rope.startX, startY: rope.startY };
                this.history.push(JSON.parse(JSON.stringify(this.ropes)));
                break;
            }
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.selectedRope !== null) {
            this.canvas.style.cursor = 'grabbing';
            const rope = this.ropes[this.selectedRope];
            const dx = x - this.dragStart.x;
            const dy = y - this.dragStart.y;

            rope.startX = this.dragStart.startX + dx;
            rope.startY = this.dragStart.startY + dy;

            this.render();
        } else {
            let hovering = false;
            for (let i = 0; i < this.ropes.length; i++) {
                if (this.isPointNearRope(x, y, this.ropes[i])) {
                    hovering = true;
                    break;
                }
            }
            this.canvas.style.cursor = hovering ? 'grab' : 'default';
        }
    }

    handleMouseUp(e) {
        if (this.selectedRope !== null) {
            const rope = this.ropes[this.selectedRope];
            rope.startX = Math.round(rope.startX / this.cellSize) * this.cellSize + this.cellSize / 2 + 50;
            rope.startY = Math.round(rope.startY / this.cellSize) * this.cellSize + this.cellSize / 2 + 50;

            if (rope.startX !== this.dragStart.startX || rope.startY !== this.dragStart.startY) {
                this.moves++;
                document.getElementById('ropeMoves').textContent = this.moves;
            }

            this.selectedRope = null;
            this.dragStart = null;

            if (this.isPuzzleSolved()) {
                for (let i = this.ropes.length - 1; i >= 0; i--) {
                    this.animateRopePop(i);
                }
                this.levelComplete();
            }

            this.render();
        }
        this.canvas.style.cursor = 'default';
    }

    isPointNearRope(x, y, rope) {
        const clickRadius = 20;
        const distStart = Math.hypot(x - rope.startX, y - rope.startY);
        if (distStart < clickRadius) return true;
        const distEnd = Math.hypot(x - rope.endX, y - rope.endY);
        if (distEnd < clickRadius) return true;
        return this.distanceToPath(x, y, rope) < clickRadius;
    }

    distanceToPath(x, y, rope) {
        let minDist = Infinity;
        const dx = rope.endX - rope.startX;
        const dy = rope.endY - rope.startY;
        const t = Math.max(0, Math.min(1, ((x - rope.startX) * dx + (y - rope.startY) * dy) / (dx * dx + dy * dy)));
        const px = rope.startX + t * dx;
        const py = rope.startY + t * dy;
        minDist = Math.hypot(x - px, y - py);

        rope.loops.forEach(loop => {
            const loopDist = Math.hypot(x - loop.pinX, y - loop.pinY);
            minDist = Math.min(minDist, loopDist);
        });
        return minDist;
    }


    // --- Strict puzzle solved check ---
    isPuzzleSolved() {
        for (let i = 0; i < this.ropes.length; i++) {
            for (let j = i + 1; j < this.ropes.length; j++) {
                if (this.ropePathsIntersect(this.ropes[i], this.ropes[j])) {
                    return false;
                }
            }
        }
        return true;
    }

    ropePathsIntersect(rope1, rope2) {
        const path1 = [{x: rope1.startX, y: rope1.startY}, ...rope1.loops, {x: rope1.endX, y: rope1.endY}];
        const path2 = [{x: rope2.startX, y: rope2.startY}, ...rope2.loops, {x: rope2.endX, y: rope2.endY}];

        for (let i = 0; i < path1.length - 1; i++) {
            for (let j = 0; j < path2.length - 1; j++) {
                if (this.segmentsIntersect(path1[i], path1[i+1], path2[j], path2[j+1])) {
                    return true;
                }
            }
        }
        return false;
    }

    segmentsIntersect(p1, p2, q1, q2) {
        const ccw = (a, b, c) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
        return (ccw(p1, q1, q2) !== ccw(p2, q1, q2)) && (ccw(p1, p2, q1) !== ccw(p1, p2, q2));
    }

    // --- Rope pop-off animation ---
    animateRopePop(ropeIndex) {
        const rope = this.ropes[ropeIndex];
        let alpha = 1;
        let scale = 1;

        const animate = () => {
            this.render(); // redraw background and other ropes

            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.strokeStyle = rope.color;
            this.ctx.lineWidth = this.ropeWidth * scale;

            this.ctx.beginPath();
            this.ctx.moveTo(rope.startX, rope.startY);
            rope.loops.forEach(loop => this.ctx.lineTo(loop.pinX, loop.pinY));
            this.ctx.lineTo(rope.endX, rope.endY);
            this.ctx.stroke();
            this.ctx.restore();

            alpha -= 0.05;
            scale += 0.05;

            if (alpha > 0) {
                requestAnimationFrame(animate);
            } else {
                this.ropes.splice(ropeIndex, 1);
                this.render();
            }
        };
        animate();
    }

    // --- Level progression ---
    levelComplete() {
        setTimeout(() => this.showVictory(), 500);
    }

    showVictory() {
        const message = `Level ${this.level} Complete!`;
        const stats = `Moves: ${this.moves}`;
        showVictoryModal(message, stats, () => this.nextLevel());
    }

    nextLevel() {
        this.initialize(this.level + 1);
    }

    // --- Rendering ---
    render() {
        if (!this.ctx) return;

        const gradient = this.ctx.createLinearGradient(0, 0, this.boardSize, this.boardSize);
        gradient.addColorStop(0, '#1a1f35');
        gradient.addColorStop(1, '#0f172a');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.boardSize, this.boardSize);

        // Grid
        this.ctx.strokeStyle = '#334155';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
            const pos = i * this.cellSize + 50;
            this.ctx.beginPath();
            this.ctx.moveTo(pos, 50);
            this.ctx.lineTo(pos, this.boardSize - 50);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(50, pos);
            this.ctx.lineTo(this.boardSize - 50, pos);
            this.ctx.stroke();
        }

        // Ropes
        this.ropes.forEach((rope, index) => {
            this.drawRope(rope, index === this.selectedRope);
        });

        // Pins
        this.pins.forEach(pin => {
            this.drawPin(pin);
        });

        // UI
        this.drawUI();
    }

    drawRope(rope, isSelected) {
        const gradient = this.ctx.createLinearGradient(rope.startX, rope.startY, rope.endX, rope.endY);
        gradient.addColorStop(0, rope.color);
        gradient.addColorStop(1, "#222");

        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = isSelected ? 6 : this.ropeWidth;
        this.ctx.shadowColor = "rgba(0,0,0,0.4)";
        this.ctx.shadowBlur = 6;

        this.ctx.beginPath();
        this.ctx.moveTo(rope.startX, rope.startY);
        rope.loops.forEach(loop => this.ctx.lineTo(loop.pinX, loop.pinY));
        this.ctx.lineTo(rope.endX, rope.endY);
        this.ctx.stroke();

        this.ctx.shadowBlur = 0;

        // Rope ends
        this.ctx.fillStyle = rope.color;
        this.ctx.beginPath();
        this.ctx.arc(rope.startX, rope.startY, 8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(rope.endX, rope.endY, 8, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawPin(pin) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(pin.x + 2, pin.y + 2, this.pinRadius + 1, 0, Math.PI * 2);
        this.ctx.fill();

        const pinGradient = this.ctx.createRadialGradient(pin.x - 2, pin.y - 2, 0, pin.x, pin.y, this.pinRadius);
        pinGradient.addColorStop(0, '#e2e8f0');
        pinGradient.addColorStop(1, '#64748b');
        this.ctx.fillStyle = pinGradient;
        this.ctx.beginPath();
        this.ctx.arc(pin.x, pin.y, this.pinRadius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.beginPath();
        this.ctx.arc(pin.x - 3, pin.y - 3, this.pinRadius * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawUI() {
        this.ctx.fillStyle = '#f1f5f9';
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.fillText(`Level ${this.level}`, 60, 30);
        this.ctx.font = '14px sans-serif';
        this.ctx.fillStyle = '#cbd5e1';
        this.ctx.fillText(`Moves: ${this.moves}`, 60, 50);

        this.ctx.font = '12px sans-serif';
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.fillText('Drag rope ends to untangle • Snap to grid', 60, this.boardSize - 20);
    }
}

const untieRopeGame = new UntieRopeGame();
