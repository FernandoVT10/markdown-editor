import { Types, TYPES_HTML_TAGS, Token } from "./types";
import { Queue, isPointInRange } from "./utils";

import Cursor from "./cursor";

abstract class Node {
  protected startPos = 0;
  protected endPos = 0;

  public getStartPos(): number {
    return this.startPos;
  }

  abstract getHTMLElement(): HTMLElement;
  abstract updateCursor(cursorPos: number): void;
  abstract updateCursorPos(node: globalThis.Node, offset: number): boolean;

  public printRange(spaces = 0): void {
    console.log("".padStart(spaces, " "), `[${this.startPos}, ${this.endPos}]`);
  }
}

abstract class BlockNode extends Node {
  protected children: Node[] = [];

  abstract closeBlock(token: Token): void;
  abstract closeUnclosedBlock(endPos: number): void;
  abstract addChild(node: Node): void;

  public printRange(spaces = 0): void {
    console.log("".padStart(spaces, " "), `[${this.startPos}, ${this.endPos}]`);

    for(const child of this.children) {
      child.printRange(spaces + 2);
    }
  }
}

export class TextNode extends Node {
  private textEl: HTMLSpanElement;

  constructor(text: string, startPos: number) {
    super();
    this.textEl = document.createElement("span");

    for(const c of text) {
      if(c === " ") {
        this.textEl.innerHTML += "&nbsp;";
      } else {
        this.textEl.innerText += c;
      }
    }

    this.startPos = startPos;
    this.endPos = startPos + text.length;
  }

  getHTMLElement(): HTMLElement {
    return this.textEl;
  }

  updateCursor(cursorPos: number): void {
    if(isPointInRange(cursorPos, this.startPos, this.endPos)) {
      const offset = cursorPos - this.startPos;
      const node = this.textEl.firstChild as ChildNode;
      Cursor.setCursorAtNode(node, offset);
    }
  }

  updateCursorPos(node: globalThis.Node, offset: number): boolean {
    if(this.textEl.contains(node)) {
      Cursor.setPos(this.startPos + offset);
      return true;
    }

    return false;
  }
}

export class InlineBlockNode extends BlockNode {
  private blockEl: HTMLElement;
  private type: Types;
  private openBlockSymbol: string;
  private closeBlockSymbol?: string;
  private isActive = false;

  constructor(token: Token) {
    super();

    this.type = token.type;
    this.openBlockSymbol = token.value;
    this.startPos = token.startPos;

    this.blockEl = document.createElement(TYPES_HTML_TAGS[this.type]);
  }

  private activateBlock() {
    if(this.isActive) return;
    this.isActive = true;

    const textNode = new TextNode(this.openBlockSymbol, this.startPos);
    this.children.unshift(textNode);
    this.blockEl.prepend(textNode.getHTMLElement());

    if(this.closeBlockSymbol) {
      const textNode = new TextNode(this.closeBlockSymbol, this.endPos - this.closeBlockSymbol.length);
      this.children.push(textNode);

      this.blockEl.appendChild(textNode.getHTMLElement());
    }
  }

  private deactivateBlock() {
    if(!this.isActive) return;
    this.isActive = false;

    this.blockEl.removeChild(this.children[0].getHTMLElement());
    this.children.shift();

    if(this.closeBlockSymbol) {
      this.blockEl.removeChild(this.children[this.children.length - 1].getHTMLElement());
      this.children.pop();
    }
  }

  closeBlock(token: Token): void {
    const symbol = token.value;
    const endPos = token.startPos;
    this.closeBlockSymbol = symbol;
    this.endPos = endPos + symbol.length;
  }

  closeUnclosedBlock(endPos: number): void {
    this.endPos = endPos;
  }

  addChild(node: Node): void {
    this.children.push(node);
    this.blockEl.appendChild(node.getHTMLElement());
  }

  getHTMLElement(): HTMLElement {
    return this.blockEl;
  }

  updateCursor(cursorPos: number): void {
    if(isPointInRange(cursorPos, this.startPos, this.endPos)) {
      this.activateBlock();
    } else if(!this.closeBlockSymbol) {
      this.activateBlock();
    } else {
      this.deactivateBlock();
    }

    for(const child of this.children) {
      child.updateCursor(cursorPos);
    }
  }

  updateCursorPos(node: globalThis.Node, offset: number): boolean {
    for(const child of this.children) {
      if(child.updateCursorPos(node, offset)) {
        return true;
      }
    }

    return false;
  }
}

export class LinkNode extends Node {
  private isLinkTextClosed = false;
  private containsDest = false;
  private isLinkDestClosed = false;
  private isLinkProperlyClosed = false;

  private linkText: string;
  private linkDest?: string;

  private containerEl: HTMLSpanElement;

  private linkEl: HTMLAnchorElement;
  private linkTextNode: TextNode;

  private markdownTextNode?: TextNode;

  private isActive = false;

  constructor(linkText: string, startPos: number) {
    super();
    this.startPos = startPos;
    this.linkText = linkText;

    this.containerEl = document.createElement("span");
    this.linkEl = document.createElement("a");
    // the first character of a link is a "[" so the text starts after this.
    this.linkTextNode = new TextNode(this.linkText, this.startPos + 1);

    this.linkEl.appendChild(this.linkTextNode.getHTMLElement());
    this.containerEl.appendChild(this.linkEl);
  }

  private activateBlock(): void {
    if(this.isActive) return;
    this.isActive = true;

    if(this.markdownTextNode) {
      this.containerEl.innerHTML = "";
      this.containerEl.appendChild(this.markdownTextNode.getHTMLElement());
    }
  }

  private deactivateBlock(): void {
    if(!this.isActive) return;
    this.isActive = false;

    this.containerEl.innerHTML = "";
    this.containerEl.appendChild(this.linkEl);
  }

  getHTMLElement(): HTMLElement {
    return this.containerEl;
  }

  updateCursor(cursorPos: number): void {
    if(isPointInRange(cursorPos, this.startPos, this.endPos)) {
      this.activateBlock();

      this.markdownTextNode?.updateCursor(cursorPos);
    } else if(!this.isLinkProperlyClosed) {
      this.activateBlock();
    } else {
      this.deactivateBlock();
    }
  }

  updateCursorPos(node: globalThis.Node, offset: number): boolean {
    // if "isActive" it means that the markdownTextNode is the one being displayed
    if(this.isActive) {
      return this.markdownTextNode?.updateCursorPos(node, offset) || false;
    }

    return this.linkTextNode.updateCursorPos(node, offset);
  }

  closeLinkText() {
    this.isLinkTextClosed = true;
  }

  closeLinkDest() {
    this.isLinkDestClosed = true;
  }

  setLinkDest(dest: string): void {
    this.linkDest = dest;
    this.linkEl.href = dest;
    this.containsDest = true;
  }

  closeLink(): void {
    let text = "[" + this.linkText;

    // the 1 represents the "[" character at the start of all links
    this.endPos = this.startPos + this.linkText.length + 1;

    if(this.isLinkTextClosed) {
      // this represents closing the link text with "]"
      this.endPos++;
      text += "]";
    }

    if(this.containsDest) {
      // the 1 represents the "(" character
      this.endPos += (this.linkDest as string).length + 1;
      text += "(" + this.linkDest;
    }

    if(this.isLinkDestClosed) {
      // this represents closing the link dest with ")"
      this.endPos++;
      text += ")";
      this.isLinkProperlyClosed = true;
    }

    this.markdownTextNode = new TextNode(text, this.startPos);
  }
}

class BRNode extends Node {
  private brEl: HTMLBRElement;

  constructor(startPos: number) {
    super();
    this.startPos = startPos;
    this.endPos = startPos;

    this.brEl = document.createElement("br");
  }

  updateCursor(cursorPos: number): void {
    if(isPointInRange(cursorPos, this.startPos, this.endPos)) {
      Cursor.setCursorAtNode(this.brEl, 0);
    }
  }

  updateCursorPos(node: globalThis.Node, _: number): boolean {
    if(node.isSameNode(this.brEl)) {
      Cursor.setPos(this.startPos);
      return true;
    }

    return false;
  }

  getHTMLElement(): HTMLElement {
    return this.brEl;
  }
}

class LineBlockNode extends BlockNode {
  private lineEl: HTMLDivElement;

  constructor(startPos: number) {
    super();
    this.startPos = startPos;

    this.lineEl = document.createElement("div");
  }

  closeBlock(token: Token): void {
    this.endPos = token.startPos;
  }

  closeUnclosedBlock(endPos: number): void {
    this.endPos = endPos;
    if(this.startPos + 1 === this.endPos) {
      this.addChild(new BRNode(this.startPos + 1));
    }
  }

  addChild(node: Node): void {
    this.children.push(node);
    this.lineEl.appendChild(node.getHTMLElement());
  }

  getHTMLElement(): HTMLElement {
    return this.lineEl;
  }

  updateCursor(cursorPos: number): void {
    for(const child of this.children) {
      child.updateCursor(cursorPos);
    }
  }

  updateCursorPos(node: globalThis.Node, offset: number): boolean {
    if(this.startPos + 1 === this.endPos && node.isSameNode(this.lineEl)) {
      Cursor.setPos(this.startPos + 1);
      return true;
    }

    for(const child of this.children) {
      if(child.updateCursorPos(node, offset)) {
        return true;
      }
    }

    return false;
  }
}

export default class Tree {
  private nodes: Node[] = [];

  private openedBlocks = new Queue<BlockNode>;
  private containerEl: HTMLDivElement;

  constructor() {
    this.containerEl = document.createElement("div");

    const lineBlock = new LineBlockNode(0);
    this.addChild(lineBlock);
    this.openBlock(lineBlock);
  }

  addChild(node: Node) {
    const lastOpenedBlock = this.openedBlocks.getLastItem();
    if(lastOpenedBlock) {
      lastOpenedBlock.addChild(node);
    } else {
      this.nodes.push(node);
      this.containerEl.appendChild(node.getHTMLElement());
    }
  }

  openBlock(node: BlockNode) {
    this.openedBlocks.addItem(node);
  }

  closeBlock(token: Token): void {
    const lastOpenedBlock = this.openedBlocks.getLastItem();
    if(lastOpenedBlock) {
      lastOpenedBlock.closeBlock(token);
      this.openedBlocks.deleteLastItem();
    }
  }

  closeUnclosedBlocks(endPos: number) {
    for(const openedBlock of this.openedBlocks.getItems()) {
      openedBlock.closeUnclosedBlock(endPos);
    }
  }

  updateCursor(cursorPos: number): void {
    for(const node of this.nodes) {
      node.printRange();
      node.updateCursor(cursorPos);
    }
  }

  updateCursorPos(targetNode: globalThis.Node, offset: number): void {
    for(const node of this.nodes) {
      if(node.updateCursorPos(targetNode, offset)) break;
    }
  }

  getHTMLPreview(): HTMLDivElement {
    return this.containerEl;
  }

  addNewLine(startPos: number): void {
    this.closeUnclosedBlocks(startPos);
    this.openedBlocks.clear();

    const lineBlock = new LineBlockNode(startPos);
    this.addChild(lineBlock);
    this.openBlock(lineBlock);
  }
}
