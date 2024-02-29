// Geometric objects




import { athrow, assertionFail, } from './athrow.mjs';
import { assert } from './check.js';

import { reiterableBy, } from './itertools.mjs';

import { roundDecimal, } from './decimalnumbers.mjs';




import BoundingBox from './bbox.js';

import {
  // @ts-ignore
  GpsbSplineSegmentCoord ,
} from './svgPathData.mjs'; 

import { optimizeSVgPathCommands as optimizeCommands } from './svgPathData.mjs'; 

import {
  // @ts-ignore
  SVGParsingOptions, SVGParsingFlipBaseOptions,
  createSVGParsingOptions,
} from './svgPathData.mjs'; 

import {
  // @ts-ignore
  SVGOutputOptions,
  createSVGOutputOptions,
} from './svgPathData.mjs'; 

import {
  pathDataFromArg ,
} from './svgPathData.mjs'; 




import {
  // @ts-ignore
  GPolySplineDesc ,
} from './svgPathData.mjs'; 

/**
 * MUTABLE
 * multi-segment spline,
 * each being straight-line or (uni-curvature) curve
 * 
 * use {@link fromSVG} to construct from SVG `<path>` `d` values.
 * 
 * Paths can be drawn on a context using {@link draw } .
 * 
 * @exports opentype.GPolySplineBuffer
 */
class GPolySplineBuffer
{
  constructor() {
    ;
      
    /** @type {GPolySplineDesc["commands"] } */
    this.commands = [];

    /** @type {GPolySplineDesc["fill"] } */
    this.fill = 'black';
    /** @type {GPolySplineDesc["stroke"] } */
    this.stroke = null;
    /** @type {GPolySplineDesc["strokeWidth"] } */
    this.strokeWidth = 1;
    
    /** @type {number=} */
    this.unitsPerEm ;

  }
}

import { GpsbSvgDPredef, } from './svgPathData.mjs';

/**
 * Sets the path data from an SVG path element or path notation
 * 
 * @type {(this: this, ...args: Parameters<typeof GPolySplineDesc.fromSVG > ) => GPolySplineBuffer }
 */
GPolySplineBuffer.prototype.fromSVG = function(...argument)
{
  {
    const p = GPolySplineDesc.fromSVG(...argument) ;
    const pb = this ;
    Object.assign(pb, p ) ;
    return pb ;
  }
} ;

import { flipYBaseIfNecessary } from './svgPathData.mjs';

/**
 * Generates {@link GPolySplineBuffer a new GPolySplineBuffer } from an {@link SVGPathElement SVG path element or path notation }
 * 
 */
GPolySplineBuffer.fromSVG = /** @satisfies {(...args: [string|SVGPathElement, object] ) => unknown } */ (function(path, options) {
    const newPath = new GPolySplineBuffer();
    return newPath.fromSVG(path, options);
}) ;

/**
 * `getLastCmd` -- throws if NF.
 * 
 */
GPolySplineBuffer.prototype.getLastCmd = function() {
  return this.getLastCmdOrNull() ?? athrow(`not found`) ;
};
/**
 */
GPolySplineBuffer.prototype.getLastCmdOrNull = function() {
  return this.commands.at(-1) ?? null ;
};

/**
 */
GPolySplineBuffer.prototype.getLastXyOrZeroes = function() {
  const { x = 0, y = 0, } = this.getLastCmdOrNull() ?? {} ;
  return { x, y } ;
};

/**
 * @param  {number} x
 * @param  {number} y
 */
GPolySplineBuffer.prototype.moveTo = function(x, y) {
    this.commands.push({
        type: 'M',
        x: x,
        y: y
    });
};

/**
 * @param  {number} x
 * @param  {number} y
 */
GPolySplineBuffer.prototype.lineTo = function(x, y) {
    this.commands.push({
        type: 'L',
        x: x,
        y: y
    });
};

/**
 * Draws cubic curve
 * @function
 * curveTo
 * @memberof opentype.GPolySplineBuffer.prototype
 * @param  {number} x1 - x of control 1
 * @param  {number} y1 - y of control 1
 * @param  {number} x2 - x of control 2
 * @param  {number} y2 - y of control 2
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */

/**
 * Draws cubic curve
 * @function
 * bezierCurveTo
 * @memberof opentype.GPolySplineBuffer.prototype
 * @param  {number} x1 - x of control 1
 * @param  {number} y1 - y of control 1
 * @param  {number} x2 - x of control 2
 * @param  {number} y2 - y of control 2
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 * @see curveTo
 */
GPolySplineBuffer.prototype.curveTo = GPolySplineBuffer.prototype.bezierCurveTo = function(x1, y1, x2, y2, x, y) {
    this.commands.push({
        type: 'C',
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        x: x,
        y: y
    });
};

/**
 * Draws quadratic curve
 * @function
 * quadraticCurveTo
 * @memberof opentype.GPolySplineBuffer.prototype
 * @param  {number} x1 - x of control
 * @param  {number} y1 - y of control
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */

/**
 * Draws quadratic curve
 * @function
 * quadTo
 * @memberof opentype.GPolySplineBuffer.prototype
 * @param  {number} x1 - x of control
 * @param  {number} y1 - y of control
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */
GPolySplineBuffer.prototype.quadTo = GPolySplineBuffer.prototype.quadraticCurveTo = function(x1, y1, x, y) {
    this.commands.push({
        type: 'Q',
        x1: x1,
        y1: y1,
        x: x,
        y: y
    });
};

/**
 * Closes the path
 * @function closePath
 * @memberof opentype.GPolySplineBuffer.prototype
 */

/**
 * Close the path
 * @function close
 * @memberof opentype.GPolySplineBuffer.prototype
 */
GPolySplineBuffer.prototype.close = GPolySplineBuffer.prototype.closePath = function() {
    this.commands.push({
        type: 'Z'
    });
};

/**
 * Add the given path or list of commands to the commands of this path.
 * 
 * @param  {BoundingBox | ((GPolySplineBuffer | GpsbSplineSegmentCoord[] ) & Partial<Record<keyof (GPolySplineBuffer & GpsbSplineSegmentCoord[]) , unknown > > ) } pathOrCommands - another opentype.GPolySplineBuffer, an opentype.BoundingBox, or an array of commands.
 */
GPolySplineBuffer.prototype.extend = function(pathOrCommands) {
    if (pathOrCommands instanceof BoundingBox) {
        const box = pathOrCommands;
        this.moveTo(box.x1, box.y1);
        this.lineTo(box.x2, box.y1);
        this.lineTo(box.x2, box.y2);
        this.lineTo(box.x1, box.y2);
        this.close();
        return;
    }
    else {
      ;
      
      if (pathOrCommands.commands) {
          pathOrCommands = pathOrCommands.commands;
      }

      Array.prototype.push.apply(this.commands, pathOrCommands);
    }
};

/**
 * Calculate the bounding box of the path.
 * 
 * @returns {BoundingBox}
 */
GPolySplineBuffer.prototype.getBoundingBox = function() {
    return (
      this.toPath()
      .getBoundingBox()
    ) ;
};

/**
 * Draw the path to a 2D context.
 * @param {CanvasRenderingContext2D} ctx - A 2D drawing context.
 */
GPolySplineBuffer.prototype.draw = function(ctx) {
    ctx.beginPath();
    for (let i = 0; i < this.commands.length; i += 1) {
        const cmd = this.commands[i] ?? assertionFail(`assertion failed`) ;
        if (cmd.type === 'M') {
            ctx.moveTo(cmd.x, cmd.y);
        } else if (cmd.type === 'L') {
            ctx.lineTo(cmd.x, cmd.y);
        } else if (cmd.type === 'C') {
            ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
        } else if (cmd.type === 'Q') {
            ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
        } else if (cmd.type === 'Z') {
            ctx.closePath();
        }
    }

    if (this.fill) {
        ctx.fillStyle = this.fill;
        ctx.fill();
    }

    if (this.stroke) {
        ctx.strokeStyle = this.stroke;
        this.strokeWidth && (ctx.lineWidth ??= this.strokeWidth) ;
        ctx.stroke();
    }
};

/**
 * convert into the immutable form, {@link GPolySplineDesc}
 * 
 */
GPolySplineBuffer.prototype.toPath = function () {
  return (
    new GPolySplineDesc()
    .derived({ commands: this.commands , })
  ) ;
} ;

import { throwMissingConfigItemError } from './svgPathData.mjs';

import { throwMissingFlipBaseError } from './svgPathData.mjs';

/**
 * Convert the {@link GPolySplineBuffer} to a string of path data instructions
 * See http://www.w3.org/TR/SVG/paths.html#PathData
 * 
 * @type {(...args : [a ?: never] | [options: SVGOutputOptions] | [nDecimalPlaces: number] ) => string }
 */
GPolySplineBuffer.prototype.toPathData = function(optionsArg = {} ) {
    // set/merge default options
    const options = (
        // @ts-ignore
        createSVGOutputOptions(optionsArg)
    );

    /** @type {(value: number ) => string } */
    function floatToString(v)
    {
        ;
        const {
          decimalPlaces = assertionFail(`'[GPolySplineBuffer.toPathData] [floatToString] [rounded] assertion failed: options.decimalPlaces not defined'`)
          ,
        } = options ;

        const rounded = roundDecimal(v, decimalPlaces ) ;
        if (Math.round(v) === rounded) {
            return '' + rounded;
        } else {
            return rounded.toFixed(decimalPlaces);
        }
    }

    function packValues()
    {
        let s = '';
        for (let i = 0; i < arguments.length; i += 1) {
            const v = arguments[i];
            if (v >= 0 && i > 0) {
                s += ' ';
            }

            s += floatToString(v);
        }

        return s;
    }

    let commandsCopy = this.commands;
    if (options.optimize) {
        // apply path optimizations
        commandsCopy = JSON.parse(JSON.stringify(this.commands)); // make a deep clone
        commandsCopy = optimizeCommands(commandsCopy);
    }

    const flipY = options.flipY;
    let flipYBase = options.flipYBase;
    if (flipY === true && flipYBase === undefined) {
        const tempPath = new GPolySplineBuffer();
        tempPath.extend(commandsCopy);
        const boundingBox = tempPath.getBoundingBox();
        flipYBase = boundingBox.y1 + boundingBox.y2;
    }

    let d = '';
    for (const cmd of commandsCopy )
    {
        if (cmd.type === 'M') {
            d += 'M' + packValues(
                cmd.x,
                flipY ? (flipYBase ?? throwMissingFlipBaseError(`y`) ) - cmd.y : cmd.y
            );
        } else if (cmd.type === 'L') {
            d += 'L' + packValues(
                cmd.x,
                flipY ? (flipYBase ?? throwMissingFlipBaseError(`y`) ) - cmd.y : cmd.y
            );
        } else if (cmd.type === 'C') {
            d += 'C' + packValues(
                cmd.x1,
                flipY ? (flipYBase ?? throwMissingFlipBaseError(`y`) ) - cmd.y1 : cmd.y1,
                cmd.x2,
                flipY ? (flipYBase ?? throwMissingFlipBaseError(`y`) ) - cmd.y2 : cmd.y2,
                cmd.x,
                flipY ? (flipYBase ?? throwMissingFlipBaseError(`y`) ) - cmd.y : cmd.y
            );
        } else if (cmd.type === 'Q') {
            d += 'Q' + packValues(
                cmd.x1,
                flipY ? (flipYBase ?? throwMissingFlipBaseError(`y`) ) - cmd.y1 : cmd.y1,
                cmd.x,
                flipY ? (flipYBase ?? throwMissingFlipBaseError(`y`) ) - cmd.y : cmd.y
            );
        } else if (cmd.type === 'Z') {
            d += 'Z';
        }
    }

    return d;
};

/**
 * Convert the path to an SVG <path> element, as a string.
 * @param  {SVGOutputOptions | number } [options={decimalPlaces:2, optimize:true}] - Options object (or amount of decimal places for floating-point values for backwards compatibility)
 * @param  {string} [pathData] - will be calculated automatically, but can be provided from Glyph's wrapper function
 * @return {string}
 */
GPolySplineBuffer.prototype.toSVG = function(options, pathData) {
  if (!pathData) {
      pathData = this.toPathData(options);
  }
  /** @type {string} */
  let svg = '<path d="';
  svg += pathData;
  svg += '"';
  if (this.fill !== undefined && this.fill !== 'black') {
      if (this.fill === null) {
          svg += ' fill="none"';
      } else {
          svg += ` fill="${this.fill}"`;
      }
  }

  if (this.stroke) {
      svg += ` stroke="${this.stroke}" stroke-width="${this.strokeWidth}"`;
  }

  svg += '/>';
  return svg;
};

/**
 * Convert the path to a DOM element.
 * @param  {SVGOutputOptions | number } [options={decimalPlaces:2, optimize:true}] - Options object (or amount of decimal places for floating-point values for backwards compatibility)
 * @param  {string} [pathData] - will be calculated automatically, but can be provided from Glyph's wrapper functionions object (or amount of decimal places for floating-point values for backwards compatibility)
 * @return {SVGPathElement}
 */
GPolySplineBuffer.prototype.toDOMElement = function(options, pathData) {
    if (!pathData) {
        pathData = this.toPathData(options);
    }
    const temporaryPath = pathData;
    const newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    newPath.setAttribute('d', temporaryPath);

    if (this.fill !== undefined && this.fill !== 'black') {
        if (this.fill === null) {
            newPath.setAttribute('fill', 'none');
        } else {
            newPath.setAttribute('fill', this.fill);
        }
    }
    
    if (this.stroke) {
        newPath.setAttribute('stroke', (this.stroke));
        this.strokeWidth && newPath.setAttribute('stroke-width', (this.strokeWidth).toString() );
    }

    return newPath;
};

export default GPolySplineBuffer;

export { GPolySplineBuffer } ;

/**
 * Draw the points of this {@link GPolySplineBuffer }.
 * On-curve points will be drawn in blue, off-curve points will be drawn in red
 * 
 * a utility for high-level visualisation.
 * 
 * {@link drawPointsInPath }
 * 
 * @param {[CanvasRenderingContext2D, ...[options?: (Parameters<typeof drawPointsInPath>[2] & {}) extends infer S ? (Omit<S, "scale" | "flipY"> & Partial<S>) : never ] ]} args
 */
GPolySplineBuffer.prototype.drawPoints = function(...[ctx, { scale = 1, x, y, flipY = false, ...options } = ({ x: 0, y: 0, }) ]) {
  return drawPointsInPath(ctx, this, { ...(options), x, y, scale, flipY, }) ;
} ;

/**
 * Draw the points of this {@link GPolySplineBuffer }.
 * On-curve points will be drawn in blue, off-curve points will be drawn in red
 * 
 * a utility for high-level visualisation.
 * 
 * {@link drawPointsInPath }
 * 
 * @param {[CanvasRenderingContext2D, import('./font.js').Font, (Parameters<typeof drawPointsInPath>[2] & {}) & { fontSize: number } ]} args
 */
GPolySplineBuffer.prototype.drawPointsAssumingFromFont = function(...[ctx, font, { x, y, fontSize, flipY, }]) {
  
  x = x !== undefined ? x : 0;
  y = y !== undefined ? y : 0;
  fontSize = fontSize !== undefined ? fontSize : 72;
  const scale = this.computePreferredScaleFactorByFontSize(fontSize) ;

  //     ;
  //     const path = this.path;

  return drawPointsInPath(ctx, this, { x, y, scale, flipY, }) ;
} ;

/**
 * Draw the points of the {@link GPolySplineBuffer }.
 * On-curve points will be drawn in blue, off-curve points will be drawn in red
 * 
 * a utility for high-level visualisation.
 * 
 * @param {[CanvasRenderingContext2D, GPolySplineBuffer | GPolySplineDesc, { [k in keyof {x, y, scale, }]: number ; } & { [ k in keyof { flipY, } ]: boolean, } ]} args
 */
const drawPointsInPath = function(...[ctx, path, { x, y, scale, flipY, }]) {
  ;
  
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

  const flippingFactor = (flipY ? -1 : 1 ) ;

  /** @type {Array<{ x: number ; y: number ; }> } */
  const blueCircles = [];
  /** @type {Array<{ x: number ; y: number ; }> } */
  const redCircles = [];
  for (const cmd of path.commands )
  {
      /* MAIN SEGMENT-END POINT(s) */
      if (cmd.x !== undefined) {
          blueCircles.push({x: cmd.x, y: flippingFactor * cmd.y});
      }

      /* SUB-SEGMENT POINT(s) */
      if ("x1" in cmd ) {
          redCircles.push({x: cmd.x1, y: flippingFactor * cmd.y1});
      }
      if (("x2" in cmd ) ) {
          redCircles.push({x: cmd.x2, y: flippingFactor * cmd.y2});
      }
  }

  ctx.fillStyle = 'blue';
  drawCircles(blueCircles, x, y, scale);
  ctx.fillStyle = 'red';
  drawCircles(redCircles, x, y, scale);
} ;

GPolySplineBuffer.prototype.computePreferredScaleFactorByFontSize = /** @param {Number} fontSize */ function (fontSize) {
  return 1 / (this.unitsPerEm ?? SpcFont.preferredFontEmSize ?? athrow(`[GPolySplineBuffer.this.computePreferredScaleFactorByFontSize] missing necessary 'unitsPerEm' attribute `) ) * fontSize ;
} ;

export { drawPointsInPath } ;

import SpcFont from './font.js';

