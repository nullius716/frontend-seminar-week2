import { useEffect, useState } from 'react';
import './App.css';

type Board = number[][];
type Direction = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';
type GameStatus = 'playing' | 'won' | 'lost';

type GameSnapshot = {
  board: Board;
  score: number;
  gameStatus: GameStatus;
};

type SavedGame = {
  board: Board;
  score: number;
  gameStatus: GameStatus;
  history: GameSnapshot[];
};

const STORAGE_KEY = 'my-2048-game';

function createEmptyBoard(): Board {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}

function addRandomTile(board: Board): Board {
  const emptyCells: [number, number][] = [];

  board.forEach((row, rowIndex) => {
    row.forEach((number, columnIndex) => {
      if (number === 0) {
        emptyCells.push([rowIndex, columnIndex]);
      }
    });
  });

  if (emptyCells.length === 0) return board;

  const randomIndex = Math.floor(Math.random() * emptyCells.length);
  const [row, column] = emptyCells[randomIndex];

  const newBoard = board.map((row) => [...row]);
  newBoard[row][column] = Math.random() < 0.9 ? 2 : 4;

  return newBoard;
}

function createInitialBoard(): Board {
  return addRandomTile(addRandomTile(createEmptyBoard()));
}

function loadSavedGame(): SavedGame {
  const savedGame = localStorage.getItem(STORAGE_KEY);

  if (savedGame) {
    try {
      const parsedGame = JSON.parse(savedGame);

      if (Array.isArray(parsedGame.board)) {
        return {
          board: parsedGame.board,
          score: parsedGame.score ?? 0,
          gameStatus: parsedGame.gameStatus ?? 'playing',
          history: parsedGame.history ?? [],
        };
      }
    } catch {
      // 저장된 데이터가 손상된 경우 새 게임을 시작한다.
    }
  }

  return {
    board: createInitialBoard(),
    score: 0,
    gameStatus: 'playing',
    history: [],
  };
}

function areBoardsSame(first: Board, second: Board): boolean {
  return first.every((row, rowIndex) =>
    row.every(
      (number, columnIndex) => number === second[rowIndex][columnIndex],
    ),
  );
}

function reverseRows(board: Board): Board {
  return board.map((row) => [...row].reverse());
}

function transpose(board: Board): Board {
  return board[0].map((_, columnIndex) =>
    board.map((row) => row[columnIndex]),
  );
}

function moveLeft(board: Board): { board: Board; addedScore: number } {
  let addedScore = 0;

  const movedBoard = board.map((row) => {
    const numbers = row.filter((number) => number !== 0);

    for (let i = 0; i < numbers.length - 1; i += 1) {
      if (numbers[i] === numbers[i + 1]) {
        numbers[i] *= 2;
        addedScore += numbers[i];
        numbers.splice(i + 1, 1);
      }
    }

    while (numbers.length < 4) {
      numbers.push(0);
    }

    return numbers;
  });

  return { board: movedBoard, addedScore };
}

function moveBoard(
  board: Board,
  direction: Direction,
): { board: Board; addedScore: number } {
  if (direction === 'ArrowLeft') {
    return moveLeft(board);
  }

  if (direction === 'ArrowRight') {
    const result = moveLeft(reverseRows(board));

    return {
      board: reverseRows(result.board),
      addedScore: result.addedScore,
    };
  }

  if (direction === 'ArrowUp') {
    const result = moveLeft(transpose(board));

    return {
      board: transpose(result.board),
      addedScore: result.addedScore,
    };
  }

  const result = moveLeft(reverseRows(transpose(board)));

  return {
    board: transpose(reverseRows(result.board)),
    addedScore: result.addedScore,
  };
}

function canMove(board: Board): boolean {
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const current = board[row][column];

      if (current === 0) return true;
      if (column < 3 && current === board[row][column + 1]) return true;
      if (row < 3 && current === board[row + 1][column]) return true;
    }
  }

  return false;
}

function has2048(board: Board): boolean {
  return board.some((row) => row.some((number) => number === 2048));
}

function App() {
  const [game, setGame] = useState<SavedGame>(loadSavedGame);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game]);

  function startNewGame() {
    setGame({
      board: createInitialBoard(),
      score: 0,
      gameStatus: 'playing',
      history: [],
    });
  }

  function undo() {
    setGame((currentGame) => {
      const previousGame =
        currentGame.history[currentGame.history.length - 1];

      if (!previousGame) return currentGame;

      return {
        ...previousGame,
        history: currentGame.history.slice(0, -1),
      };
    });
  }

  function handleMove(direction: Direction) {
    setGame((currentGame) => {
      if (currentGame.gameStatus !== 'playing') return currentGame;

      const result = moveBoard(currentGame.board, direction);

      if (areBoardsSame(currentGame.board, result.board)) {
        return currentGame;
      }

      const nextBoard = addRandomTile(result.board);

      let nextStatus: GameStatus = 'playing';

      if (has2048(nextBoard)) {
        nextStatus = 'won';
      } else if (!canMove(nextBoard)) {
        nextStatus = 'lost';
      }

      return {
        board: nextBoard,
        score: currentGame.score + result.addedScore,
        gameStatus: nextStatus,
        history: [
          ...currentGame.history,
          {
            board: currentGame.board.map((row) => [...row]),
            score: currentGame.score,
            gameStatus: currentGame.gameStatus,
          },
        ],
      };
    });
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const directions: Direction[] = [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
      ];

      if (directions.includes(event.key as Direction)) {
        event.preventDefault();
        handleMove(event.key as Direction);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const message =
    game.gameStatus === 'won'
      ? '2048을 만들었어요!'
      : '더 이상 움직일 수 없어요.';

  return (
    <main className="game">
      <header className="game-header">
        <div>
          <h1>2048</h1>
          <p>방향키를 눌러 같은 숫자를 합쳐보세요!</p>
        </div>

        <div className="score-box">
          <span>SCORE</span>
          <strong>{game.score}</strong>
        </div>
      </header>

      <section className="board" aria-label="2048 게임판">
        {game.board.flat().map((number, index) => (
          <div className={`tile tile-${number}`} key={index}>
            {number === 0 ? '' : number}
          </div>
        ))}

        {game.gameStatus !== 'playing' && (
          <div className="game-message">
            <p>{message}</p>
            <button onClick={startNewGame}>다시 시작</button>
          </div>
        )}
      </section>

      <div className="game-buttons">
        <button className="restart-button" onClick={startNewGame}>
          새 게임
        </button>

        <button
          className="undo-button"
          onClick={undo}
          disabled={game.history.length === 0}
        >
          Undo
        </button>
      </div>
    </main>
  );
}

export default App;