import Point from "@mapbox/point-geometry";
import { Bbox, Feature } from "./tilecache";
import { PreparedTile } from "./view";
import { PaintSymbolizer } from "./symbolizer";
import { Index } from "./labeler";
export declare type Filter = (zoom: number, feature: Feature) => boolean;
export interface Rule {
    id?: string;
    minzoom?: number;
    maxzoom?: number;
    dataSource?: string;
    dataLayer: string;
    symbolizer: PaintSymbolizer;
    filter?: Filter;
}
export declare function painter(ctx: CanvasRenderingContext2D, z: number, prepared_tilemap: Map<string, PreparedTile[]>, label_data: Index | null, rules: Rule[], bbox: Bbox, origin: Point, clip: boolean, debug?: string): number;
