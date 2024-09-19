import Trait from "./trait";
import Cursor, { CursorPos } from "../cursor";
import { isCursorPosInRange } from "../utils";
import { TokenRange, Token } from "../tokens";

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
      // TODO: write this part...
      console.error("Cursor selection is not supported yet.");
      return false;
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
