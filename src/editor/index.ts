import Cursor, { CursorPos } from "../cursor";

import Lexer from "../lexer";
import Tree from "../tree";
import UndoManager from "./undoManager";
import Clipboard from "./clipboard";
import Debug from "./debug";

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

  private tree: Tree;

  public undoManager: UndoManager;
  private typingState: TypingState = {
    isTyping: false,
  };

  private isMouseBtnPressed = false;
  private mouseStartedAtImg = false;
  private selectionWasCollapsed = true;

  constructor(container: HTMLElement) {
    this.container = container;
    this.cursor = new Cursor(this);
    this.tree = new Tree(this.container);
    this.undoManager = new UndoManager(this);

    this.buffer.push("");

    Clipboard.setup(this);
    Debug.setup(this);

    this.setupKeyboard();
    // this.setupMouse();
    // this.setupSelection();
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

  private emitCursorUpdate(): void {
    // TODO: make this better
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

    const line = this.cursor.getPosY();
    const col = this.cursor.getPosX();

    const bufLine = this.buffer[line];
    const leftPart = bufLine.slice(0, col);
    const rightPart = bufLine.slice(col);

    this.cursor.setPosX(this.cursor.getPosX() + 1);
    const updatedBuff = leftPart + char + rightPart;
    this.updateLine(line, updatedBuff);
  }

  private addNewLine(): void {
    const line = this.cursor.getPosY();
    const col = this.cursor.getPosX();

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
      newCursorPos: { x: 0, y: line + 1 },
    });
  }

  private removeChar(): void {
    // if(!this.cursor.isCollapsed())
    //   return this.removeSelection();

    const col = this.cursor.getPosX();
    const line = this.cursor.getPosY();

    if(col === 0 && line === 0) return;

    if(col > 0) {
      const bufLine = this.buffer[line];
      const leftPart = bufLine.slice(0, col - 1);
      const rightPart = bufLine.slice(col);

      this.cursor.setPosX(col - 1);
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
      newCursorPos: { x: prevLineBuff.length - 1, y: prevLine },
    });
  }

  private removeAlnumSequence(): void {
    // if(!this.cursor.isCollapsed())
    //   return this.removeSelection();

    const col = this.cursor.getPosX();
    const line = this.cursor.getPosY();
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
        newCursorPos: { x: col - count, y: line },
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

  // private removeSelection(): void {
  //   const selection = this.cursor.getSelection();
  //
  //   if(!selection) return;
  //   const { startPos, endPos } = selection;
  //   const linesOps: LineOpType[] = [];
  //
  //   if(startPos.y === endPos.y) {
  //     const line = startPos.y;
  //     const bufLine = this.buffer[line];
  //     const leftPart = bufLine.slice(0, startPos.x);
  //     const rightPart = bufLine.slice(endPos.x);
  //     linesOps.push(updateLineOp(bufLine, leftPart + rightPart));
  //   } else {
  //     const startLine = startPos.y;
  //     const endLine = endPos.y;
  //
  //     const oldBuff = this.buffer[startLine];
  //
  //     const startBuf = this.buffer[startLine].slice(0, startPos.x);
  //     const endBuf = this.buffer[endLine].slice(endPos.x);
  //     const updatedBuff = startBuf + endBuf;
  //
  //     linesOps.push(updateLineOp(oldBuff, updatedBuff));
  //
  //     // remove all lines at the middle of the selection
  //     if(endPos.y > startPos.y + 1) {
  //       for(let line = startPos.y + 1; line < endPos.y; line++) {
  //         linesOps.push(removeLineOp(this.buffer[line]));
  //       }
  //     }
  //
  //     const removedBuff = this.buffer[endLine];
  //     linesOps.push(removeLineOp(removedBuff));
  //   }
  //
  //   const topLine = startPos.y - 1;
  //
  //   this.undoManager.saveAndExec({
  //     linesOps,
  //     topLine,
  //     oldCursorPos: endPos,
  //     newCursorPos: startPos,
  //   });
  // }

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
          if(e.ctrlKey) {
            this.removeAlnumSequence();
          } else {
            this.initTyping(this.cursor.getPosY());
            this.removeChar();
          }

          this.updateTree();
        } break;
        case "Enter": {
          this.addNewLine();
          this.updateTree();
        } break;
        case "Tab": {
          this.addChar("\t");
          this.updateTree();
        } break;
        default: {
          const char = e.key;

          if(char.length === 1) {
            this.initTyping(this.cursor.getPosY());
            this.addChar(char);
            this.updateTree();
          }
        } break;
      }
    });
  }

  // private setupMouse(): void {
  //   this.container.addEventListener("mousedown", e => {
  //     this.saveTypedBuffer();
  //     this.isMouseBtnPressed = true;
  //
  //     const target = e.target as HTMLElement;
  //     if(target.tagName.toLowerCase() === "img") {
  //       this.mouseStartedAtImg = true;
  //     }
  //   });
  //
  //   this.container.addEventListener("mouseup", e => {
  //     this.isMouseBtnPressed = false;
  //
  //     const selection = window.getSelection();
  //     if(!selection) return;
  //
  //     const target = e.target as HTMLElement;
  //
  //     // This sets the cursor on the image markdown text
  //     // when an image is clicked
  //     if((selection.isCollapsed || this.mouseStartedAtImg)
  //       && target.tagName === "IMG"
  //       && target.parentNode
  //     ) {
  //       let newCursorPos = this.nodesTree.getCursorPos(target.parentNode, 0);
  //
  //       if(newCursorPos) {
  //         this.cursor.setPos(newCursorPos.x, newCursorPos.y);
  //         this.updateTreeCursor();
  //       }
  //     }
  //
  //     this.mouseStartedAtImg = false;
  //   });
  // }
  //
  // private setupSelection() {
  //   document.addEventListener("selectionchange", () => {
  //     const selection = window.getSelection();
  //     if(!selection) return;
  //
  //     if(selection.isCollapsed && (this.isMouseBtnPressed || !this.selectionWasCollapsed)) {
  //       this.isMouseBtnPressed = false;
  //       this.selectionWasCollapsed = true;
  //
  //       const selNode = selection.focusNode;
  //       const offset = selection.focusOffset;
  //       if(!selNode) return;
  //
  //       const newPos = this.nodesTree.getCursorPos(selNode, offset);
  //
  //       if(newPos) {
  //         this.cursor.setPos(newPos.x, newPos.y);
  //         this.updateTreeCursor();
  //       }
  //     } else if(!selection.isCollapsed) {
  //       const startNode = selection.anchorNode;
  //       const startOffset = selection.anchorOffset;
  //       const endNode = selection.focusNode;
  //       const endOffset = selection.focusOffset;
  //
  //       let startPos: CursorPos | undefined;
  //       if(startNode) {
  //         startPos = this.nodesTree.getCursorPos(startNode, startOffset);
  //       }
  //
  //       let endPos: CursorPos | undefined;
  //       if(endNode) {
  //         endPos = this.nodesTree.getCursorPos(endNode, endOffset);
  //       }
  //
  //       if(startPos !== undefined && endPos !== undefined) {
  //         // the selection in the browser can be made backwards
  //         if(startPos.y > endPos.y || (startPos.y === endPos.y && startPos.x > endPos.x)) {
  //           this.cursor.setSelection(endPos, startPos);
  //         } else {
  //           this.cursor.setSelection(startPos, endPos);
  //         }
  //
  //         this.updateTreeCursor();
  //       }
  //
  //       this.selectionWasCollapsed = false;
  //     }
  //   });
  // }
}
