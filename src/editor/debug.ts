import Cursor from "../cursor";

export function setup(cursor: Cursor) {
  if(process.env.NODE_ENV === "test") return;

  const cursorPosX = document.getElementById("cursor-pos-x") as HTMLElement;
  const cursorPosY = document.getElementById("cursor-pos-y") as HTMLElement;

  const loop = () => {
    const { x, y }= cursor.getPos();
    cursorPosX.innerText = x.toString();
    cursorPosY.innerText = y.toString();
    window.requestAnimationFrame(loop);
  }

  loop();
}

export default {
  setup,
};
