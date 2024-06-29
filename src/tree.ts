import Cursor, { CursorPos } from "./cursor";
import { MDRange, Tokens } from "./tokens";
import {
  appendNodesToEl,
  isPointInRange,
  scrollToEl,
  setSelectionAtNode,
  isLineRangeInSel
} from "./utils";

type TagName = keyof HTMLElementTagNameMap;

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
      if(selection) return isLineRangeInSel({
        line: this.line,
        range: this.getRange(),
      }, selection);
    }

    return false;
  }

  public getHTMLEl(): HTMLElement {
    return this.htmlEl;
  }

  public setLine(line: number): void {
    this.line = line;
  }

  abstract onCursorUpdate(cursor: Cursor): void;
  abstract getCursorPos(selNode: Node, offset: number): CursorPos | undefined;
}

export abstract class MDBlockNode extends MDNode {
  protected nodes: MDNode[];

  constructor(range: MDRange, nodes: MDNode[], tagName: TagName) {
    super(range, tagName);
    this.nodes = nodes;
    appendNodesToEl(this.htmlEl, this.nodes);
  }

  protected updateNodesCursor(cursor: Cursor): void {
    for(const node of this.nodes) {
      node.onCursorUpdate(cursor);
    }
  }

  setLine(line: number): void {
    this.line = line;

    for(const node of this.nodes) {
      node.setLine(line);
    }
  }

  onCursorUpdate(cursor: Cursor): void {
    this.updateNodesCursor(cursor);
  }

  getCursorPos(selNode: Node, offset: number): CursorPos | undefined {
    for(const node of this.nodes) {
      const pos = node.getCursorPos(selNode, offset);
      if(pos !== undefined) return pos;
    }
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

  setLine(line: number): void {
    this.line = line;
    this.startNode.setLine(line);
    this.endNode?.setLine(line);

    for(const node of this.nodes) {
      node.setLine(line);
    }
  }

  onCursorUpdate(cursor: Cursor): void {
    if(this.isInCursorRange(cursor)) {
      this.activateEditMode();
    } else {
      this.deactivateEditMode();
    }

    this.updateNodesCursor(cursor);
  }
}

export class Text extends MDNode {
  constructor(text: string, range: MDRange) {
    super(range, "span");

    this.htmlEl.textContent = text;
  }

  onCursorUpdate(cursor: Cursor): void {
    const posX = cursor.getPosX();

    if(this.isInCursorRange(cursor) && cursor.isCollapsed()) {
      const offset = posX - this.getStartPos();
      const node = this.htmlEl.firstChild;

      if(node) setSelectionAtNode(node, offset);
      scrollToEl(this.htmlEl);
    }
  }

  getCursorPos(selNode: Node, offset: number): CursorPos | undefined {
    if(this.htmlEl.firstChild?.isSameNode(selNode)) {
      return {
        x: this.getStartPos() + offset,
        y: this.line,
      };
    }
  }
}


export class Paragraph extends MDBlockNode {
  constructor(range: MDRange, nodes: MDNode[]) {
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

export class NewLine extends MDBlockNode {
  constructor(range: MDRange) {
    super(range, [], "div");

    const br = document.createElement("br");
    this.htmlEl.appendChild(br);
  }

  onCursorUpdate(cursor: Cursor): void {
    if(this.isInCursorRange(cursor) && cursor.isCollapsed()) {
      setSelectionAtNode(this.htmlEl, 0);
      scrollToEl(this.htmlEl);
    }
  }

  getCursorPos(selNode: Node, _: number): CursorPos | undefined {
    if(this.htmlEl.isSameNode(selNode)) {
      return {
        x: this.getStartPos(),
        y: this.line,
      };
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

  setLine(line: number): void {
    this.line = line;
    this.rawLinkNode.setLine(line);
  }

  onCursorUpdate(cursor: Cursor): void {
    if(this.isInCursorRange(cursor)) {
      this.activateEditMode();
      this.rawLinkNode.onCursorUpdate(cursor);
    } else {
      this.deactivateEditMode();
    }
  }

  getCursorPos(selNode: Node, offset: number): CursorPos | undefined {
    if(this.editing) {
      return this.rawLinkNode.getCursorPos(selNode, offset);
    }

    if(this.linkEl.firstChild?.isSameNode(selNode)) {
      // here we sum one to ignore the first "["
      return {
        x: this.getStartPos() + offset + 1,
        y: this.line,
      };
    }
  }
}

export class MDImage extends MDNode {
  private rawImageNode: Text;
  private imgContainer: HTMLDivElement;
  private wasClosed: boolean;

  private editing = false;

  constructor(token: Tokens.Image) {
    super(token.range, "span");

    const imgEl = document.createElement("img");
    imgEl.alt = token.altText;
    if(token.url) imgEl.src = token.url;

    this.imgContainer = document.createElement("div");
    this.imgContainer.appendChild(imgEl);

    this.rawImageNode = new Text(token.raw, this.range);
    this.wasClosed = token.wasClosed;

    if(this.wasClosed) {
      this.htmlEl.appendChild(this.imgContainer);
    } else {
      this.htmlEl.appendChild(this.rawImageNode.getHTMLEl());
      this.editing = true;
    }
  }

  private activateEditMode(): void {
    if(this.editing) return;
    this.editing = true;

    this.htmlEl.prepend(this.rawImageNode.getHTMLEl());
  }

  private deactivateEditMode(): void {
    if(!this.editing || !this.wasClosed) return;
    this.editing = false;

    this.htmlEl.removeChild(this.rawImageNode.getHTMLEl());
  }

  setLine(line: number): void {
    this.line = line;
    this.rawImageNode.setLine(line);
  }

  onCursorUpdate(cursor: Cursor): void {
    if(this.isInCursorRange(cursor)) {
      this.activateEditMode();
      this.rawImageNode.onCursorUpdate(cursor);
    } else {
      this.deactivateEditMode();
    }
  }

  getCursorPos(selNode: Node, offset: number): CursorPos | undefined {
    if(this.imgContainer.isSameNode(selNode)) {
      return {
        x: this.getEndPos(),
        y: this.line,
      };
    }

    if(this.editing) {
      return this.rawImageNode.getCursorPos(selNode, offset);
    }
  }
}

export default class Tree {
  private nodeLines: MDBlockNode[] = [];
  private editorContainer: HTMLElement;

  constructor(editorContainer: HTMLElement) {
    this.editorContainer = editorContainer;
  }

  updateNodesLine(fromLine: number) {
    for(let newLine = fromLine; newLine < this.nodeLines.length; newLine++) {
      this.nodeLines[newLine].setLine(newLine);
    }
  }

  addLine(line: number, blockNode?: MDBlockNode): void {
    if(!blockNode) {
      blockNode = new NewLine([0, 0]);
    }

    blockNode.setLine(line);
    this.nodeLines.splice(line, 0, blockNode);

    if(this.nodeLines[line + 1]) {
      const nextEl = this.nodeLines[line + 1].getHTMLEl();
      this.editorContainer.insertBefore(blockNode.getHTMLEl(), nextEl);

      this.updateNodesLine(line + 1);
    } else {
      this.editorContainer.appendChild(blockNode.getHTMLEl());
    }
  }

  updateLine(line: number, blockNode?: MDBlockNode): void {
    if(!blockNode) {
      blockNode = new NewLine([0, 0]);
    }

    blockNode.setLine(line);

    if(this.nodeLines[line]) {
      const prevEl = this.nodeLines[line].getHTMLEl();
      prevEl.replaceWith(blockNode.getHTMLEl());
      this.nodeLines[line] = blockNode;
    } else {
      this.addLine(line, blockNode);
    }
  }

  removeLine(line: number) {
    if(line < this.nodeLines.length) {
      this.editorContainer.removeChild(this.nodeLines[line].getHTMLEl());
      this.nodeLines.splice(line, 1);
      this.updateNodesLine(line);
    }
  }

  onCursorUpdate(cursor: Cursor): void {
    for(const node of this.nodeLines) {
      node.onCursorUpdate(cursor);
    }
  }

  getCursorPos(selNode: Node, offset: number): CursorPos | undefined {
    for(const node of this.nodeLines) {
      const pos = node.getCursorPos(selNode, offset);
      if(pos !== undefined) return pos;
    }
  }
}
