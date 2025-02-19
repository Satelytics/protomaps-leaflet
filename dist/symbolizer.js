import Point from "@mapbox/point-geometry";
import UnitBezier from "@mapbox/unitbezier";
// @ts-ignore
import polylabel from "polylabel";
import { ArrayAttr, FontAttr, NumberAttr, StringAttr, TextAttr, } from "./attribute";
import { lineCells, simpleLabel } from "./line";
import { linebreak } from "./text";
import { GeomType } from "./tilecache";
// https://bugs.webkit.org/show_bug.cgi?id=230751
const MAX_VERTICES_PER_DRAW_CALL = 5400;
export var Justify;
(function (Justify) {
    Justify[Justify["Left"] = 1] = "Left";
    Justify[Justify["Center"] = 2] = "Center";
    Justify[Justify["Right"] = 3] = "Right";
})(Justify || (Justify = {}));
export var TextPlacements;
(function (TextPlacements) {
    TextPlacements[TextPlacements["N"] = 1] = "N";
    TextPlacements[TextPlacements["NE"] = 2] = "NE";
    TextPlacements[TextPlacements["E"] = 3] = "E";
    TextPlacements[TextPlacements["SE"] = 4] = "SE";
    TextPlacements[TextPlacements["S"] = 5] = "S";
    TextPlacements[TextPlacements["SW"] = 6] = "SW";
    TextPlacements[TextPlacements["W"] = 7] = "W";
    TextPlacements[TextPlacements["NW"] = 8] = "NW";
})(TextPlacements || (TextPlacements = {}));
export const createPattern = (width, height, fn) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;
    if (ctx !== null)
        fn(canvas, ctx);
    return canvas;
};
export class PolygonSymbolizer {
    constructor(options) {
        var _a;
        this.pattern = options.pattern;
        this.fill = new StringAttr(options.fill, "black");
        this.opacity = new NumberAttr(options.opacity, 1);
        this.stroke = new StringAttr(options.stroke, "black");
        this.width = new NumberAttr(options.width, 0);
        this.per_feature =
            (_a = (this.fill.per_feature ||
                this.opacity.per_feature ||
                this.stroke.per_feature ||
                this.width.per_feature ||
                options.per_feature)) !== null && _a !== void 0 ? _a : false;
        this.do_stroke = false;
    }
    before(ctx, z) {
        if (!this.per_feature) {
            ctx.globalAlpha = this.opacity.get(z);
            ctx.fillStyle = this.fill.get(z);
            ctx.strokeStyle = this.stroke.get(z);
            let width = this.width.get(z);
            if (width > 0)
                this.do_stroke = true;
            ctx.lineWidth = width;
        }
        if (this.pattern) {
            const patten = ctx.createPattern(this.pattern, "repeat");
            if (patten)
                ctx.fillStyle = patten;
        }
    }
    draw(ctx, geom, z, f) {
        var do_stroke = false;
        if (this.per_feature) {
            ctx.globalAlpha = this.opacity.get(z, f);
            ctx.fillStyle = this.fill.get(z, f);
            var width = this.width.get(z, f);
            if (width) {
                do_stroke = true;
                ctx.strokeStyle = this.stroke.get(z, f);
                ctx.lineWidth = width;
            }
        }
        let drawPath = () => {
            ctx.fill();
            if (do_stroke || this.do_stroke) {
                ctx.stroke();
            }
        };
        var vertices_in_path = 0;
        ctx.beginPath();
        for (var poly of geom) {
            if (vertices_in_path + poly.length > MAX_VERTICES_PER_DRAW_CALL) {
                drawPath();
                vertices_in_path = 0;
                ctx.beginPath();
            }
            for (var p = 0; p < poly.length; p++) {
                let pt = poly[p];
                if (p == 0)
                    ctx.moveTo(pt.x, pt.y);
                else
                    ctx.lineTo(pt.x, pt.y);
            }
            vertices_in_path += poly.length;
        }
        if (vertices_in_path > 0)
            drawPath();
    }
}
export function arr(base, a) {
    return (z) => {
        let b = z - base;
        if (b >= 0 && b < a.length) {
            return a[b];
        }
        return 0;
    };
}
function getStopIndex(input, stops) {
    let idx = 0;
    while (stops[idx + 1][0] < input)
        idx++;
    return idx;
}
function interpolate(factor, start, end) {
    return factor * (end - start) + start;
}
function computeInterpolationFactor(z, idx, base, stops) {
    const difference = stops[idx + 1][0] - stops[idx][0];
    const progress = z - stops[idx][0];
    if (difference === 0)
        return 0;
    else if (base === 1)
        return progress / difference;
    else
        return (Math.pow(base, progress) - 1) / (Math.pow(base, difference) - 1);
}
export function exp(base, stops) {
    return (z) => {
        if (stops.length < 1)
            return 0;
        if (z <= stops[0][0])
            return stops[0][1];
        if (z >= stops[stops.length - 1][0])
            return stops[stops.length - 1][1];
        const idx = getStopIndex(z, stops);
        const factor = computeInterpolationFactor(z, idx, base, stops);
        return interpolate(factor, stops[idx][1], stops[idx + 1][1]);
    };
}
export function step(output0, stops) {
    // Step computes discrete results by evaluating a piecewise-constant
    // function defined by stops.
    // Returns the output value of the stop with a stop input value just less than
    // the input one. If the input value is less than the input of the first stop,
    // output0 is returned
    return (z) => {
        if (stops.length < 1)
            return 0;
        let retval = output0;
        for (let i = 0; i < stops.length; i++) {
            if (z >= stops[i][0])
                retval = stops[i][1];
        }
        return retval;
    };
}
export function linear(stops) {
    return exp(1, stops);
}
export function cubicBezier(x1, y1, x2, y2, stops) {
    return (z) => {
        if (stops.length < 1)
            return 0;
        const bezier = new UnitBezier(x1, y1, x2, y2);
        const idx = getStopIndex(z, stops);
        const factor = bezier.solve(computeInterpolationFactor(z, idx, 1, stops));
        return interpolate(factor, stops[idx][1], stops[idx + 1][1]);
    };
}
function isFunction(obj) {
    return !!(obj && obj.constructor && obj.call && obj.apply);
}
export class LineSymbolizer {
    constructor(options) {
        var _a;
        this.color = new StringAttr(options.color, "black");
        this.width = new NumberAttr(options.width);
        this.opacity = new NumberAttr(options.opacity);
        this.dash = options.dash ? new ArrayAttr(options.dash) : null;
        this.dashColor = new StringAttr(options.dashColor, "black");
        this.dashWidth = new NumberAttr(options.dashWidth, 1.0);
        this.lineCap = new StringAttr(options.lineCap, "butt");
        this.lineJoin = new StringAttr(options.lineJoin, "miter");
        this.skip = false;
        this.per_feature = !!(((_a = this.dash) === null || _a === void 0 ? void 0 : _a.per_feature) ||
            this.color.per_feature ||
            this.opacity.per_feature ||
            this.width.per_feature ||
            this.lineCap.per_feature ||
            this.lineJoin.per_feature ||
            options.per_feature);
    }
    before(ctx, z) {
        if (!this.per_feature) {
            ctx.strokeStyle = this.color.get(z);
            ctx.lineWidth = this.width.get(z);
            ctx.globalAlpha = this.opacity.get(z);
            ctx.lineCap = this.lineCap.get(z);
            ctx.lineJoin = this.lineJoin.get(z);
        }
    }
    draw(ctx, geom, z, f) {
        if (this.skip)
            return;
        let strokePath = () => {
            if (this.per_feature) {
                ctx.globalAlpha = this.opacity.get(z, f);
                ctx.lineCap = this.lineCap.get(z, f);
                ctx.lineJoin = this.lineJoin.get(z, f);
            }
            if (this.dash) {
                ctx.save();
                if (this.per_feature) {
                    ctx.lineWidth = this.dashWidth.get(z, f);
                    ctx.strokeStyle = this.dashColor.get(z, f);
                    ctx.setLineDash(this.dash.get(z, f));
                }
                else {
                    ctx.setLineDash(this.dash.get(z));
                }
                ctx.stroke();
                ctx.restore();
            }
            else {
                ctx.save();
                if (this.per_feature) {
                    ctx.lineWidth = this.width.get(z, f);
                    ctx.strokeStyle = this.color.get(z, f);
                }
                ctx.stroke();
                ctx.restore();
            }
        };
        var vertices_in_path = 0;
        ctx.beginPath();
        for (var ls of geom) {
            if (vertices_in_path + ls.length > MAX_VERTICES_PER_DRAW_CALL) {
                strokePath();
                vertices_in_path = 0;
                ctx.beginPath();
            }
            for (var p = 0; p < ls.length; p++) {
                let pt = ls[p];
                if (p == 0)
                    ctx.moveTo(pt.x, pt.y);
                else
                    ctx.lineTo(pt.x, pt.y);
            }
            vertices_in_path += ls.length;
        }
        if (vertices_in_path > 0)
            strokePath();
    }
}
export class IconSymbolizer {
    constructor(options) {
        this.name = options.name;
        this.sheet = options.sheet;
        this.dpr = window.devicePixelRatio;
    }
    place(layout, geom, feature) {
        let pt = geom[0];
        let a = new Point(geom[0][0].x, geom[0][0].y);
        let loc = this.sheet.get(this.name);
        let width = loc.w / this.dpr;
        let height = loc.h / this.dpr;
        let bbox = {
            minX: a.x - width / 2,
            minY: a.y - height / 2,
            maxX: a.x + width / 2,
            maxY: a.y + height / 2,
        };
        let draw = (ctx) => {
            ctx.globalAlpha = 1;
            ctx.drawImage(this.sheet.canvas, loc.x, loc.y, loc.w, loc.h, -loc.w / 2 / this.dpr, -loc.h / 2 / this.dpr, loc.w / 2, loc.h / 2);
        };
        return [{ anchor: a, bboxes: [bbox], draw: draw }];
    }
}
export class CircleSymbolizer {
    constructor(options) {
        this.radius = new NumberAttr(options.radius, 3);
        this.fill = new StringAttr(options.fill, "black");
        this.stroke = new StringAttr(options.stroke, "white");
        this.width = new NumberAttr(options.width, 0);
        this.opacity = new NumberAttr(options.opacity);
    }
    draw(ctx, geom, z, f) {
        ctx.globalAlpha = this.opacity.get(z, f);
        let radius = this.radius.get(z, f);
        let width = this.width.get(z, f);
        if (width > 0) {
            ctx.strokeStyle = this.stroke.get(z, f);
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.arc(geom[0][0].x, geom[0][0].y, radius + width / 2, 0, 2 * Math.PI);
            ctx.stroke();
        }
        ctx.fillStyle = this.fill.get(z, f);
        ctx.beginPath();
        ctx.arc(geom[0][0].x, geom[0][0].y, radius, 0, 2 * Math.PI);
        ctx.fill();
    }
    place(layout, geom, feature) {
        let pt = geom[0];
        let a = new Point(geom[0][0].x, geom[0][0].y);
        let radius = this.radius.get(layout.zoom, feature);
        let bbox = {
            minX: a.x - radius,
            minY: a.y - radius,
            maxX: a.x + radius,
            maxY: a.y + radius,
        };
        let draw = (ctx) => {
            this.draw(ctx, [[new Point(0, 0)]], layout.zoom, feature);
        };
        return [{ anchor: a, bboxes: [bbox], draw }];
    }
}
export class ShieldSymbolizer {
    constructor(options) {
        this.font = new FontAttr(options);
        this.text = new TextAttr(options);
        this.fill = new StringAttr(options.fill, "black");
        this.background = new StringAttr(options.background, "white");
        this.padding = new NumberAttr(options.padding, 0); // TODO check falsy
    }
    place(layout, geom, f) {
        let property = this.text.get(layout.zoom, f);
        if (!property)
            return undefined;
        let font = this.font.get(layout.zoom, f);
        layout.scratch.font = font;
        let metrics = layout.scratch.measureText(property);
        let width = metrics.width;
        let ascent = metrics.actualBoundingBoxAscent;
        let descent = metrics.actualBoundingBoxDescent;
        let pt = geom[0];
        let a = new Point(geom[0][0].x, geom[0][0].y);
        let p = this.padding.get(layout.zoom, f);
        let bbox = {
            minX: a.x - width / 2 - p,
            minY: a.y - ascent - p,
            maxX: a.x + width / 2 + p,
            maxY: a.y + descent + p,
        };
        let draw = (ctx) => {
            ctx.globalAlpha = 1;
            ctx.fillStyle = this.background.get(layout.zoom, f);
            ctx.fillRect(-width / 2 - p, -ascent - p, width + 2 * p, ascent + descent + 2 * p);
            ctx.fillStyle = this.fill.get(layout.zoom, f);
            ctx.font = font;
            ctx.fillText(property, -width / 2, 0);
        };
        return [{ anchor: a, bboxes: [bbox], draw: draw }];
    }
}
// TODO make me work with multiple anchors
export class FlexSymbolizer {
    constructor(list) {
        this.list = list;
    }
    place(layout, geom, feature) {
        var labels = this.list[0].place(layout, geom, feature);
        if (!labels)
            return undefined;
        var label = labels[0];
        let anchor = label.anchor;
        let bbox = label.bboxes[0];
        let height = bbox.maxY - bbox.minY;
        let draws = [{ draw: label.draw, translate: { x: 0, y: 0 } }];
        let newGeom = [[new Point(geom[0][0].x, geom[0][0].y + height)]];
        for (let i = 1; i < this.list.length; i++) {
            labels = this.list[i].place(layout, newGeom, feature);
            if (labels) {
                label = labels[0];
                bbox = mergeBbox(bbox, label.bboxes[0]);
                draws.push({ draw: label.draw, translate: { x: 0, y: height } });
            }
        }
        let draw = (ctx) => {
            for (let sub of draws) {
                ctx.save();
                ctx.translate(sub.translate.x, sub.translate.y);
                sub.draw(ctx);
                ctx.restore();
            }
        };
        return [{ anchor: anchor, bboxes: [bbox], draw: draw }];
    }
}
const mergeBbox = (b1, b2) => {
    return {
        minX: Math.min(b1.minX, b2.minX),
        minY: Math.min(b1.minY, b2.minY),
        maxX: Math.max(b1.maxX, b2.maxX),
        maxY: Math.max(b1.maxY, b2.maxY),
    };
};
export class GroupSymbolizer {
    constructor(list) {
        this.list = list;
    }
    place(layout, geom, feature) {
        let first = this.list[0];
        if (!first)
            return undefined;
        var labels = first.place(layout, geom, feature);
        if (!labels)
            return undefined;
        var label = labels[0];
        let anchor = label.anchor;
        let bbox = label.bboxes[0];
        let draws = [label.draw];
        for (let i = 1; i < this.list.length; i++) {
            labels = this.list[i].place(layout, geom, feature);
            if (!labels)
                return undefined;
            label = labels[0];
            bbox = mergeBbox(bbox, label.bboxes[0]);
            draws.push(label.draw);
        }
        let draw = (ctx) => {
            draws.forEach((d) => d(ctx));
        };
        return [{ anchor: anchor, bboxes: [bbox], draw: draw }];
    }
}
export class CenteredSymbolizer {
    constructor(symbolizer) {
        this.symbolizer = symbolizer;
    }
    place(layout, geom, feature) {
        let a = geom[0][0];
        let placed = this.symbolizer.place(layout, [[new Point(0, 0)]], feature);
        if (!placed || placed.length == 0)
            return undefined;
        let first_label = placed[0];
        let bbox = first_label.bboxes[0];
        let width = bbox.maxX - bbox.minX;
        let height = bbox.maxY - bbox.minY;
        let centered = {
            minX: a.x - width / 2,
            maxX: a.x + width / 2,
            minY: a.y - height / 2,
            maxY: a.y + height / 2,
        };
        let draw = (ctx) => {
            ctx.translate(-width / 2, height / 2 - bbox.maxY);
            first_label.draw(ctx, { justify: Justify.Center });
        };
        return [{ anchor: a, bboxes: [centered], draw: draw }];
    }
}
export class Padding {
    constructor(padding, symbolizer) {
        this.padding = new NumberAttr(padding, 0);
        this.symbolizer = symbolizer;
    }
    place(layout, geom, feature) {
        let placed = this.symbolizer.place(layout, geom, feature);
        if (!placed || placed.length == 0)
            return undefined;
        let padding = this.padding.get(layout.zoom, feature);
        for (var label of placed) {
            for (var bbox of label.bboxes) {
                bbox.minX -= padding;
                bbox.minY -= padding;
                bbox.maxX += padding;
                bbox.maxY += padding;
            }
        }
        return placed;
    }
}
export class TextSymbolizer {
    constructor(options) {
        this.font = new FontAttr(options);
        this.text = new TextAttr(options);
        this.fill = new StringAttr(options.fill, "black");
        this.stroke = new StringAttr(options.stroke, "black");
        this.width = new NumberAttr(options.width, 0);
        this.lineHeight = new NumberAttr(options.lineHeight, 1);
        this.letterSpacing = new NumberAttr(options.letterSpacing, 0);
        this.maxLineCodeUnits = new NumberAttr(options.maxLineChars, 15);
        this.justify = options.justify;
    }
    place(layout, geom, feature) {
        let property = this.text.get(layout.zoom, feature);
        if (!property)
            return undefined;
        let font = this.font.get(layout.zoom, feature);
        layout.scratch.font = font;
        let letterSpacing = this.letterSpacing.get(layout.zoom, feature);
        // line breaking
        let lines = linebreak(property, this.maxLineCodeUnits.get(layout.zoom, feature));
        var longestLine = "";
        var longestLineLen = 0;
        for (let line of lines) {
            if (line.length > longestLineLen) {
                longestLineLen = line.length;
                longestLine = line;
            }
        }
        let metrics = layout.scratch.measureText(longestLine);
        let width = metrics.width + letterSpacing * (longestLineLen - 1);
        let ascent = metrics.actualBoundingBoxAscent;
        let descent = metrics.actualBoundingBoxDescent;
        let lineHeight = (ascent + descent) * this.lineHeight.get(layout.zoom, feature);
        let a = new Point(geom[0][0].x, geom[0][0].y);
        let bbox = {
            minX: a.x,
            minY: a.y - ascent,
            maxX: a.x + width,
            maxY: a.y + descent + (lines.length - 1) * lineHeight,
        };
        // inside draw, the origin is the anchor
        // and the anchor is the typographic baseline of the first line
        let draw = (ctx, extra) => {
            ctx.globalAlpha = 1;
            ctx.font = font;
            ctx.fillStyle = this.fill.get(layout.zoom, feature);
            let textStrokeWidth = this.width.get(layout.zoom, feature);
            var y = 0;
            for (let line of lines) {
                var startX = 0;
                if (this.justify == Justify.Center ||
                    (extra && extra.justify == Justify.Center)) {
                    startX = (width - ctx.measureText(line).width) / 2;
                }
                else if (this.justify == Justify.Right ||
                    (extra && extra.justify == Justify.Right)) {
                    startX = width - ctx.measureText(line).width;
                }
                if (textStrokeWidth) {
                    ctx.lineWidth = textStrokeWidth * 2; // centered stroke
                    ctx.strokeStyle = this.stroke.get(layout.zoom, feature);
                    if (letterSpacing > 0) {
                        var xPos = startX;
                        for (var letter of line) {
                            ctx.strokeText(letter, xPos, y);
                            xPos += ctx.measureText(letter).width + letterSpacing;
                        }
                    }
                    else {
                        ctx.strokeText(line, startX, y);
                    }
                }
                if (letterSpacing > 0) {
                    var xPos = startX;
                    for (var letter of line) {
                        ctx.fillText(letter, xPos, y);
                        xPos += ctx.measureText(letter).width + letterSpacing;
                    }
                }
                else {
                    ctx.fillText(line, startX, y);
                }
                y += lineHeight;
            }
        };
        return [{ anchor: a, bboxes: [bbox], draw: draw }];
    }
}
export class CenteredTextSymbolizer {
    constructor(options) {
        this.centered = new CenteredSymbolizer(new TextSymbolizer(options));
    }
    place(layout, geom, feature) {
        return this.centered.place(layout, geom, feature);
    }
}
export class OffsetSymbolizer {
    constructor(symbolizer, options) {
        var _a, _b, _c;
        this.symbolizer = symbolizer;
        this.offsetX = new NumberAttr(options.offsetX, 0);
        this.offsetY = new NumberAttr(options.offsetY, 0);
        this.justify = (_a = options.justify) !== null && _a !== void 0 ? _a : undefined;
        this.placements = (_b = options.placements) !== null && _b !== void 0 ? _b : [
            TextPlacements.NE,
            TextPlacements.SW,
            TextPlacements.NW,
            TextPlacements.SE,
            TextPlacements.N,
            TextPlacements.E,
            TextPlacements.S,
            TextPlacements.W,
        ];
        this.ddValues =
            (_c = options.ddValues) !== null && _c !== void 0 ? _c : (() => {
                return {};
            });
    }
    place(layout, geom, feature) {
        if (feature.geomType !== GeomType.Point)
            return undefined;
        let anchor = geom[0][0];
        let placed = this.symbolizer.place(layout, [[new Point(0, 0)]], feature);
        if (!placed || placed.length == 0)
            return undefined;
        let first_label = placed[0];
        let fb = first_label.bboxes[0];
        // Overwrite options values via the data driven function if exists
        let offsetXValue = this.offsetX;
        let offsetYValue = this.offsetY;
        let justifyValue = this.justify;
        let placements = this.placements;
        const { offsetX: ddOffsetX, offsetY: ddOffsetY, justify: ddJustify, placements: ddPlacements, } = this.ddValues(layout.zoom, feature) || {};
        if (ddOffsetX)
            offsetXValue = new NumberAttr(ddOffsetX, 0);
        if (ddOffsetY)
            offsetYValue = new NumberAttr(ddOffsetY, 0);
        if (ddJustify)
            justifyValue = ddJustify;
        if (ddPlacements)
            placements = ddPlacements;
        const offsetX = offsetXValue.get(layout.zoom, feature);
        const offsetY = offsetYValue.get(layout.zoom, feature);
        let getBbox = (a, o) => {
            return {
                minX: a.x + o.x + fb.minX,
                minY: a.y + o.y + fb.minY,
                maxX: a.x + o.x + fb.maxX,
                maxY: a.y + o.y + fb.maxY,
            };
        };
        var origin = new Point(offsetX, offsetY);
        var justify;
        let draw = (ctx) => {
            ctx.translate(origin.x, origin.y);
            first_label.draw(ctx, { justify: justify });
        };
        const placeLabelInPoint = (a, o) => {
            const bbox = getBbox(a, o);
            if (!layout.index.bboxCollides(bbox, layout.order))
                return [{ anchor: anchor, bboxes: [bbox], draw: draw }];
        };
        for (let placement of placements) {
            const xAxisOffset = this.computeXAxisOffset(offsetX, fb, placement);
            const yAxisOffset = this.computeYAxisOffset(offsetY, fb, placement);
            justify = this.computeJustify(justifyValue, placement);
            origin = new Point(xAxisOffset, yAxisOffset);
            return placeLabelInPoint(anchor, origin);
        }
        return undefined;
    }
    computeXAxisOffset(offsetX, fb, placement) {
        const labelWidth = fb.maxX;
        const labelHalfWidth = labelWidth / 2;
        if ([TextPlacements.N, TextPlacements.S].includes(placement))
            return offsetX - labelHalfWidth;
        if ([TextPlacements.NW, TextPlacements.W, TextPlacements.SW].includes(placement))
            return offsetX - labelWidth;
        return offsetX;
    }
    computeYAxisOffset(offsetY, fb, placement) {
        const labelHalfHeight = Math.abs(fb.minY);
        const labelBottom = fb.maxY;
        const labelCenterHeight = (fb.minY + fb.maxY) / 2;
        if ([TextPlacements.E, TextPlacements.W].includes(placement))
            return offsetY - labelCenterHeight;
        if ([TextPlacements.NW, TextPlacements.NE, TextPlacements.N].includes(placement))
            return offsetY - labelBottom;
        if ([TextPlacements.SW, TextPlacements.SE, TextPlacements.S].includes(placement))
            return offsetY + labelHalfHeight;
        return offsetY;
    }
    computeJustify(fixedJustify, placement) {
        if (fixedJustify)
            return fixedJustify;
        if ([TextPlacements.N, TextPlacements.S].includes(placement))
            return Justify.Center;
        if ([TextPlacements.NE, TextPlacements.E, TextPlacements.SE].includes(placement))
            return Justify.Left;
        return Justify.Right;
    }
}
export class OffsetTextSymbolizer {
    constructor(options) {
        this.symbolizer = new OffsetSymbolizer(new TextSymbolizer(options), options);
    }
    place(layout, geom, feature) {
        return this.symbolizer.place(layout, geom, feature);
    }
}
export var LineLabelPlacement;
(function (LineLabelPlacement) {
    LineLabelPlacement[LineLabelPlacement["Above"] = 1] = "Above";
    LineLabelPlacement[LineLabelPlacement["Center"] = 2] = "Center";
    LineLabelPlacement[LineLabelPlacement["Below"] = 3] = "Below";
})(LineLabelPlacement || (LineLabelPlacement = {}));
export class LineLabelSymbolizer {
    constructor(options) {
        var _a;
        this.font = new FontAttr(options);
        this.text = new TextAttr(options);
        this.fill = new StringAttr(options.fill, "black");
        this.stroke = new StringAttr(options.stroke, "black");
        this.width = new NumberAttr(options.width, 0);
        this.offset = new NumberAttr(options.offset, 0);
        this.position = (_a = options.position) !== null && _a !== void 0 ? _a : LineLabelPlacement.Above;
        this.maxLabelCodeUnits = new NumberAttr(options.maxLabelChars, 40);
        this.repeatDistance = new NumberAttr(options.repeatDistance, 250);
    }
    place(layout, geom, feature) {
        let name = this.text.get(layout.zoom, feature);
        if (!name)
            return undefined;
        if (name.length > this.maxLabelCodeUnits.get(layout.zoom, feature))
            return undefined;
        let MIN_LABELABLE_DIM = 20;
        let fbbox = feature.bbox;
        if (fbbox.maxY - fbbox.minY < MIN_LABELABLE_DIM &&
            fbbox.maxX - fbbox.minX < MIN_LABELABLE_DIM)
            return undefined;
        let font = this.font.get(layout.zoom, feature);
        layout.scratch.font = font;
        let metrics = layout.scratch.measureText(name);
        let width = metrics.width;
        let height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        var repeatDistance = this.repeatDistance.get(layout.zoom, feature);
        if (layout.overzoom > 4)
            repeatDistance *= 1 << (layout.overzoom - 4);
        let cell_size = height * 2;
        let label_candidates = simpleLabel(geom, width, repeatDistance, cell_size);
        if (label_candidates.length == 0)
            return undefined;
        let labels = [];
        for (let candidate of label_candidates) {
            let dx = candidate.end.x - candidate.start.x;
            let dy = candidate.end.y - candidate.start.y;
            let cells = lineCells(candidate.start, candidate.end, width, cell_size / 2);
            let bboxes = cells.map((c) => {
                return {
                    minX: c.x - cell_size / 2,
                    minY: c.y - cell_size / 2,
                    maxX: c.x + cell_size / 2,
                    maxY: c.y + cell_size / 2,
                };
            });
            let draw = (ctx) => {
                ctx.globalAlpha = 1;
                // ctx.beginPath();
                // ctx.moveTo(0, 0);
                // ctx.lineTo(dx, dy);
                // ctx.strokeStyle = "red";
                // ctx.stroke();
                ctx.rotate(Math.atan2(dy, dx));
                if (dx < 0) {
                    ctx.scale(-1, -1);
                    ctx.translate(-width, 0);
                }
                let heightPlacement = 0;
                if (this.position === LineLabelPlacement.Below)
                    heightPlacement += height;
                else if (this.position === LineLabelPlacement.Center)
                    heightPlacement += height / 2;
                ctx.translate(0, heightPlacement - this.offset.get(layout.zoom, feature));
                ctx.font = font;
                let lineWidth = this.width.get(layout.zoom, feature);
                if (lineWidth) {
                    ctx.lineWidth = lineWidth;
                    ctx.strokeStyle = this.stroke.get(layout.zoom, feature);
                    ctx.strokeText(name, 0, 0);
                }
                ctx.fillStyle = this.fill.get(layout.zoom, feature);
                ctx.fillText(name, 0, 0);
            };
            labels.push({
                anchor: candidate.start,
                bboxes: bboxes,
                draw: draw,
                deduplicationKey: name,
                deduplicationDistance: repeatDistance,
            });
        }
        return labels;
    }
}
export class PolygonLabelSymbolizer {
    constructor(options) {
        this.symbolizer = new TextSymbolizer(options);
    }
    place(layout, geom, feature) {
        let fbbox = feature.bbox;
        let area = (fbbox.maxY - fbbox.minY) * (fbbox.maxX - fbbox.minX); // TODO needs to be based on zoom level/overzooming
        if (area < 20000)
            return undefined;
        let placed = this.symbolizer.place(layout, [[new Point(0, 0)]], feature);
        if (!placed || placed.length == 0)
            return undefined;
        let first_label = placed[0];
        let fb = first_label.bboxes[0];
        let first_poly = geom[0];
        let found = polylabel([first_poly.map((c) => [c.x, c.y])]);
        let a = new Point(found[0], found[1]);
        let bbox = {
            minX: a.x - (fb.maxX - fb.minX) / 2,
            minY: a.y - (fb.maxY - fb.minY) / 2,
            maxX: a.x + (fb.maxX - fb.minX) / 2,
            maxY: a.y + (fb.maxY - fb.minY) / 2,
        };
        let draw = (ctx) => {
            ctx.translate(first_label.anchor.x - (fb.maxX - fb.minX) / 2, first_label.anchor.y);
            first_label.draw(ctx);
        };
        return [{ anchor: a, bboxes: [bbox], draw: draw }];
    }
}
