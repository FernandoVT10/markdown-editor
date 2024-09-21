import Editor from "./editor";

export type CursorPos = {
  col: number;
  line: number;
}

export type CursorSelection = {
  start: CursorPos;
  end: CursorPos;
}

export default class Cursor {
  private editor: Editor;
  private prevColPos = 0;
  private pos: CursorPos = {
    col: 0,
    line: 0,
  };

  private selection?: CursorSelection;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  private getLineLen(line: number): number {
    const text = this.editor.buffer[line];
    let len = text.length;
    if(text.charAt(len - 1) === "\n") len--;
    return len;
  }

  public getPos(): CursorPos {
    return this.pos;
  }
  
  // returns a copy of the position object
  public getPosCopy(): CursorPos {
    return { ...this.pos };
  }
  
  public getCol(): number {
    return this.pos.col;
  }
  
  public getLine(): number {
    return this.pos.line;
  }

  public setPos(newPos: CursorPos): void {
    this.pos = newPos;
    this.prevColPos = newPos.col;

    this.selection = undefined;
  }

  public setCol(col: number): void {
    this.pos.col = col;
    this.prevColPos = col;
    this.selection = undefined;
  }

  public setLine(line: number): void {
    this.pos.line = line;
    this.selection = undefined;
  }

  public goLeft(): void {
    if(this.pos.col > 0) {
      this.pos.col--;
    } else {
      if(this.pos.line > 0) {
        this.pos.line--;
        this.pos.col = this.getLineLen(this.pos.line);
      }
    }

    this.prevColPos = this.pos.col;
  }

  public goRight(): void {
    if(this.pos.col < this.getLineLen(this.pos.line)) {
      this.pos.col++;
    } else {
      const bufLen = this.editor.buffer.length;
      if(this.pos.line < bufLen - 1) {
        this.pos.line++;
        this.pos.col = 0;
      }
    }

    this.prevColPos = this.pos.col;
  }

  public goDown(): void {
    const bufLen = this.editor.buffer.length;
    if(this.pos.line < bufLen - 1) {
      this.pos.line++;

      const lineLen = this.getLineLen(this.pos.line);
      this.pos.col = Math.min(this.prevColPos, lineLen);
    }
  }

  public goUp(): void {
    if(this.pos.line > 0) {
      this.pos.line--;

      const lineLen = this.getLineLen(this.pos.line);
      this.pos.col = Math.min(this.prevColPos, lineLen);
    }
  }

  public getSelection(): CursorSelection | undefined {
    return this.selection;
  }

  public setSelection(start: CursorPos, end: CursorPos): void {
    this.selection = { start, end };
  }

  public isCollapsed(): boolean {
    return this.selection === undefined;
  }
}
