import Point from "@mapbox/point-geometry";
import RBush from "rbush";
import { Filter } from "./painter";
import { DrawExtra, LabelSymbolizer } from "./symbolizer";
import { Bbox } from "./tilecache";
import { PreparedTile } from "./view";
declare type TileInvalidationCallback = (tiles: Set<string>) => void;
export interface Label {
    anchor: Point;
    bboxes: Bbox[];
    draw: (ctx: CanvasRenderingContext2D, drawExtra?: DrawExtra) => void;
    deduplicationKey?: string;
    deduplicationDistance?: number;
}
export interface IndexedLabel {
    anchor: Point;
    bboxes: Bbox[];
    draw: (ctx: CanvasRenderingContext2D) => void;
    order: number;
    tileKey: string;
    deduplicationKey?: string;
    deduplicationDistance?: number;
}
export interface Layout {
    index: Index;
    order: number;
    scratch: CanvasRenderingContext2D;
    zoom: number;
    overzoom: number;
}
export interface LabelRule {
    id?: string;
    minzoom?: number;
    maxzoom?: number;
    dataSource?: string;
    dataLayer: string;
    symbolizer: LabelSymbolizer;
    filter?: Filter;
    visible?: boolean;
    sort?: (a: any, b: any) => number;
}
export declare const covering: (display_zoom: number, tile_width: number, bbox: Bbox) => {
    display: string;
    key: string;
}[];
export declare class Index {
    tree: RBush<any>;
    current: Map<string, Set<IndexedLabel>>;
    dim: number;
    maxLabeledTiles: number;
    constructor(dim: number, maxLabeledTiles: number);
    hasPrefix(tileKey: string): boolean;
    has(tileKey: string): boolean;
    size(): number;
    keys(): IterableIterator<string>;
    searchBbox(bbox: Bbox, order: number): Set<IndexedLabel>;
    searchLabel(label: Label, order: number): Set<IndexedLabel>;
    bboxCollides(bbox: Bbox, order: number): boolean;
    labelCollides(label: Label, order: number): boolean;
    deduplicationCollides(label: Label): boolean;
    makeEntry(tileKey: string): void;
    insert(label: Label, order: number, tileKey: string): void;
    pruneOrNoop(key_added: string): void;
    pruneKey(keyToRemove: string): void;
    removeLabel(labelToRemove: IndexedLabel): void;
}
export declare class Labeler {
    index: Index;
    z: number;
    scratch: CanvasRenderingContext2D;
    labelRules: LabelRule[];
    callback?: TileInvalidationCallback;
    constructor(z: number, scratch: CanvasRenderingContext2D, labelRules: LabelRule[], maxLabeledTiles: number, callback?: TileInvalidationCallback);
    private layout;
    private findInvalidatedTiles;
    add(prepared_tilemap: Map<string, PreparedTile[]>): number;
}
export declare class Labelers {
    labelers: Map<number, Labeler>;
    scratch: CanvasRenderingContext2D;
    labelRules: LabelRule[];
    maxLabeledTiles: number;
    callback: TileInvalidationCallback;
    constructor(scratch: CanvasRenderingContext2D, labelRules: LabelRule[], maxLabeledTiles: number, callback: TileInvalidationCallback);
    add(z: number, prepared_tilemap: Map<string, PreparedTile[]>): number;
    getIndex(z: number): Index | undefined;
}
export {};
