// Template data as the renderer sees it (design doc §6). Plain types with no runtime
// dependencies: the editor (step 3c) imports them in the browser. The Zod schemas that read
// fields.yaml live in scripts/lib/content/schemas.ts and produce exactly these shapes.

/** Placeholder names: `{{productName}}` (§6.3: a fixed, legal format). */
export const FIELD_NAME_PATTERN = /^[a-z][A-Za-z0-9]*$/;

type FieldBase = {
  name: string;
  required: boolean;
  /** Editor grouping (content/taxonomy/field-groups.yaml); does not affect rendering. */
  group: string | null;
};

export type StringField = FieldBase & {
  type: 'string';
  default: string | null;
  minLength: number | null;
  /** Counted in grapheme clusters, so accents and emoji count once (§13.2). */
  maxLength: number | null;
  /** Shown as a multi-line text area; line breaks are kept in the prompt. */
  multiline: boolean;
};

export type StringListField = FieldBase & {
  type: 'string-list';
  default: string[] | null;
  minItems: number | null;
  maxItems: number | null;
  itemMaxLength: number | null;
  /** Joins the items in the prompt (§6.3). */
  separator: string;
};

export type EnumOption = {
  /** Stable value stored in samples, drafts and shared links (§6.3). */
  value: string;
  /** Output in the selected prompt language; the stored option value stays stable. */
  renderText?: string;
  /** Colour chips for palette-like options (§11.8.4); presentation only. */
  swatch: string[] | null;
};

export type EnumField = FieldBase & {
  type: 'enum';
  default: string | null;
  options: EnumOption[];
};

/** A field as the renderer needs it: no UI labels; output text may be localized. */
export type FieldSpec = StringField | StringListField | EnumField;

/** Values entered by a user or read from a sample. Missing keys fall back to defaults. */
export type FieldValues = Record<string, string | string[]>;

/** One template version: its body and fields (§6.1). */
export type TemplateVersionSpec = {
  body: string;
  fields: FieldSpec[];
};

export type FieldErrorCode =
  | 'required'
  | 'too-short'
  | 'too-long'
  | 'too-few'
  | 'too-many'
  | 'item-too-long'
  | 'empty-item'
  | 'invalid-option'
  | 'wrong-type';

/** A value problem. The UI turns it into a localized message (§11.11: what happened, how to fix). */
export type FieldError = {
  field: string;
  code: FieldErrorCode;
  /** The limit that was crossed, for too-short / too-long / too-few / too-many / item-too-long. */
  limit?: number;
  /** The current count, for the same codes. */
  actual?: number;
  /** For list items, the 0-based item index. */
  item?: number;
};

/** A piece of the template body: literal text or a placeholder. */
export type BodySegment =
  { kind: 'text'; text: string } | { kind: 'field'; name: string; line: number; column: number };

/** A problem in body.txt, reported by the build with its position (§6.3: undefined field). */
export type BodyProblem = { line: number; column: number; message: string };

/** A rendered piece, for the editor preview: literal text, or a field's value. */
export type RenderedSegment =
  | { kind: 'text'; text: string }
  | {
      kind: 'field';
      name: string;
      /** Position of the field in `fields`, for the variable colour (§11.1.1: cycles through 6). */
      fieldIndex: number;
      text: string;
      /** True when the value is missing or invalid; the preview marks it. */
      invalid: boolean;
    };

export type RenderResult = {
  /** True when every value is valid; only then is `text` the complete prompt. */
  ok: boolean;
  /** The prompt to preview, copy and download (§6.3: one result for all three); null when not ok. */
  text: string | null;
  /** Always present, so the preview can show which variable needs attention. */
  segments: RenderedSegment[];
  errors: FieldError[];
  /** Values after defaults were applied. */
  values: FieldValues;
};
