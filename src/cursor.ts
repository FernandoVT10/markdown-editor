type CB = () => void;

class CursorClass {
  private cursorPos = 0;
  private cbList: CB[]  = [];

  onUpdate(cb: CB): void {
    this.cbList.push(cb);
  }

  getPos(): number {
    return this.cursorPos;
  }

  setPos(cursorPos: number): void {
    this.cursorPos = cursorPos;

    for(const cb of this.cbList) {
      cb();
    }
  }

  setCursorAtNode(node: globalThis.Node, offset: number): void {
    const range = document.createRange();
    range.setStart(node, offset);

    const selection = window.getSelection();
    if(selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      selection.collapseToEnd();
    }
  }
}

const Cursor = new CursorClass();
export default Cursor;
