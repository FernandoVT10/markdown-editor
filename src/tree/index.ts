import Subtree from "./traits/Subtree";
import Cursor, { CursorPos } from "../cursor";

import { getDiff } from "./diff";
import { parseTokens } from "../parser";
import { Container } from "../editor";
import { Tokens } from "../tokens";

class Tree {
  private docToken?: Tokens.Document;
  private subtree?: Subtree;

  private editorContainer: Container;

  constructor(editorContainer: Container) {
    this.editorContainer = editorContainer;
  }

  updateDocToken(newDocToken: Tokens.Document): void {
    if(this.docToken) {
      const diff = getDiff(this.docToken, newDocToken);
      this.subtree?.applyDiff(diff);
    } else {
      const nodes = parseTokens(newDocToken.tokens);
      this.subtree = new Subtree(nodes, this.editorContainer);
    }

    this.subtree?.updateRange(newDocToken);
    this.docToken = newDocToken;
  }

  onCursorUpdate(cursor: Cursor): void {
    this.subtree?.onCursorUpdate(null as any, cursor);
  }

  getCursorPos(selNode: Node, offset: number): CursorPos | undefined {
    return this.subtree?.getCursorPos(null, selNode, offset);
  }
}

export default Tree;
