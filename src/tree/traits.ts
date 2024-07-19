import { MDRange } from "../tokens";
import { Text } from "./nodes";

import Cursor, { CursorPos } from "../cursor";

export interface Trait {
  onCursorEnter(): void;
  onCursorLeave(): void;
  onCursorUpdate(cursor: Cursor): void;
  getCursorPos(selNode: Node, offset: number): CursorPos | undefined;
  setLine(line: number): void;
}

interface MDSyntaxOpts {
  htmlEl: HTMLElement;
  mdMark: string;
  range: MDRange;
  closeBlock: boolean; // adds the markdown mark at the end of the block
  keepActive: boolean; // keeps the block always active 
}

export class MDSyntax implements Trait {
  private startNode: Text;
  private endNode?: Text;
  private htmlEl: HTMLElement;
  private keepActive: boolean;

  private isActive = false;

  constructor(opts: MDSyntaxOpts) {
    this.htmlEl = opts.htmlEl;
    this.keepActive = opts.keepActive;

    const [startPos, endPos] = opts.range;
    const { mdMark } = opts;

    this.startNode = new Text(mdMark, [startPos, startPos + mdMark.length]);
    if(opts.closeBlock) {
      this.endNode = new Text(mdMark, [endPos - mdMark.length, endPos]);
    }

    if(this.keepActive) {
      this.activate();
    }
  }

  private activate() {
    this.isActive = true;
    this.htmlEl.prepend(this.startNode.getHTMLEl());

    if(this.endNode) this.htmlEl.appendChild(this.endNode.getHTMLEl());
  }

  private deactivate() {
    if(this.keepActive) return;

    this.isActive = false;
    this.htmlEl.removeChild(this.startNode.getHTMLEl());
    if(this.endNode) this.htmlEl.removeChild(this.endNode.getHTMLEl());
  }

  public onCursorEnter(): void {
    this.activate();
  }

  public onCursorLeave(): void {
    this.deactivate();
  }

  public onCursorUpdate(cursor: Cursor): void {
    if(this.isActive) {
      this.startNode.onCursorUpdate(cursor);
      if(this.endNode) this.endNode.onCursorUpdate(cursor);
    }
  }

  public getCursorPos(selNode: Node, offset: number): CursorPos | undefined {
    let cursor = this.startNode.getCursorPos(selNode, offset);
    if(cursor) return cursor;

    cursor = this.endNode?.getCursorPos(selNode, offset);
  }

  public setLine(line: number): void {
    this.startNode.setLine(line);
    this.endNode?.setLine(line);
  }
}

interface RawMdSyntaxOpts {
  containerEl: HTMLElement;
  rawMDText: string;
  range: MDRange;
  htmlEl: HTMLElement;
  keepActive: boolean; // keeps the block always active 
  getCursorPos: (selNode: Node, offset: number) => CursorPos | undefined;
}

export class RawMdSyntax implements Trait {
  private rawMdNode: Text;
  private containerEl: HTMLElement;
  private htmlEl: HTMLElement;
  private keepActive: boolean;

  private isActive = false;

  private parentGetCursorPos: RawMdSyntaxOpts["getCursorPos"];

  constructor(opts: RawMdSyntaxOpts) {
    this.containerEl = opts.containerEl;
    this.htmlEl = opts.htmlEl;
    this.keepActive = opts.keepActive;
    this.parentGetCursorPos = opts.getCursorPos;

    const { rawMDText, range } = opts;
    const startPos = range[0];
    this.rawMdNode = new Text(rawMDText, [startPos, startPos + rawMDText.length]);

    if(this.keepActive) {
      this.containerEl.appendChild(this.rawMdNode.getHTMLEl());
    } else {
      this.containerEl.appendChild(this.htmlEl);
    }
  }

  private activate() {
    this.isActive = true;

    if(this.containerEl.contains(this.htmlEl))
      this.containerEl.removeChild(this.htmlEl);

    this.containerEl.appendChild(this.rawMdNode.getHTMLEl());
  }

  private deactivate() {
    if(this.keepActive) return;

    this.isActive = false;
    this.containerEl.removeChild(this.rawMdNode.getHTMLEl());
    this.containerEl.appendChild(this.htmlEl);
  }

  public onCursorEnter(): void {
    this.activate();
  }

  public onCursorLeave(): void {
    this.deactivate();
  }

  public onCursorUpdate(cursor: Cursor): void {
    if(this.isActive) this.rawMdNode.onCursorUpdate(cursor);
  }

  public getCursorPos(selNode: Node, offset: number): CursorPos | undefined {
    if(this.isActive) {
      return this.rawMdNode.getCursorPos(selNode, offset);
    }

    return this.parentGetCursorPos(selNode, offset);
  }

  public setLine(line: number): void {
    this.rawMdNode.setLine(line);
  }
}
