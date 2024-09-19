import MDNode from "./MDNode";
import { Token } from "../tokens";

import Cursor, { CursorPos } from "../cursor";

abstract class Trait {
  public abstract onCursorUpdate(mdNode: MDNode, cursor: Cursor): void;
  public abstract getCursorPos(mdNode: MDNode, selNode: Node, offset: number): CursorPos | undefined;

  public updateRange(_token: Token): void {}
}

export default Trait;
