import MDNode from "../MDNode";
import Trait from "../trait";

import { Text } from "../nodes";
import { Token } from "../../tokens";
import { TokenRange } from "../../tokens";
import Cursor, { CursorPos } from "../../cursor";

class ListMark extends Trait {
  private mdMarkNode: Text;
  private listMark: HTMLSpanElement;

  private isShowing = false;

  constructor(mark: string, range: TokenRange, parentEl: HTMLElement) {
    super();
    this.mdMarkNode = new Text(mark, this.getMDMarkRange(range));

    this.listMark = document.createElement("span");
    this.listMark.classList.add("list-dot");

    this.hideListMark();
    this.hideMdMark();

    const mdMarkEl = this.mdMarkNode.getHTMLEl();
    parentEl.prepend(this.listMark, mdMarkEl);
  }

  private getMDMarkRange(range: TokenRange): TokenRange {
    return {
      start: { line: range.start.line, col: range.start.col },
      end: { line: range.start.line, col: range.start.col + 1 }
    };
  }

  private showListMark(): void {
    this.listMark.classList.remove("display-none");
  }

  private hideListMark(): void {
    this.listMark.classList.add("display-none");
  }

  private showMdMark(): void {
    this.mdMarkNode.getHTMLEl().classList.remove("display-none");
  }

  private hideMdMark(): void {
    this.mdMarkNode.getHTMLEl().classList.add("display-none");
  }

  private show(): void {
    if(this.isShowing) return;
    this.isShowing = true;
    this.showMdMark();
    this.hideListMark();
  }

  private hide(): void {
    if(!this.isShowing) return;
    this.isShowing = false;
    this.hideMdMark();
    this.showListMark();
  }

  public onCursorUpdate(mdNode: MDNode, cursor: Cursor): void {
    if(mdNode.isInCursorRange(cursor)) {
      this.show();
      this.mdMarkNode.onCursorUpdate(cursor);
    } else {
      this.hide();
    }
  }

  public getCursorPos(mdNode: MDNode, selNode: Node, offset: number): CursorPos | undefined {
    if(this.isShowing) return this.mdMarkNode.getCursorPos(selNode, offset);

    if(selNode.isSameNode(this.listMark)) {
      return { line: mdNode.getStartLine(), col: 1 };
    }
  }

  public updateRange(token: Token): void {
    this.mdMarkNode.setRange(this.getMDMarkRange(token.range));
  }
}

export default ListMark;
