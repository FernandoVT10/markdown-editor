import { TKNRange } from "./tokens";
import { isPointInRange, appendNodesToEl } from "./utils";

import Cursor from "./cursor";

export abstract class MDNode {
  protected startPos = 0;
  protected endPos = 0;
  protected range: TKNRange;
  protected htmlEl: HTMLElement;

  constructor(range: TKNRange, htmlEl: HTMLElement) {
    this.range = range;
    this.htmlEl = htmlEl;
  }

  protected getRange(): TKNRange {
    return this.range;
  }

  protected getStartPos(): number {
    return this.range[0];
  }

  public getHTMLEl(): HTMLElement {
    return this.htmlEl;
  }

  abstract updateCursor(cursorPos: number): void;
  // abstract updateCursorPos(node: globalThis.Node, offset: number): boolean;
  //
  // public printRange(spaces = 0): void {
  //   console.log("".padStart(spaces, " "), `[${this.startPos}, ${this.endPos}]`);
  // }
}

abstract class MDBlockNode extends MDNode {
  protected nodes: MDNode[];

  constructor(range: TKNRange, nodes: MDNode[], htmlEl: HTMLElement) {
    super(range, htmlEl);
    this.nodes = nodes;
    appendNodesToEl(this.htmlEl, this.nodes);
  }

  protected updateNodesCursor(cursorPos: number): void {
    for(const node of this.nodes) {
      node.updateCursor(cursorPos);
    }
  }
}

export class Text extends MDNode {
  constructor(text: string, range: TKNRange) {
    const spanEl = document.createElement("span");
    spanEl.innerText = text;
    super(range, spanEl);
  }

  updateCursor(cursorPos: number): void {
    if(isPointInRange(cursorPos, this.getRange())) {
      const offset = cursorPos - this.getStartPos();
      const node = this.htmlEl.firstChild;
      if(node) Cursor.setCursorAtNode(node, offset);
    }
  }
}

export class Paragraph extends MDBlockNode {
  constructor(range: TKNRange, nodes: MDNode[]) {
    const pEl = document.createElement("p");
    super(range, nodes, pEl);
  }

  updateCursor(cursorPos: number): void {
    if(!isPointInRange(cursorPos, this.getRange())) return;
    this.updateNodesCursor(cursorPos);
  }
}

export class Italic extends MDBlockNode {
  private startNode: Text;
  private editing = false;

  constructor(range: TKNRange, nodes: MDNode[]) {
    const italicEl = document.createElement("i");
    super(range, nodes, italicEl);

    const startPos = this.getStartPos();
    this.startNode = new Text("*", [startPos, startPos + 1]);
  }

  private activateEditMode(): void {
    if(this.editing) return;
    this.editing = true;

    this.htmlEl.prepend(this.startNode.getHTMLEl());
    this.nodes.unshift(this.startNode);
  }

  private deactivateEditMode(): void {
    if(!this.editing) return;
    this.editing = false;

    this.htmlEl.removeChild(this.startNode.getHTMLEl());
    this.nodes.shift();
  }

  updateCursor(cursorPos: number): void {
    if(isPointInRange(cursorPos, this.getRange())) {
      this.activateEditMode();
      this.updateNodesCursor(cursorPos);
    } else {
      this.deactivateEditMode();
    }
  }
}

export class NewLine extends MDNode {
  constructor(range: TKNRange) {
    const brEl = document.createElement("br");
    super(range, brEl);
  }

  updateCursor(cursorPos: number): void {
    if(isPointInRange(cursorPos, this.getRange())) {
      const node = this.htmlEl;
      if(node) Cursor.setCursorAtNode(node, 0);
    }
  }
}

export default class Tree {
  private nodes: MDNode[] = [];

  constructor(nodes: MDNode[]) {
    this.nodes = nodes;
  }

  render(parentElement: HTMLElement): void {
    parentElement.innerHTML = "";
    appendNodesToEl(parentElement, this.nodes);
  }

  updateCursor(cursorPos: number): void {
    for(const node of this.nodes) {
      node.updateCursor(cursorPos);
    }
  }
}
