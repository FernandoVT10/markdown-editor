import MDNode from "../MDNode";
import Trait from "../trait";

import { setSelectionAtNode, scrollToEl } from "../../utils";

import Cursor, { CursorPos } from "../../cursor";

export default class SelectableText extends Trait {
  public onCursorUpdate(mdNode: MDNode, cursor: Cursor): void {
    const col = cursor.getCol();

    if(mdNode.isInCursorRange(cursor) && cursor.isCollapsed()) {
      const htmlEl = mdNode.getHTMLEl();
      const offset = col - mdNode.getStartCol();
      const node = htmlEl.firstChild;

      if(node) setSelectionAtNode(node, offset);
      scrollToEl(htmlEl);
    }
  }

  public getCursorPos(mdNode: MDNode, selNode: Node, offset: number): CursorPos | undefined {
    const htmlEl = mdNode.getHTMLEl();
    if(htmlEl.firstChild?.isSameNode(selNode)) {
      return {
        col: mdNode.getStartCol() + offset,
        line: mdNode.getStartLine(),
      };
    }
  }
}
