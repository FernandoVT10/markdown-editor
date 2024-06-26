import NewEditor from "./editor";

import "./styles.css";

const editorContainer = document.getElementById("editor") as HTMLDivElement;
editorContainer.focus();

const editor = new NewEditor(editorContainer);
(window as any).editor = editor;
