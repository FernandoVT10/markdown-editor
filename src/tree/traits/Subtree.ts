import MDNode from "../MDNode";
import Trait from "../trait";
import Cursor, { CursorPos } from "../../cursor";
import { DiffOp, DiffOpsTypes } from "../diff";
import { parseToken } from "../../parser";
import { isAParentToken } from "../../tokens";
import { BlockTokens } from "../../tokens";
import { CSS_CLASSES } from "../constants";

export default class Subtree extends Trait {
  private nodes: MDNode[];
  private subtreeContainer: HTMLDivElement;

  constructor(nodes: MDNode[], parentEl: HTMLElement) {
    super();
    this.nodes = nodes;

    this.subtreeContainer = document.createElement("div");
    // TODO: make a better way to handle the creating of elements with classes
    this.subtreeContainer.classList.add(CSS_CLASSES.subtree);
    parentEl.appendChild(this.subtreeContainer);

    // fill parent element with childs' html elements
    for(const node of this.nodes) {
      this.subtreeContainer.appendChild(node.getHTMLEl());
    }
  }

  onCursorUpdate(_: MDNode, cursor: Cursor): void {
    for(const nodes of this.nodes) {
      nodes.onCursorUpdate(cursor);
    }
  }

  getCursorPos(_: MDNode | null, selNode: Node, offset: number): CursorPos | undefined {
    for(const node of this.nodes) {
      const pos = node.getCursorPos(selNode, offset);
      if(pos !== undefined) return pos;
    }
  }

  applyDiff(diffOps: DiffOp[]): void {
    for(const diffOp of diffOps) {
      switch(diffOp.type) {
        case DiffOpsTypes.Update: {
          this.nodes[diffOp.pos].onTokenUpdate(diffOp.updatedToken);
        } break;
        case DiffOpsTypes.Insert: {
          const newNode = parseToken(diffOp.insertedToken);
          this.nodes.splice(diffOp.pos, 0, newNode);

          const nextEl = this.nodes[diffOp.pos + 1]?.getHTMLEl();
          if(nextEl && this.subtreeContainer.contains(nextEl)) {
            this.subtreeContainer.insertBefore(newNode.getHTMLEl(), nextEl);
          } else {
            this.subtreeContainer.appendChild(newNode.getHTMLEl());
          }
        } break;
        case DiffOpsTypes.Delete: {
          const node = this.nodes[diffOp.pos];
          this.subtreeContainer.removeChild(node.getHTMLEl());
          this.nodes.splice(diffOp.pos, 1);
        } break;
        case DiffOpsTypes.Replace: {
          const oldNode = this.nodes[diffOp.pos];
          const newNode = parseToken(diffOp.newToken);

          this.subtreeContainer.replaceChild(newNode.getHTMLEl(), oldNode.getHTMLEl());
          this.nodes.splice(diffOp.pos, 1, newNode);
        } break;
        case DiffOpsTypes.SubtreeUpd:
        case DiffOpsTypes.SubtreeAndTknUpd: {
          const node = this.nodes[diffOp.pos];

          if(diffOp.type === DiffOpsTypes.SubtreeAndTknUpd) {
            node.onTokenUpdate(diffOp.updatedToken);
          }

          if(node.hasTrait(Subtree)) {
            const subtree = node.getTrait<Subtree>(Subtree);
            subtree.applyDiff(diffOp.ops);
          } else {
            console.error(`Error: you cannot apply a SubtreeUpd operation to ${node} because it doesn't have the trait subtree`);
          }
        } break;
      }
    }
  }

  public updateRange(token: BlockTokens): void {
    if(isAParentToken(token)) {
      for(let i = 0; i < this.nodes.length; i++) {
        this.nodes[i].updateRange(token.tokens[i]);
      }
    } else {
      console.error("[token.tokens] must be an array. Token recieved:", token);
    }
  }
}
