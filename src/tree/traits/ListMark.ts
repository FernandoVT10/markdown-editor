import MDNode from "../MDNode";
import Trait from "../trait";

import { Text } from "../nodes";
import { Token } from "../../tokens";
import { TokenRange } from "../../tokens";
import Cursor, { CursorPos } from "../../cursor";

class ListMark extends Trait {
  private mark: string;
  private markNode: Text;
  private isOrdered: boolean;
  private listDotEl: HTMLSpanElement;

  private isShowing = false;

  constructor(mark: string, isOrdered: boolean, range: TokenRange, parentEl: HTMLElement) {
    super();
    this.mark = mark;
    this.markNode = new Text(mark, this.getMarkRange(range, this.mark.length));
    this.isOrdered = isOrdered;

    this.listDotEl = document.createElement("span");
    this.listDotEl.classList.add("list-dot");

    const markEl = this.markNode.getHTMLEl();

    if(this.isOrdered) {
      this.showMark();
      parentEl.prepend(markEl);
    } else {
      this.hideListDot();
      this.hideMark();
      parentEl.prepend(this.listDotEl, markEl);
    }
  }

  private getMarkRange(range: TokenRange, markLen: number): TokenRange {
    return {
      start: { line: range.start.line, col: range.start.col },
      end: { line: range.start.line, col: range.start.col + markLen }
    };
  }

  private showListDot(): void {
    this.listDotEl.classList.remove("display-none");
  }

  private hideListDot(): void {
    this.listDotEl.classList.add("display-none");
  }

  private showMark(): void {
    this.markNode.getHTMLEl().classList.remove("display-none");
  }

  private hideMark(): void {
    this.markNode.getHTMLEl().classList.add("display-none");
  }

  private show(): void {
    if(this.isShowing || this.isOrdered) return;
    this.isShowing = true;
    this.showMark();
    this.hideListDot();
  }

  private hide(): void {
    if(!this.isShowing || this.isOrdered) return;
    this.isShowing = false;
    this.hideMark();
    this.showListDot();
  }

  public onCursorUpdate(mdNode: MDNode, cursor: Cursor): void {
    if(mdNode.isInCursorRange(cursor)) {
      this.show();
      this.markNode.onCursorUpdate(cursor);
    } else {
      this.hide();
    }
  }

  public getCursorPos(mdNode: MDNode, selNode: Node, offset: number): CursorPos | undefined {
    if(this.isShowing || this.isOrdered) return this.markNode.getCursorPos(selNode, offset);

    if(selNode.isSameNode(this.listDotEl)) {
      return { line: mdNode.getStartLine(), col: 1 };
    }
  }

  public updateRange(token: Token): void {
    this.markNode.setRange(this.getMarkRange(token.range, this.mark.length));
  }

  public updateMark(mark: string): void {
    this.mark = mark;
    this.markNode.updateText(mark);
  }
}

export default ListMark;
