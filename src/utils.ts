export function isalnum(text: string): boolean {
  return /[A-Z0-9]/i.test(text);
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
