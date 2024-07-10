import Editor from "./editor";

export type CursorPos = {
  x: number;
  y: number;
}

export type CursorSelection = {
  startPos: CursorPos;
  endPos: CursorPos;
}

export default class Cursor {
  private editor: Editor;
  private prevPosX = 0;
  private pos = {
    x: 0,
    y: 0,
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
  
  public getPosX(): number {
    return this.pos.x;
  }
  
  public getPosY(): number {
    return this.pos.y;
  }

  public setPos(x: number, y: number): void {
    this.prevPosX = x;
    this.pos.x = x;
    this.pos.y = y;

    this.selection = undefined;
  }

  public setPosX(x: number): void {
    this.pos.x = x;
    this.prevPosX = x;
    this.selection = undefined;
  }

  public setPosY(y: number): void {
    this.pos.y = y;
    this.selection = undefined;
  }

  public goLeft(): void {
    if(this.pos.x > 0) {
      this.pos.x--;
    } else {
      if(this.pos.y > 0) {
        this.pos.y--;
        this.pos.x = this.getLineLen(this.pos.y);
      }
    }

    this.prevPosX = this.pos.x;
  }

  public goRight(): void {
    if(this.pos.x < this.getLineLen(this.pos.y)) {
      this.pos.x++;
    } else {
      const bufLen = this.editor.buffer.length;
      if(this.pos.y < bufLen - 1) {
        this.pos.y++;
        this.pos.x = 0;
      }
    }

    this.prevPosX = this.pos.x;
  }

  public goDown(): void {
    const bufLen = this.editor.buffer.length;
    if(this.pos.y < bufLen - 1) {
      this.pos.y++;

      const lineLen = this.getLineLen(this.pos.y);
      this.pos.x = Math.min(this.prevPosX, lineLen);
    }
  }

  public goUp(): void {
    if(this.pos.y > 0) {
      this.pos.y--;

      const lineLen = this.getLineLen(this.pos.y);
      this.pos.x = Math.min(this.prevPosX, lineLen);
    }
  }

  public getSelection(): CursorSelection | undefined {
    return this.selection;
  }

  public setSelection(startPos: CursorPos, endPos: CursorPos): void {
    this.selection = { startPos, endPos };
  }

  public isCollapsed(): boolean {
    return this.selection === undefined;
  }
}
