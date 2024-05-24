import { Types, TYPES_HTML_TAGS, Token } from "./types";
import { Queue, setCursorAtNode } from "./utils";

abstract class Node {
  protected startPos = 0;
  protected endPos = 0;

  public getStartPos(): number {
    return this.startPos;
  }

  abstract getHTMLElement(): HTMLElement;
  abstract updateCursor(cursorPos: number): void;
}

export class TextNode extends Node {
  private textEl: HTMLSpanElement;

  constructor(text: string, startPos: number) {
    super();
    this.textEl = document.createElement("span");
    this.textEl.innerHTML = text.replace(/ /g, "&nbsp;");

    this.startPos = startPos;
    this.endPos = startPos + text.length;
  }

  getHTMLElement(): HTMLElement {
    return this.textEl;
  }

  updateCursor(cursorPos: number): void {
    if(cursorPos >= this.startPos && cursorPos <= this.endPos) {
      const offset = cursorPos - this.startPos;
      const node = this.textEl.firstChild as ChildNode;
      setCursorAtNode(node, offset);
    }
  }
}

export class BlockNode extends Node {
  private children: Node[] = [];
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

  closeBlock(closeBlockSymbol: string, endPos: number): void {
    this.closeBlockSymbol = closeBlockSymbol;
    this.endPos = endPos + closeBlockSymbol.length;
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
    if(cursorPos >= this.startPos && cursorPos <= this.endPos) {
      this.activateBlock();

      for(const node of this.children) {
        node.updateCursor(cursorPos);
      }
    } else if(!this.closeBlockSymbol) {
      this.activateBlock();
    } else {
      this.deactivateBlock();
    }
  }
}

export default class Tree {
  private nodes: Node[] = [];

  private openedBlocks = new Queue<BlockNode>;

  addChild(node: Node) {
    const lastOpenedBlock = this.openedBlocks.getLastItem();
    if(lastOpenedBlock) {
      lastOpenedBlock.addChild(node);
    } else {
      this.nodes.push(node);
    }
  }

  openBlock(node: BlockNode) {
    this.openedBlocks.addItem(node);
  }

  closeBlock(closeBlockSymbol: string, endPos: number) {
    const lastOpenedBlock = this.openedBlocks.getLastItem();
    if(lastOpenedBlock) {
      lastOpenedBlock.closeBlock(closeBlockSymbol, endPos);
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
      node.updateCursor(cursorPos);
    }
  }

  getHTMLPreview(): HTMLDivElement {
    const div = document.createElement("div");

    for(const node of this.nodes) {
      div.appendChild(node.getHTMLElement());
    }

    return div;
  }
}
