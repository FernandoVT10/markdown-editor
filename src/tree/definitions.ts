import { MDRange } from "../tokens";
import Cursor, { CursorPos } from "../cursor";
import {
  isPointInRange,
  isLineRangeInSel,
  appendNodesToEl,
} from "../utils";
import { Trait } from "./traits";

export type TagName = keyof HTMLElementTagNameMap;

export abstract class MDNode {
  protected range: MDRange;
  protected htmlEl: HTMLElement;

  protected line = 0;

  constructor(range: MDRange, tagName: TagName) {
    this.range = range;
    this.htmlEl = document.createElement(tagName);
  }

  protected getRange(): MDRange {
    return this.range;
  }

  protected getStartPos(): number {
    return this.range[0];
  }

  protected getEndPos(): number {
    return this.range[1];
  }

  protected isInCursorRange(cursor: Cursor): boolean {
    if(cursor.isCollapsed()) {
      const { x, y } = cursor.getPos();
      return isPointInRange(x, this.getRange()) && this.line === y;
    } else {
      const selection = cursor.getSelection();

      if(selection) {
        return isLineRangeInSel({
          line: this.line,
          range: this.getRange(),
        }, selection);
      }
    }

    return false;
  }

  public getHTMLEl(): HTMLElement {
    return this.htmlEl;
  }

  public setLine(line: number): void {
    this.line = line;
  }

  public abstract onCursorUpdate(cursor: Cursor): void;
  public abstract getCursorPos(selNode: Node, offset: number): CursorPos | undefined;
}

export abstract class MDBlockNode extends MDNode {
  protected nodes: MDNode[];
  private traits: Trait[] = [];
  private isCursorInside = false;

  constructor(range: MDRange, nodes: MDNode[], tagName: TagName) {
    super(range, tagName);
    this.nodes = nodes;
    appendNodesToEl(this.htmlEl, this.nodes);
  }

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

  protected updateNodesCursor(_: Cursor): void {
    console.error("This function is deprecated!");
  }

  public setLine(line: number): void {
    this.line = line;

    for(const trait of this.traits) {
      trait.setLine(line);
    }

    for(const node of this.nodes) {
      node.setLine(line);
    }
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

    for(const node of this.nodes) {
      node.onCursorUpdate(cursor);
    }
  }

  public getCursorPos(selNode: Node, offset: number): CursorPos | undefined {
    for(const node of this.nodes) {
      const pos = node.getCursorPos(selNode, offset);
      if(pos !== undefined) return pos;
    }

    for(const trait of this.traits) {
      const pos = trait.getCursorPos(selNode, offset);
      if(pos !== undefined) return pos;
    }
  }
}
