import { SourceOptions } from "../view";
import { Rule } from "../painter";
import { LabelRule } from "../labeler";
import { XraySelection } from "../xray";
import { PMTiles } from "pmtiles";
declare type Status = {
    status: string;
    value?: any;
    reason: Error;
};
interface LeafletLayerOptions {
    bounds?: number[][];
    attribution?: string;
    debug?: string;
    lang?: string;
    tileDelay?: number;
    backgroundColor?: string;
    language1?: string[];
    language2?: string[];
    shade?: string;
    dark?: boolean;
    noWrap?: boolean;
    paint_rules?: Rule[];
    label_rules?: LabelRule[];
    xray?: XraySelection;
    tasks?: Promise<Status>[];
    levelDiff?: number;
    maxDataZoom?: number;
    url?: PMTiles | string;
    sources?: Record<string, SourceOptions>;
}
declare const leafletLayer: (options?: LeafletLayerOptions) => any;
export { leafletLayer };
