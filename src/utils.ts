export class Queue<T> {
  private items: T[] = [];
  private itemsCount = 0;

  addItem(item: T) {
    this.items[this.itemsCount] = item;
    this.itemsCount++;
  }

  getItems() {
    return this.items.slice(0, this.itemsCount);
  }

  deleteLastItem(): boolean {
    this.itemsCount--;
    return delete this.items[this.itemsCount];
  }

  getLastItem(): T | undefined {
    return this.items[this.itemsCount - 1];
  }
}

export function setCursorAtNode(node: globalThis.Node, offset: number): void {
  const range = document.createRange();
  range.setStart(node, offset);

  const selection = window.getSelection();
  if(selection) {
    selection.removeAllRanges();
    selection.addRange(range);
    selection.collapseToEnd();
  }
}
