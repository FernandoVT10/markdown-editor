import Editor from ".";

import { LineOpType, LineOps } from "../lineOps";
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

  private execLinesOps(startLine: number, linesOps: LineOpType[]): void {
    let lineNumber = startLine;

    // TODO: group similar sequencial operations and execute them together
    for(const lineOp of linesOps) {
      switch(lineOp.type) {
        case LineOps.Add: {
          this.editor.addLine(lineNumber, lineOp.addedBuff);
          lineNumber++;
        } break;
        case LineOps.Update: {
          this.editor.updateLine(lineNumber, lineOp.postUpdateBuff);
          lineNumber++;
        } break;
        case LineOps.Remove: {
          this.editor.removeLine(lineNumber);
        } break;
      }
    }
  }

  private revertLinesOps(startLine: number, lineOps: LineOpType[]): void {
    let lineNumber = startLine;

    // TODO: group similar sequencial operations and execute them together
    for(const lineOp of lineOps) {
      switch(lineOp.type) {
        case LineOps.Add: {
          this.editor.removeLine(lineNumber);
        } break;
        case LineOps.Update: {
          this.editor.updateLine(lineNumber, lineOp.preUpdateBuff);
          lineNumber++;
        } break;
        case LineOps.Remove: {
          this.editor.addLine(lineNumber, lineOp.removedBuff);
          lineNumber++;
        } break;
      }
    }
  }

  public undo(): void {
    if(this.cursor > 0) {
      this.editor.saveTypedBuffer();

      this.cursor--;
      const undoItem = this.array[this.cursor];
      const startLine = undoItem.topLine + 1;
      this.revertLinesOps(startLine, undoItem.linesOps);

      const cursorPos = undoItem.oldCursorPos;
      this.editor.cursor.setPos(cursorPos.x, cursorPos.y);
    }
  }

  public redo(): void {
    if(this.cursor < this.array.length) {
      const redoItem = this.array[this.cursor];
      const startLine = redoItem.topLine + 1;
      this.execLinesOps(startLine, redoItem.linesOps);

      const cursorPos = redoItem.newCursorPos;
      this.editor.cursor.setPos(cursorPos.x, cursorPos.y);

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
    this.editor.saveTypedBuffer();

    this.save(item);
    const startLine = item.topLine + 1;
    this.execLinesOps(startLine, item.linesOps);

    const cursorPos = item.newCursorPos;
    this.editor.cursor.setPos(cursorPos.x, cursorPos.y);
  }
}
