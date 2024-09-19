import MDNode from "../MDNode";
import Trait from "../trait";

import Cursor, { CursorPos } from "../../cursor";
import { Token, Tokens, TokenRange } from "../../tokens";
import { Text } from "../nodes";

// IMPORTANT: this class is only working for the node "Code" 
class RawContent extends Trait {
  private contentNode: Text;

  private wasClosed: boolean;

  constructor(token: Tokens.Code, parentEl: HTMLElement) {
    super();

    this.wasClosed = token.wasClosed;
    this.contentNode = new Text(token.content, this.getContentRange(token.range));

    parentEl.appendChild(this.contentNode.getHTMLEl());
  }

  private getContentRange(range: TokenRange): TokenRange {
    const line = range.start.line;
    const endCol = this.wasClosed ? range.end.col - 1 : range.end.col;
    return {
      start: { col: range.start.col + 1, line },
      end: { col: endCol, line },
    };
  }

  public onCursorUpdate(_: MDNode, cursor: Cursor): void {
    this.contentNode.onCursorUpdate(cursor);
  }

  public getCursorPos(_: MDNode, selNode: Node, offset: number): CursorPos | undefined {
    return this.contentNode.getCursorPos(selNode, offset);
  }

  public updateData(content: string, wasClosed: boolean): void {
    this.contentNode.updateText(content);
    this.wasClosed = wasClosed;
  }

  public updateRange(token: Token): void {
    this.contentNode.setRange(this.getContentRange(token.range));
  }
}

export default RawContent;
