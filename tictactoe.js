var Mark;
(function (Mark) {
    Mark[Mark["O"] = -1] = "O";
    Mark[Mark["BLANK"] = 0] = "BLANK";
    Mark[Mark["X"] = 1] = "X";
})(Mark || (Mark = {}));
function opp(mark) {
    return mark === Mark.X ? Mark.O : Mark.X;
}
class Board {
    marks;
    nextMark_;
    watcher;
    winner_ = Mark.BLANK;
    constructor(marks = new Array(9).fill(Mark.BLANK), nextMark_ = Mark.X) {
        this.marks = marks;
        this.nextMark_ = nextMark_;
    }
    reset() {
        this.winner_ = Mark.BLANK;
        for (let i = 0; i < this.marks.length; ++i) {
            this.marks[i] = Mark.BLANK;
        }
        this.nextMark_ = Mark.X;
        this.watcher.reset();
    }
    clone() {
        return new Board([...this.marks], this.nextMark_);
    }
    get(row, col) {
        return this.marks[(row - 1) * 3 + col - 1];
    }
    get nextMark() {
        return this.nextMark_;
    }
    get blankIndices() {
        return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(i => this.marks[i] == Mark.BLANK);
    }
    move(row, col) {
        this.moveByIndex((row - 1) * 3 + col - 1);
    }
    moveByIndex(index) {
        if (this.winner_ != Mark.BLANK)
            return;
        if (this.marks[index] !== Mark.BLANK)
            return;
        const markUsed = this.marks[index] = this.nextMark;
        this.switchTurns();
        this.winner_ = this.evaluate();
        if (this.winner_ == Mark.BLANK && this.marks.every(m => m !== Mark.BLANK)) {
            this.winner_ = 'tie';
        }
        if (this.watcher)
            this.watcher.changed(Math.floor(index / 3) + 1, index % 3 + 1, markUsed);
    }
    undoMove(index) {
        this.marks[index] = Mark.BLANK;
        this.winner_ = Mark.BLANK;
        this.switchTurns();
    }
    switchTurns() {
        this.nextMark_ = this.nextMark === Mark.X ? Mark.O : Mark.X;
    }
    evaluate() {
        for (let row = 1; row <= 3; ++row) {
            const first = this.get(row, 1);
            if (first == Mark.BLANK)
                continue;
            if (first == this.get(row, 2) && first == this.get(row, 3))
                return first;
        }
        for (let col = 1; col <= 3; ++col) {
            const first = this.get(1, col);
            if (first === Mark.BLANK)
                continue;
            if (first == this.get(2, col) && first == this.get(3, col))
                return first;
        }
        const center = this.get(2, 2);
        if (center != Mark.BLANK) {
            if (center == this.get(1, 1) && center == this.get(3, 3))
                return center;
            if (center == this.get(1, 3) && center == this.get(3, 1))
                return center;
        }
        return Mark.BLANK;
    }
    get winner() {
        return this.winner_;
    }
    get loser() {
        switch (this.winner_) {
            case Mark.X:
                return Mark.O;
            case Mark.O:
                return Mark.X;
            default:
                return this.winner_;
        }
    }
    register(watcher) {
        this.watcher = watcher;
    }
}
class View {
    board;
    controller;
    boardContainer = document.getElementById('container');
    spaces = [];
    message;
    constructor(board, controller) {
        this.board = board;
        this.controller = controller;
        for (let row = 1; row <= 3; ++row) {
            for (let col = 1; col <= 3; ++col) {
                const space = document.createElement('div');
                this.spaces.push(space);
                this.boardContainer.appendChild(space);
                space.addEventListener('click', () => this.controller.clickedSquare(row, col));
            }
        }
        board.register(this);
        this.message = document.createElement('div');
        this.message.className = 'message';
        this.message.addEventListener('click', () => this.controller.clickedMessage());
        document.querySelector('body').appendChild(this.message);
        this.updateMessage();
        this.updateBot();
    }
    letter(mark) {
        switch (mark) {
            case Mark.X: return 'X';
            case Mark.O: return 'O';
        }
        return '';
    }
    reset() {
        for (const space of this.spaces) {
            space.innerText = '';
        }
        this.updateMessage();
    }
    changed(row, col, mark) {
        this.spaces[(row - 1) * 3 + col - 1].innerText = this.letter(mark);
        this.updateMessage();
    }
    won(mark) {
        this.message.innerText = `${this.letter(mark)} wins!`;
    }
    updateMessage() {
        switch (this.board.winner) {
            case Mark.BLANK:
                const prefix = this.controller.botTurn() ? 'Click for bot to move ' : 'Your move, ';
                this.message.innerText = `${prefix}${this.letter(this.board.nextMark)}`;
                break;
            case Mark.X:
            case Mark.O:
                this.message.innerText = `${this.letter(this.board.winner)} wins!`;
                break;
            case 'tie':
                this.message.innerText = 'Tie';
        }
    }
    updateBot() {
        const bot = this.controller.getBot();
        document.getElementById('bot-image').src = bot.imagePath;
        document.getElementById('bot-name').innerText = bot.name;
    }
}
class Controller {
    board;
    markControllers;
    bots = [
        new Bot('Randy McRando', 'img/randymcrando.png', new RandomStrategy()),
        new Bot('Scaredy Bot', 'img/scaredy.png', new WeakDefensiveStrategy()),
        new Bot('Basic Bot', 'img/basic.png', new ShortSightedStrategy()),
        new Bot('Logic Bot', 'img/smart.png', new OptimalSearchStrategy()),
    ];
    bot = this.bots[0];
    constructor(board) {
        this.board = board;
        this.markControllers = {
            [Mark.X]: new MarkController(this.board, Mark.X),
            [Mark.O]: new MarkController(this.board, Mark.O, this.bot),
        };
    }
    getBot() {
        return this.bot;
    }
    botTurn() {
        return this.markControllers[this.board.nextMark].isBot;
    }
    clickedSquare(row, col) {
        this.markControllers[board.nextMark].clickedSquare(row, col);
    }
    clickedMessage() {
        if (this.board.winner !== Mark.BLANK) {
            this.board.reset();
        }
        this.markControllers[board.nextMark].clickedMessage();
    }
    selectedPlayerOption(option) {
        const { [Mark.X]: xc, [Mark.O]: oc } = this.markControllers;
        switch (option) {
            case '1px':
                xc.setHuman();
                oc.bot = this.bot;
                break;
            case '1po':
                xc.bot = this.bot;
                oc.setHuman();
                break;
            case '1p?':
                if (Math.random() < 0.5) {
                    xc.setHuman();
                    oc.bot = this.bot;
                }
                else {
                    xc.bot = this.bot;
                    oc.setHuman();
                }
                break;
            case '0p':
                xc.bot = this.bot;
                oc.bot = this.bot;
                break;
            case '2p':
                xc.setHuman();
                oc.setHuman();
                break;
        }
    }
    selectedBot(name) {
        for (const bot of this.bots) {
            if (bot.name === name) {
                this.bot = bot;
                for (const mc of Object.values(this.markControllers)) {
                    if (mc.isBot)
                        mc.bot = bot;
                }
                break;
            }
        }
    }
}
class MarkController {
    board;
    mark;
    bot;
    constructor(board, mark, bot) {
        this.board = board;
        this.mark = mark;
        this.bot = bot;
    }
    clickedSquare(row, col) {
        if (this.bot) {
            this.clickedMessage();
        }
        else {
            this.board.move(row, col);
        }
    }
    clickedMessage() {
        const ix = this.bot.strategy.selectMove(board);
        board.moveByIndex(ix);
    }
    get isBot() {
        return !!this.bot;
    }
    setHuman() {
        this.bot = undefined;
    }
}
class Bot {
    name;
    imagePath;
    strategy;
    constructor(name, imagePath, strategy) {
        this.name = name;
        this.imagePath = imagePath;
        this.strategy = strategy;
    }
}
function randFrom(ts) {
    return ts[Math.floor(Math.random() * ts.length)];
}
function mselect(board, avail, fun) {
    const want = avail.filter(i => {
        board.moveByIndex(i);
        const v = fun(i);
        board.undoMove(i);
        return v;
    });
    return want.length ? randFrom(want) : undefined;
}
// Pick a move at random.
class RandomStrategy {
    selectMove(board) {
        return randFrom(board.blankIndices);
    }
}
// Avoid a loss on the next move if possible.
class WeakDefensiveStrategy {
    fallback = new RandomStrategy();
    selectMove(board) {
        const b = board.clone();
        b.switchTurns();
        const avail = board.blankIndices;
        const avoidLoss = mselect(b, avail, i => b.loser === board.nextMark);
        if (avoidLoss !== undefined)
            return avoidLoss;
        return this.fallback.selectMove(board);
    }
}
// Win on the next move if possible, or else avoid a loss if possible.
class ShortSightedStrategy {
    fallback = new WeakDefensiveStrategy();
    selectMove(board) {
        const b = board.clone();
        const avail = board.blankIndices;
        const win = mselect(b, avail, i => b.winner === board.nextMark);
        if (win !== undefined)
            return win;
        return this.fallback.selectMove(board);
    }
}
// Find the best move assuming the opponent makes the best move.
class OptimalSearchStrategy {
    selectMove(curBoard) {
        const [i, winner] = this.bestResultFor(curBoard, curBoard.nextMark, false);
        return i;
    }
    bestResultFor(curBoard, mark, fastMode) {
        const avail = curBoard.blankIndices;
        const b = curBoard.clone();
        const wins = [];
        const ties = [];
        for (const i of avail) {
            b.moveByIndex(i);
            let winner = b.winner;
            if (winner === Mark.BLANK) {
                winner = this.bestResultFor(b, opp(mark), true)[1];
            }
            if (winner === mark) {
                if (fastMode) {
                    return [i, mark];
                }
                else {
                    wins.push(i);
                }
            }
            else if (winner == 'tie') {
                ties.push(i);
            }
            b.undoMove(i);
        }
        if (wins.length)
            return [randFrom(wins), mark];
        if (ties.length)
            return [randFrom(ties), 'tie'];
        return [randFrom(avail), opp(mark)];
    }
}
const strats = {
    'rand': new RandomStrategy(),
    'weak': new WeakDefensiveStrategy(),
    'shrt': new ShortSightedStrategy(),
    'opts': new OptimalSearchStrategy(),
};
const stratNames = ['rand', 'weak', 'shrt', 'opts'];
function testBotVsBot() {
    const N = 1000;
    for (const sn1 of stratNames) {
        const s1 = strats[sn1];
        for (const sn2 of stratNames) {
            const s2 = strats[sn2];
            const results = new Map();
            for (let i = 0; i < N; ++i) {
                const board = new Board();
                while (board.winner == Mark.BLANK) {
                    const s = board.nextMark == Mark.X ? s1 : s2;
                    const m = s.selectMove(board);
                    board.moveByIndex(m);
                }
                results.set(board.winner, 1 + (results.get(board.winner) || 0));
            }
            console.log(sn1, sn2);
            console.log('  X', results.get(Mark.X));
            console.log('  O', results.get(Mark.O));
            console.log('  =', results.get('tie'));
            const score = (results.get(Mark.X) + 0.5 * results.get('tie')) / N;
            console.log('  S', score);
        }
    }
}
//testBotVsBot();
const board = new Board();
const controller = new Controller(board);
setupPlayerNumberOptions();
setupBotOptions();
const view = new View(board, controller);
function setupPlayerNumberOptions() {
    const options = document.querySelectorAll('#pn-options .option');
    options[0].classList.add('selected');
    options.forEach(option => {
        option.addEventListener('click', (e) => {
            options.forEach(opt => opt.classList.remove('selected'));
            const clickedOption = e.currentTarget;
            clickedOption.classList.add('selected');
            const selectedValue = clickedOption.getAttribute('data-value');
            controller.selectedPlayerOption(selectedValue);
            view.updateMessage();
        });
    });
}
function setupBotOptions() {
    const options = document.querySelectorAll('#bot-options .option');
    options[0].classList.add('selected');
    options.forEach(option => {
        option.addEventListener('click', (e) => {
            options.forEach(opt => opt.classList.remove('selected'));
            const clickedOption = e.currentTarget;
            clickedOption.classList.add('selected');
            const selectedName = clickedOption.innerText;
            controller.selectedBot(selectedName);
            view.updateBot();
        });
    });
}
