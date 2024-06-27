import Cursor from "./cursor";
import Tree from "./tree";

import { parseLine } from "./parser";
import { isalnum } from "./utils";

export default class Editor {
  public buffer: string[] = [];
  public cursor: Cursor;
  private container: HTMLElement;
  private nodesTree: Tree;

  constructor(container: HTMLElement) {
    this.container = container;
    this.cursor = new Cursor(this);
    this.nodesTree = new Tree(this.container);

    this.setupKeyboard();
    this.setupDebug();
  }

  private addLine(line: number, text: string): void {
    this.buffer.splice(line, 0, text);

    if(text.length) {
      const blockNode = parseLine(line, text);
      this.nodesTree.addLine(line, blockNode);
    } else {
      this.nodesTree.addLine(line);
    }
  }

  private updateLine(line: number, text: string): void {
    this.buffer[line] = text;

    if(text.length) {
      const blockNode = parseLine(line, text);
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

    // TODO: remove selection(if there's one) before adding character

    const line = this.cursor.getPosY();
    const column = this.cursor.getPosX();

    if(!this.buffer[line]) {
      this.buffer[line] = "";
    }

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

  private removeCharSequence() {
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

  private setupKeyboard(): void {
    this.container.addEventListener("keydown", (e) => {
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

  private setupDebug() {
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
