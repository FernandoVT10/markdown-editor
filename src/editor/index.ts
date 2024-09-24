import Cursor, { CursorPos, CursorSelection } from "../cursor";

import { LineOpType } from "../lineOps";

import Lexer from "../lexer";
import Tree from "../tree";
import UndoManager from "./undoManager";
import Clipboard from "./clipboard";
import Debug from "./debug";
import Mouse from "./mouse";

import {
  addLineOp,
  removeLineOp,
  updateLineOp
} from "../lineOps";
import { isalnum, isSpecialAction } from "../utils";

type TypingState = {
  isTyping: boolean;
  initialCursorPos?: CursorPos;  // cursor position before starting to type
  initialBuff?: string;      // buffer of the line we're going to type before of update it
  line?: number;
}

export type MDBuffer = string[];
export type Container = HTMLElement;

export default class Editor {
  public buffer: MDBuffer = [];
  public cursor: Cursor;
  public container: Container;
  public tree: Tree;

  public undoManager: UndoManager;
  private typingState: TypingState = {
    isTyping: false,
  };

  constructor(container: HTMLElement) {
    this.container = container;
    this.cursor = new Cursor(this);
    this.tree = new Tree(this.container);
    this.undoManager = new UndoManager(this);

    this.buffer.push("");

    Clipboard.setup(this);
    Debug.setup(this);

    new Mouse(this);

    this.setupKeyboard();
  }

  public addLine(line: number, text: string): void {
    this.buffer.splice(line, 0, text);
  }

  public updateLine(line: number, text: string): void {
    this.buffer[line] = text;
  }

  public removeLine(line: number): void {
    if(line > 0 && line < this.buffer.length) {
      this.buffer.splice(line, 1);
    }
  }

  public updateTree(): void {
    const lexer = new Lexer(this.buffer.join(""));
    const docToken = lexer.scan();
    this.tree.updateDocToken(docToken);

    this.emitCursorUpdate();
  }

  public updateCursorPos(cursorPos: CursorPos): void {
    this.cursor.setPos(cursorPos);
    this.emitCursorUpdate();
  }

  public updateCursorSelection(start: CursorPos, end: CursorPos): void {
    this.cursor.setSelection(start, end);
    this.emitCursorUpdate();
  }

  private emitCursorUpdate(): void {
    this.tree.onCursorUpdate(this.cursor);
  }

  private initTyping(line: number): void {
    if(!this.typingState.isTyping) {
      this.typingState = {
        isTyping: true,
        initialBuff: this.buffer[line],
        initialCursorPos: this.cursor.getPosCopy(),
        line,
      };
    }
  }

  private addChar(char: string): void {
    if(char.length > 1) return;

    // if(!this.cursor.isCollapsed()) this.removeSelection();

    const { col, line } = this.cursor.getPos();

    const bufLine = this.buffer[line];
    const leftPart = bufLine.slice(0, col);
    const rightPart = bufLine.slice(col);

    this.cursor.setCol(col + 1);
    const updatedBuff = leftPart + char + rightPart;
    this.updateLine(line, updatedBuff);
  }

  private addNewLine(): void {
    const { col, line } = this.cursor.getPos();

    const bufLine = this.buffer[line];
    const leftPart = bufLine.slice(0, col);
    const rightPart = bufLine.slice(col);

    const updatedBuff = leftPart + "\n";
    const addedBuff = rightPart;

    this.undoManager.saveAndExec({
      linesOps: [
        updateLineOp(bufLine, updatedBuff),
        addLineOp(addedBuff),
      ],
      topLine: line - 1,
      oldCursorPos: this.cursor.getPosCopy(),
      newCursorPos: { col: 0, line: line + 1 },
    });
  }

  private removeChar(): void {
    // if(!this.cursor.isCollapsed())
    //   return this.removeSelection();

    const { col, line } = this.cursor.getPos();

    if(col === 0 && line === 0) return;

    if(col > 0) {
      const bufLine = this.buffer[line];
      const leftPart = bufLine.slice(0, col - 1);
      const rightPart = bufLine.slice(col);

      this.cursor.setCol(col - 1);
      this.updateLine(line, leftPart + rightPart);
    } else {
      this.removeNewLine(line);
    }
  }

  private removeNewLine(line: number): void {
    if(line < 1) return;

    const curLineBuff = this.buffer[line];

    const prevLine = line - 1;
    const prevLineBuff = this.buffer[prevLine];

    let updatedBuff = prevLineBuff;

    if(curLineBuff.length) {
      updatedBuff += curLineBuff;
    }

    this.undoManager.saveAndExec({
      linesOps: [
        updateLineOp(prevLineBuff, updatedBuff),
        removeLineOp(curLineBuff),
      ],
      topLine: prevLine - 1,
      oldCursorPos: this.cursor.getPosCopy(),
      // sets cursor at the end of the previous line
      newCursorPos: { col: prevLineBuff.length - 1, line: prevLine },
    });
  }

  private removeAlnumSequence(): void {
    // if(!this.cursor.isCollapsed())
    //   return this.removeSelection();

    const { col, line } = this.cursor.getPos();

    const bufLine = this.buffer[line];

    // we start to delete from one character behind the cursor's col position
    const startingCol = col - 1;

    // if the char is alphanumeric we will keep removing chars until we find
    // a non alphanumeric char
    if(col > 0 && isalnum(bufLine.charAt(startingCol))) {
      let count = 0;
      while(isalnum(bufLine.charAt(startingCol - count))) count++;

      const leftPart = bufLine.slice(0, col - count);
      const rightPart = bufLine.slice(col);
      const updatedBuff = leftPart + rightPart;

      this.undoManager.saveAndExec({
        linesOps: [
          updateLineOp(bufLine, updatedBuff),
        ],
        topLine: line - 1,
        oldCursorPos: this.cursor.getPosCopy(),
        newCursorPos: { col: col - count, line },
      });
    } else {
      // if the first char is not alphanumeric, we delete only one char
      this.removeChar();
    }
  }

  public saveTypedBuffer(): void {
    if(this.typingState.isTyping) {
      const initialBuff = this.typingState.initialBuff as string;
      const initialCursorPos = this.typingState.initialCursorPos as CursorPos;
      const line = this.typingState.line as number;

      const updatedBuff = this.buffer[line];

      this.undoManager.save({
        linesOps: [
          updateLineOp(initialBuff, updatedBuff),
        ],
        topLine: line - 1,
        oldCursorPos: initialCursorPos,
        newCursorPos: this.cursor.getPosCopy(),
      });

      this.typingState.isTyping = false;
    }
  }


  private removeSelection(): void {
    if(this.cursor.isCollapsed()) return;

    const { start, end } = this.cursor.getSelection() as CursorSelection;

    const linesOps: LineOpType[] = [];

    if(start.line === end.line) {
      // removes single line selection
      const line = start.line;
      const bufLine = this.buffer[line];
      const leftPart = bufLine.slice(0, start.col);
      const rightPart = bufLine.slice(end.col);
      linesOps.push(updateLineOp(bufLine, leftPart + rightPart));
    } else {
      const startLine = start.line;
      const endLine = end.line;

      const oldBuff = this.buffer[startLine];

      const startBuf = this.buffer[startLine].slice(0, start.col);
      const endBuf = this.buffer[endLine].slice(end.col);
      const updatedBuff = startBuf + endBuf;

      linesOps.push(updateLineOp(oldBuff, updatedBuff));

      // remove all lines below the first line of the selection
      if(end.line > start.line + 1) {
        for(let line = startLine + 1; line <= endLine; line++) {
          linesOps.push(removeLineOp(this.buffer[line]));
        }
      }
    }

    const topLine = start.line - 1;

    this.undoManager.saveAndExec({
      linesOps,
      topLine,
      oldCursorPos: end,
      newCursorPos: start,
    });
  }

  private setupKeyboard(): void {
    this.container.addEventListener("keydown", (e) => {
      if(isSpecialAction(e)) return;
      e.preventDefault();

      // UNDO and REDO
      const key = e.key.toLowerCase();
      if(e.ctrlKey && key === "z") {
        if(e.shiftKey) this.undoManager.redo();
        else this.undoManager.undo();

        return this.updateTree();
      }

      switch(e.key) {
        case "ArrowLeft": 
          this.saveTypedBuffer();
          this.cursor.goLeft();
          this.emitCursorUpdate();
          break;
        case "ArrowRight":
          this.saveTypedBuffer();
          this.cursor.goRight();
          this.emitCursorUpdate();
          break;
        case "ArrowDown":
          this.saveTypedBuffer();
          this.cursor.goDown();
          this.emitCursorUpdate();
          break;
        case "ArrowUp":
          this.saveTypedBuffer();
          this.cursor.goUp();
          this.emitCursorUpdate();
          break;
        case "Backspace": {
          this.removeSelection();

          if(e.ctrlKey) {
            this.removeAlnumSequence();
          } else {
            this.initTyping(this.cursor.getLine());
            this.removeChar();
          }

          this.updateTree();
        } break;
        case "Enter": {
          this.removeSelection();
          this.addNewLine();
          this.updateTree();
        } break;
        case "Tab": {
          this.removeSelection();
          this.addChar("\t");
          this.updateTree();
        } break;
        default: {
          const char = e.key;

          if(char.length === 1) {
            this.removeSelection();
            this.initTyping(this.cursor.getLine());
            this.addChar(char);
            this.updateTree();
          }
        } break;
      }
    });
  }
}
