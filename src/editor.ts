import Cursor, { CursorPos } from "./cursor";
import Tree from "./tree";

import { parseLine } from "./parser";
import { isalnum, isSpecialAction } from "./utils";

export default class Editor {
  public buffer: string[] = [];
  public cursor: Cursor;
  private container: HTMLElement;
  private nodesTree: Tree;

  private isMouseBtnPressed = false;
  private mouseStartedAtImg = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.cursor = new Cursor(this);
    this.nodesTree = new Tree(this.container);

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

  private updateTreeCursor(): void {
    // TODO: make this better
    if(process.env.NODE_ENV !== "test") this.nodesTree.onCursorUpdate(this.cursor);
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
      this.cursor.setPos(0, this.cursor.getPosY() + 1);
      this.updateLine(line, leftPart + char);
      this.addLine(line + 1, rightPart);
    } else {
      this.cursor.setPosX(this.cursor.getPosX() + 1);
      const text = leftPart + char + rightPart;
      this.updateLine(line, text);
    }

    this.updateTreeCursor();
  }

  private removeChar(): void {
    if(!this.cursor.isCollapsed())
      return this.removeSelection();

    // TODO: this function should save history
    const posX = this.cursor.getPosX();
    const posY = this.cursor.getPosY();
    if(posX === 0 && posY === 0) return;

    if(posX > 0) {
      const column = posX;
      this.cursor.setPosX(posX - 1);

      const line = posY;
      const bufLine = this.buffer[line];
      const leftPart = bufLine.slice(0, column - 1);
      const rightPart = bufLine.slice(column);
      this.updateLine(line, leftPart + rightPart);
    } else {
      const line = posY;
      const prevLine = line - 1;
      const bufLine = this.buffer[line];
      const prevLineLen = this.buffer[prevLine].length;

      let prevBufLine = this.buffer[prevLine].slice(0, prevLineLen - 1);

      if(bufLine.length) {
        prevBufLine += bufLine;
      }

      this.cursor.setPos(prevLineLen - 1, posY - 1);

      this.removeLine(line);
      this.updateLine(prevLine, prevBufLine);
    }

    this.updateTreeCursor();
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

      this.cursor.setPosX(column - count)

      this.updateLine(line, leftPart + rightPart); 
    } else {
      this.removeChar();
    }

    this.updateTreeCursor();
  }

  private removeSelection(): void {
    const selection = this.cursor.getSelection();

    if(!selection) return;
    const { startPos, endPos } = selection;

    if(startPos.y === endPos.y) {
      const line = startPos.y;
      const bufLine = this.buffer[line];
      const leftPart = bufLine.slice(0, startPos.x);
      const rightPart = bufLine.slice(endPos.x);
      this.updateLine(line, leftPart + rightPart);
    } else {
      // remove all lines at the middle of the selection
      // this removes the lines from bottom to top
      if(endPos.y > startPos.y + 1) {
        for(let line = endPos.y - 1; line > startPos.y; line--) {
          this.removeLine(line);
        }
      }

      const startLine = startPos.y;
      const endLine = startPos.y + 1;

      const startBuf = this.buffer[startLine].slice(0, startPos.x);
      const endBuf = this.buffer[endLine].slice(endPos.x);

      this.updateLine(startLine, startBuf + endBuf);
      this.removeLine(endLine);
    }

    this.cursor.setPos(startPos.x, startPos.y);
    this.updateTreeCursor();
  }

  private setupKeyboard(): void {
    this.container.addEventListener("keydown", (e) => {
      if(isSpecialAction(e)) return;
      e.preventDefault();

      if(e.ctrlKey && e.key === "a") {
        console.table(this.buffer);
        console.log(this.nodesTree);
        return;
      } else if(e.ctrlKey && e.key === "i") {
        const text = prompt("Enter text") || "";
        this.updateLine(0, text);
        return;
      }

      switch(e.key) {
        case "ArrowLeft": 
          this.cursor.goLeft();
          this.updateTreeCursor();
          break;
        case "ArrowRight":
          this.cursor.goRight();
          this.updateTreeCursor();
          break;
        case "ArrowDown":
          this.cursor.goDown();
          this.updateTreeCursor();
          break;
        case "ArrowUp":
          this.cursor.goUp();
          this.updateTreeCursor();
          break;
        case "Backspace":
          // TODO: should remove the selection if there's one
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
      if(pastedLines.length > 1) {
        for(let i = 0; i < pastedLines.length; i++) {
          let text = pastedLines[i];
          if(i === 0) {
            this.updateLine(line + i, leftPart + text + "\n");
          } else if(i === pastedLines.length - 1) {
            this.addLine(line + i, text + rightPart);
          } else {
            this.addLine(line + i, text + "\n");
          }
        }

        const lastIndex = pastedLines.length - 1;
        const lastInsertedLine = line + lastIndex;
        const newPosX = pastedLines[lastIndex].length;

        this.cursor.setPos(newPosX, lastInsertedLine);
        this.updateTreeCursor();
      } else {
        this.cursor.setPosX(posX + pastedText.length);
        this.updateLine(line, leftPart + pastedText + rightPart);
        this.updateTreeCursor();
      }
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
          console.log(startPos.x, endPos.x);
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

      if(selection.isCollapsed && this.isMouseBtnPressed) {
        this.isMouseBtnPressed = false;

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
          if(startPos.y > endPos.y || startPos.x > endPos.x) {
            this.cursor.setSelection(endPos, startPos);
          } else {
            this.cursor.setSelection(startPos, endPos);
          }

          this.updateTreeCursor();
        }
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
