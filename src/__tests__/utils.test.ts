import { CursorSelection } from "../cursor";
import { TokenRange } from "../tokens";
import {
  checkLineCollision,
  isLineRangeInSel,
  isCursorPosInRange,
  Line,
  LineRange,
} from "../utils";

describe("utils", () => {
  describe("checkLineCollision()", () => {
    it("should return true", () => {
      const lineA: Line =  { start: 0, end: 10 };
      const lineB: Line =  { start: 5, end: 15 };
      expect(checkLineCollision(lineA, lineB)).toBeTruthy();
    });

    it("returns true when end and beginning touch", () => {
      const lineA: Line =  { start: 0, end: 5 };
      const lineB: Line =  { start: 5, end: 10 };
      expect(checkLineCollision(lineA, lineB)).toBeTruthy();
    });

    it("returns true when beginning and end touch", () => {
      const lineA: Line =  { start: 5, end: 10 };
      const lineB: Line =  { start: 0, end: 5 };
      expect(checkLineCollision(lineA, lineB)).toBeTruthy();
    });

    it("returns true when lineA is inside lineB", () => {
      const lineA: Line =  { start: 5, end: 10 };
      const lineB: Line =  { start: 0, end: 20 };
      expect(checkLineCollision(lineA, lineB)).toBeTruthy();
    });

    it("returns true when lineB is inside lineA", () => {
      const lineA: Line =  { start: 0, end: 20 };
      const lineB: Line =  { start: 5, end: 10 };
      expect(checkLineCollision(lineA, lineB)).toBeTruthy();
    });

    it("returns false when both lines don't touch", () => {
      const lineA: Line =  { start: 0, end: 5 };
      const lineB: Line =  { start: 6, end: 10 };
      expect(checkLineCollision(lineA, lineB)).toBeFalsy();
    });
  });

  describe("isLineRangeInSel()", () => {
    it("should return true", () => {
      const lineRange: LineRange = {
        line: 0,
        range: [0, 10],
      };

      const selection: CursorSelection = {
        startPos: { x: 2, y: 0 },
        endPos: { x: 7, y: 0 },
      };
      expect(isLineRangeInSel(lineRange, selection)).toBeTruthy();
    });

    it("returns false when the range is outside selection", () => {
      const lineRange: LineRange = {
        line: 0,
        range: [0, 1],
      };

      const selection: CursorSelection = {
        startPos: { x: 2, y: 0 },
        endPos: { x: 7, y: 0 },
      };
      expect(isLineRangeInSel(lineRange, selection)).toBeFalsy();
    });

    it("returns false when range's line is outside selection", () => {
      const lineRange: LineRange = {
        line: 5,
        range: [0, 10],
      };

      const selection: CursorSelection = {
        startPos: { x: 2, y: 0 },
        endPos: { x: 7, y: 0 },
      };
      expect(isLineRangeInSel(lineRange, selection)).toBeFalsy();
    });

    it("returns true when range's line is inside selection", () => {
      const lineRange: LineRange = {
        line: 1,
        range: [0, 1],
      };

      const selection: CursorSelection = {
        startPos: { x: 2, y: 0 },
        endPos: { x: 7, y: 2 },
      };
      expect(isLineRangeInSel(lineRange, selection)).toBeTruthy();
    });

    it("returns true when range's end barely touches selection", () => {
      const lineRange: LineRange = {
        line: 0,
        range: [0, 5],
      };

      const selection: CursorSelection = {
        startPos: { x: 5, y: 0 },
        endPos: { x: 7, y: 2 },
      };
      expect(isLineRangeInSel(lineRange, selection)).toBeTruthy();
    });

    it("returns true when range's beginning barely touches selection", () => {
      const lineRange: LineRange = {
        line: 2,
        range: [7, 10],
      };

      const selection: CursorSelection = {
        startPos: { x: 5, y: 0 },
        endPos: { x: 7, y: 2 },
      };
      expect(isLineRangeInSel(lineRange, selection)).toBeTruthy();
    });
  });

  describe("isCursorPosInRange", () => {
    it("returns true when cursor's y is between the range", () => {
      const range = {
        start: { line: 0, col: 10 },
        end: { line: 2, col: 20 },
      };
      const cursorPos = { x: 25, y: 1 };
      expect(isCursorPosInRange(cursorPos, range)).toBeTruthy();
    });

    it("returns false when cursor's y is not between the range", () => {
      const range = {
        start: { line: 0, col: 10 },
        end: { line: 2, col: 20 },
      };
      const cursorPos = { x: 25, y: 3 };
      expect(isCursorPosInRange(cursorPos, range)).toBeFalsy();
    });

    describe("passing single-line range", () => {
      const range = {
        start: { line: 0, col: 0 },
        end: { line: 0, col: 20 },
      };

      it("returns true", () => {
        const cursorPos = { x: 10, y: 0 };
        expect(isCursorPosInRange(cursorPos, range)).toBeTruthy();
      });

      it("returns false", () => {
        const cursorPos = { x: 21, y: 0 };
        expect(isCursorPosInRange(cursorPos, range)).toBeFalsy();
      });
    });

    describe("when cursor's y is equal to range's start line", () => {
      const range = {
        start: { line: 0, col: 10 },
        end: { line: 2, col: 20 },
      };

      it("returns true", () => {
        const cursorPos = { x: 10, y: 0 };
        expect(isCursorPosInRange(cursorPos, range)).toBeTruthy();
      });

      it("returns false", () => {
        const cursorPos = { x: 0, y: 0 };
        expect(isCursorPosInRange(cursorPos, range)).toBeFalsy();
      });
    });

    describe("when cursor's y is equal to range's end line", () => {
      const range = {
        start: { line: 0, col: 10 },
        end: { line: 2, col: 20 },
      };

      it("returns true", () => {
        const cursorPos = { x: 0, y: 2 };
        expect(isCursorPosInRange(cursorPos, range)).toBeTruthy();
      });

      it("returns false", () => {
        const cursorPos = { x: 21, y: 2 };
        expect(isCursorPosInRange(cursorPos, range)).toBeFalsy();
      });
    });

    describe("when cursor's y is equal to range's end line", () => {
      const range = {
        start: { line: 0, col: 10 },
        end: { line: 2, col: 20 },
      };

      it("returns true", () => {
        const cursorPos = { x: 0, y: 2 };
        expect(isCursorPosInRange(cursorPos, range)).toBeTruthy();
      });

      it("returns false", () => {
        const cursorPos = { x: 21, y: 2 };
        expect(isCursorPosInRange(cursorPos, range)).toBeFalsy();
      });
    });
  });
});
