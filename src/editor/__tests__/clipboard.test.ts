import { getSelectedText, getPastedLinesOps } from "../clipboard";

import { Buffer } from "..";
import { CursorSelection, CursorPos } from "../../cursor";
import { LineOps, UpdateLineOp, AddLineOp } from "../../lineOps";

describe("editor/clipboard", () => {
  describe("getSelectedText()", () => {
    it("returns selected text from single-line selection", () => {
      const buffer: Buffer = ["test"];
      const selection: CursorSelection = {
        startPos: { x: 1, y: 0 },
        endPos: { x: 3, y: 0 },
      };
      expect(getSelectedText(buffer, selection)).toBe("es");
    });

    it("returns selected text from two-line selection", () => {
      const buffer: Buffer = ["test\n", "test2"];
      const selection: CursorSelection = {
        startPos: { x: 3, y: 0 },
        endPos: { x: 5, y: 1 },
      };
      expect(getSelectedText(buffer, selection)).toBe("t\ntest2");
    });


    it("returns selected text from multi-line selection", () => {
      const buffer: Buffer = [
        "Mozart\n",
        "Bethoveen\n",
        "Bach\n",
        "Rachmaninoff",
      ];
      const selection: CursorSelection = {
        startPos: { x: 0, y: 1 },
        endPos: { x: 4, y: 3 },
      };
      expect(getSelectedText(buffer, selection)).toBe("Bethoveen\nBach\nRach");
    });
  });

  describe("getPastedLinesOps()", () => {
    it("returns one line op", () => {
      const pastedLines = ["llo"];
      const cursorPos: CursorPos = { x: 2, y: 0 };
      const buffer: Buffer = ["he"];

      const linesOps = getPastedLinesOps(pastedLines, cursorPos, buffer)
      expect(linesOps).toHaveLength(1);
      const lineOp = linesOps[0] as UpdateLineOp;
      expect(lineOp.type).toBe(LineOps.Update);
      expect(lineOp.preUpdateBuff).toBe("he");
      expect(lineOp.postUpdateBuff).toBe("hello");
    });

    it("returns two line ops", () => {
      const pastedLines = ["1", "2"];
      const cursorPos: CursorPos = { x: 1, y: 0 };
      const buffer: Buffer = ["LL"];

      const linesOps = getPastedLinesOps(pastedLines, cursorPos, buffer);
      expect(linesOps).toHaveLength(2);
      expect(linesOps[0].type).toBe(LineOps.Update);
      expect(linesOps[1].type).toBe(LineOps.Add);

      const updateOp = linesOps[0] as UpdateLineOp;
      expect(updateOp.type).toBe(LineOps.Update);
      expect(updateOp.preUpdateBuff).toBe("LL");
      expect(updateOp.postUpdateBuff).toBe("L1\n");

      const addOp = linesOps[1] as AddLineOp;
      expect(addOp.addedBuff).toBe("2L");
    });

    it("returns 3 line ops", () => {
      const pastedLines = ["1", "2", "3"];
      const cursorPos: CursorPos = { x: 2, y: 0 };
      const buffer: Buffer = ["LL\n", "LL"];

      const linesOps = getPastedLinesOps(pastedLines, cursorPos, buffer);
      expect(linesOps).toHaveLength(3);
      expect(linesOps[0].type).toBe(LineOps.Update);
      expect(linesOps[1].type).toBe(LineOps.Add);
      expect(linesOps[2].type).toBe(LineOps.Add);

      const updateOp = linesOps[0] as UpdateLineOp;
      expect(updateOp.type).toBe(LineOps.Update);
      expect(updateOp.preUpdateBuff).toBe("LL\n");
      expect(updateOp.postUpdateBuff).toBe("LL1\n");

      const addOp = linesOps[1] as AddLineOp;
      expect(addOp.addedBuff).toBe("2\n");

      const addOp2 = linesOps[2] as AddLineOp;
      expect(addOp2.addedBuff).toBe("3\n");
    });
  });
});
