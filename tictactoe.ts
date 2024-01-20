enum Mark {
    O = -1,
    BLANK = 0,
    X = 1,
}

function opp(mark: Mark) {
    return mark === Mark.X ? Mark.O : Mark.X;
}

interface ReadonlyBoard {
    clone(): Board
    get(row: number, col: number): Mark
    blankIndices: number[]
    nextMark: Mark
}

class Board {
    protected watcher: BoardWatcher;
    protected winner_: Mark|'tie' = Mark.BLANK;

    constructor(
            protected marks: Mark[] = new Array(9).fill(Mark.BLANK), 
            protected nextMark_: Mark = Mark.X) {
    }

    reset() {
        this.winner_ = Mark.BLANK;
        for (let i = 0; i < this.marks.length; ++i) {
            this.marks[i] = Mark.BLANK;
        }
        this.nextMark_ = Mark.X;

        this.watcher.reset();
    }

    clone(): Board {
        return new Board([...this.marks], this.nextMark_)
    }

    get(row: number, col: number) {
        return this.marks[(row - 1) * 3 + col - 1];
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
        this.switchTurns();
        
        this.winner_ = this.evaluate();
        if (this.winner_ == Mark.BLANK && this.marks.every(m => m !== Mark.BLANK)) {
            this.winner_ = 'tie';
        }
        
        if (this.watcher) this.watcher.changed(Math.floor(index / 3) + 1, index % 3 + 1, markUsed);
    }

    undoMove(index: number) {
        this.marks[index] = Mark.BLANK;
        this.winner_ = Mark.BLANK;
        this.switchTurns();
    }

    switchTurns() {
        this.nextMark_ = this.nextMark === Mark.X ? Mark.O : Mark.X;
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

    register(watcher: BoardWatcher) {
        this.watcher = watcher;
    }
}

interface BoardWatcher {
    changed(row: number, col: number, mark: Mark)
    won(mark: Mark)
    reset()
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

    reset() {
        for (const space of this.spaces) {
            space.innerText = '';
        }
        this.updateMessage();
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
        const bot = this.controller.getBot();
        (document.getElementById('bot-image') as HTMLImageElement).src = bot.imagePath;
        document.getElementById('bot-name').innerText = bot.name;
    }
}

class Controller {
    protected markControllers: {
        [Mark.X]: MarkController;
        [Mark.O]: MarkController;
    };

    readonly bots = [
        new Bot('Randy McRando', 'img/randymcrando.png', new RandomStrategy()),
        new Bot('Scaredy Bot', 'img/scaredy.png', new WeakDefensiveStrategy()),
        new Bot('Basic Bot', 'img/basic.png', new ShortSightedStrategy()),
        new Bot('Logic Bot', 'img/smart.png', new OptimalSearchStrategy()),
    ];

    protected bot: Bot = this.bots[0];

    constructor(protected readonly board: Board) {
        this.markControllers = {
            [Mark.X]: new MarkController(this.board, Mark.X),
            [Mark.O]: new MarkController(this.board, Mark.O, this.bot),
        };
    }

    getBot() {
        return this.bot;
    }

    botTurn(): boolean {
        return this.markControllers[this.board.nextMark].isBot;
    }

    clickedSquare(row: number, col: number) {
        this.markControllers[board.nextMark].clickedSquare(row, col);
    }

    clickedMessage() {
        if (this.board.winner !== Mark.BLANK) {
            this.board.reset();
        }
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

    selectedBot(name: string) {
        for (const bot of this.bots) {
            if (bot.name === name) {
                this.bot = bot;
                for (const mc of Object.values(this.markControllers)) {
                    if (mc.isBot) mc.bot = bot;
                }
                break;
            }
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
    selectMove(ReadonlyBoard): number
}

function randFrom<T>(ts: T[]) {
    return ts[Math.floor(Math.random() * ts.length)];
}

function mselect(board: Board, avail: number[], fun: (i: number) => boolean): number|undefined {
    const want = avail.filter(i => {
        board.moveByIndex(i);
        const v = fun(i);
        board.undoMove(i);
        return v;
    });

    return want.length ? randFrom(want) : undefined;
}

// Pick a move at random.
//
// Mostly loses, except playing as X against itself.
//
// - As X:
//   - Against itself, wins 60%, ties 30%
//   - Seldom (<15%) wins against any other strategy
//   - Often (40%) loses against weak defensive
//   - Usually (75%) loses against short-sighted or optimal
// - As O:
//   - Generally (>90%, 98% vs optimal) loses
class RandomStrategy {
    selectMove(board: ReadonlyBoard): number {
        return randFrom(board.blankIndices);
    }
}

// Avoid a loss on the next move if possible.
//
// Usually ties, except playing O against optimal. Strictly
// inferior to short-sighted. Stronger as X against optimal
// than it is against short-sighted.
//
// - As X:
//   - Usually (60-80%) ties
//   - Wins more than loses against itself
//   - Loses more than wins against short-sighted
//   - Never wins against optimal
//   * Short-sighted beats it more often than optimal does
// - As O:
//   - Ties 60% and wins 10% vs short-sighted
//   - Usually (80%) loses against optimal
class WeakDefensiveStrategy {
    protected fallback = new RandomStrategy();

    selectMove(board: ReadonlyBoard): number {
        const b = board.clone();
        b.switchTurns();

        const avail = board.blankIndices;
        const avoidLoss = mselect(b, avail, i => b.loser === board.nextMark);
        if (avoidLoss !== undefined) return avoidLoss;

        return this.fallback.selectMove(board);
    }
}

// Win on the next move if possible, or else avoid a loss if possible.
//
// Usually ties, except playing O against optimal. Strictly better
// than short-sighted.
//
// - As X:
//   - Usually (60%) ties
//   - Sometimes (30%) wins against weak and itself, but never optimal
// - As O:
//   - Usually ties against weak and itself, stronger against weak
//   - Usually (80%) loses against optimal
class ShortSightedStrategy {
    protected fallback = new WeakDefensiveStrategy();

    selectMove(board: ReadonlyBoard): number {
        const b = board.clone();

        const avail = board.blankIndices;
        const win = mselect(b, avail, i => b.winner === board.nextMark);
        if (win !== undefined) return win;

        return this.fallback.selectMove(board);
    }
}

// Find the best move assuming the opponent makes the best move.
//
// Never loses. As X, usually wins, but nontrivial strategies sometimes
// tie. As O, usually ties except against random, but occasionally wins.
// Strictly better than all others, except that short-sighted and weak
// can win against each other more often than optimal does.
//
// - Always ties itself
// - As X:
//   - Usually (>80%) wins against all others
// - As O:
//   - Usually ties weak and short-sighted, but occasionally wins
class OptimalSearchStrategy {
    selectMove(curBoard: ReadonlyBoard): number {
        const [i, winner] = this.bestResultFor(curBoard, curBoard.nextMark, false);
        return i;
    }

    bestResultFor(curBoard: ReadonlyBoard, mark: Mark, fastMode: boolean): [number, Mark|'tie'] {
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
                } else {
                    wins.push(i);
                }
            } else if (winner == 'tie') {
                ties.push(i);
            }
            b.undoMove(i);
        }
        if (wins.length) return [randFrom(wins), mark];
        if (ties.length) return [randFrom(ties), 'tie'];
        return [randFrom(avail), opp(mark)];
    }
}

// Optimal, except uses a specific first move.
//
// This is intended to improve on optimal a bit when playing as X, in case
// the other strategies are weaker against different opening moves. Optimal
// chooses an opening move randomly, as optimal play leads to a tie no
// matter what.
//
// But the right opening move can do better against the heuristic strategies
// as X:
// - optimal wins 80% of the time
// - opening with corner or edge boosts to 90%
// - opening with center drops to 30%!
//
// This strategy opening with corner or edge is for the most part the best,
// but it's still not quite as good at winning as O against the heuristic
// strategies as they are against each other. However, it never loses, and
// they do. The question remains whether some algorithm could get a better
// win rate against the heuristic strategies while still not losing.
class OptimalSearchStrategyWithOpening {
    readonly oss = new OptimalSearchStrategy();
    constructor(readonly openingMove: number) {}

    selectMove(curBoard: ReadonlyBoard): number {
        return curBoard.blankIndices.length == 9 
             ? this.openingMove
             : this.oss.selectMove(curBoard);
    }
}

const strats = {
    'rand': new RandomStrategy(),
    'weak': new WeakDefensiveStrategy(),
    'shrt': new ShortSightedStrategy(),
    'opts': new OptimalSearchStrategy(),
    'optc': new OptimalSearchStrategyWithOpening(0),
    'opto': new OptimalSearchStrategyWithOpening(4),
    'opte': new OptimalSearchStrategyWithOpening(2),
}
const stratNames = ['rand', 'weak', 'shrt', 'opts']; //, 'optc', 'opto', 'opte'];

function testBotVsBot() {
    const N = 1000;
    for (const sn1 of stratNames) {
        const s1 = strats[sn1];
        for(const sn2 of stratNames) {
            const s2 = strats[sn2];
            const results = new Map<Mark|"tie",number>();
            for (let i = 0; i < N; ++i) {
                const board = new Board();
                while (board.winner == Mark.BLANK) {
                    const s = board.nextMark == Mark.X ? s1 : s2;
                    const m = s.selectMove(board);
                    board.moveByIndex(m);
                }
                results.set(board.winner, 1 + (results.get(board.winner) || 0));
            }
            const x = results.get(Mark.X) || 0;
            const o = results.get(Mark.O) || 0;
            const t = results.get('tie') || 0;
            console.log(`${sn1} ${x.toString().padStart(4)} | ${sn2} ${o.toString().padStart(4)} | tie ${t.toString().padStart(4)}`);
        }
        console.log('-');
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
            const clickedOption = e.currentTarget as HTMLElement;
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
            const clickedOption = e.currentTarget as HTMLElement;
            clickedOption.classList.add('selected');

            const selectedName = clickedOption.innerText;
            controller.selectedBot(selectedName);
            view.updateBot();
        });
    });
}