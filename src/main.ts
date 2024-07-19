import Cursor from "./cursor";
import Editor from "./editor";

import "./styles.css";

const editorContainer = document.getElementById("editor") as HTMLDivElement;
editorContainer.focus();

const editor = new Editor(editorContainer);
(window as any).editor = editor;
(window as any).Cursor = Cursor;
