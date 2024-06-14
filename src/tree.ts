import { TKNRange, Tokens } from "./tokens";
import { isPointInRange, appendNodesToEl } from "./utils";

import Cursor from "./cursor";

type TagName = keyof HTMLElementTagNameMap;

export abstract class MDNode {
  protected range: TKNRange;
  protected htmlEl: HTMLElement;

  constructor(range: TKNRange, tagName: TagName) {
    this.range = range;
    this.htmlEl = document.createElement(tagName);
  }

  protected getRange(): TKNRange {
    return this.range;
  }

  protected getStartPos(): number {
    return this.range[0];
  }

  protected getEndPos(): number {
    return this.range[1];
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

  constructor(range: TKNRange, nodes: MDNode[], tagName: TagName) {
    super(range, tagName);
    this.nodes = nodes;
    appendNodesToEl(this.htmlEl, this.nodes);
  }

  protected updateNodesCursor(cursorPos: number): void {
    for(const node of this.nodes) {
      node.updateCursor(cursorPos);
    }
  }

  updateCursor(cursorPos: number): void {
    this.updateNodesCursor(cursorPos);
  }
}

abstract class MDExBlockNode extends MDBlockNode {
  protected abstract startNode: Text;
  protected abstract wasClosed: boolean;

  protected endNode?: Text;
  private editing = false;

  protected activateEditMode(): void {
    if(this.editing) return;
    this.editing = true;

    this.htmlEl.prepend(this.startNode.getHTMLEl());
    this.nodes.unshift(this.startNode);

    if(this.endNode) {
      this.htmlEl.append(this.endNode.getHTMLEl());
      this.nodes.push(this.endNode);
    }
  }

  protected deactivateEditMode(): void {
    if(!this.editing || !this.wasClosed) return;
    this.editing = false;

    this.htmlEl.removeChild(this.startNode.getHTMLEl());
    this.nodes.shift();

    if(this.endNode) {
      this.htmlEl.removeChild(this.endNode.getHTMLEl());
      this.nodes.pop();
    }
  }

  updateCursor(cursorPos: number): void {
    if(isPointInRange(cursorPos, this.getRange())) {
      this.activateEditMode();
      this.updateNodesCursor(cursorPos);
    } else {
      this.updateNodesCursor(cursorPos);
      this.deactivateEditMode();
    }
  }
}

export class Text extends MDNode {
  constructor(text: string, range: TKNRange) {
    super(range, "span");

    for(const c of text) {
      if(c === " ") {
        this.htmlEl.innerHTML += "&nbsp;"
      } else {
        this.htmlEl.innerText += c;
      }
    }
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
    super(range, nodes, "p");
  }
}

export class Italic extends MDExBlockNode {
  protected startNode: Text;
  protected wasClosed: boolean;

  constructor(token: Tokens.Italic, nodes: MDNode[]) {
    super(token.range, nodes, "i");

    this.wasClosed = token.wasClosed;

    const startPos = this.getStartPos();
    this.startNode = new Text("*", [startPos, startPos + 1]);

    if(this.wasClosed) {
      const endPos = this.getEndPos();
      this.endNode = new Text("*", [endPos - 1, endPos]);
    } else {
      this.activateEditMode();
    }
  }
}

export class Bold extends MDExBlockNode {
  protected startNode: Text;
  protected wasClosed: boolean;

  constructor(token: Tokens.Bold, nodes: MDNode[]) {
    super(token.range, nodes, "strong");

    const startPos = this.getStartPos();
    this.startNode = new Text("**", [startPos, startPos + 2]);

    this.wasClosed = token.wasClosed;

    if(this.wasClosed) {
      const endPos = this.getEndPos();
      this.endNode = new Text("**", [endPos - 2, endPos]);
    } else {
      this.activateEditMode();
    }
  }
}

export class NewLine extends MDNode {
  constructor(range: TKNRange) {
    super(range, "br");
  }

  updateCursor(cursorPos: number): void {
    if(cursorPos === this.getEndPos()) {
      const node = this.htmlEl;
      if(node) Cursor.setCursorAtNode(node, 0);
    }
  }
}

export class Code extends MDExBlockNode {
  protected startNode: Text;
  protected wasClosed: boolean;

  constructor(token: Tokens.Code) {
    const { range, wasClosed, content } = token;

    const nodes: MDNode[] = [];

    if(content.length > 0) {
      const textStartPos = range[0] + 1;
      const textEndPos = wasClosed ? range[1] - 1 : range[1];
      nodes.push(new Text(content, [textStartPos, textEndPos]));
    }

    super(range, nodes, "code");

    this.wasClosed = wasClosed;

    const startPos = this.getStartPos();
    this.startNode = new Text("`", [startPos, startPos + 1]);

    if(this.wasClosed) {
      const endPos = this.getEndPos();
      this.endNode = new Text("`", [endPos - 1, endPos]);
    } else {
      this.activateEditMode();
    }
  }
}

export class Header extends MDExBlockNode {
  protected startNode: Text;
  protected wasClosed = true;

  constructor(token: Tokens.Header, nodes: MDNode[]) {
    const { range, level } = token;
    const tagName = `h${level}` as TagName;
    super(range, nodes, tagName);

    const startPos = this.getStartPos();
    let markdownMark = "".padStart(level, "#");
    let nodeEndPos = startPos + level;

    if(token.hasAfterSpace) {
      markdownMark += " ";
      nodeEndPos++;
    }

    this.startNode = new Text(markdownMark, [startPos, nodeEndPos]);
  }
}

export class Link extends MDNode {
  private rawLinkNode: Text;
  private linkEl: HTMLAnchorElement;
  private wasClosed: boolean;

  private editing = false;

  constructor(token: Tokens.Link) {
    super(token.range, "span");

    this.linkEl = document.createElement("a");
    
    this.linkEl.innerText = token.text;
    if(token.dest) this.linkEl.href = token.dest;

    this.rawLinkNode = new Text(token.raw, this.range);
    this.wasClosed = token.wasClosed;

    if(this.wasClosed) {
      this.htmlEl.appendChild(this.linkEl);
    } else {
      this.htmlEl.appendChild(this.rawLinkNode.getHTMLEl());
      this.editing = true;
    }
  }

  private activateEditMode(): void {
    if(this.editing) return;
    this.editing = true;

    this.htmlEl.removeChild(this.linkEl);
    this.htmlEl.appendChild(this.rawLinkNode.getHTMLEl());
  }

  private deactivateEditMode(): void {
    if(!this.editing || !this.wasClosed) return;
    this.editing = false;

    this.htmlEl.removeChild(this.rawLinkNode.getHTMLEl());
    this.htmlEl.appendChild(this.linkEl);
  }

  updateCursor(cursorPos: number): void {
    if(isPointInRange(cursorPos, this.range)) {
      this.activateEditMode();
      this.rawLinkNode.updateCursor(cursorPos);
    } else {
      this.deactivateEditMode();
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
