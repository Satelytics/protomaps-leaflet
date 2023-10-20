/// <reference types="@types/css-font-loading-module" />
import { Rule } from "../painter";
import { LabelRule } from "../labeler";
declare const Toner: (variant: string) => {
    tasks: Promise<FontFace>[];
    paint_rules: Rule[];
    label_rules: LabelRule[];
    attribution: string;
};
export { Toner };
