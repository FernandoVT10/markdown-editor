import Trait from "../trait";
import MDNode from "../MDNode";

import { Text } from "../nodes";
import { Token, TokenRange } from "../../tokens";
import Cursor, { CursorPos } from "../../cursor";

interface SyntaxSymbolOpts {
  addSymbolAtEnd: boolean;
  neverHide: boolean;
}

class SyntaxSymbol extends Trait {
  private symbol: string;
  private startSymbolNode: Text;
  private endSymbolNode: Text;
  private parentEl: HTMLElement;
  private opts: {
    addSymbolAtEnd: boolean;
    neverHide: boolean;
  };

  private isShowing = false;

  constructor(
    symbol: string,
    range: TokenRange,
    parentEl: HTMLElement,
    opts: SyntaxSymbolOpts
  ) {
    super();

    this.symbol = symbol;
    this.parentEl = parentEl;
    this.startSymbolNode = new Text(symbol, this.createStartRange(range));
    this.endSymbolNode = new Text(symbol, this.createEndRange(range));

    this.parentEl.prepend(this.startSymbolNode.getHTMLEl());
    this.parentEl.append(this.endSymbolNode.getHTMLEl());

    this.hideStartSymbol();
    this.hideEndSymbol();

    this.opts = {
      addSymbolAtEnd: opts.addSymbolAtEnd,
      neverHide: opts.neverHide,
    };

    if(this.opts.neverHide) {
      this.show();
    }
  }


  private showStartSymbol(): void {
    this.startSymbolNode.getHTMLEl().classList.remove("display-none");
  }

  private hideStartSymbol(): void {
    this.startSymbolNode.getHTMLEl().classList.add("display-none");
  }

  private showEndSymbol(): void {
    this.endSymbolNode.getHTMLEl().classList.remove("display-none");
  }

  private hideEndSymbol(): void {
    this.endSymbolNode.getHTMLEl().classList.add("display-none");
  }

  private createStartRange(range: TokenRange): TokenRange {
    const symLen = this.symbol.length;
    return {
      start: { col: range.start.col, line: range.start.line },
      end: { col: range.start.col + symLen, line: range.start.line },
    }
  }

  private createEndRange(range: TokenRange): TokenRange {
    const symLen = this.symbol.length;
    return {
      start: { col: range.end.col - symLen, line: range.end.line },
      end: { col: range.end.col, line: range.end.line },
    };
  }

  public updateOpts(opts: Partial<SyntaxSymbolOpts>): void {
    if(opts.addSymbolAtEnd) {
      this.opts.addSymbolAtEnd = true;

      // make the symbol at the end visible if it wasn't
      this.endSymbolNode.getHTMLEl().classList.remove("display-none");
    } else {
      this.opts.addSymbolAtEnd = false;
      this.endSymbolNode.getHTMLEl().classList.add("display-none");
    }

    if(opts.neverHide) {
      this.opts.neverHide = true;
      this.show();
    } else {
      this.opts.neverHide = false;
    }
  }

  private show(): void {
    if(this.isShowing) return;
    this.isShowing = true;

    this.showStartSymbol();

    if(this.opts.addSymbolAtEnd) {
      this.showEndSymbol();
    }
  }

  private hide(): void {
    if(!this.isShowing || this.opts.neverHide) return;
    this.isShowing = false;

    this.hideStartSymbol();
    this.hideEndSymbol();
  }

  public onCursorUpdate(mdNode: MDNode, cursor: Cursor): void {
    if(mdNode.isInCursorRange(cursor)) {
      this.show();

      this.startSymbolNode.onCursorUpdate(cursor);
      this.endSymbolNode.onCursorUpdate(cursor);
    } else {
      this.hide();
    }
  }

  public getCursorPos(_: MDNode, selNode: Node, offset: number): CursorPos | undefined {
    const pos = this.startSymbolNode.getCursorPos(selNode, offset);
    if(pos) return pos;

    return this.endSymbolNode.getCursorPos(selNode, offset);
  }

  public updateRange(token: Token): void {
    this.startSymbolNode.setRange(this.createStartRange(token.range));
    this.endSymbolNode.setRange(this.createEndRange(token.range));
  }
  
  public updateSymbol(symbol: string): void {
    this.symbol = symbol;

    this.startSymbolNode.updateText(symbol);
    this.endSymbolNode.updateText(symbol);
  }
}

export default SyntaxSymbol;
