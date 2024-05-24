export enum Types {
  Text,

  BeginBoldText,
  EndBoldText,
  BeginItalicText,
  EndItalicText,

  BeginInlineCode,
  EndInlineCode,

  BeginH1,
  EndH1,
};

export const TYPES_HTML_TAGS: Record<number, string> = {
  [Types.BeginBoldText]: "strong",
  [Types.BeginItalicText]: "i",
  [Types.BeginInlineCode]: "code",
  [Types.BeginH1]: "h1",
};

export type Token = {
  type: Types;
  startPos: number;
  value: string;
};

