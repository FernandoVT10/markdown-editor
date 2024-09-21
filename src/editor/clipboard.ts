import Editor, { MDBuffer } from ".";
import { CursorSelection } from "../cursor";
import { CursorPos } from "../cursor";
import {
  LineOpType,
  addLineOp,
  updateLineOp
} from "../lineOps";

export function getSelectedText(buffer: MDBuffer, selection: CursorSelection): string {
  let text = "";

  const { start, end } = selection;

  if(start.line === end.line) {
    const line = start.line;
    text = buffer[line].slice(start.col, end.col);
  } else {
    for(let line = start.line; line <= end.line; line++) {
      const bufLine = buffer[line];

      if(line === start.line) {
        text += bufLine.slice(start.col);
      } else if(line === end.line) {
        text += bufLine.slice(0, end.col);
      } else {
        text += bufLine;
      }
    }
  }

  return text;
}

export function getPastedLinesOps(pastedLines: string[], cursorPos: CursorPos, buffer: MDBuffer): LineOpType[] {
  const { col, line } = cursorPos;

  const bufLine = buffer[line];

  const leftPart = bufLine.slice(0, col);
  const rightPart = bufLine.slice(col);

  const linesOps: LineOpType[] = [];

  if(pastedLines.length > 1) {
    for(let i = 0; i < pastedLines.length; i++) {
      let text = pastedLines[i];
      if(i === 0) {
        const updatedBuff = leftPart + text + "\n";
        linesOps.push(updateLineOp(bufLine, updatedBuff));
      } else if(i === pastedLines.length - 1) {
        const addedBuff = text + rightPart;
        linesOps.push(addLineOp(addedBuff));
      } else {
        const addedBuff = text + "\n";
        linesOps.push(addLineOp(addedBuff));
      }
    }
  } else {
    const updatedBuff = leftPart + pastedLines[0] + rightPart;
    linesOps.push(updateLineOp(bufLine, updatedBuff));
  }

  return linesOps;
}

function setup(editor: Editor): void {
  editor.container.addEventListener("copy", e => {
    e.preventDefault();
    const selection = editor.cursor.getSelection();
    if(!editor.cursor.isCollapsed() && selection) {
      const selectedText = getSelectedText(editor.buffer, selection);

      e.clipboardData?.setData("text/plain", selectedText);
    }
  });

  editor.container.addEventListener("paste", e => {
    e.preventDefault();

    const pastedText = e.clipboardData?.getData("text/plain");
    if(!pastedText) return;

    const { col, line } = editor.cursor.getPos();
    const pastedLines = pastedText.split("\n");
    const linesOps = getPastedLinesOps(pastedLines, editor.cursor.getPos(), editor.buffer);

    let newCursorPos: CursorPos;
    if(pastedLines.length > 1) {
      const lastIndex = pastedLines.length - 1;
      newCursorPos = {
        col: pastedLines[lastIndex].length,
        line: line + lastIndex,
      };
    } else {
      newCursorPos = {
        col: col + pastedText.length,
        line,
      };
    }

    // TODO: maybe do something about this line?
    editor.saveTypedBuffer();
    editor.undoManager.saveAndExec({
      linesOps,
      topLine: line - 1,
      oldCursorPos: editor.cursor.getPosCopy(),
      newCursorPos,
    });
  });
}

export default {
  setup,
};
