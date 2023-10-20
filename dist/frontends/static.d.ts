import Point from "@mapbox/point-geometry";
import { View, SourceOptions } from "../view";
import { Rule } from "../painter";
import { LabelRule } from "../labeler";
import { XraySelection } from "../xray";
import { PMTiles } from "pmtiles";
export declare const getZoom: (degrees_lng: number, css_pixels: number) => number;
interface StaticOptions {
    debug?: string;
    lang?: string;
    shade?: string;
    levelDiff?: number;
    maxDataZoom?: number;
    url?: PMTiles | string;
    sources?: Record<string, SourceOptions>;
    paint_rules?: Rule[];
    dark?: boolean;
    label_rules?: LabelRule[];
    language1?: string[];
    language2?: string[];
    backgroundColor?: string;
    xray?: XraySelection;
}
export declare class Static {
    paint_rules: Rule[];
    label_rules: LabelRule[];
    views: Map<string, View>;
    debug?: string;
    backgroundColor?: string;
    xray?: XraySelection;
    constructor(options: StaticOptions);
    drawContext(ctx: CanvasRenderingContext2D, width: number, height: number, latlng: Point, display_zoom: number): Promise<{
        elapsed: number;
        project: (latlng: Point) => Point;
        unproject: (point: Point) => {
            lat: number;
            lng: number;
        };
    }>;
    drawCanvas(canvas: HTMLCanvasElement, latlng: Point, display_zoom: number, options?: StaticOptions): Promise<{
        elapsed: number;
        project: (latlng: Point) => Point;
        unproject: (point: Point) => {
            lat: number;
            lng: number;
        };
    }>;
    drawContextBounds(ctx: CanvasRenderingContext2D, top_left: Point, bottom_right: Point, width: number, height: number): Promise<{
        elapsed: number;
        project: (latlng: Point) => Point;
        unproject: (point: Point) => {
            lat: number;
            lng: number;
        };
    }>;
    drawCanvasBounds(canvas: HTMLCanvasElement, top_left: Point, bottom_right: Point, width: number, options?: StaticOptions): Promise<{
        elapsed: number;
        project: (latlng: Point) => Point;
        unproject: (point: Point) => {
            lat: number;
            lng: number;
        };
    }>;
}
export {};
