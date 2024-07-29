import { Token, Types } from "../tokens";
import { getTokenArrDiff, areRangesEq, DiffTypes } from "../diff";

describe("diff", () => {
  describe("areRangesEq()", () => {
    describe("return false when", () => {
      it("start.col are different", () => {
        const end = { col: 1, line: 0 };
        
        const r1 = {
          start: { col: 0, line: 0 },
          end,
        };

        const r2 = {
          start: { col: 1, line: 0 },
          end,
        };

        expect(areRangesEq(r1, r2)).toBeFalsy();
      });

      it("start.line are different", () => {
        const end = { col: 1, line: 0 };
        
        const r1 = {
          start: { col: 0, line: 0 },
          end,
        };

        const r2 = {
          start: { col: 0, line: 1 },
          end,
        };

        expect(areRangesEq(r1, r2)).toBeFalsy();
      });

      it("end.col are different", () => {
        const start = { col: 0, line: 0 };
        
        const r1 = {
          start,
          end: { col: 0, line: 0 },
        };

        const r2 = {
          start,
          end: { col: 1, line: 0 },
        };

        expect(areRangesEq(r1, r2)).toBeFalsy();
      });

      it("end.line are different", () => {
        const start = { col: 0, line: 0 };
        
        const r1 = {
          start,
          end: { col: 0, line: 0 },
        };

        const r2 = {
          start,
          end: { col: 0, line: 1 },
        };

        expect(areRangesEq(r1, r2)).toBeFalsy();
      });
    });
  });
  
  describe("getTokenArrDiff()", () => {
    const mockTokens: Token[] = [
      {
        type: Types.Paragraph,
        range: {
          start: { col: 0, line: 0 },
          end: { col: 5, line: 0 },
        },
        tokens: [],
      },
      {
        type: Types.Bold,
        range: {
          start: { col: 0, line: 1 },
          end: { col: 5, line: 1 },
        },
        tokens: [],
        wasClosed: true,
      },
      {
        type: Types.Italic,
        range: {
          start: { col: 0, line: 2 },
          end: { col: 5, line: 2 },
        },
        tokens: [],
        wasClosed: true,
      },
      {
        type: Types.Paragraph,
        range: {
          start: { col: 0, line: 3 },
          end: { col: 5, line: 3 },
        },
        tokens: [],
      },
    ];

    it("returns an emtpy array when nothing changes", () => {
      expect(getTokenArrDiff(mockTokens, mockTokens)).toHaveLength(0);
    });

    it("returns modification when ranges are not equal", () => {
      const arr1: Token[] = [{
        type: Types.Paragraph,
        range: {
          start: { col: 0, line: 0 },
          end: { col: 5, line: 0 },
        },
        tokens: [],
      }];

      const arr2: Token[] = [{
        type: Types.Paragraph,
        range: {
          start: { col: 0, line: 0 },
          end: { col: 7, line: 7 },
        },
        tokens: [],
      }];

      const res = getTokenArrDiff(arr1, arr2); 
      expect(res).toHaveLength(1);
      expect(res[0]).toMatchObject({
        type: DiffTypes.Modification,
        tokenIndex: 0,
        token: arr2[0],
      });
    });

    it("returns deletion and insertion when tokens are different", () => {
      const arr1 = [mockTokens[0]];
      const arr2 = [mockTokens[1]];

      const res = getTokenArrDiff(arr1, arr2); 
      expect(res).toHaveLength(2);
      expect(res[0]).toMatchObject({
        type: DiffTypes.Deletion,
        tokenIndex: 0,
      });

      expect(res[1]).toMatchObject({
        type: DiffTypes.Insertion,
        tokenIndex: 0,
        token: arr2[0],
      });
    });

    it("returns insertion if one token is missing", () => {
      const arr1 = [mockTokens[0]];
      const arr2 = [mockTokens[0], mockTokens[1]];

      const res = getTokenArrDiff(arr1, arr2); 
      expect(res).toHaveLength(1);
      expect(res[0]).toMatchObject({
        type: DiffTypes.Insertion,
        tokenIndex: 1,
        token: arr2[1],
      });
    });

    it("returns deletion if there's an extra token", () => {
      const arr1 = [mockTokens[0], mockTokens[1]];
      const arr2 = [mockTokens[0]];

      const res = getTokenArrDiff(arr1, arr2); 
      expect(res).toHaveLength(1);
      expect(res[0]).toMatchObject({
        type: DiffTypes.Deletion,
        tokenIndex: 1,
      });
    });

    it("returns deletion if there's an extra token in the middle", () => {
      const arr1 = [mockTokens[0], mockTokens[1], mockTokens[2]];
      const arr2 = [mockTokens[0], mockTokens[2]];

      const res = getTokenArrDiff(arr1, arr2); 
      expect(res).toHaveLength(1);
      expect(res[0]).toMatchObject({
        type: DiffTypes.Deletion,
        tokenIndex: 1,
      });
    });

    it("returns insertion if there's a new token in the middle", () => {
      const newToken = mockTokens[1];
      const arr1 = [mockTokens[0], mockTokens[2]];
      const arr2 = [mockTokens[0], newToken, mockTokens[2]];

      const res = getTokenArrDiff(arr1, arr2); 
      expect(res).toHaveLength(1);
      expect(res[0]).toMatchObject({
        type: DiffTypes.Insertion,
        tokenIndex: 1,
        token: newToken,
      });
    });

    it("should work with many insertions", () => {
      const newToken = mockTokens[1];
      const newToken2 = mockTokens[2];

      const arr1 = [mockTokens[0], mockTokens[3]];
      const arr2 = [mockTokens[0], newToken, newToken2, mockTokens[3]];

      const res = getTokenArrDiff(arr1, arr2); 
      expect(res).toHaveLength(2);
      expect(res[0]).toMatchObject({
        type: DiffTypes.Insertion,
        tokenIndex: 1,
        token: newToken,
      });

      expect(res[1]).toMatchObject({
        type: DiffTypes.Insertion,
        tokenIndex: 2,
        token: newToken2,
      });
    });

    it("should work with many deletions", () => {
      const arr1 = [mockTokens[0], mockTokens[1], mockTokens[2], mockTokens[3]];
      const arr2 = [mockTokens[0], mockTokens[3]];

      const res = getTokenArrDiff(arr1, arr2); 
      expect(res).toHaveLength(2);
      expect(res[0]).toMatchObject({
        type: DiffTypes.Deletion,
        tokenIndex: 1,
      });

      expect(res[1]).toMatchObject({
        type: DiffTypes.Deletion,
        tokenIndex: 2,
      });
    });
  });
});
