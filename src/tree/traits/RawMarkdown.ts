import MDNode from "../MDNode";
import Trait from "../trait";

import Cursor, { CursorPos } from "../../cursor";
import { Token, TokenRange } from "../../tokens";
import { Text } from "../nodes";

type RawMarkdownOpts = {
  neverHide: boolean;
}

type CustomGetCursorPos = (selNode: Node, offset: number) => CursorPos | undefined;

type RawMardownProps = {
  rawMarkdown: string;
  previewHtmlEl: HTMLElement;
  range: TokenRange;
  parentEl: HTMLElement;
  customGetCursorPos:  CustomGetCursorPos;
  opts: RawMarkdownOpts;
};

class RawMarkdown extends Trait {
  private rawMardownNode: Text;
  private previewHtmlEl: HTMLElement;
  private parentEl: HTMLElement;
  private opts: RawMarkdownOpts;
  private customGetCursorPos: CustomGetCursorPos;

  private isShowing = false;

  constructor(props: RawMardownProps) {
    super();
    this.rawMardownNode = new Text(props.rawMarkdown, props.range);
    this.previewHtmlEl = props.previewHtmlEl;
    this.parentEl = props.parentEl;
    this.opts = props.opts;
    this.customGetCursorPos = props.customGetCursorPos;

    this.parentEl.appendChild(this.previewHtmlEl);

    if(this.opts.neverHide) {
      this.showMarkdown();
    }
  }

  public showMarkdown(): void {
    if(this.isShowing) return;
    this.isShowing = true;

    if(this.parentEl.contains(this.previewHtmlEl))
      this.parentEl.removeChild(this.previewHtmlEl);

    this.parentEl.appendChild(this.rawMardownNode.getHTMLEl());
  }

  public hideMarkdown(): void {
    if(!this.isShowing || this.opts.neverHide) return;
    this.isShowing = false;

    const rawEl = this.rawMardownNode.getHTMLEl();
    if(this.parentEl.contains(rawEl))
      this.parentEl.removeChild(rawEl);

    this.parentEl.appendChild(this.previewHtmlEl);
  }

  public onCursorUpdate(mdNode: MDNode, cursor: Cursor): void {
    if(mdNode.isInCursorRange(cursor)) {
      this.showMarkdown();

      this.rawMardownNode.onCursorUpdate(cursor);
    } else {
      this.hideMarkdown();
    }
  }

  public getCursorPos(_: MDNode, selNode: Node, offset: number): CursorPos | undefined {
    if(this.isShowing) return this.rawMardownNode.getCursorPos(selNode, offset);
    return this.customGetCursorPos(selNode, offset);
  }

  public updateRange(token: Token): void {
    this.rawMardownNode.setRange(token.range);
  }

  public updateRawMarkdown(raw: string): void {
    this.rawMardownNode.updateText(raw);
  }

  public updateOpts(opts: RawMarkdownOpts): void {
    if(opts.neverHide) {
      this.opts.neverHide = true;
      this.showMarkdown();
    } else {
      this.opts.neverHide = false;
    }
  }
}

export default RawMarkdown;
