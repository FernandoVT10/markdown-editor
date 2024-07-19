import { MDBlockNode } from "./definitions";
import { NewLine } from "./nodes";
import Cursor, { CursorPos } from "../cursor";

export default class Tree {
  private nodeLines: MDBlockNode[] = [];
  private editorContainer: HTMLElement;

  constructor(editorContainer: HTMLElement) {
    this.editorContainer = editorContainer;
  }

  updateNodesLine(fromLine: number) {
    for(let newLine = fromLine; newLine < this.nodeLines.length; newLine++) {
      this.nodeLines[newLine].setLine(newLine);
    }
  }

  addLine(line: number, blockNode?: MDBlockNode): void {
    if(!blockNode) {
      blockNode = new NewLine([0, 0]);
    }

    blockNode.setLine(line);
    this.nodeLines.splice(line, 0, blockNode);

    if(this.nodeLines[line + 1]) {
      const nextEl = this.nodeLines[line + 1].getHTMLEl();
      this.editorContainer.insertBefore(blockNode.getHTMLEl(), nextEl);

      this.updateNodesLine(line + 1);
    } else {
      this.editorContainer.appendChild(blockNode.getHTMLEl());
    }
  }

  updateLine(line: number, blockNode?: MDBlockNode): void {
    if(!blockNode) {
      blockNode = new NewLine([0, 0]);
    }

    blockNode.setLine(line);

    if(this.nodeLines[line]) {
      const prevEl = this.nodeLines[line].getHTMLEl();
      prevEl.replaceWith(blockNode.getHTMLEl());
      this.nodeLines[line] = blockNode;
    } else {
      this.addLine(line, blockNode);
    }
  }

  removeLine(line: number) {
    if(line < this.nodeLines.length) {
      this.editorContainer.removeChild(this.nodeLines[line].getHTMLEl());
      this.nodeLines.splice(line, 1);
      this.updateNodesLine(line);
    }
  }

  onCursorUpdate(cursor: Cursor): void {
    for(const node of this.nodeLines) {
      node.onCursorUpdate(cursor);
    }
  }

  getCursorPos(selNode: Node, offset: number): CursorPos | undefined {
    for(const node of this.nodeLines) {
      const pos = node.getCursorPos(selNode, offset);
      if(pos !== undefined) return pos;
    }
  }
}
