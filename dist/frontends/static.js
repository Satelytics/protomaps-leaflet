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
import { sourcesToViews } from "../view";
import { painter } from "../painter";
import { Labeler } from "../labeler";
import { light } from "../default_style/light";
import { dark } from "../default_style/dark";
import { paintRules, labelRules } from "../default_style/style";
import { xray_rules } from "../xray";
let R = 6378137;
let MAX_LATITUDE = 85.0511287798;
let MAXCOORD = R * Math.PI;
let project = (latlng) => {
    let d = Math.PI / 180;
    let constrained_lat = Math.max(Math.min(MAX_LATITUDE, latlng.y), -MAX_LATITUDE);
    let sin = Math.sin(constrained_lat * d);
    return new Point(R * latlng.x * d, (R * Math.log((1 + sin) / (1 - sin))) / 2);
};
let unproject = (point) => {
    var d = 180 / Math.PI;
    return {
        lat: (2 * Math.atan(Math.exp(point.y / R)) - Math.PI / 2) * d,
        lng: (point.x * d) / R,
    };
};
let instancedProject = (origin, display_zoom) => {
    return (latlng) => {
        let projected = project(latlng);
        let normalized = new Point((projected.x + MAXCOORD) / (MAXCOORD * 2), 1 - (projected.y + MAXCOORD) / (MAXCOORD * 2));
        return normalized.mult((1 << display_zoom) * 256).sub(origin);
    };
};
let instancedUnproject = (origin, display_zoom) => {
    return (point) => {
        let normalized = new Point(point.x, point.y)
            .add(origin)
            .div((1 << display_zoom) * 256);
        let projected = new Point(normalized.x * (MAXCOORD * 2) - MAXCOORD, (1 - normalized.y) * (MAXCOORD * 2) - MAXCOORD);
        return unproject(projected);
    };
};
export const getZoom = (degrees_lng, css_pixels) => {
    let d = css_pixels * (360 / degrees_lng);
    return Math.log2(d / 256);
};
export class Static {
    constructor(options) {
        let theme = options.dark ? dark : light;
        this.paint_rules = options.paint_rules || paintRules(theme, options.shade);
        this.label_rules =
            options.label_rules ||
                labelRules(theme, options.shade, options.language1, options.language2);
        this.backgroundColor = options.backgroundColor;
        this.views = sourcesToViews(options);
        this.debug = options.debug || "";
        this.xray = options.xray;
    }
    drawContext(ctx, width, height, latlng, display_zoom) {
        return __awaiter(this, void 0, void 0, function* () {
            let center = project(latlng);
            let normalized_center = new Point((center.x + MAXCOORD) / (MAXCOORD * 2), 1 - (center.y + MAXCOORD) / (MAXCOORD * 2));
            // the origin of the painter call in global Z coordinates
            let origin = normalized_center
                .clone()
                .mult(Math.pow(2, display_zoom) * 256)
                .sub(new Point(width / 2, height / 2));
            // the bounds of the painter call in global Z coordinates
            let bbox = {
                minX: origin.x,
                minY: origin.y,
                maxX: origin.x + width,
                maxY: origin.y + height,
            };
            let promises = [];
            for (const [k, v] of this.views) {
                let promise = v.getBbox(display_zoom, bbox);
                promises.push({ key: k, promise: promise });
            }
            let tile_responses = yield Promise.all(promises.map((o) => {
                return o.promise.then((v) => {
                    return { status: "fulfilled", value: v, key: o.key };
                }, (error) => {
                    return { status: "rejected", value: [], reason: error, key: o.key };
                });
            }));
            let prepared_tilemap = new Map();
            for (const tile_response of tile_responses) {
                if (tile_response.status === "fulfilled") {
                    prepared_tilemap.set(tile_response.key, tile_response.value);
                }
            }
            let start = performance.now();
            let labeler = new Labeler(display_zoom, ctx, this.label_rules, 16, undefined); // because need ctx to measure
            let layout_time = labeler.add(prepared_tilemap);
            if (this.backgroundColor) {
                ctx.save();
                ctx.fillStyle = this.backgroundColor;
                ctx.fillRect(0, 0, width, height);
                ctx.restore();
            }
            let paint_rules = this.paint_rules;
            if (this.xray) {
                paint_rules = xray_rules(prepared_tilemap, this.xray);
            }
            let p = painter(ctx, display_zoom, prepared_tilemap, this.xray ? null : labeler.index, paint_rules, bbox, origin, true, this.debug);
            if (this.debug) {
                ctx.save();
                ctx.translate(-origin.x, -origin.y);
                ctx.strokeStyle = this.debug;
                ctx.fillStyle = this.debug;
                ctx.font = "12px sans-serif";
                let idx = 0;
                for (const [k, v] of prepared_tilemap) {
                    for (let prepared_tile of v) {
                        ctx.strokeRect(prepared_tile.origin.x, prepared_tile.origin.y, prepared_tile.dim, prepared_tile.dim);
                        let dt = prepared_tile.data_tile;
                        ctx.fillText(k + (k ? " " : "") + dt.z + " " + dt.x + " " + dt.y, prepared_tile.origin.x + 4, prepared_tile.origin.y + 14 * (1 + idx));
                    }
                    idx++;
                }
                ctx.restore();
            }
            // TODO this API isn't so elegant
            return {
                elapsed: performance.now() - start,
                project: instancedProject(origin, display_zoom),
                unproject: instancedUnproject(origin, display_zoom),
            };
        });
    }
    drawCanvas(canvas, latlng, display_zoom, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            let dpr = window.devicePixelRatio;
            let width = canvas.clientWidth;
            let height = canvas.clientHeight;
            if (!(canvas.width == width * dpr && canvas.height == height * dpr)) {
                canvas.width = width * dpr;
                canvas.height = height * dpr;
            }
            if (options.lang)
                canvas.lang = options.lang;
            let ctx = canvas.getContext("2d");
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            return this.drawContext(ctx, width, height, latlng, display_zoom);
        });
    }
    drawContextBounds(ctx, top_left, bottom_right, width, height) {
        return __awaiter(this, void 0, void 0, function* () {
            let delta_degrees = bottom_right.x - top_left.x;
            let center = new Point((top_left.x + bottom_right.x) / 2, (top_left.y + bottom_right.y) / 2);
            return this.drawContext(ctx, width, height, center, getZoom(delta_degrees, width));
        });
    }
    drawCanvasBounds(canvas, top_left, bottom_right, width, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            let delta_degrees = bottom_right.x - top_left.x;
            let center = new Point((top_left.x + bottom_right.x) / 2, (top_left.y + bottom_right.y) / 2);
            return this.drawCanvas(canvas, center, getZoom(delta_degrees, width), options);
        });
    }
}
