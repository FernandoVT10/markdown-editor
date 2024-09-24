import Trait from "./trait";
import Cursor, { CursorPos, CursorSelection } from "../cursor";
import { TokenRange, Token, MDRange } from "../tokens";

function isPointInRange(point: number, range: MDRange): boolean {
  return point >= range[0] && point <= range[1];
}

// NOTE: maybe this algorithm could be better written
function isCursorPosInRange(cursor: CursorPos, range: TokenRange): boolean {
  const { start, end } = range;

  if(!isPointInRange(cursor.line, [start.line, end.line])) {
    return false;
  } else if(start.line === end.line) {
    // if the range is just in a single line, we only need to check if the cursor is inside the columns
    return isPointInRange(cursor.col, [start.col, end.col]);
  } else if(cursor.line === start.line) {
    return cursor.col >= start.col;
  } else if(cursor.line === end.line) {
    return cursor.col <= end.col;
  } else {
    return true;
  }
}

// checks if the cursor's selection is colliding with the range
function isCurSelInRange(sel: CursorSelection, range: TokenRange): boolean {
  // this lines checks if the selection and range share lines
  if(!(sel.start.line <= range.end.line && sel.end.line >= range.start.line)) {
    return false;
  }

  if(sel.start.line === range.end.line) {
    // if the start line of the selection is the same as the end line of the range
    // we return true if the selection's start column is less or equal than range's end column
    return sel.start.col <= range.end.col;
  } else if(sel.end.line === range.start.line) {
    // either way if the selection's end line is the same as the range's start line
    // we return true if the selection's end column is greater or equal than range's start column
    return sel.end.col >= range.start.col;
  }

  return true;
}

export type TagName = keyof HTMLElementTagNameMap;

export default abstract class MDNode {
  protected range: TokenRange;
  protected htmlEl: HTMLElement;
  protected traits = new Map<Function, Trait>();

  constructor(range: TokenRange, tagName: TagName) {
    this.range = range;
    this.htmlEl = document.createElement(tagName);
  }

  public addTrait(trait: Trait): void {
    this.traits.set(trait.constructor, trait);
  }

  public getTrait<T>(constructor: Function): T {
    return this.traits.get(constructor) as T;
  }

  public hasTrait(constructor: Function): boolean {
    return this.traits.get(constructor) !== undefined;
  }

  public getStartCol(): number {
    return this.range.start.col;
  }

  public getStartLine(): number {
    return this.range.start.line;
  }

  public getEndLine(): number {
    return this.range.end.line;
  }

  public getEndCol(): number {
    return this.range.end.col;
  }

  public setRange(range: TokenRange): void {
    this.range = range;
  }

  public getRange(): TokenRange {
    return this.range;
  }

  public isInCursorRange(cursor: Cursor): boolean {
    if(cursor.isCollapsed()) {
      return isCursorPosInRange(cursor.getPos(), this.getRange());
    } else {
      return isCurSelInRange(cursor.getSelection() as CursorSelection, this.getRange());
    }
  }

  public getHTMLEl(): HTMLElement {
    return this.htmlEl;
  }

  public onCursorUpdate(cursor: Cursor): void {
    for(const trait of this.traits.values()) {
      trait.onCursorUpdate(this, cursor);
    }
  }

  public getCursorPos(selNode: Node, offset: number): CursorPos | undefined {
    for(const trait of this.traits.values()) {
      const pos = trait.getCursorPos(this, selNode, offset);
      if(pos !== undefined) return pos;
    }
  }

  public updateRange(token: Token): void {
    this.setRange(token.range);

    for(const trait of this.traits.values()) {
      trait.updateRange(token);
    }
  }

  public abstract onTokenUpdate(token: Token): void;
}
