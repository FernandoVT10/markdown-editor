import MDNode from "../MDNode";
import Trait from "../trait";

import { setSelectionAtNode, scrollToEl } from "../../utils";

import Cursor, { CursorPos } from "../../cursor";

class SelectableNewLine extends Trait {
  public onCursorUpdate(mdNode: MDNode, cursor: Cursor): void {
    if(mdNode.getEndLine() === cursor.getPosY() && cursor.getPosX() === 0 && cursor.isCollapsed()) {
      const htmlEl = mdNode.getHTMLEl();
      setSelectionAtNode(htmlEl, 0);
      scrollToEl(htmlEl);
    }
  }

  public getCursorPos(mdNode: MDNode, selNode: Node, _: number): CursorPos | undefined {
    if(mdNode.getHTMLEl().isSameNode(selNode)) {
      return {
        x: mdNode.getStartCol(),
        y: mdNode.getStartLine(),
      };
    }
  }
}
export default SelectableNewLine;
