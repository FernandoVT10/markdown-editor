import { MDRange, TokenRange, Token } from "../tokens";
import Cursor, { CursorPos } from "../cursor";
import {
  appendNodesToEl,
  isCursorPosInRange,
} from "../utils";
import { Trait } from "./traits";

export type TagName = keyof HTMLElementTagNameMap;

export abstract class MDNode {
  protected token: Token;
  protected htmlEl: HTMLElement;

  constructor(token: Token, tagName: TagName) {
    this.token = token;
    this.htmlEl = document.createElement(tagName);
  }

  private getRange(): TokenRange {
    return this.token.range;
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

  public abstract updateToken(token: Token): void;
  public abstract onCursorUpdate(cursor: Cursor): void;
  public abstract getCursorPos(selNode: Node, offset: number): CursorPos | undefined;
}

export abstract class MDBlockNode extends MDNode {
  private traits: Trait[] = [];
  private isCursorInside = false;

  protected onCursorEnter(): void {}
  protected onCursorLeave(): void {}

  private cursorEnter(): void {
    if(this.isCursorInside) return;
    this.isCursorInside = true;

    for(const trait of this.traits) {
      trait.onCursorEnter();
    }
    this.onCursorEnter();
  }

  private cursorLeave(): void {
    if(!this.isCursorInside) return;
    this.isCursorInside = false;

    for(const trait of this.traits) {
      trait.onCursorLeave();
    }
    this.onCursorLeave();
  }

  protected addTrait(trait: Trait): void {
    this.traits.push(trait);
  }

  public onCursorUpdate(cursor: Cursor): void {
    if(this.isInCursorRange(cursor)) {
      this.cursorEnter();
    } else {
      this.cursorLeave();
    }

    for(const trait of this.traits) {
      trait.onCursorUpdate(cursor);
    }

    // for(const node of this.nodes) {
    //   node.onCursorUpdate(cursor);
    // }
  }

  public getCursorPos(selNode: Node, offset: number): CursorPos | undefined {
    // for(const node of this.nodes) {
    //   const pos = node.getCursorPos(selNode, offset);
    //   if(pos !== undefined) return pos;
    // }

    for(const trait of this.traits) {
      const pos = trait.getCursorPos(selNode, offset);
      if(pos !== undefined) return pos;
    }
  }
}
