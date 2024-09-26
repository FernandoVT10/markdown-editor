export enum Types {
  Document,
  Text,
  Bold,
  Italic,
  Code,
  Header,
  Paragraph,
  NewLine,
  Link,
  Image,
  Rule,
  Blockquote,
  ListItem,
  List,
}

export type MDRange = [number, number];

export type TokenRange = {
  start: { line: number, col: number };
  end: { line: number, col: number };
};

export namespace Tokens {
  export interface Document {
    type: Types.Document;
    range: TokenRange;
    tokens: Token[];
  }

  export interface Text {
    type: Types.Text;
    range: TokenRange;
    text: string;
  }

  export interface Bold {
    type: Types.Bold;
    range: TokenRange;
    tokens: Token[];
    wasClosed: boolean;
  }

  export interface Italic {
    type: Types.Italic;
    range: TokenRange;
    tokens: Token[];
    wasClosed: boolean;
  }

  export interface Code {
    type: Types.Code;
    range: TokenRange;
    content: string;
    wasClosed: boolean;
  }

  export interface Header {
    type: Types.Header;
    range: TokenRange;
    tokens: Token[];
    level: number;
    hasAfterSpace: boolean;
  }

  export interface Paragraph {
    type: Types.Paragraph;
    range: TokenRange;
    tokens: Token[];
  }

  export interface NewLine {
    type: Types.NewLine;
    range: TokenRange;
  }

  export interface Link {
    type: Types.Link;
    range: TokenRange;
    text: string;
    dest: string | null;
    raw: string;
    wasClosed: boolean;
  }

  export interface Image {
    type: Types.Image;
    range: TokenRange;
    altText: string;
    url: string | null;
    raw: string;
    wasClosed: boolean;
  }

  export interface Rule {
    type: Types.Rule;
    range: TokenRange;
    raw: string;
  }


  export interface Blockquote {
    type: Types.Blockquote;
    range: TokenRange;
    tokens: Token[];
    nestedLevel: number;
  }

  export interface ListItem {
    type: Types.ListItem;
    range: TokenRange;
    marker: string;
    tokens: Token[];
  }

  export interface List {
    type: Types.List;
    range: TokenRange;
    tokens: ListItem[];
  }
}

export type BlockTokens = (
    Tokens.Document
  | Tokens.Bold
  | Tokens.Italic
  | Tokens.Header
  | Tokens.Paragraph
  | Tokens.Blockquote
  | Tokens.ListItem
  | Tokens.List
);

export type Token = (
    Tokens.Document
  | Tokens.Text
  | Tokens.Bold
  | Tokens.Italic
  | Tokens.Code
  | Tokens.Header
  | Tokens.Paragraph
  | Tokens.NewLine
  | Tokens.Link
  | Tokens.Image
  | Tokens.Rule
  | Tokens.Blockquote
  | Tokens.ListItem
  | Tokens.List
);

export function isAParentToken(token: Token): boolean {
  return Array.isArray((token as BlockTokens).tokens);
}
