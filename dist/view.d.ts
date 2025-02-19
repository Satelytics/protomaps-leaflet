import Point from "@mapbox/point-geometry";
import { Zxy, TileCache, Feature, Bbox } from "./tilecache";
import { PMTiles } from "pmtiles";
export interface PreparedTile {
    z: number;
    origin: Point;
    data: Map<string, Feature[]>;
    scale: number;
    dim: number;
    data_tile: Zxy;
}
export interface TileTransform {
    data_tile: Zxy;
    origin: Point;
    scale: number;
    dim: number;
}
export declare const transformGeom: (geom: Array<Array<Point>>, scale: number, translate: Point) => Point[][];
export declare const wrap: (val: number, z: number) => number;
export declare class View {
    levelDiff: number;
    tileCache: TileCache;
    maxDataLevel: number;
    constructor(tileCache: TileCache, maxDataLevel: number, levelDiff: number);
    dataTilesForBounds(display_zoom: number, bounds: any): Array<TileTransform>;
    dataTileForDisplayTile(display_tile: Zxy): TileTransform;
    getBbox(display_zoom: number, bounds: Bbox): Promise<Array<PreparedTile>>;
    getDisplayTile(display_tile: Zxy): Promise<PreparedTile>;
    queryFeatures(lng: number, lat: number, display_zoom: number): import("./tilecache").PickedFeature[];
}
export interface SourceOptions {
    levelDiff?: number;
    maxDataZoom?: number;
    url?: PMTiles | string;
    sources?: Record<string, SourceOptions>;
    headers?: Headers;
}
export declare let sourcesToViews: (options: SourceOptions) => Map<string, View>;
