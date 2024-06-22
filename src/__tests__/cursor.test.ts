import Editor from "../editor";
import Cursor from "../cursor-new";

describe("Cursor", () => {
  let cursor: Cursor;

  const buffer = [
    "all alone\n",
    "with\n",
    "you - supercell",
  ];

  beforeEach(() => {
    const editor = { buffer };
    cursor = new Cursor(editor as Editor);
  });

  describe("goRight()", () => {
    it("increments cursor pos in x", () => {
      cursor.setPos(0, 0);
      cursor.goRight();
      expect(cursor.getPosX()).toBe(1);
    });

    it("should jump to next line", () => {
      // the new line character "\n" should be skiped
      cursor.setPos(buffer[0].length - 1, 0);
      cursor.goRight();
      expect(cursor.getPos()).toEqual({ x: 0, y: 1 });
    });

    it("does nothing if it's at the end of the buffer", () => {
      const endY = buffer.length - 1;
      const endX = buffer[endY].length;
      cursor.setPos(endX, endY);
      cursor.goRight()
      expect(cursor.getPos()).toEqual({ x: endX, y: endY });
    });
  });

  describe("goLeft()", () => {
    it("decrements cursor pos in x", () => {
      cursor.setPos(1, 0);
      cursor.goLeft()
      expect(cursor.getPosX()).toBe(0);
    });

    it("should jump to prev line", () => {
      // the new line character "\n" should be skiped
      cursor.setPos(0, 1);
      cursor.goLeft();
      expect(cursor.getPos()).toEqual({
        x: buffer[0].length - 1,
        y: 0,
      });
    });

    it("does nothing if it's at the beginning of the buffer", () => {
      cursor.setPos(0, 0);
      cursor.goLeft();
      expect(cursor.getPos()).toEqual({ x: 0, y: 0 });
    });
  });

  describe("goDown()", () => {
    it("increments cursor pos in y", () => {
      cursor.setPos(0, 0);
      cursor.goDown();
      expect(cursor.getPosY()).toBe(1);
    });

    it("does nothing if there's no other line below", () => {
      cursor.setPos(0, 2);
      cursor.goDown();
      expect(cursor.getPosY()).toBe(2);
    });

    it("updates cursor's x pos if there's not enough chars", () => {
      cursor.setPos(6, 0);
      cursor.goDown();
      expect(cursor.getPos()).toEqual({ x: 4, y: 1 });
    });

    it("should remember the x before going down", () => {
      const startX = buffer[0].length - 1;
      cursor.setPos(startX, 0);
      cursor.goDown();
      cursor.goDown();
      expect(cursor.getPosX()).toBe(startX);
    });
  });

  describe("goUp()", () => {
    it("decrements cursor pos in y", () => {
      cursor.setPos(0, 1);
      cursor.goUp();
      expect(cursor.getPosY()).toBe(0);
    });

    it("does nothing if y is 0", () => {
      cursor.setPos(0, 0);
      cursor.goUp();
      expect(cursor.getPosY()).toBe(0);
    });

    it("updates cursor's x pos if there's not enough chars", () => {
      cursor.setPos(6, 2);
      cursor.goUp();
      expect(cursor.getPos()).toEqual({ x: 4, y: 1 });
    });

    it("should remember the x before going up", () => {
      const startX = 6;
      cursor.setPos(startX, 2);
      cursor.goUp();
      cursor.goUp();
      expect(cursor.getPosX()).toBe(startX);
    });
  });
});
