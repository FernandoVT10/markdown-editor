import Cursor from "./cursor-new";

import { isalnum } from "./utils";

class BufferPreviewer {
  private container: HTMLElement;

  private divList: HTMLDivElement[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  addLine(line: number) {
    if(!this.divList[line]) {
      const div = document.createElement("div");
      this.divList.splice(line, 0, div);

      if(this.divList[line + 1]) {
        this.container.insertBefore(this.divList[line + 1], this.divList[line]);
      } else {
        this.container.appendChild(this.divList[line]);
      }
    }
  }

  removeLine(line: number) {
    this.container.removeChild(this.divList[line]);
    this.divList.splice(line, 1);
  }
  
  updateLine(line: number, text: string) {
    if(!this.divList[line]) this.addLine(line);

    if(text.length) {
      this.divList[line].innerText = text;
    } else {
      this.divList[line].innerText = "\n";
    }
  }
}

export default class Editor {
  public buffer: string[] = [];
  public cursor: Cursor;
  private container: HTMLElement;

  private bufferPreviewer?: BufferPreviewer;

  constructor(container: HTMLElement) {
    this.container = container;
    this.cursor = new Cursor(this);

    this.setupKeyboard();

    if(process.env.NODE_ENV !== "test") {
      this.bufferPreviewer = new BufferPreviewer(container);
      this.setupDebug();
    }
  }

  private addLine(line: number, text: string): void {
    this.buffer.splice(line, 0, "");
    this.updateLine(line, text);
    this.bufferPreviewer?.addLine(line);
    this.bufferPreviewer?.updateLine(line, text);
  }

  private updateLine(line: number, text: string): void {
    this.buffer[line] = text;
    this.bufferPreviewer?.updateLine(line, text);
    console.table(this.buffer);
  }

  private removeLine(line: number): void {
    if(line > 0 && line < this.buffer.length) {
      this.buffer.splice(line, 1);
      this.bufferPreviewer?.removeLine(line);
    }
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
  }

  private setupKeyboard(): void {
    this.container.addEventListener("keydown", (e) => {
      e.preventDefault();

      if(e.ctrlKey && e.key === "a") {
        console.table(this.buffer);
      }

      switch(e.key) {
        case "ArrowLeft": 
          this.cursor.goLeft();
          break;
        case "ArrowRight":
          this.cursor.goRight();
          break;
        case "ArrowDown":
          this.cursor.goDown();
          break;
        case "ArrowUp":
          this.cursor.goUp();
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
