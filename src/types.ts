export enum Types {
  Text,

  BeginBoldText,
  EndBoldText,
  BeginItalicText,
  EndItalicText,

  BeginInlineCode,
  EndInlineCode,

  BeginH1,
  BeginH2,
  BeginH3,
  BeginH4,
  BeginH5,
  BeginH6,
  EndH1,
  EndH2,
  EndH3,
  EndH4,
  EndH5,
  EndH6,

  BeginLink,
  EndLink,
  BeginLinkText,
  EndLinkText,
  BeginLinkDest,
  EndLinkDest,
};

export const TYPES_HTML_TAGS: Record<number, string> = {
  [Types.BeginBoldText]: "strong",
  [Types.BeginItalicText]: "i",
  [Types.BeginInlineCode]: "code",
  [Types.BeginH1]: "h1",
  [Types.BeginH2]: "h2",
  [Types.BeginH3]: "h3",
  [Types.BeginH4]: "h4",
  [Types.BeginH5]: "h5",
  [Types.BeginH6]: "h6",
};

export type Token = {
  type: Types;
  startPos: number;
  value: string;
};

export const NUMBER_OF_HEADERS = 6;
export const BEGIN_HEADER_TYPE_LIST = [
  Types.BeginH1,
  Types.BeginH2,
  Types.BeginH3,
  Types.BeginH4,
  Types.BeginH5,
  Types.BeginH6,
];
