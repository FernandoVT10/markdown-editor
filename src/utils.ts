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

export function isalnum(text: string): boolean {
  return /[A-Z0-9]/i.test(text);
}

export function isPointInRange(point: number, rangeStart: number, rangeEnd: number): boolean {
  return point >= rangeStart && point <= rangeEnd;
}
