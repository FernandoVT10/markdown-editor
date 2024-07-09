import Editor from "../editor";

console.log = () => {};

const expectCursorPos = (editor: Editor, x: number, y: number) => {
  expect(editor.cursor.getPos()).toEqual({ x, y });
};

describe("Editor", () => {
  let editor: Editor;
  let container: HTMLDivElement;

  const dispatchKeydown = (opts: Partial<KeyboardEvent>) => {
    const event = new KeyboardEvent("keydown", opts);
    container.dispatchEvent(event);
  };

  const dispatchPaste = (text: string) => {
    const event = new Event("paste") as any;
    event.clipboardData = {
      getData: () => text,
    };
    container.dispatchEvent(event);
  };

  const dispatchUndo = () => {
    dispatchKeydown({
      ctrlKey: true,
      key: "z",
    });
  };

  const dispatchRedo = () => {
    dispatchKeydown({
      ctrlKey: true,
      shiftKey: true,
      key: "z",
    });
  };

  const writeIntoEditor = (text: string) => {
    for(const c of text) {
      dispatchKeydown({ key: c });
    }
  };

  beforeEach(() => {
    container = document.createElement("div");
    editor = new Editor(container);
  });

  describe("adding chars", () => {
    it("adds char", () => {;
      dispatchKeydown({ key: "a" });
      expect(editor.buffer).toHaveLength(1);
      expect(editor.buffer[0]).toBe("a");
      expectCursorPos(editor, 1, 0);
    });

    it("adds new line", () => {
      dispatchKeydown({ key: "Enter" });

      expect(editor.buffer).toHaveLength(2);
      expect(editor.buffer[0]).toBe("\n");
      expect(editor.buffer[1]).toBe("");
      expectCursorPos(editor, 0, 1);
    });

    it("adds new line after char", () => {
      editor.buffer = ["a"];
      editor.cursor.setPos(1, 0);
      dispatchKeydown({ key: "Enter" });

      expect(editor.buffer).toHaveLength(2);
      expect(editor.buffer[0]).toBe("a\n");
      expectCursorPos(editor, 0, 1);
    });

    it("adds new line between chars", () => {
      editor.buffer = ["aa"];
      editor.cursor.setPos(1, 0);
      dispatchKeydown({ key: "Enter" });

      expect(editor.buffer).toHaveLength(2);
      expect(editor.buffer[0]).toBe("a\n");
      expect(editor.buffer[1]).toBe("a");
      expectCursorPos(editor, 0, 1);
    });
  });

  describe("remove char with Backspace", () => {
    it("removes char", () => {
      const text = "text";
      editor.buffer[0] = text;
      editor.cursor.setPos(2, 0);
      dispatchKeydown({ key: "Backspace" });
      expect(editor.buffer[0]).toBe("txt");
      expectCursorPos(editor, 1, 0);
    });

    it("removes new line", () => {
      const text = "text";
      editor.buffer = [text + "\n", ""];
      editor.cursor.setPos(0, 1);
      dispatchKeydown({ key: "Backspace" });
      expect(editor.buffer).toHaveLength(1);
      expect(editor.buffer[0]).toBe(text);
      expectCursorPos(editor, text.length, 0);
    });

    it("removes line with chars in it", () => {
      editor.buffer = ["text\n", "foo"];
      editor.cursor.setPos(0, 1);
      dispatchKeydown({ key: "Backspace" });
      expect(editor.buffer).toHaveLength(1);
      expect(editor.buffer[0]).toBe("textfoo");
      expectCursorPos(editor, 4, 0);
    });

    it("removes line between lines", () => {
      editor.buffer = ["text\n", "\n", "foo"];
      editor.cursor.setPos(0, 1);
      dispatchKeydown({ key: "Backspace" });
      expect(editor.buffer).toHaveLength(2);
      expect(editor.buffer[0]).toBe("text\n");
      expect(editor.buffer[1]).toBe("foo");
      expectCursorPos(editor, 4, 0);
    });

    it("does nothing if the cursor is at the beginning", () => {
      editor.buffer = ["text\n"];
      editor.cursor.setPos(0, 0);
      dispatchKeydown({ key: "Backspace" });
      expect(editor.buffer).toEqual(editor.buffer);
      expectCursorPos(editor, 0, 0);
    });
  });

  describe("removing chars with CTRL + Backspace", () => {
    it("removes a sequence of alphanumeric chars", () => {
      const seq = "AB10cd";
      editor.buffer = [seq];
      editor.cursor.setPos(seq.length, 0);
      dispatchKeydown({ key: "Backspace", ctrlKey: true });
      expect(editor.buffer[0]).toBe("");
      expectCursorPos(editor, 0, 0);
    });

    it("stops removing if there's a non alphanumeric char", () => {
      const seq = "AB$10cd";
      editor.buffer = [seq];
      editor.cursor.setPos(seq.length, 0);
      dispatchKeydown({ key: "Backspace", ctrlKey: true });
      expect(editor.buffer[0]).toBe("AB$");
      expectCursorPos(editor, 3, 0);
    });

    it("removes only 1 char if it's not alphanumeric", () => {
      const seq = "abc$";
      editor.buffer = [seq];
      editor.cursor.setPos(seq.length, 0);
      dispatchKeydown({ key: "Backspace", ctrlKey: true });
      expect(editor.buffer[0]).toBe("abc");
      expectCursorPos(editor, 3, 0);
    });

    it("stops removing before new line", () => {
      const seq = "foo";
      editor.buffer = ["abc\n", seq];
      editor.cursor.setPos(seq.length, 1);
      dispatchKeydown({ key: "Backspace", ctrlKey: true });

      expect(editor.buffer).toHaveLength(2);

      expect(editor.buffer[0]).toBe(editor.buffer[0]);
      expect(editor.buffer[1]).toBe("");

      expectCursorPos(editor, 0, 1);
    });

    it("removes new line", () => {
      editor.buffer = ["abc\n", ""];
      editor.cursor.setPos(0, 1);
      dispatchKeydown({ key: "Backspace", ctrlKey: true });
      expect(editor.buffer).toHaveLength(1);
      expect(editor.buffer[0]).toBe("abc");
      expectCursorPos(editor, 3, 0);
    });

    it("does nothing if the cursor is at the beginning", () => {
      editor.buffer = ["text\n"];
      editor.cursor.setPos(0, 0);
      dispatchKeydown({ key: "Backspace", ctrlKey: true });
      expect(editor.buffer).toEqual(editor.buffer);
      expectCursorPos(editor, 0, 0);
    });
  });

  it("should add \\t when pressing tab", () => {
    dispatchKeydown({ key: "Tab" });
    expect(editor.buffer[0]).toBe("\t");
    expectCursorPos(editor, 1, 0);
  });

  describe("pasting text", () => {
    it("pastes one word", () => {
      editor.cursor.setPosX(0);
      dispatchPaste("neovim");
      expect(editor.buffer[0]).toBe("neovim");
      expectCursorPos(editor, 6, 0);
    });

    it("pastes text in middle of other text", () => {
      editor.cursor.setPosX(2);
      editor.buffer = ["nevim"];

      dispatchPaste("o");

      expect(editor.buffer[0]).toBe("neovim");
      expectCursorPos(editor, 3, 0);
    });

    it("pastes text that contains a new line", () => {
      editor.cursor.setPosX(5);
      editor.buffer = ["firstsecond"];

      dispatchPaste("test\ntest");

      expect(editor.buffer).toHaveLength(2);
      expect(editor.buffer[0]).toBe("firsttest\n");
      expect(editor.buffer[1]).toBe("testsecond");
      expectCursorPos(editor, 4, 1);
    });

    it("pastes text with several new lines in empty buffer", () => {
      dispatchPaste("hello\nworld\n!\n");

      expect(editor.buffer).toHaveLength(4);
      expect(editor.buffer[0]).toBe("hello\n");
      expect(editor.buffer[1]).toBe("world\n");
      expect(editor.buffer[2]).toBe("!\n");
      expect(editor.buffer[3]).toBe("");
      expectCursorPos(editor, 0, 3);
    });

    it("does nothing when there's no text to paste", () => {
      editor.buffer = ["test"];
      dispatchPaste("");

      expect(editor.buffer).toHaveLength(1);
      expect(editor.buffer[0]).toBe("test");
      expectCursorPos(editor, 0, 0);
    });
  });

  describe("removing selection", () => {
    it("removes one line selection", () => {
      editor.buffer[0] = "hello";

      editor.cursor.setSelection(
        { x: 1, y: 0 },
        { x: 4, y: 0 },
      );
      dispatchKeydown({ key: "Backspace" });
      expect(editor.buffer[0]).toBe("ho");
    });

    it("removes two lines selection", () => {
      editor.buffer[0] = "hello";
      editor.buffer[1] = "hello";

      editor.cursor.setSelection(
        { x: 1, y: 0 },
        { x: 1, y: 1 },
      );
      dispatchKeydown({ key: "Backspace" });
      expect(editor.buffer).toHaveLength(1);
      expect(editor.buffer[0]).toBe("hello");
    });

    it("removes 4 lines selection", () => {
      editor.buffer[0] = "soul";
      editor.buffer[1] = "of";
      editor.buffer[2] = "cinder";
      editor.buffer[3] = "!";

      editor.cursor.setSelection(
        { x: 2, y: 0 },
        { x: 0, y: 3 },
      );
      dispatchKeydown({ key: "Backspace" });
      expect(editor.buffer).toHaveLength(1);
      expect(editor.buffer[0]).toBe("so!");
    });
  });

  describe("copying to clipboard", () => {
    let setDataMock = jest.fn();

    beforeEach(() => {
      setDataMock.mockClear();
    });

    const dispatchCopy = () => {
      const event = new Event("copy") as any;
      event.clipboardData = {
        setData: setDataMock,
      };
      container.dispatchEvent(event);
    };

    it("should copy text from one line", () => {
      editor.buffer[0] = "elden ring";
      editor.cursor.setSelection(
        { x: 0, y: 0 },
        { x: 5, y: 0 },
      );
      dispatchCopy();
      expect(setDataMock).toHaveBeenCalledWith("text/plain", "elden");
    });

    it("should copy text from two lines", () => {
      editor.buffer[0] = "elden ring\n";
      editor.buffer[1] = "dark souls";
      editor.cursor.setSelection(
        { x: 6, y: 0 },
        { x: 4, y: 1 },
      );
      dispatchCopy();
      expect(setDataMock).toHaveBeenCalledWith("text/plain", "ring\ndark");
    });

    it("should copy text from 4 lines", () => {
      editor.buffer[0] = "test 1\n";
      editor.buffer[1] = "23\n";
      editor.buffer[2] = "45\n";
      editor.buffer[3] = "6 endtest";
      editor.cursor.setSelection(
        { x: 5, y: 0 },
        { x: 1, y: 3 },
      );
      dispatchCopy();
      expect(setDataMock).toHaveBeenCalledWith("text/plain", "1\n23\n45\n6");
    });
  });

  describe("undo system", () => {
    describe("adding chars", () => {
      it("UNDO", () => {
        writeIntoEditor("abc");
        dispatchUndo();
        expect(editor.buffer[0]).toBe("");
        expectCursorPos(editor, 0, 0);
      });

      it("REDO", () => {
        writeIntoEditor("abc");
        dispatchUndo();
        dispatchRedo();
        expect(editor.buffer[0]).toBe("abc");
        expectCursorPos(editor, 3, 0);
      });
    });

    describe("removing chars with CTRL + Backspace", () => {
      it("UNDO", () => {
        writeIntoEditor("hello");
        dispatchKeydown({ key: "Backspace", ctrlKey: true });
        dispatchUndo();
        expect(editor.buffer[0]).toBe("hello");
        expectCursorPos(editor, 5, 0);
      });

      it("REDO", () => {
        writeIntoEditor("hello");
        dispatchKeydown({ key: "Backspace", ctrlKey: true });
        dispatchUndo();
        dispatchRedo();
        expect(editor.buffer[0]).toBe("");
        expectCursorPos(editor, 0, 0);
      });
    });

    // it.only("undoes removing a selection", () => {
    //   writeIntoEditor("hello");
    //   // the selection includes only "ll" 
    //   const startPos = { x: 2, y: 0 };
    //   const endPos = { x: 4, y: 0 };
    //   editor.cursor.setSelection(startPos, endPos);
    //   dispatchKeydown({ key: "ArrowLeft" });
    //   dispatchKeydown({ key: "Backspace" });
    //   dispatchUndo();
    //   expect(editor.buffer[0]).toBe("hello");
    //   expectCursorPos(editor, 4, 0);
    // });

    // it("undoes removing multiline selection", () => {
    //   writeIntoEditor("hello");
    //   // the selection includes only "ll" 
    //   const startPos = { x: 2, y: 0 };
    //   const endPos = { x: 4, y: 0 };
    //   editor.cursor.setSelection(startPos, endPos);
    //   dispatchKeydown({ key: "Backspace" });
    //   dispatchUndo();
    //   expect(editor.buffer[0]).toBe("hello");
    //   expectCursorPos(editor, 5, 0);
    // });


    it("undoes back to text typed before newline was created", () => {
      writeIntoEditor("hello");
      dispatchKeydown({ key: "Enter" });
      dispatchUndo();
      expect(editor.buffer).toHaveLength(1);
      expect(editor.buffer[0]).toBe("hello");
      expectCursorPos(editor, 5, 0);
    });

    describe("adding a newline", () => {
      it("UNDO", () => {
        dispatchKeydown({ key: "Enter" });
        dispatchUndo();
        expect(editor.buffer).toHaveLength(1);
        expect(editor.buffer[0]).toBe("");
        expectCursorPos(editor, 0, 0);
      });

      it("REDO", () => {
        dispatchKeydown({ key: "Enter" });
        dispatchUndo();
        dispatchRedo();
        expect(editor.buffer).toHaveLength(2);
        expect(editor.buffer[0]).toBe("\n");
        expect(editor.buffer[1]).toBe("");
        expectCursorPos(editor, 0, 1);
      });
    });

    describe("removing a new line", () => {
      it("UNDO", () => {
        dispatchKeydown({ key: "Enter" });
        dispatchKeydown({ key: "Backspace" });
        dispatchUndo();
        expect(editor.buffer).toHaveLength(2);
        expectCursorPos(editor, 0, 1);
      });

      it("REDO", () => {
        dispatchKeydown({ key: "Enter" });
        dispatchKeydown({ key: "Backspace" });
        dispatchUndo();
        dispatchRedo();
        expect(editor.buffer).toHaveLength(1);
        expectCursorPos(editor, 0, 0);
      });
    });

    describe("pasting text", () => {
      describe("single line", () => {
        it("UNDO", () => {
          dispatchPaste("Hello");
          dispatchUndo();
          expect(editor.buffer[0]).toBe("");
          expectCursorPos(editor, 0, 0);
        });

        it("REDO", () => {
          dispatchPaste("Hello");
          dispatchUndo();
          dispatchRedo();
          expect(editor.buffer[0]).toBe("Hello");
          expectCursorPos(editor, 5, 0);
        });
      });

      describe("multiple lines", () => {
        it("UNDO", () => {
          dispatchPaste("Hello\nWorld\n!");
          dispatchUndo();
          expect(editor.buffer[0]).toBe("");
          expectCursorPos(editor, 0, 0);
        });

        it("REDO", () => {
          dispatchPaste("Hello\nWorld\n!");
          dispatchUndo();
          dispatchRedo();
          expect(editor.buffer).toHaveLength(3);
          expect(editor.buffer[0]).toBe("Hello\n");
          expect(editor.buffer[1]).toBe("World\n");
          expect(editor.buffer[2]).toBe("!");
          expectCursorPos(editor, 1, 2);
        });
      });
    });

    describe("removing a selection", () => {
      describe("single line", () => {
        const text = "hello";
        // the selection includes only "ll" 
        const startPos = { x: 2, y: 0 };
        const endPos = { x: 4, y: 0 };

        it("UNDO", () => {
          writeIntoEditor(text);
          editor.cursor.setSelection(startPos, endPos);
          // arrow left is used to call saveTypedText indirectly
          dispatchKeydown({ key: "ArrowLeft" });
          dispatchKeydown({ key: "Backspace" });
          dispatchUndo();
          expect(editor.buffer[0]).toBe(text);
          expectCursorPos(editor, 4, 0);
        });

        it("REDO", () => {
          writeIntoEditor(text);
          editor.cursor.setSelection(startPos, endPos);
          // arrow left is used to call saveTypedText indirectly
          dispatchKeydown({ key: "ArrowLeft" });
          dispatchKeydown({ key: "Backspace" });
          dispatchUndo();
          dispatchRedo();
          expect(editor.buffer[0]).toBe("heo");
          expectCursorPos(editor, 2, 0);
        });
      });

      describe("multiple lines", () => {
        const text = "Hello\nWorld\n!";
        // the selection includes only "o\nWorld\n!" 
        const startPos = { x: 4, y: 0 };
        const endPos = { x: 1, y: 2 };

        it("UNDO", () => {
          writeIntoEditor(text);
          editor.cursor.setSelection(startPos, endPos);
          // arrow left is used to call saveTypedText indirectly
          dispatchKeydown({ key: "ArrowLeft" });
          dispatchKeydown({ key: "Backspace" });
          dispatchUndo();
          expect(editor.buffer).toHaveLength(3);
          expectCursorPos(editor, 1, 2);
        });

        it("REDO", () => {
          writeIntoEditor(text);
          editor.cursor.setSelection(startPos, endPos);
          // arrow left is used to call saveTypedText indirectly
          dispatchKeydown({ key: "ArrowLeft" });
          dispatchKeydown({ key: "Backspace" });
          dispatchUndo();
          dispatchRedo();
          expect(editor.buffer).toHaveLength(1);
          expect(editor.buffer[0]).toBe("Hell");
          expectCursorPos(editor, 4, 0);
        });
      });
    });
  });
});
