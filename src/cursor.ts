import { TKNRange } from "./tokens";

type CB = () => void;

type Range = {
  start: number;
  end: number;
};

class CursorClass {
  private cursorPos = 0;
  private cbList: CB[]  = [];
  private lines: Range[] = [];
  private maxPos = 0;
  private lineOffset = 0;

  private collapsed = true;
  private selectionRange: TKNRange = [0, 0];

  private getColumn(): number {
    let column = 0;
    while(this.cursorPos > this.lines[column].end && column < this.lines.length - 1) column++;
    return column;
  }

  private callCallbacks(): void {
    for(const cb of this.cbList) {
      cb();
    }
  }

  addCallback(cb: CB): void {
    this.cbList.push(cb);
  }

  updateLines(text: string): void {
    this.maxPos = text.length;

    this.lines = [{
      start: 0,
      end: 0,
    }];

    let count = 0;

    for(const c of text) {
      if(c === "\n") {
        this.lines.push({
          start: count,
          end: count + 1,
        });
      } else {
        this.lines[this.lines.length - 1].end++;
      }

      count++;
    }
  }

  getPos(): number {
    return this.cursorPos;
  }

  setPos(cursorPos: number): void {
    this.collapsed = true;
    this.cursorPos = cursorPos;

    if(this.lines.length) {
      const column = this.getColumn();
      this.lineOffset = this.cursorPos - this.lines[column].start;
    }

    this.callCallbacks();
  }

  goRight(): void {
    if(this.isCollapsed()) {
      if(this.cursorPos < this.maxPos) {
        this.setPos(this.cursorPos + 1);
      }
    } else {
      this.setPos(this.selectionRange[1]);
    }
  }

  goLeft(): void {
    if(this.isCollapsed()) {
      if(this.cursorPos > 0) {
        this.setPos(this.cursorPos - 1);
      }
    } else {
      this.setPos(this.selectionRange[0]);
    }
  }

  goDown(): void {
    if(this.isCollapsed()) {
      const column = this.getColumn();

      if(column + 1 < this.lines.length) {
        // the columnOffset at the first column has a min value of 0
        // meanwhile all the other columns have 1 as its min value
        // here we correct the first column to avoid errors
        if(column === 0) {
          this.lineOffset++;
        }

        const nextColumn = this.lines[column + 1];
        const newPos = nextColumn.start + this.lineOffset;

        this.cursorPos = Math.min(newPos, nextColumn.end);
        this.callCallbacks();
      }
    } else {
      this.setPos(this.selectionRange[1]);
    }
  }

  goUp(): void {
    if(this.isCollapsed()) {
      const column = this.getColumn();

      if(column - 1 >= 0) {
        // here the columnOffset is greater by 1 in all the columns
        // except the first one, with this is solved
        if(column === 1) {
          this.lineOffset--;
        }

        const prevColumn = this.lines[column - 1];
        const newPos = prevColumn.start + this.lineOffset;

        this.cursorPos = Math.min(newPos, prevColumn.end);
        this.callCallbacks();
      }
    } else {
      this.setPos(this.selectionRange[0]);
    }
  }

  setSelectionRange(start: number, end: number): void {
    this.collapsed = false;
    this.selectionRange = [start, end];
  }

  isCollapsed(): boolean {
    return this.collapsed;
  }

  getSelectionRange(): TKNRange {
    return this.selectionRange;
  }

  setCursorAtNode(node: Node, offset: number): void {
    const range = document.createRange();
    range.setStart(node, offset);

    const selection = window.getSelection();

    if(selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      selection.collapseToEnd();
    }
  }
}

const Cursor = new CursorClass();
export default Cursor;
