// Color Sort Game Implementation
class ColorSortGame {
    constructor() {
        this.level = 1;
        this.tubes = [];
        this.selectedTube = null;
        this.moves = 0;
        this.history = [];
        this.maxLevel = 10;
    }

    initialize(level = 1) {
        this.level = Math.min(level, this.maxLevel);
        this.moves = 0;
        this.history = [];
        this.selectedTube = null;
        this.generateLevel();
        this.render();
    }

    generateLevel() {
        const colorCount = Math.min(3 + Math.floor(this.level / 3), 8);
        const tubeCount = colorCount + 1;

        this.tubes = [];

        // Create tubes with balls
        for (let i = 0; i < colorCount; i++) {
            const colorNames = ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'cyan', 'orange'];
            const color = colorNames[i];
            const tube = {
                balls: [
                    { color, id: `${color}-1` },
                    { color, id: `${color}-2` },
                    { color, id: `${color}-3` }
                ]
            };
            this.tubes.push(tube);
        }

        // Shuffle balls
        let allBalls = [];
        this.tubes.forEach(tube => {
            allBalls = allBalls.concat(tube.balls);
        });

        // Shuffle
        for (let i = allBalls.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allBalls[i], allBalls[j]] = [allBalls[j], allBalls[i]];
        }

        // Redistribute
        this.tubes = [];
        for (let i = 0; i < tubeCount; i++) {
            this.tubes.push({ balls: [] });
        }

        allBalls.forEach((ball, index) => {
            this.tubes[index % tubeCount].balls.push(ball);
        });
    }

    selectTube(index) {
        if (this.selectedTube === null) {
            if (this.tubes[index].balls.length > 0) {
                this.selectedTube = index;
            }
        } else {
            if (this.selectedTube === index) {
                this.selectedTube = null;
            } else {
                this.moveBalls(this.selectedTube, index);
                this.selectedTube = null;
            }
        }
        this.render();
    }

    moveBalls(fromIndex, toIndex) {
        const fromTube = this.tubes[fromIndex];
        const toTube = this.tubes[toIndex];

        if (fromTube.balls.length === 0) return;

        // Save to history
        this.history.push(JSON.parse(JSON.stringify(this.tubes)));

        // Get the top ball from source
        const topBall = fromTube.balls[fromTube.balls.length - 1];

        // Check if move is valid
        if (toTube.balls.length > 0) {
            const topTargetBall = toTube.balls[toTube.balls.length - 1];
            if (topBall.color !== topTargetBall.color) return;
        }

        if (toTube.balls.length >= 3) return;

        // Move ball
        fromTube.balls.pop();
        toTube.balls.push(topBall);
        this.moves++;

        if (this.isLevelComplete()) {
            this.levelComplete();
        }
    }

    undo() {
        if (this.history.length > 0) {
            this.tubes = this.history.pop();
            this.moves = Math.max(0, this.moves - 1);
            this.render();
        }
    }

    reset() {
        this.initialize(this.level);
    }

    isLevelComplete() {
        return this.tubes.every(tube => {
            if (tube.balls.length === 0) return true;
            const color = tube.balls[0].color;
            return tube.balls.every(ball => ball.color === color);
        });
    }

    levelComplete() {
        gameStateManager.updateGameLevel('colorSort', this.level + 1);
        const isOptimal = this.moves <= 3 + this.level;
        if (isOptimal) {
            gameStateManager.recordBestScore('colorSort', 'bestMoves', this.level, this.moves);
        }
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
        const canvas = document.getElementById('colorSortCanvas');
        if (!canvas) return;

        canvas.innerHTML = '';

        this.tubes.forEach((tube, index) => {
            const tubeEl = document.createElement('div');
            tubeEl.className = 'tube';
            if (this.selectedTube === index) tubeEl.classList.add('selected');

            tube.balls.forEach(ball => {
                const ballEl = document.createElement('div');
                ballEl.className = 'ball';
                ballEl.style.backgroundColor = GameEngine.getColorByName(ball.color);
                tubeEl.appendChild(ballEl);
            });

            tubeEl.addEventListener('click', () => this.selectTube(index));
            canvas.appendChild(tubeEl);
        });

        document.getElementById('colorSortLevel').textContent = this.level;
        document.getElementById('colorSortMoves').textContent = this.moves;
    }
}

const colorSortGame = new ColorSortGame();