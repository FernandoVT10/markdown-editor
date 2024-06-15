import { MDNode } from "./tree";
import { TKNRange } from "./tokens";

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

export function scrollToEl(el: HTMLElement): void {
  const scrollY = window.scrollY;
  const elTop = el.offsetTop;

  const windowBot = scrollY + window.innerHeight;
  const elBot = elTop + el.offsetHeight;

  if(windowBot < elBot) {
    const offset = elBot - windowBot;
    window.scrollTo({ top: scrollY + offset })
  } else if(scrollY > elTop) {
    const offset = scrollY - elTop;
    window.scrollTo({ top: scrollY - offset })
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
