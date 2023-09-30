enum Mark {
    O = -1,
    BLANK = 0,
    X = 1,
}

class Board {
    protected watcher: BoardWatcher;
    protected winner_: Mark|'tie' = Mark.BLANK;

    constructor(
            protected marks: Mark[] = new Array(9).fill(Mark.BLANK), 
            protected nextMark_: Mark = Mark.X) {
    }

    clone(): Board {
        return new Board([...this.marks], this.nextMark_)
    }

    get(row: number, col: number) {
        return this.marks[(row - 1) * 3 + col - 1];
    }

    protected set(row: number, col: number, mark: Mark) {
        this.marks[(row - 1) * 3 + col - 1] = mark;
        this.nextMark_ = this.nextMark === Mark.X ? Mark.O : Mark.X;
        if (this.watcher) this.watcher.changed(row, col, mark);
    }

    get nextMark() {
        return this.nextMark_;
    }

    get blankIndices() {
        return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(i => this.marks[i] == Mark.BLANK);
    }

    move(row: number, col: number) {
        this.moveByIndex((row - 1) * 3 + col - 1);
    }

    moveByIndex(index: number) {
        if (this.winner_ != Mark.BLANK) return;
        if (this.marks[index] !== Mark.BLANK) return;
        const markUsed = this.marks[index] = this.nextMark;
        this.nextMark_ = this.nextMark === Mark.X ? Mark.O : Mark.X;
        
        this.winner_ = this.evaluate();
        if (this.winner_ == Mark.BLANK && this.marks.every(m => m !== Mark.BLANK)) {
            this.winner_ = 'tie';
        }
        
        if (this.watcher) this.watcher.changed(Math.floor(index / 3) + 1, index % 3 + 1, markUsed);
    }

    protected evaluate(): Mark {
        for (let row = 1; row <= 3; ++row) {
            const first = this.get(row, 1);
            if (first == Mark.BLANK) continue;
            if (first == this.get(row, 2) && first == this.get(row, 3)) return first;
        }
        for (let col = 1; col <= 3; ++col) {
            const first = this.get(1, col);
            if (first === Mark.BLANK) continue;
            if (first == this.get(2, col) && first == this.get(3, col)) return first;
        }
        const center = this.get(2, 2);
        if (center != Mark.BLANK) {
            if (center == this.get(1, 1) && center == this.get(3, 3)) return center;
            if (center == this.get(1, 3) && center == this.get(3, 1)) return center;
        }
        return Mark.BLANK;
    }

    get winner() {
        return this.winner_;
    }

    register(watcher: BoardWatcher) {
        this.watcher = watcher;
    }
}

interface BoardWatcher {
    changed(row: number, col: number, mark: Mark)
    won(mark: Mark)
}

class View {
    readonly boardContainer: HTMLElement = document.getElementById('container');
    protected readonly spaces: HTMLElement[] = [];

    protected readonly message: HTMLElement;

    constructor(protected board: Board, protected controller: Controller) {
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

    letter(mark: Mark) {
        switch (mark) {
            case Mark.X: return 'X';
            case Mark.O: return 'O';
        }
        return '';
    }

    changed(row: number, col: number, mark: Mark) {
        this.spaces[(row - 1) * 3 + col - 1].innerText = this.letter(mark);
        this.updateMessage();
    }

    won(mark: Mark) {
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
        (document.getElementById('bot-image') as HTMLImageElement).src = this.controller.bot.imagePath;
        document.getElementById('bot-name').innerText = this.controller.bot.name;
    }
}

class Controller {
    protected markControllers: {
        [Mark.X]: MarkController;
        [Mark.O]: MarkController;
    };

    readonly bot: Bot = new Bot('Randy McRando', 'img/randymcrando.png', new RandomStrategy());

    constructor(protected readonly board: Board) {
        this.markControllers = {
            [Mark.X]: new MarkController(this.board, Mark.X),
            [Mark.O]: new MarkController(this.board, Mark.O, this.bot),
        };
    }

    botTurn(): boolean {
        return this.markControllers[this.board.nextMark].isBot;
    }

    clickedSquare(row: number, col: number) {
        this.markControllers[board.nextMark].clickedSquare(row, col);
    }

    clickedMessage() {
        this.markControllers[board.nextMark].clickedMessage();
    }

    selectedPlayerOption(option: string) {
        const {[Mark.X]: xc, [Mark.O]: oc} = this.markControllers;
        switch(option) {
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
                } else {
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
}

class MarkController {
    constructor(protected readonly board: Board, protected readonly mark: Mark, 
        public bot?: Bot) {}

    clickedSquare(row: number, col: number) {
        if (this.bot) {
            this.clickedMessage();
        } else {
            this.board.move(row, col);
        }
    }

    clickedMessage() {
        const ix = this.bot.strategy.selectMove(board);
        board.moveByIndex(ix);
    }

    get isBot(): boolean {
        return !!this.bot;
    }

    setHuman() {
        this.bot = undefined;
    }
}

class Bot {
    constructor(
        public readonly name: string, 
        public readonly imagePath: string, 
        public readonly strategy: Strategy) {}
}

interface Strategy {
    selectMove(Board): number
}

class RandomStrategy {
    selectMove(board: Board): number {
        const avail = board.blankIndices;
        return avail[Math.floor(Math.random() * avail.length)]
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
        const clickedOption = e.currentTarget as HTMLElement;
        clickedOption.classList.add('selected');
        
        // Handle your logic here based on the selected option
        const selectedValue = clickedOption.getAttribute('data-value');
        controller.selectedPlayerOption(selectedValue);
        view.updateMessage();
    });
});
