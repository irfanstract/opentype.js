// Geometric objects




import { athrow, } from './athrow.mjs';
import { assert } from './check.js';

import { throwMissingConfigItemError } from './athrow.mjs';
export { throwMissingConfigItemError } ;

/**
 * @type {{
 *  <O1 extends {}, O2 extends {}, k1 extends string | number | symbol = ((keyof O1) ), k2 extends string | number | symbol = ((keyof O2)) , e3 = { [k in (k1 | k2)] : "k3" } > (v1: O1, v2: O2): (
 *    { [k in (keyof [O2][0])]: O2[k] } &
 *    { [k in (k1 | k2) ] : (
 *      [O2][0] extends { [kActual in k ] : unknown } ? O2[k] :
 *      [O1][0] extends { [kActual in k ] : unknown } ? ((O2 & { [kActual in keyof O1] : unknown } )[k] | O1[k] ) :
 *      never
 *    ) }
 * ) ;
 *  <O extends {}>(...os : O[] ): O ;
 * }}
 *  */
const dictKAssign = (
  // @ts-ignore
  (...args) => Object.assign(new Object, ...args)
) ;

import { reiterableBy, } from './itertools.mjs';

import { roundDecimal, } from './decimalnumbers.mjs';





import BoundingBox from './bbox.js';

/**
 * @typedef {Readonly<((RecordFromOccurenceTable<GpsbCoordFieldOccurenceTable> & Partial<Record<"x1" | "y1" | "x2" | "y2" | "x" | "y" , number> > ) | { type: "Z", x ?: never, y ?: never , } )> } GpsbSplineSegmentCoord
 * 
 */
const GpsbSplineSegmentCoord = {} ;
export { GpsbSplineSegmentCoord } ;

/**
 * @typedef {Object} GpsbCoordFieldOccurenceTable
 * @property {"C" | "Q" } x1
 * @property {"C" | "Q" } y1
 * @property {"C" } x2
 * @property {"C" } y2
 * @property {"C" | "Q" | "H" | "L" | "M" } x
 * @property {"C" | "Q" | "V" | "L" | "M" } y
 * 
 */
const GpsbCoordFieldOccurenceTable = {} ;
export { GpsbCoordFieldOccurenceTable } ;

/**
 * 
 * @satisfies {(...args: [GpsbSplineSegmentCoord[] ] ) => GpsbSplineSegmentCoord[] }
 */
const optimizeCommands = /** @return {GpsbSplineSegmentCoord[] } */ function (commands) {
  {
    /** @typedef {readonly Readonly<GpsbSplineSegmentCoord>[] } GpsbSplContourCmds */
    
    /** @typedef {Readonly<{ closedContour ?: boolean , pointsListBuf: Array<GpsbSplContourCmds[number] > , }> } GpsbSplContourMutable */

    // separate subpaths
    /** @type {Array<GpsbSplContourMutable > } */
    let collectedContoursListbuf = [{ pointsListBuf: [] }];
    LOOP :
    for (const [i, cmd] of commands.entries( ) )
    {
      ;
      {
        ;
        const c = ((collectedContoursListbuf[0] ?? athrow(`assertion failed, empty collectedContoursListbuf`) ).pointsListBuf[0] ?? { type: "M", x: Number.NaN, y: Number.NaN } ) ;
        assert(c.type === "M" , (
          `assertion error. ${(
            JSON.stringify({
              c,
              nextCmdInfo: { i, cmd, },
              commands ,
              collectedContoursListbuf,
            })
          ) }`
        ) ) ;
      }

      const { pointsListBuf: subpathPlb, } = collectedContoursListbuf[collectedContoursListbuf.length - 1] ?? athrow(`assertion failed`) ;
      const firstCommand  = subpathPlb[0] ;
      const secondCommand = subpathPlb[1] ;
      const previousCommand = subpathPlb[subpathPlb.length - 1];
      subpathPlb.push(cmd);
      if (cmd.type === 'Z') {
        // When closing at the same position as the path started,
        // remove unnecessary line command
        if (
          firstCommand &&
          secondCommand &&
          previousCommand &&
          firstCommand.type === 'M' &&
          secondCommand.type === 'L' &&
          previousCommand.type === 'L' &&
          previousCommand.x === firstCommand.x &&
          previousCommand.y === firstCommand.y
        ) {
            subpathPlb.shift();
            {
              const s = subpathPlb.shift() ?? athrow(`assertion failed`) ;
              subpathPlb.unshift(
                // @ts-ignore
                { ...s, type: "M" } ) ;
            }
        }

        if (i + 1 < commands.length) {
            collectedContoursListbuf.push({ pointsListBuf: [] });
        }
      } else
      if (cmd.type === 'L') {
          // remove lines that lead to the same position as the previous command
          if (previousCommand && previousCommand.x === cmd.x && previousCommand.y === cmd.y) {
              subpathPlb.pop();
          }
      }
    }
    return collectedContoursListbuf.flatMap(s => s.pointsListBuf ) ; // flatten again
  }
} ;


export const optimizeSVgPathCommands = optimizeCommands ;




/**
 * @typedef {SVGParsingOptionsNonKnownProperties & ({ decimalPlaces?: number ; } & ({ x : number ; y : number ; scale : number ; } | { x ?: never ; y ?: never ; scale ?: never ; } ) & SVGParsingFlipBaseOptions & { optimize ?: boolean ; } ) } SVGParsingOptions
 * 
 */
const    SVGParsingOptions = {} ;
export { SVGParsingOptions } ;

/**
 * would have been `{ [k: string]: unknown ; }` but for now disabled due to issues with (spurious) index-signature-caused type-widenings.
 * 
 * @typedef {{} } SVGParsingOptionsNonKnownProperties
 * 
 */

/** @type {() => boolean} */
export function shallByDefaultApplyFlipY() {
  return true ;
}

/**
 * Returns options merged with the default options for parsing SVG data
 * @param {SVGParsingOptions} [options] (optional)
 */
export function createSVGParsingOptions(options)
{
  {
    /** @satisfies {Partial<SVGParsingOptions> } */
    const defaultOptions = {
        decimalPlaces: 2,
        optimize: true,
        flipY: shallByDefaultApplyFlipY() ,
        scale: 1,
        x: 0,
        y: 0
    };
    const newOptions = dictKAssign(defaultOptions, options ?? {});
    return newOptions;
  }
}

/**
 * @typedef {{ flipY ?: false ; flipYBase ?: never ; } | { flipY : true ; flipYBase : number ; } } SVGParsingFlipBaseOptions
 * 
 */
const    SVGParsingFlipBaseOptions = {} ;
export { SVGParsingFlipBaseOptions } ;

export const throwMissingFlipBaseError = /** @param {string} v */ (v) => throwMissingConfigItemError(`flip${v}Base`) ;

/**
 * 
 * @type {(...args: [GpsbSplineSegmentCoord[], (ReturnType<typeof createSVGParsingOptions> ) ] ) => GpsbSplineSegmentCoord[] }
 * 
 */
export function flipYBaseIfNecessary (commands, options )
{
  const {
    flipY ,
    flipYBase ,
  } = options ;

  {
    const { scale = 1 } = options ;
    const { x = 0 } = options ;
    const { y = 0 } = options ;

    /** @typedef {(GpsbSplineSegmentCoord extends (infer S) ? [S] : never )} Gsc */
    /** @typedef {{ [k in GpsbSplineSegmentCoord["type"] ] : GpsbSplineSegmentCoord & { type: k } }[GpsbSplineSegmentCoord["type"] ] } Spc1 */

    return (
      //

      commands
      .map((cmd, i) => /** @type {(Required<GpsbSplineSegmentCoord> extends infer S1 ? (S1 extends infer S2 ? { [k in keyof [S2][0] ]: [k, S2[k] ] }[keyof S2] : never) : never )[] } */ (Object.entries(cmd) ) )
      .map(cmdTable => (
        cmdTable
        .map(([prop, val0]) => {
          const val2 = (
            (prop === 'x' || prop === 'x1' || prop === 'x2') ?
            x + val0 * scale
            :
            (prop === 'y' || prop === 'y1' || prop === 'y2' ) ?
            y + (flipY ? (flipYBase ?? throwMissingFlipBaseError(`y`) ) - val0 : val0 ) * scale
            :
            val0
          ) ;
          return /** @satisfies {[{}, {}] } */ ([prop, val2]) ;
        } )
      ) )
      .map(cmdTable => /** @type {GpsbSplineSegmentCoord } */ (Object.fromEntries(cmdTable) ) )
    ) ;
  }

  return commands ;
}

export const pathDataFromArg = /** @type {(d: string | SVGPathElement | RegExp) => string } */ function (pathDataArg) {
  ;
  
  // TODO
  if ((typeof pathDataArg === "object") && (!!pathDataArg ) ) {
    ;
    if ((typeof SVGPathElement !== "undefined") && (pathDataArg instanceof SVGPathElement)) {
      return pathDataArg.getAttribute('d') ?? athrow(`[GPolySplineBuffer.fromSVG] [pathData] attribute not defined`) ;
    }
  }
  if (typeof pathDataArg ==="string" ) {
    return pathDataArg ;
  }
  throw new TypeError(`'pathDataArg': ${pathDataArg } `) ;
} ;




/**
 * a multi-segment spline,
 * each being straight-line or (uni-curvature) curve
 * 
 * use {@link fromSVG} to construct from SVG `<path>` `d` values.
 * 
 */
class GPolySplineDesc
{
  /**
   * PRIVATE
   */
  constructor() {
    ;
    
    /** @type {( GpsbSplineSegmentCoord )[] } */
    this.commands = [];

    /** @type {Extract<CanvasRenderingContext2D["fillStyle"] , string > } */
    this.fill ;
    /** @type {(string) | null } */
    this.stroke ;
    /** @type {(number) | null } */
    this.strokeWidth ;
  }
}

/**
 * @typedef {Pick<GPolySplineDesc, "commands" | "fill" | "stroke" | "strokeWidth"> } GPolySplineDescInt
 * 
 */

/**
 * 
 * @type {(a: Partial<GPolySplineDescInt> ) => GPolySplineDesc } c
 */
GPolySplineDesc.prototype.derived = function (c) {
  return {
    // @ts-ignore
    __proto__ : GPolySplineDesc.prototype ,
    ...this ,
    ...c ,
  } ;
} ;

/**
 * 
 * @param {GPolySplineDesc["commands"] } c
 */
GPolySplineDesc.prototype.withAddedCommands = function (c) {
  return this.derived({ commands: [...this.commands , ...c ] , }) ;
} ;

/**
 * Calculate the bounding box of the path.
 * @returns {BoundingBox}
 */
GPolySplineDesc.prototype.getBoundingBox = function() {
  const box = new BoundingBox();

  /** @type {number} */ let startX ;
  /** @type {number} */ let startY ;
  /** @type {number} */ let  prevX ;
  /** @type {number} */ let  prevY ;

  ({ x: startX, y: startY } = { x: 0, y: 0 }) ;
  ({ prevX, prevY } = { prevX: startX, prevY: startY }) ;

  for (const [i, cmd] of this.commands.entries() )
  {
    CMD_MATCH :
    switch (cmd.type) {
      case 'M':
          box.addPoint(cmd.x, cmd.y);
          startX = prevX = cmd.x;
          startY = prevY = cmd.y;
          break CMD_MATCH;
      case 'L':
          box.addPoint(cmd.x, cmd.y);
          prevX = cmd.x;
          prevY = cmd.y;
          break CMD_MATCH;
      case 'Q':
          box.addQuad(prevX, prevY, cmd.x1, cmd.y1, cmd.x, cmd.y);
          prevX = cmd.x;
          prevY = cmd.y;
          break CMD_MATCH;
      case 'C':
          box.addBezier(prevX, prevY, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
          prevX = cmd.x;
          prevY = cmd.y;
          break CMD_MATCH;
      case 'Z':
          prevX = startX;
          prevY = startY;
          break CMD_MATCH;
      default:
          return athrow(`Unexpected path command ${(
            JSON.stringify(cmd)
          )}`);
    }
  }
  if (box.isEmpty())
  {
    box.addPoint(0, 0);
  }

  return box;
};

// TODO 
/**
 * the path data from an SVG path element or path notation .
 * __to use this method you must make your code do `import from "./svgPathData.mjs"` first, otherwise this method would outright `throw`s__ .
 * 
 * @deprecated WIP
 * 
 * @type {(...args: [pathData: Required<Parameters<typeof pathDataFromArg > >[0] , options?: SVGParsingOptions ] ) => GPolySplineDesc }
 */
GPolySplineDesc.fromSVG = () => athrow(`method not initialized yet. must first import "./svgPathData.mjs".`) ;



export { GPolySplineDesc, } ;









