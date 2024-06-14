export enum Types {
  Text,
  Bold,
  Italic,
  Code,
  Header,
  Paragraph,
  NewLine,
  Link,
  Image,
}

export type TKNRange = [number, number];

export namespace Tokens {
  export interface Text {
    type: Types.Text;
    range: TKNRange;
    text: string;
  }

  export interface Bold {
    type: Types.Bold;
    range: TKNRange;
    tokens: Token[];
    wasClosed: boolean;
  }

  export interface Italic {
    type: Types.Italic;
    range: TKNRange;
    tokens: Token[];
    wasClosed: boolean;
  }

  export interface Code {
    type: Types.Code;
    range: TKNRange;
    content: string;
    wasClosed: boolean;
  }

  export interface Header {
    type: Types.Header;
    range: TKNRange;
    tokens: Token[];
    level: number;
    hasAfterSpace: boolean;
  }

  export interface Paragraph {
    type: Types.Paragraph;
    range: TKNRange;
    tokens: Token[];
  }

  export interface NewLine {
    type: Types.NewLine;
    range: TKNRange;
  }

  export interface Link {
    type: Types.Link;
    range: TKNRange;
    text: string;
    dest: string | null;
    raw: string;
    wasClosed: boolean;
  }

  export interface Image {
    type: Types.Image;
    range: TKNRange;
    altText: string;
    url: string | null;
    raw: string;
    wasClosed: boolean;
  }
}

export type BlockTokens = (
    Tokens.Bold
  | Tokens.Italic
  | Tokens.Header
  | Tokens.Paragraph
);

export type Token = (
    Tokens.Text
  | Tokens.Bold
  | Tokens.Italic
  | Tokens.Code
  | Tokens.Header
  | Tokens.Paragraph
  | Tokens.NewLine
  | Tokens.Link
  | Tokens.Image);
