var Mark;
(function (Mark) {
    Mark[Mark["O"] = -1] = "O";
    Mark[Mark["BLANK"] = 0] = "BLANK";
    Mark[Mark["X"] = 1] = "X";
})(Mark || (Mark = {}));
class Board {
    marks;
    nextMark_;
    watcher;
    winner_ = Mark.BLANK;
    constructor(marks = new Array(9).fill(Mark.BLANK), nextMark_ = Mark.X) {
        this.marks = marks;
        this.nextMark_ = nextMark_;
    }
    clone() {
        return new Board([...this.marks], this.nextMark_);
    }
    get(row, col) {
        return this.marks[(row - 1) * 3 + col - 1];
    }
    set(row, col, mark) {
        this.marks[(row - 1) * 3 + col - 1] = mark;
        this.nextMark_ = this.nextMark === Mark.X ? Mark.O : Mark.X;
        if (this.watcher)
            this.watcher.changed(row, col, mark);
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
        new Bot('Scaredy McScaredo', 'img/scaredy.png', new WeakDefensiveStrategy()),
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
class RandomStrategy {
    selectMove(board) {
        return randFrom(board.blankIndices);
    }
}
class WeakDefensiveStrategy {
    selectMove(board) {
        const b = board.clone();
        b.switchTurns();
        const avail = board.blankIndices;
        const want = avail.filter(i => {
            b.moveByIndex(i);
            const v = b.loser === board.nextMark;
            b.undoMove(i);
            return v;
        });
        if (want.length)
            return randFrom(want);
        return randFrom(board.blankIndices);
    }
}
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
