var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import Point from "@mapbox/point-geometry";
import { TileCache, ZxySource, PmtilesSource, } from "./tilecache";
// TODO make this lazy
export const transformGeom = (geom, scale, translate) => {
    let retval = [];
    for (let arr of geom) {
        let loop = [];
        for (let coord of arr) {
            loop.push(coord.clone().mult(scale).add(translate));
        }
        retval.push(loop);
    }
    return retval;
};
export const wrap = (val, z) => {
    let dim = 1 << z;
    if (val < 0)
        val = dim + val;
    if (val >= dim)
        val = val % dim;
    return val;
};
/*
 * @class View
 * expresses relationship between canvas coordinates and data tiles.
 */
export class View {
    constructor(tileCache, maxDataLevel, levelDiff) {
        this.tileCache = tileCache;
        this.maxDataLevel = maxDataLevel;
        this.levelDiff = levelDiff;
    }
    dataTilesForBounds(display_zoom, bounds) {
        let fractional = Math.pow(2, display_zoom) / Math.pow(2, Math.ceil(display_zoom));
        let needed = [];
        var scale = 1;
        var dim = this.tileCache.tileSize;
        if (display_zoom < this.levelDiff) {
            scale = (1 / (1 << (this.levelDiff - display_zoom))) * fractional;
            needed.push({
                data_tile: { z: 0, x: 0, y: 0 },
                origin: new Point(0, 0),
                scale: scale,
                dim: dim * scale,
            });
        }
        else if (display_zoom <= this.levelDiff + this.maxDataLevel) {
            let f = 1 << this.levelDiff;
            let basetile_size = 256 * fractional;
            let data_zoom = Math.ceil(display_zoom) - this.levelDiff;
            let mintile_x = Math.floor(bounds.minX / f / basetile_size);
            let mintile_y = Math.floor(bounds.minY / f / basetile_size);
            let maxtile_x = Math.floor(bounds.maxX / f / basetile_size);
            let maxtile_y = Math.floor(bounds.maxY / f / basetile_size);
            for (var tx = mintile_x; tx <= maxtile_x; tx++) {
                for (var ty = mintile_y; ty <= maxtile_y; ty++) {
                    let origin = new Point(tx * f * basetile_size, ty * f * basetile_size);
                    needed.push({
                        data_tile: {
                            z: data_zoom,
                            x: wrap(tx, data_zoom),
                            y: wrap(ty, data_zoom),
                        },
                        origin: origin,
                        scale: fractional,
                        dim: dim * fractional,
                    });
                }
            }
        }
        else {
            let f = 1 << this.levelDiff;
            scale =
                (1 << (Math.ceil(display_zoom) - this.maxDataLevel - this.levelDiff)) *
                    fractional;
            let mintile_x = Math.floor(bounds.minX / f / 256 / scale);
            let mintile_y = Math.floor(bounds.minY / f / 256 / scale);
            let maxtile_x = Math.floor(bounds.maxX / f / 256 / scale);
            let maxtile_y = Math.floor(bounds.maxY / f / 256 / scale);
            for (var tx = mintile_x; tx <= maxtile_x; tx++) {
                for (var ty = mintile_y; ty <= maxtile_y; ty++) {
                    let origin = new Point(tx * f * 256 * scale, ty * f * 256 * scale);
                    needed.push({
                        data_tile: {
                            z: this.maxDataLevel,
                            x: wrap(tx, this.maxDataLevel),
                            y: wrap(ty, this.maxDataLevel),
                        },
                        origin: origin,
                        scale: scale,
                        dim: dim * scale,
                    });
                }
            }
        }
        return needed;
    }
    dataTileForDisplayTile(display_tile) {
        var data_tile;
        var scale = 1;
        var dim = this.tileCache.tileSize;
        var origin;
        if (display_tile.z < this.levelDiff) {
            data_tile = { z: 0, x: 0, y: 0 };
            scale = 1 / (1 << (this.levelDiff - display_tile.z));
            origin = new Point(0, 0);
            dim = dim * scale;
        }
        else if (display_tile.z <= this.levelDiff + this.maxDataLevel) {
            let f = 1 << this.levelDiff;
            data_tile = {
                z: display_tile.z - this.levelDiff,
                x: Math.floor(display_tile.x / f),
                y: Math.floor(display_tile.y / f),
            };
            origin = new Point(data_tile.x * f * 256, data_tile.y * f * 256);
        }
        else {
            scale = 1 << (display_tile.z - this.maxDataLevel - this.levelDiff);
            let f = 1 << this.levelDiff;
            data_tile = {
                z: this.maxDataLevel,
                x: Math.floor(display_tile.x / f / scale),
                y: Math.floor(display_tile.y / f / scale),
            };
            origin = new Point(data_tile.x * f * scale * 256, data_tile.y * f * scale * 256);
            dim = dim * scale;
        }
        return { data_tile: data_tile, scale: scale, origin: origin, dim: dim };
    }
    getBbox(display_zoom, bounds) {
        return __awaiter(this, void 0, void 0, function* () {
            let needed = this.dataTilesForBounds(display_zoom, bounds);
            let result = yield Promise.all(needed.map((tt) => this.tileCache.get(tt.data_tile)));
            return result.map((data, i) => {
                let tt = needed[i];
                return {
                    data: data,
                    z: display_zoom,
                    data_tile: tt.data_tile,
                    scale: tt.scale,
                    dim: tt.dim,
                    origin: tt.origin,
                };
            });
        });
    }
    getDisplayTile(display_tile) {
        return __awaiter(this, void 0, void 0, function* () {
            let tt = this.dataTileForDisplayTile(display_tile);
            const data = yield this.tileCache.get(tt.data_tile);
            return {
                data: data,
                z: display_tile.z,
                data_tile: tt.data_tile,
                scale: tt.scale,
                origin: tt.origin,
                dim: tt.dim,
            };
        });
    }
    queryFeatures(lng, lat, display_zoom) {
        let rounded_zoom = Math.round(display_zoom);
        let data_zoom = Math.min(rounded_zoom - this.levelDiff, this.maxDataLevel);
        let brush_size = 16 / (1 << (rounded_zoom - data_zoom));
        return this.tileCache.queryFeatures(lng, lat, data_zoom, brush_size);
    }
}
export let sourcesToViews = (options) => {
    let sourceToViews = (o) => {
        let level_diff = o.levelDiff === undefined ? 2 : o.levelDiff;
        let maxDataZoom = o.maxDataZoom || 14;
        let source;
        if (typeof o.url === "string") {
            if (o.url.endsWith(".pmtiles")) {
                source = new PmtilesSource(o.url, true, o.headers);
            }
            else {
                console.log('zxy source', o.headers);
                source = new ZxySource(o.url, true, o.headers);
            }
        }
        else {
            source = new PmtilesSource(o.url, true, o.headers);
        }
        let cache = new TileCache(source, (256 * 1) << level_diff);
        return new View(cache, maxDataZoom, level_diff);
    };
    let sources = new Map();
    if (options.sources) {
        for (const key in options.sources) {
            sources.set(key, sourceToViews(options.sources[key]));
        }
    }
    else {
        sources.set("", sourceToViews(options));
    }
    return sources;
};
