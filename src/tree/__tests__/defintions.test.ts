import Cursor, { CursorPos } from "../../cursor";
import { Token } from "../../tokens";
import { MDNode } from "../definitions";

describe("tree/definitions", () => {
  describe("MDNode", () => {
    class TestNode extends MDNode {
      public updateToken(_token: Token): void {}

      public onCursorUpdate(_cursor: Cursor): void {}

      public getCursorPos(_selNode: Node, _offset: number): CursorPos | undefined {
        return;
      }
    }

    describe("inCursorRange()", () => {
      const createCursorObj = (opts: { isCollapsed: boolean, pos: CursorPos }): Cursor => {
        return {
          isCollapsed: () => opts.isCollapsed,
          getPos: () => opts.pos,
        } as Cursor;
      };

      describe("when cursor is collapsed", () => {
        it("returns true", () => {
          const cursor = createCursorObj({
            isCollapsed: true,
            pos: { x: 0, y: 0 },
          });
          const token = {
            type: 0,
            range: {
              start: { line: 0, col: 0 },
              end: { line: 0, col: 20 },
            },
          };

          const testNode = new TestNode(token, "span");
          expect(testNode.isInCursorRange(cursor)).toBeTruthy();
        });

        it("returns false", () => {
          const cursor = createCursorObj({
            isCollapsed: true,
            pos: { x: 0, y: 1 },
          });

          const token = {
            type: 0,
            range: {
              start: { line: 0, col: 0 },
              end: { line: 0, col: 20 },
            },
          };

          const testNode = new TestNode(token, "span");
          expect(testNode.isInCursorRange(cursor)).toBeFalsy();
        });
      });
    });
  });

  describe("MDBlockNode", () => {
    it.todo("test onCursorUpdate()");
    it.todo("test cursorEnter()");
    it.todo("test cursorLeave()");
  });
});
