// The Glyph object

import { athrow, } from './athrow.mjs';

import check from './check.js';
import draw from './draw.js';
import Path from './path.js';
// import glyf from './tables/glyf' Can't be imported here, because it's a circular dependency

// import Font from './font.js';
/** @typedef {import("./font.js").default } Font */
import BoundingBox from './bbox.js';

function getPathDefinition(glyph, path) {
    let _path = path || new Path();
    return {
        configurable: true,

        get: function() {
            if (typeof _path === 'function') {
                _path = _path();
            }

            return _path;
        },

        set: function(p) {
            _path = p;
        }
    };
}

/**
 * @typedef {Object} GlyphOptions
 * @property {string} [name] - The glyph name
 * @property {number} [unicode]
 * @property {Array} [unicodes]
 * @property {number} [xMin]
 * @property {number} [yMin]
 * @property {number} [xMax]
 * @property {number} [yMax]
 * @property {number} [advanceWidth]
 * @property {number} [leftSideBearing]
 * 
 * @property {Path} [path]
 * @property {number} [index]
 */

// A Glyph is an individual mark that often corresponds to a character.
// Some glyphs, such as ligatures, are a combination of many characters.
// Glyphs are the basic building blocks of a font.
//
// The `Glyph` class contains utility methods for drawing the path and its points.
/**
 * @exports Glyph
 * @class
 * @param {GlyphOptions} options
 * @constructor
 */
function Glyph(options) {
    // By putting all the code on a prototype function (which is only declared once)
    // we reduce the memory requirements for larger fonts by some 2%
    this.bindConstructorValues(options);

    /** these relies on having been initialised via {@link this.bindConstructorValues} ! */

    /** @type {Path } */
    this.path ;
    /** @type {{ x: number ; y: number ; }[] } */
    this.points ;
    /** @type {{}[] } */
    this.glyphs ;
    /** @type {GlyphOptions["unicodes"] & {} } */
    this.unicodes ;
    /** @type {GlyphOptions["index"] & {} } */
    this.index ;

}

/**
 * 
 * @param  {GlyphOptions} options
 */
Glyph.prototype.bindConstructorValues = function(options) {
    this.index = options.index || 0;

    if (options.name === '.notdef') {
        options.unicode = undefined;
    } else if (options.name === '.null') {
        options.unicode = 0;
    }

    if (options.unicode === 0 && options.name !== '.null') {
        throw new Error('The unicode value "0" is reserved for the glyph name ".null" and cannot be used by any other glyph.');
    }

    // These three values cannot be deferred for memory optimization:
    this.name = options.name || null;
    this.unicode = options.unicode;
    this.unicodes = options.unicodes || (options.unicode !== undefined ? [options.unicode] : []);

    // But by binding these values only when necessary, we reduce can
    // the memory requirements by almost 3% for larger fonts.
    if ('xMin' in options) {
        this.xMin = options.xMin;
    }

    if ('yMin' in options) {
        this.yMin = options.yMin;
    }

    if ('xMax' in options) {
        this.xMax = options.xMax;
    }

    if ('yMax' in options) {
        this.yMax = options.yMax;
    }

    if ('advanceWidth' in options) {
        this.advanceWidth = options.advanceWidth;
    }

    if ('leftSideBearing' in options) {
        this.leftSideBearing = options.leftSideBearing;
    }

    // The path for a glyph is the most memory intensive, and is bound as a value
    // with a getter/setter to ensure we actually do path parsing only once the
    // path is actually needed by anything.
    Object.defineProperty(this, 'path', getPathDefinition(this, options.path));
};

/**
 * @param {number} unicode
 */
Glyph.prototype.addUnicode = function(unicode) {
    if (this.unicodes.length === 0) {
        this.unicode = unicode;
    }

    this.unicodes.push(unicode);
};

/**
 * Calculate the minimum bounding box for this glyph.
 * @return {BoundingBox}
 */
Glyph.prototype.getBoundingBox = function() {
    return this.path.getBoundingBox();
};

/**
 * Convert the glyph to a Path we can draw on a drawing context.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {{ xScale?: number, yScale?: number, hinting?: boolean, }} [options] - xScale, yScale to stretch the glyph.
 * @param  {Font} [font] if hinting is to be used, the font
 * @return {Path}
 */
Glyph.prototype.getPath = function(x, y, fontSize, options, font) {
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 72;
    /** @type {Path["commands"] } */
    let commands;
    options ??= { };
    let xScale = options.xScale;
    let yScale = options.yScale;
    const scale = 1 / (this.path.unitsPerEm || 1000) * fontSize;

    ;
    let hPoints;
    if (options.hinting && font && font.hinting) {
        // in case of hinting, the hinting engine takes care
        // of scaling the points (not the path) before hinting.
        hPoints = this.path && font.hinting.exec(this, fontSize);
        // in case the hinting engine failed hPoints is undefined
        // and thus reverts to plain rending
    }

    if (hPoints) {
        // Call font.hinting.getCommands instead of `glyf.getPath(hPoints).commands` to avoid a circular dependency
        commands = font.hinting.getCommands(hPoints);
        x = Math.round(x);
        y = Math.round(y);
        // TODO in case of hinting xyScaling is not yet supported
        xScale = yScale = 1;
    } else {
        commands = this.path.commands;
        if (xScale === undefined) xScale = scale;
        if (yScale === undefined) yScale = scale;
    }

    const p = new Path();
    p.fill = this.path.fill;
    p.stroke = this.path.stroke;
    p.strokeWidth = this.path.strokeWidth * scale;
    for (const cmd of commands)
    {
        if (cmd.type === 'M') {
            p.moveTo(x + (cmd.x * xScale), y + (-cmd.y * yScale));
        } else if (cmd.type === 'L') {
            p.lineTo(x + (cmd.x * xScale), y + (-cmd.y * yScale));
        } else if (cmd.type === 'Q') {
            p.quadraticCurveTo(x + (cmd.x1 * xScale), y + (-cmd.y1 * yScale),
                x + (cmd.x * xScale), y + (-cmd.y * yScale));
        } else if (cmd.type === 'C') {
            p.curveTo(x + (cmd.x1 * xScale), y + (-cmd.y1 * yScale),
                x + (cmd.x2 * xScale), y + (-cmd.y2 * yScale),
                x + (cmd.x * xScale), y + (-cmd.y * yScale));
        } else if (cmd.type === 'Z') {
            p.closePath();
        }
    }

    return p;
};

/**
 * Split the glyph into contours.
 * This function is here for backwards compatibility, and to
 * provide raw access to the TrueType glyph outlines.
 * @return {Array}
 */
Glyph.prototype.getContours = function() {
    if (this.points === undefined) {
        return [];
    }

    const contours = [];
    let currentContour = [];
    for (const pt of this.points )
    {
        currentContour.push(pt);
        if (pt.lastPointOfContour) {
            contours.push(currentContour);
            currentContour = [];
        }
    }

    check.argument(currentContour.length === 0, 'There are still points left in the current contour.');
    return contours;
};

/**
 * glyph metric item-value
 * 
 * @typedef {boolean | number | GlyphMetriclikeDict | GlyphMetriclikeRArray } GlyphMetriclike
 * 
 */

/**
 * @typedef {ReadonlyArray<GlyphMetriclike> } GlyphMetriclikeRArray
 * 
 */

/**
 * @typedef {{ [key: string]: GlyphMetriclike ; }} GlyphMetriclikeDict
 * 
 */

/**
 * Calculate the xMin/yMin/xMax/yMax/lsb/rsb for a Glyph.
 * @return {GlyphMetriclikeDict }
 */
Glyph.prototype.getMetrics = function() {
    const commands = this.path.commands;
    const xCoords = [];
    const yCoords = [];
    for (const cmd of commands )
    {
        if (cmd.type !== 'Z') {
            xCoords.push(cmd.x);
            yCoords.push(cmd.y);
        }

        if (cmd.type === 'Q' || cmd.type === 'C') {
            xCoords.push(cmd.x1);
            yCoords.push(cmd.y1);
        }

        if (cmd.type === 'C') {
            xCoords.push(cmd.x2);
            yCoords.push(cmd.y2);
        }
    }

    const metrics = (() => {
        ;
        /** @type {number} */ let xMin = Math.min(...xCoords) ;
        /** @type {number} */ let yMin = Math.min(...yCoords) ;
        /** @type {number} */ let xMax = Math.max(...xCoords) ;
        /** @type {number} */ let yMax = Math.max(...yCoords) ;

        /**
         * TODO: proper handling for the "value not defined" scenario
         */
        const {
            leftSideBearing = (
                1 ? Number.NaN : athrow(`[Glyph.this.getMetrics] [metrics] missing 'leftSideBearing'`)
            ),
            advanceWidth    = (
                1 ? Number.NaN : athrow(`[Glyph.this.getMetrics] [metrics] missing 'advanceWidth'`)
            ),
        } = this ;

        if (!isFinite(xMin) ) { xMin = 0 ; }
        if (!isFinite(xMax) ) { xMax = advanceWidth ; }

        if (!isFinite(yMin) ) { yMin = 0 ; }
        if (!isFinite(yMax) ) { yMax = 0 ; }

        const rightSideBearing = advanceWidth - leftSideBearing - (xMax - xMin) ;

        return { xMin, xMax,  yMin, yMax, leftSideBearing, rightSideBearing } ;
    })() ;

    return metrics;
};

/**
 * Draw the glyph on the given context.
 * @param  {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {Object=} options - xScale, yScale to stretch the glyph.
 */
Glyph.prototype.draw = function(ctx, x, y, fontSize, options) {
    this.getPath(x, y, fontSize, options).draw(ctx);
};

/**
 * Draw the points of the glyph.
 * On-curve points will be drawn in blue, off-curve points will be drawn in red.
 * @param  {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 */
Glyph.prototype.drawPoints = function(ctx, x, y, fontSize) {
    /**
     * @param {Array<{ x: number ; y: number ; }> } l
     * @param {number} x 
     * @param {number} y
     * @param {number} scale
     * @returns {void}
     */
    function drawCircles(l, x, y, scale) {
        ctx.beginPath();
        for (const pt of l )
        {
            ctx.moveTo(x + (pt.x * scale), y + (pt.y * scale));
            ctx.arc(x + (pt.x * scale), y + (pt.y * scale), 2, 0, Math.PI * 2, false);
        }

        ctx.closePath();
        ctx.fill();
    }

    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 24;
    const scale = 1 / (this.path.unitsPerEm ?? athrow(`[Glyph.this.drawPoints] [scale] missing 'unitsPerEm' in 'this.path'`) ) * fontSize;

    /** @type {Array<{ x: number ; y: number ; }> } */
    const blueCircles = [];
    /** @type {Array<{ x: number ; y: number ; }> } */
    const redCircles = [];
    const path = this.path;
    for (const cmd of path.commands )
    {
        if (cmd.x !== undefined) {
            blueCircles.push({x: cmd.x, y: -cmd.y});
        }

        if ("x1" in cmd ) {
            redCircles.push({x: cmd.x1, y: -cmd.y1});
        }

        if (("x2" in cmd ) ) {
            redCircles.push({x: cmd.x2, y: -cmd.y2});
        }
    }

    ctx.fillStyle = 'blue';
    drawCircles(blueCircles, x, y, scale);
    ctx.fillStyle = 'red';
    drawCircles(redCircles, x, y, scale);
};

/**
 * Draw lines indicating important font measurements.
 * Black lines indicate the origin of the coordinate system (point 0,0).
 * Blue lines indicate the glyph bounding box.
 * Green line indicates the advance width of the glyph.
 * @param  {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 */
Glyph.prototype.drawMetrics = function(ctx, x, y, fontSize) {
    let scale;
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 24;
    scale = 1 / this.path.unitsPerEm * fontSize;
    ctx.lineWidth = 1;

    // Draw the origin
    ctx.strokeStyle = 'black';
    draw.line(ctx, x, -10000, x, 10000);
    draw.line(ctx, -10000, y, 10000, y);

    // This code is here due to memory optimization: by not using
    // defaults in the constructor, we save a notable amount of memory.
    const xMin = this.xMin || 0;
    let yMin = this.yMin || 0;
    const xMax = this.xMax || 0;
    let yMax = this.yMax || 0;
    const advanceWidth = this.advanceWidth || 0;

    // Draw the glyph box
    ctx.strokeStyle = 'blue';
    draw.line(ctx, x + (xMin * scale), -10000, x + (xMin * scale), 10000);
    draw.line(ctx, x + (xMax * scale), -10000, x + (xMax * scale), 10000);
    draw.line(ctx, -10000, y + (-yMin * scale), 10000, y + (-yMin * scale));
    draw.line(ctx, -10000, y + (-yMax * scale), 10000, y + (-yMax * scale));

    // Draw the advance width
    ctx.strokeStyle = 'green';
    draw.line(ctx, x + (advanceWidth * scale), -10000, x + (advanceWidth * scale), 10000);
};

/**
 * Convert the Glyph's Path to a string of path data instructions
 * @param  {object|number} [options={decimalPlaces:2, optimize:true}] - Options object (or amount of decimal places for floating-point values for backwards compatibility)
 * @return {string}
 * @see Path.toPathData
 */
Glyph.prototype.toPathData = function(options) {
    return this.path.toPathData(options);
};

/**
 * Sets the path data from an SVG path element or path notation
 * 
 * @param  {string|SVGPathElement } pathData
 * @param  {object} options
 */
Glyph.prototype.fromSVG = function(pathData, options = {}) {
    return this.path.fromSVG(pathData, options);
};

/**
 * Convert the Glyph's Path to an SVG <path> element, as a string.
 * 
 * @param  {object|number} [options={decimalPlaces:2, optimize:true}] - Options object (or amount of decimal places for floating-point values for backwards compatibility)
 * @return {string}
 */
Glyph.prototype.toSVG = function(options) {
    return this.path.toSVG(options, this.toPathData.apply(this, [options]));
};

/**
 * Convert the path to a DOM element.
 * 
 * @param  {object|number} [options={decimalPlaces:2, optimize:true}] - Options object (or amount of decimal places for floating-point values for backwards compatibility)
 * @return {SVGPathElement}
 */
Glyph.prototype.toDOMElement = function(options) {
    return this.path.toDOMElement(options);
};

export default Glyph;
