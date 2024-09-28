import Editor from "./editor";

import "./styles/app.css";
import "./styles/editor.css";

const editorContainer = document.getElementById("editor") as HTMLDivElement;
editorContainer.focus();

const editor = new Editor(editorContainer);
(window as any).editor = editor;
