// Untie the Rope Game - Physics-based puzzle solving
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
        // Create empty grid with available slots
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
            // Level 1: Simple - 2 ropes, easy to untangle
            {
                ropes: 2,
                pins: 6,
                complexity: 'simple',
                solution: 'straightforward'
            },
            // Level 2: Two colors - 2 ropes different colors, slightly tangled
            {
                ropes: 2,
                pins: 8,
                complexity: 'easy',
                solution: 'one_move'
            },
            // Level 3: Triple play - 3 ropes, basic puzzle
            {
                ropes: 3,
                pins: 10,
                complexity: 'medium',
                solution: 'three_moves'
            },
            // Level 4: Complex tangle - 3 ropes, more entanglement
            {
                ropes: 3,
                pins: 12,
                complexity: 'medium',
                solution: 'sequence'
            },
            // Level 5: Master puzzle - 4 ropes, strategic thinking needed
            {
                ropes: 4,
                pins: 14,
                complexity: 'hard',
                solution: 'complex_sequence'
            },
            // Level 6: Expert challenge - 4 ropes, deep tangle
            {
                ropes: 4,
                pins: 16,
                complexity: 'hard',
                solution: 'expert'
            },
            // Level 7: Ultimate - 5 ropes, very complex
            {
                ropes: 5,
                pins: 18,
                complexity: 'expert',
                solution: 'ultimate'
            },
            // Level 8: Zen Master - 5 ropes, maximum complexity
            {
                ropes: 5,
                pins: 20,
                complexity: 'expert',
                solution: 'zen_master'
            }
        ];

        const config = configs[this.level - 1];
        this.ropes = [];
        this.pins = [];

        const ropeColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#a855f7'];
        const usedSlots = new Set();

        // Generate pins for the puzzle
        for (let i = 0; i < config.pins; i++) {
            let slot;
            let attempts = 0;
            do {
                slot = this.boardSlots[Math.floor(Math.random() * this.boardSlots.length)];
                attempts++;
            } while (usedSlots.has(`${slot.row},${slot.col}`) && attempts < 20);

            if (attempts < 20) {
                usedSlots.add(`${slot.row},${slot.col}`);
                this.pins.push({
                    id: i,
                    x: slot.x,
                    y: slot.y,
                    ropeLoops: [] // Which ropes pass through this pin
                });
            }
        }

        // Generate ropes with loops through pins
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
                    loops: this.generateRopeLoops(ropeIndex, config.complexity)
                };

                this.ropes.push(rope);
            }
        }

        this.updateMovesRequired();
    }

    generateRopeLoops(ropeIndex, complexity) {
        // Create loops through random pins to create the tangle
        const loopCount = complexity === 'simple' ? 2 : 
                         complexity === 'easy' ? 3 :
                         complexity === 'medium' ? 4 :
                         complexity === 'hard' ? 5 : 6;

        const loops = [];
        const shuffledPins = [...this.pins].sort(() => Math.random() - 0.5);

        for (let i = 0; i < Math.min(loopCount, shuffledPins.length); i++) {
            loops.push({
                pinId: shuffledPins[i].id,
                pinX: shuffledPins[i].x,
                pinY: shuffledPins[i].y
            });
        }

        return loops;
    }

    updateMovesRequired() {
        // Calculate estimated moves needed to solve (for reference)
        const minMoves = Math.ceil(this.ropes.length * 1.5);
        const maxMoves = Math.ceil(this.ropes.length * 3);
        this.minMovesEstimate = minMoves;
        this.maxMovesEstimate = maxMoves;
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

        // Check if clicked on a rope
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

        // Update cursor
        if (this.selectedRope !== null) {
            this.canvas.style.cursor = 'grabbing';
            const rope = this.ropes[this.selectedRope];
            const dx = x - this.dragStart.x;
            const dy = y - this.dragStart.y;

            rope.startX = this.dragStart.startX + dx;
            rope.startY = this.dragStart.startY + dy;

            this.render();
        } else {
            // Check if hovering over rope
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
            
            // Snap to grid
            rope.startX = Math.round(rope.startX / this.cellSize) * this.cellSize + this.cellSize / 2 + 50;
            rope.startY = Math.round(rope.startY / this.cellSize) * this.cellSize + this.cellSize / 2 + 50;

            this.moves++;
            document.getElementById('ropeMoves').textContent = this.moves;

            this.selectedRope = null;
            this.dragStart = null;

            // Check if puzzle is solved
            if (this.isPuzzleSolved()) {
                this.levelComplete();
            }

            this.render();
        }
        this.canvas.style.cursor = 'default';
    }

    isPointNearRope(x, y, rope) {
        const clickRadius = 20;

        // Check start point
        const distStart = Math.hypot(x - rope.startX, y - rope.startY);
        if (distStart < clickRadius) return true;

        // Check end point
        const distEnd = Math.hypot(x - rope.endX, y - rope.endY);
        if (distEnd < clickRadius) return true;

        // Check path (simplified)
        const pathDist = this.distanceToPath(x, y, rope);
        return pathDist < clickRadius;
    }

    distanceToPath(x, y, rope) {
        let minDist = Infinity;

        // Check distance to start->end line
        const dx = rope.endX - rope.startX;
        const dy = rope.endY - rope.startY;
        const t = Math.max(0, Math.min(1, ((x - rope.startX) * dx + (y - rope.startY) * dy) / (dx * dx + dy * dy)));
        const px = rope.startX + t * dx;
        const py = rope.startY + t * dy;
        minDist = Math.hypot(x - px, y - py);

        // Check distance to loops
        rope.loops.forEach(loop => {
            const loopDist = Math.hypot(x - loop.pinX, y - loop.pinY);
            minDist = Math.min(minDist, loopDist);
        });

        return minDist;
    }

    isPuzzleSolved() {
        // Check if all ropes are untangled
        // Ropes are solved when they don't cross each other excessively
        let totalIntersections = 0;

        for (let i = 0; i < this.ropes.length; i++) {
            for (let j = i + 1; j < this.ropes.length; j++) {
                if (this.ropesIntersect(this.ropes[i], this.ropes[j])) {
                    totalIntersections++;
                }
            }
        }

        // Puzzle is solved when there are minimal intersections
        const threshold = Math.ceil(this.ropes.length * 0.5);
        return totalIntersections <= threshold;
    }

    ropesIntersect(rope1, rope2) {
        // Check if two ropes' paths intersect
        const dx1 = rope1.endX - rope1.startX;
        const dy1 = rope1.endY - rope1.startY;
        const dx2 = rope2.endX - rope2.startX;
        const dy2 = rope2.endY - rope2.startY;

        const cross = dx1 * dy2 - dy1 * dx2;
        if (Math.abs(cross) < 1e-8) return false;

        const t = ((rope2.startX - rope1.startX) * dy2 - (rope2.startY - rope1.startY) * dx2) / cross;
        const u = ((rope2.startX - rope1.startX) * dy1 - (rope2.startY - rope1.startY) * dx1) / cross;

        return (t >= 0 && t <= 1) && (u >= 0 && u <= 1);
    }

    undo() {
        if (this.history.length > 0) {
            this.ropes = this.history.pop();
            this.moves = Math.max(0, this.moves - 1);
            document.getElementById('ropeMoves').textContent = this.moves;
            this.render();
        }
    }

    reset() {
        this.initialize(this.level);
    }

    levelComplete() {
        gameStateManager.updateGameLevel('untieRope', this.level + 1);
        gameStateManager.recordBestScore('untieRope', 'bestMoves', this.level, this.moves);
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

    render() {
        if (!this.ctx) return;

        // Clear canvas with gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, this.boardSize, this.boardSize);
        gradient.addColorStop(0, '#1a1f35');
        gradient.addColorStop(1, '#0f172a');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.boardSize, this.boardSize);

        // Draw grid
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

        // Draw ropes
        this.ropes.forEach((rope, index) => {
            this.drawRope(rope, index === this.selectedRope);
        });

        // Draw pins
        this.pins.forEach(pin => {
            this.drawPin(pin);
        });

        // Draw UI info
        this.drawUI();
    }

    drawRope(rope, isSelected) {
        const lineWidth = isSelected ? 6 : this.ropeWidth;
        const opacity = isSelected ? 1 : 0.8;

        this.ctx.strokeStyle = rope.color;
        this.ctx.globalAlpha = opacity;
        this.ctx.lineWidth = lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Draw shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;

        this.ctx.beginPath();
        this.ctx.moveTo(rope.startX, rope.startY);

        // Draw through loops
        rope.loops.forEach(loop => {
            this.ctx.lineTo(loop.pinX, loop.pinY);
        });

        this.ctx.lineTo(rope.endX, rope.endY);
        this.ctx.stroke();

        this.ctx.globalAlpha = 1;
        this.ctx.shadowColor = 'transparent';

        // Draw rope ends (handles)
        this.ctx.fillStyle = rope.color;
        this.ctx.beginPath();
        this.ctx.arc(rope.startX, rope.startY, 8, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = rope.color;
        this.ctx.beginPath();
        this.ctx.arc(rope.endX, rope.endY, 8, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawPin(pin) {
        // Pin shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(pin.x + 2, pin.y + 2, this.pinRadius + 1, 0, Math.PI * 2);
        this.ctx.fill();

        // Pin body (metallic)
        const pinGradient = this.ctx.createRadialGradient(pin.x - 2, pin.y - 2, 0, pin.x, pin.y, this.pinRadius);
        pinGradient.addColorStop(0, '#e2e8f0');
        pinGradient.addColorStop(1, '#64748b');
        this.ctx.fillStyle = pinGradient;
        this.ctx.beginPath();
        this.ctx.arc(pin.x, pin.y, this.pinRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Pin highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.beginPath();
        this.ctx.arc(pin.x - 3, pin.y - 3, this.pinRadius * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawUI() {
        // Level info
        this.ctx.fillStyle = '#f1f5f9';
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.fillText(`Level ${this.level}`, 60, 30);
        this.ctx.font = '14px sans-serif';
        this.ctx.fillStyle = '#cbd5e1';
        this.ctx.fillText(`Moves: ${this.moves}`, 60, 50);

        // Instructions
        this.ctx.font = '12px sans-serif';
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.fillText('Drag rope ends to untangle • Snap to grid', 60, this.boardSize - 20);
    }
}

const untieRopeGame = new UntieRopeGame();