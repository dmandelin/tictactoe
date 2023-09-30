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
        this.nextMark_ = this.nextMark === Mark.X ? Mark.O : Mark.X;
        this.winner_ = this.evaluate();
        if (this.winner_ == Mark.BLANK && this.marks.every(m => m !== Mark.BLANK)) {
            this.winner_ = 'tie';
        }
        if (this.watcher)
            this.watcher.changed(Math.floor(index / 3) + 1, index % 3 + 1, markUsed);
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
}
class Controller {
    board;
    markControllers;
    constructor(board) {
        this.board = board;
        this.markControllers = {
            [Mark.X]: new MarkController(this.board, Mark.X, false),
            [Mark.O]: new MarkController(this.board, Mark.O, true),
        };
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
                oc.setBot();
                break;
            case '1po':
                xc.setBot();
                oc.setHuman();
                break;
            case '1p?':
                if (Math.random() < 0.5) {
                    xc.setHuman();
                    oc.setBot();
                }
                else {
                    xc.setBot();
                    oc.setHuman();
                }
                break;
            case '0p':
                xc.setBot();
                oc.setBot();
                break;
            case '2p':
                xc.setHuman();
                oc.setHuman();
                break;
        }
    }
}
class MarkController {
    board;
    mark;
    isBot_;
    botStrategy = new RandomStrategy();
    constructor(board, mark, isBot_) {
        this.board = board;
        this.mark = mark;
        this.isBot_ = isBot_;
    }
    clickedSquare(row, col) {
        if (this.isBot) {
            this.clickedMessage();
        }
        else {
            this.board.move(row, col);
        }
    }
    clickedMessage() {
        const ix = this.botStrategy.selectMove(board);
        board.moveByIndex(ix);
    }
    get isBot() {
        return this.isBot_;
    }
    setBot() {
        this.isBot_ = true;
    }
    setHuman() {
        this.isBot_ = false;
    }
}
class RandomStrategy {
    selectMove(board) {
        const avail = board.blankIndices;
        return avail[Math.floor(Math.random() * avail.length)];
    }
}
const board = new Board();
const controller = new Controller(board);
const view = new View(board, controller);
const options = document.querySelectorAll('.option');
options[0].classList.add('selected');
options.forEach(option => {
    option.addEventListener('click', (e) => {
        // Remove 'selected' class from all options
        options.forEach(opt => opt.classList.remove('selected'));
        // Add 'selected' class to clicked option
        const clickedOption = e.currentTarget;
        clickedOption.classList.add('selected');
        // Handle your logic here based on the selected option
        const selectedValue = clickedOption.getAttribute('data-value');
        controller.selectedPlayerOption(selectedValue);
        view.updateMessage();
    });
});
