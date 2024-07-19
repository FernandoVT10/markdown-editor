import Editor, { Buffer } from ".";
import { CursorSelection } from "../cursor";
import { CursorPos } from "../cursor";
import {
  LineOpType,
  addLineOp,
  updateLineOp
} from "../lineOps";

export function getSelectedText(buffer: Buffer, selection: CursorSelection): string {
  let text = "";

  const { startPos, endPos } = selection;

  if(startPos.y === endPos.y) {
    const line = startPos.y;
    text = buffer[line].slice(startPos.x, endPos.x);
  } else {
    for(let line = startPos.y; line <= endPos.y; line++) {
      const bufLine = buffer[line];

      if(line === startPos.y) {
        text += bufLine.slice(startPos.x);
      } else if(line === endPos.y) {
        text += bufLine.slice(0, endPos.x);
      } else {
        text += bufLine;
      }
    }
  }

  return text;
}

export function getPastedLinesOps(pastedLines: string[], cursorPos: CursorPos, buffer: Buffer): LineOpType[] {
  const posX = cursorPos.x;
  const line = cursorPos.y;
  const bufLine = buffer[line];

  const leftPart = bufLine.slice(0, posX);
  const rightPart = bufLine.slice(posX);

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

    const posX = editor.cursor.getPosX();
    const line = editor.cursor.getPosY();
    const pastedLines = pastedText.split("\n");
    const linesOps = getPastedLinesOps(pastedLines, editor.cursor.getPos(), editor.buffer);

    let newCursorPos: CursorPos;
    if(pastedLines.length > 1) {
      const lastIndex = pastedLines.length - 1;
      newCursorPos = {
        x: pastedLines[lastIndex].length,
        y: line + lastIndex,
      };
    } else {
      newCursorPos = {
        x: posX + pastedText.length,
        y: line,
      };
    }

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
