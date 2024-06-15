import { Token, Types } from "./tokens";

export const DEBUG = true;

export function printTokens(tokens: Token[], depth = 0): void {
  const spaces = "".padStart(depth * 2, " ");
  for(const token of tokens) {
    const { type, range } = token;
    console.log(`${spaces}${Types[type]}: [${range[0]}, ${range[1]}]`);

    if(Array.isArray((token as any).tokens)) {
      printTokens((token as any).tokens, depth + 2);
    }
  }
}

export function logInfo(text: string) {
  const style = "color: #79aaeb;font-weight: bold;";
  console.log("%c" + text, style);
}
