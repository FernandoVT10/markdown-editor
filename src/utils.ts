import { CursorSelection, CursorPos } from "./cursor";
import { MDRange, TokenRange } from "./tokens";

export function isalnum(text: string): boolean {
  return /[A-Z0-9]/i.test(text);
}

export function isPointInRange(point: number, range: MDRange): boolean {
  return point >= range[0] && point <= range[1];
}

export type Line = {
  start: number,
  end: number,
};

export function checkLineCollision(lineA: Line, lineB: Line): boolean {
  const rangeA: MDRange = [lineA.start, lineA.end];
  const rangeB: MDRange = [lineB.start, lineB.end]

  return isPointInRange(lineA.start, rangeB)
    || isPointInRange(lineA.end, rangeB)
    || isPointInRange(lineB.start, rangeA)
    || isPointInRange(lineB.end, rangeA);
}

export function scrollToEl(el: HTMLElement): void {
  const margin = 10;
  const scrollY = window.scrollY;
  const windowBot = scrollY + window.innerHeight;
  const elRect = el.getBoundingClientRect();
  const elTop = elRect.top + scrollY;
  const elBot = elRect.bottom + scrollY;

  if(windowBot < elBot) {
    const offset = elBot - windowBot;
    window.scrollTo({ top: scrollY + offset + margin });
  } else if(scrollY > elTop) {
    const offset = scrollY - elTop;
    window.scrollTo({ top: scrollY - offset - margin });
  }
}

export function isSpecialAction(e: KeyboardEvent): boolean {
  const ctrl = e.ctrlKey;
  const shift = e.shiftKey;
  const key = e.key.toLowerCase();

  if(ctrl) {
    // Open dev console
    if(shift && key === "i") return true;

    // Copy & Paste
    if(["v", "c"].includes(key)) return true;
  }

  return false;
}

export function setSelectionAtNode(node: Node, offset: number): void {
  const selection = window.getSelection();
  if(selection) {
    selection.collapse(node, offset);
  }
}

export type LineRange = {
  line: number;
  range: MDRange;
}

export function isLineRangeInSel(lineRange: LineRange, selection: CursorSelection): boolean {
  const { startPos, endPos } = selection;

  const line = lineRange.line;
  const [startRange, endRange] = lineRange.range;

  if(line >= startPos.y && line <= endPos.y) {
    if(endPos.y === startPos.y) {
      // here the selection is only in one line, so we have two lines (range and selection)
      // and we return the result depending if both lines touch.
      return checkLineCollision(
        { start: startRange, end: endRange },
        { start: startPos.x, end: endPos.x },
      );
    } else if(line === startPos.y) {
      // here the selection is at least of two lines, so the only thing we have to check
      // is if the range touch the start of the selection
      return endRange >= startPos.x;
    } else if(line === endPos.y) {
      // here we're at the end of the selection, so we check if the range and selection touch each other
      return startRange <= endPos.x;
    }

    return true;
  }

  return false;
}

export function isCursorPosInRange(pos: CursorPos, range: TokenRange): boolean {
  const { start, end } = range;

  if(!isPointInRange(pos.y, [start.line, end.line])) {
    return false;
  }

  if(start.line === end.line) {
    return isPointInRange(pos.x, [start.col, end.col]);
  } else if(pos.y === start.line) {
    return pos.x >= start.col;
  } else if(pos.y === end.line) {
    return pos.x <= end.col;
  } else {
    return true;
  }
}
