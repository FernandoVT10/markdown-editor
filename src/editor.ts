import Cursor, { CursorPos } from "./cursor";
import Tree from "./tree";
import UndoManager from "./undoManager";

import {
  LineOps,
  LineOpType,
  addLineOp,
  removeLineOp,
  updateLineOp
} from "./lineOps";
import { parseLine } from "./parser";
import { isalnum, isSpecialAction } from "./utils";

type TypingState = {
  isTyping: boolean;
  startCursorPos?: CursorPos;  // cursor position before starting to type
  startLineBuff?: string;      // buffer of the line we're going to type before of update it
  startLine?: number;
}

export default class Editor {
  public buffer: string[] = [];
  public cursor: Cursor;
  private container: HTMLElement;
  private nodesTree: Tree;

  private undoManager: UndoManager;
  private typingState: TypingState = {
    isTyping: false,
  };

  private isMouseBtnPressed = false;
  private mouseStartedAtImg = false;
  private selectionWasCollapsed = true;

  constructor(container: HTMLElement) {
    this.container = container;
    this.cursor = new Cursor(this);
    this.nodesTree = new Tree(this.container);
    this.undoManager = new UndoManager(this);

    this.buffer.push("");

    this.setupKeyboard();
    this.setupClipboard();
    this.setupMouse();
    this.setupSelection();
    this.setupDebug();
  }

  private addLine(line: number, text: string): void {
    this.buffer.splice(line, 0, text);

    if(text.length) {
      const blockNode = parseLine(text);
      this.nodesTree.addLine(line, blockNode);
    } else {
      this.nodesTree.addLine(line);
    }
  }

  private updateLine(line: number, text: string): void {
    this.buffer[line] = text;

    if(text.length) {
      const blockNode = parseLine(text);
      this.nodesTree.updateLine(line, blockNode);
    } else {
      this.nodesTree.updateLine(line);
    }
  }

  private removeLine(line: number): void {
    if(line > 0 && line < this.buffer.length) {
      this.buffer.splice(line, 1);
      this.nodesTree.removeLine(line);
    }
  }

  public execLinesOps(startLine: number, linesOps: LineOpType[]): void {
    let lineNumber = startLine;

    // TODO: group similar sequencial operations and execute them together
    for(const lineOp of linesOps) {
      switch(lineOp.type) {
        case LineOps.Add: {
          this.addLine(lineNumber, lineOp.addedBuff);
        } break;
        case LineOps.Update: {
          this.updateLine(lineNumber, lineOp.postUpdateBuff);
        } break;
        case LineOps.Remove: {
          this.removeLine(lineNumber);
          lineNumber--;
        } break;
      }

      lineNumber++;
    }
  }

  public revertLinesOps(startLine: number, lineOps: LineOpType[]): void {
    let lineNumber = startLine;

    // TODO: group similar sequencial operations and execute them together
    for(const lineOp of lineOps) {
      switch(lineOp.type) {
        case LineOps.Add: {
          this.removeLine(lineNumber);
          lineNumber--;
        } break;
        case LineOps.Update: {
          this.updateLine(lineNumber, lineOp.preUpdateBuff);
        } break;
        case LineOps.Remove: {
          this.addLine(lineNumber, lineOp.removedBuff);
        } break;
      }

      lineNumber++;
    }
  }

  private updateTreeCursor(): void {
    // TODO: make this better
    if(process.env.NODE_ENV !== "test") this.nodesTree.onCursorUpdate(this.cursor);
  }

  public updateCursorPos(cursorPos: CursorPos): void {
    const { x, y } = cursorPos;
    this.cursor.setPos(x, y);
    this.updateTreeCursor();
  }

  private saveTypedBuffer(): void {
    if(this.typingState.isTyping) {
      const bufLine = this.typingState.startLineBuff as string;
      const cursorPos = this.typingState.startCursorPos as CursorPos;
      const line = this.typingState.startLine as number;

      const updatedBuff = this.buffer[line];

      this.undoManager.save({
        linesOps: [
          updateLineOp(bufLine, updatedBuff),
        ],
        topLine: line - 1,
        oldCursorPos: cursorPos,
        newCursorPos: { ...this.cursor.getPos() },
      });

      this.typingState.isTyping = false;
    }
  }

  private addChar(char: string): void {
    if(char.length > 1) return;

    if(!this.cursor.isCollapsed()) this.removeSelection();

    const line = this.cursor.getPosY();
    const column = this.cursor.getPosX();

    const bufLine = this.buffer[line];
    const leftPart = bufLine.slice(0, column);
    const rightPart = bufLine.slice(column);

    if(char === "\n") {
      const updatedBuff = leftPart + char;
      const addedBuff = rightPart;

      this.saveTypedBuffer();
      this.undoManager.saveAndExec({
        linesOps: [
          updateLineOp(bufLine, updatedBuff),
          addLineOp(addedBuff),
        ],
        topLine: line - 1,
        oldCursorPos: { ...this.cursor.getPos() },
        newCursorPos: { x: 0, y: line + 1 },
      });
    } else {
      if(!this.typingState.isTyping) {
        this.typingState.isTyping = true;
        this.typingState.startLineBuff = bufLine;
        this.typingState.startCursorPos = { ...this.cursor.getPos() };
        this.typingState.startLine = line;
      }

      this.cursor.setPosX(this.cursor.getPosX() + 1);
      const text = leftPart + char + rightPart;
      this.updateLine(line, text);
      this.updateTreeCursor();
    }
  }

  private removeChar(): void {
    if(!this.cursor.isCollapsed())
      return this.removeSelection();

    const posX = this.cursor.getPosX();
    const posY = this.cursor.getPosY();
    if(posX === 0 && posY === 0) return;

    if(posX > 0) {
      const column = posX;
      const line = posY;
      const bufLine = this.buffer[line];
      const leftPart = bufLine.slice(0, column - 1);
      const rightPart = bufLine.slice(column);
      
      if(!this.typingState.isTyping) {
        this.typingState.isTyping = true;
        this.typingState.startLineBuff = bufLine;
        this.typingState.startCursorPos = { ...this.cursor.getPos() };
        this.typingState.startLine = line;
      }

      this.cursor.setPosX(posX - 1);
      this.updateLine(line, leftPart + rightPart);
      this.updateTreeCursor();
    } else {
      // deletes a new line
      const currentLine = posY;
      const prevLine = currentLine - 1;
      const prevLineLen = this.buffer[prevLine].length;

      let updatedBuff = this.buffer[prevLine].slice(0, prevLineLen - 1);

      const currentLineBuff = this.buffer[currentLine];
      if(currentLineBuff.length) {
        updatedBuff += currentLineBuff;
      }

      this.saveTypedBuffer();
      this.undoManager.saveAndExec({
        linesOps: [
          updateLineOp(this.buffer[prevLine], updatedBuff),
          removeLineOp(currentLineBuff),
        ],
        topLine: prevLine - 1,
        oldCursorPos: { ...this.cursor.getPos() },
        newCursorPos: { x: prevLineLen - 1, y: currentLine - 1 },
      });
    }
  }

  private removeCharSequence(): void {
    if(!this.cursor.isCollapsed())
      return this.removeSelection();

    const column = this.cursor.getPosX();
    const line = this.cursor.getPosY();
    const bufLine = this.buffer[line];

    if(column > 0 && isalnum(bufLine.charAt(column - 1))) {
      let count = 0;
      while(isalnum(bufLine.charAt(column - count - 1))) count++;

      const leftPart = bufLine.slice(0, column - count);
      const rightPart = bufLine.slice(column);
      const updatedBuff = leftPart + rightPart;

      this.saveTypedBuffer();
      this.undoManager.saveAndExec({
        linesOps: [
          updateLineOp(bufLine, updatedBuff),
        ],
        topLine: line - 1,
        oldCursorPos: { ...this.cursor.getPos() },
        newCursorPos: { x: column - count, y: line },
      });
    } else {
      this.removeChar();
    }
  }

  private removeSelection(): void {
    const selection = this.cursor.getSelection();

    if(!selection) return;
    const { startPos, endPos } = selection;
    const linesOps: LineOpType[] = [];

    if(startPos.y === endPos.y) {
      const line = startPos.y;
      const bufLine = this.buffer[line];
      const leftPart = bufLine.slice(0, startPos.x);
      const rightPart = bufLine.slice(endPos.x);
      linesOps.push(updateLineOp(bufLine, leftPart + rightPart));
    } else {
      const startLine = startPos.y;
      const endLine = endPos.y;

      const oldBuff = this.buffer[startLine];

      const startBuf = this.buffer[startLine].slice(0, startPos.x);
      const endBuf = this.buffer[endLine].slice(endPos.x);
      const updatedBuff = startBuf + endBuf;

      linesOps.push(updateLineOp(oldBuff, updatedBuff));

      // remove all lines at the middle of the selection
      if(endPos.y > startPos.y + 1) {
        for(let line = startPos.y + 1; line < endPos.y; line++) {
          linesOps.push(removeLineOp(this.buffer[line]));
        }
      }

      const removedBuff = this.buffer[endLine];
      linesOps.push(removeLineOp(removedBuff));
    }

    const topLine = startPos.y - 1;

    this.undoManager.saveAndExec({
      linesOps,
      topLine,
      oldCursorPos: endPos,
      newCursorPos: startPos,
    });
  }

  private setupKeyboard(): void {
    this.container.addEventListener("keydown", (e) => {
      if(isSpecialAction(e)) return;
      e.preventDefault();

      // UNDO and REDO
      const key = e.key.toLowerCase();
      if(e.ctrlKey && key === "z") {
        if(e.shiftKey) {
          this.undoManager.redo();
        } else {
          this.saveTypedBuffer();
          this.undoManager.undo();
        }

        return;
      }

      switch(e.key) {
        case "ArrowLeft": 
          this.saveTypedBuffer();
          this.cursor.goLeft();
          this.updateTreeCursor();
          break;
        case "ArrowRight":
          this.saveTypedBuffer();
          this.cursor.goRight();
          this.updateTreeCursor();
          break;
        case "ArrowDown":
          this.saveTypedBuffer();
          this.cursor.goDown();
          this.updateTreeCursor();
          break;
        case "ArrowUp":
          this.saveTypedBuffer();
          this.cursor.goUp();
          this.updateTreeCursor();
          break;
        case "Backspace":
          if(e.ctrlKey) {
            this.removeCharSequence();
          } else {
            this.removeChar();
          }
          break;
        case "Enter":
          this.addChar("\n");
          break;
        case "Tab":
          this.addChar("\t");
          break;
        default:
          this.addChar(e.key);
          break;
      }
    });
  }

  private setupClipboard(): void {
    this.container.addEventListener("paste", e => {
      // TODO: this event should work with selection and it has to save history too
      e.preventDefault();

      const pastedText = e.clipboardData?.getData("text/plain");
      if(!pastedText) return;

      const posX = this.cursor.getPosX();
      const line = this.cursor.getPosY();
      const bufLine = this.buffer[line];

      const leftPart = bufLine.slice(0, posX);
      const rightPart = bufLine.slice(posX);

      const pastedLines = pastedText.split("\n");

      const linesOps: LineOpType[] = [];
      let newCursorPos: CursorPos;

      if(pastedLines.length > 1) {
        for(let i = 0; i < pastedLines.length; i++) {
          let text = pastedLines[i];
          if(i === 0) {
            const updatedBuff = leftPart + text + "\n";
            linesOps.push(updateLineOp(bufLine, updatedBuff));
          } else if(i === pastedLines.length - 1) {
            const addedBuff = text + rightPart;
            linesOps.push(addLineOp(addedBuff));
          } else {
            const addedBuff = text + "\n";
            linesOps.push(addLineOp(addedBuff));
          }
        }

        const lastIndex = pastedLines.length - 1;
        newCursorPos = {
          x: pastedLines[lastIndex].length,
          y: line + lastIndex,
        };
      } else {
        const updatedBuff = leftPart + pastedText + rightPart;
        linesOps.push(updateLineOp(bufLine, updatedBuff));
        newCursorPos = {
          x: posX + pastedText.length,
          y: line,
        };
      }

      this.saveTypedBuffer();
      this.undoManager.saveAndExec({
        linesOps,
        topLine: line - 1,
        oldCursorPos: { ...this.cursor.getPos() },
        newCursorPos,
      });
    });

    this.container.addEventListener("copy", e => {
      e.preventDefault();
      const selection = this.cursor.getSelection();
      if(!this.cursor.isCollapsed() && selection) {
        let text = "";

        const { startPos, endPos } = selection;

        if(startPos.y === endPos.y) {
          const line = startPos.y;
          text = this.buffer[line].slice(startPos.x, endPos.x);
        } else {
          for(let line = startPos.y; line <= endPos.y; line++) {
            const bufLine = this.buffer[line];

            if(line === startPos.y) {
              text += bufLine.slice(startPos.x);
            } else if(line === endPos.y) {
              text += bufLine.slice(0, endPos.x);
            } else {
              text += bufLine;
            }
          }
        }

        e.clipboardData?.setData("text/plain", text);
      }
    });
  }

  private setupMouse(): void {
    this.container.addEventListener("mousedown", e => {
      this.saveTypedBuffer();
      this.isMouseBtnPressed = true;

      const target = e.target as HTMLElement;
      if(target.tagName.toLowerCase() === "img") {
        this.mouseStartedAtImg = true;
      }
    });

    this.container.addEventListener("mouseup", e => {
      this.isMouseBtnPressed = false;

      const selection = window.getSelection();
      if(!selection) return;

      const target = e.target as HTMLElement;

      // This sets the cursor on the image markdown text
      // when an image is clicked
      if((selection.isCollapsed || this.mouseStartedAtImg)
        && target.tagName === "IMG"
        && target.parentNode
      ) {
        let newCursorPos = this.nodesTree.getCursorPos(target.parentNode, 0);

        if(newCursorPos) {
          this.cursor.setPos(newCursorPos.x, newCursorPos.y);
          this.updateTreeCursor();
        }
      }

      this.mouseStartedAtImg = false;
    });
  }

  private setupSelection() {
    document.addEventListener("selectionchange", () => {
      const selection = window.getSelection();
      if(!selection) return;

      if(selection.isCollapsed && (this.isMouseBtnPressed || !this.selectionWasCollapsed)) {
        this.isMouseBtnPressed = false;
        this.selectionWasCollapsed = true;

        const selNode = selection.focusNode;
        const offset = selection.focusOffset;
        if(!selNode) return;

        const newPos = this.nodesTree.getCursorPos(selNode, offset);

        if(newPos) {
          this.cursor.setPos(newPos.x, newPos.y);
          this.updateTreeCursor();
        }
      } else if(!selection.isCollapsed) {
        const startNode = selection.anchorNode;
        const startOffset = selection.anchorOffset;
        const endNode = selection.focusNode;
        const endOffset = selection.focusOffset;

        let startPos: CursorPos | undefined;
        if(startNode) {
          startPos = this.nodesTree.getCursorPos(startNode, startOffset);
        }

        let endPos: CursorPos | undefined;
        if(endNode) {
          endPos = this.nodesTree.getCursorPos(endNode, endOffset);
        }

        if(startPos !== undefined && endPos !== undefined) {
          // the selection in the browser can be made backwards
          if(startPos.y > endPos.y || (startPos.y === endPos.y && startPos.x > endPos.x)) {
            this.cursor.setSelection(endPos, startPos);
          } else {
            this.cursor.setSelection(startPos, endPos);
          }

          this.updateTreeCursor();
        }

        this.selectionWasCollapsed = false;
      }
    });
  }

  private setupDebug(): void {
    if(process.env.NODE_ENV === "test") return;

    const cursorPosX = document.getElementById("cursor-pos-x") as HTMLElement;
    const cursorPosY = document.getElementById("cursor-pos-y") as HTMLElement;

    const loop = () => {
      const { x, y }= this.cursor.getPos();
      cursorPosX.innerText = x.toString();
      cursorPosY.innerText = y.toString();
      window.requestAnimationFrame(loop);
    }

    loop();
  }
}

(window as any).Cursor = Cursor;
