import { MDNode } from "./tree";
import { TKNRange } from "./tokens";

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

  clear(): boolean {
    while(this.itemsCount > 0) {
      this.deleteLastItem();
    }

    return true;
  }
}

export function isalnum(text: string): boolean {
  return /[A-Z0-9]/i.test(text);
}

export function isPointInRange(point: number, range: TKNRange): boolean {
  return point >= range[0] && point <= range[1];
}

export function appendNodesToEl(el: HTMLElement, nodes: MDNode[]): void {
  for(const node of nodes) {
    el.appendChild(node.getHTMLEl());
  }
}
