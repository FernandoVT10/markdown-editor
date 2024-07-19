import Editor from ".";

import { LineOpType } from "../lineOps";
import { CursorPos } from "../cursor";

export type UndoItem = {
  linesOps: LineOpType[];
  topLine: number;
  oldCursorPos: CursorPos;
  newCursorPos: CursorPos;
}

export default class UndoManager {
  private array: UndoItem[] = [];
  private cursor = 0;
  private editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  public undo(): void {
    if(this.cursor > 0) {
      this.cursor--;
      const undoItem = this.array[this.cursor];
      const startLine = undoItem.topLine + 1;
      this.editor.revertLinesOps(startLine, undoItem.linesOps);
      this.editor.updateCursorPos(undoItem.oldCursorPos);
    }
  }

  public redo(): void {
    if(this.cursor < this.array.length) {
      const redoItem = this.array[this.cursor];
      const startLine = redoItem.topLine + 1;
      this.editor.execLinesOps(startLine, redoItem.linesOps);
      this.editor.updateCursorPos(redoItem.newCursorPos);
      this.cursor++;
    }
  }

  public save(undoItem: UndoItem): void {
    this.array.splice(
      this.cursor,
      this.array.length - this.cursor,
      undoItem
    );
    this.cursor++;
  }

  public saveAndExec(item: UndoItem): void {
    this.save(item);
    const startLine = item.topLine + 1;
    this.editor.execLinesOps(startLine, item.linesOps);
    this.editor.updateCursorPos(item.newCursorPos);
  }
}
