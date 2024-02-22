// Geometric objects




import { athrow, } from './athrow.mjs';

import { reiterableBy, } from './itertools.mjs';

import { roundDecimal, } from './decimalnumbers.mjs';




import BoundingBox from './bbox.js';

/**
 * @typedef {(RecordFromOccurenceTable<GpsbCoordFieldOccurenceTable> | { type: "Z", x ?: never, y ?: never , } ) & { [key: string]: unknown ; } } GpsbSplineSegmentCoord
 * 
 */

/**
 * @typedef {Object} GpsbCoordFieldOccurenceTable
 * @property {"C" | "Q" } x1
 * @property {"C" | "Q" } y1
 * @property {"C" } x2
 * @property {"C" } y2
 * @property {"C" | "Q" | "L" | "M" } x
 * @property {"C" | "Q" | "L" | "M" } y
 * 
 */

/**
 * 
 * @satisfies {(...args: [GpsbSplineSegmentCoord[] ] ) => unknown }
 */
const optimizeCommands = function (commands) {
  {
    // separate subpaths
    /** @type {(any)[] } */
    let subpaths = [[]];
    for (let i = 0; i < commands.length; i += 1) {
        const subpath = subpaths[subpaths.length - 1];
        const cmd = commands[i] ?? athrow(`assertion failed`) ;
        const firstCommand = subpath[0];
        const secondCommand = subpath[1];
        const previousCommand = subpath[subpath.length - 1];
        subpath.push(cmd);
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
                subpath.shift();
                subpath[0].type = 'M';
            }

            if (i + 1 < commands.length) {
                subpaths.push([]);
            }
        } else if (cmd.type === 'L') {
            // remove lines that lead to the same position as the previous command
            if (previousCommand && previousCommand.x === cmd.x && previousCommand.y === cmd.y) {
                subpath.pop();
            }
        }
    }
    commands = [].concat.apply([], subpaths); // flatten again
    return commands;
  }
} ;

/**
 * @typedef {{ [k: string]: unknown ; decimalPlaces?: number ; flipYBase ?: number ; flipY ?: unknown ; x ?: number ; }} SVGParsingOptions
 * 
 */

/**
 * Returns options merged with the default options for parsing SVG data
 * @param {SVGParsingOptions} [options] (optional)
 */
function createSVGParsingOptions(options)
{
  {
    const defaultOptions = {
        decimalPlaces: 2,
        optimize: true,
        flipY: true,
        flipYBase: undefined,
        scale: 1,
        x: 0,
        y: 0
    };
    const newOptions = Object.assign({}, defaultOptions, options);
    return newOptions;
  }
}

/**
 * @typedef {{ [k: string]: unknown ; decimalPlaces?: number ; flipYBase ?: number ; }} SVGOutputOptions
 * 
 */

/**
 * Returns options merged with the default options for outputting SVG data
 * @param {SVGOutputOptions | number } [optionsArg] (optional)
 * @returns {SVGOutputOptions }
 */
function createSVGOutputOptions(optionsArg)
{
  const options = (/** @return {SVGOutputOptions } */ () => {
    ;
    
    // accept number for backwards compatibility
    // and in that case set flipY to false
    if ((
      (
        // @ts-ignore
        parseInt(optionsArg)
      ) === optionsArg
      ||
      typeof optionsArg === "number"
    )) {
        return { decimalPlaces: optionsArg, flipY: false };
    }
    return optionsArg || {} ;
  })() ;

  const defaultOptions = {
    decimalPlaces: 2,
    optimize: true,
    flipY: true,
    flipYBase: undefined
  };
  const newOptions = Object.assign({}, defaultOptions, options);

  return newOptions;
}

const pathDataFromArg = /** @type {(d: string | SVGPathElement | RegExp) => string } */ function (pathDataArg) {
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
   * @private
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

// // TODO 
// /**
//  * the path data from an SVG path element or path notation .
//  * 
//  * @type {(...args: [pathData: Required<Parameters<typeof pathDataFromArg > >[0] , options?: SVGParsingOptions ] ) => GPolySplineDesc }
//  */
// GPolySplineDesc.fromSVG = function (pathDataArg, optionsArg = {}) {
//   ;
  
//   /** @type {string} */
//   const pathData = pathDataFromArg(pathDataArg) ;

//   // set/merge default options
//   const options = createSVGParsingOptions(optionsArg);
  
//   const {
//     numericChars ,
//     signChars ,
//     supportedCommands ,
//     unsupportedCommands ,
//   } = GpsbSvgDPredef ;

//   /** @typedef {{ buffer: readonly string [] ; lastCmd?: GpsbSplineSegmentCoord["type"] ; } } ParsingState */

//   /** @typedef {{ commands: readonly GpsbSplineSegmentCoord[] ; } } S2 */

//   return (
//     (Array.from((
//       reiterableBy(/** @satisfies {() => Iterable<{ type: "input-char", value: string ; } | { type: "apply-setting" } > } */ (function * () {
//         ;
        
//         for (const [token, charIndex] of (
//           Array.from(pathData )
//           .map((chr, i) => /** @type {[String, (ReadonlyArray<unknown>)["length"] ]} */ ([chr, i]) )
//         ) )
//         { yield { type: "input-char", value: token } ; }

//         yield { type: "apply-setting" } ;
//       }) )
//     )) )
//     .reduce((
//       /**
//        * @param {ParsingState} prevState
//        *  */
//       (prevState, c) => {
//         ;

//         const U = /** @type {(opts: { lU: (a: string) => string ; lastCmd: (ParsingState["lastCmd"] & {}) ; } ) => ParsingState } */ ({ lU: tokenBy, lastCmd }) => ({
//           buffer: (
//             prevState.buffer
//             .map((v, i, s) => (
//               (i + 1 === s.length ) ?
//               tokenBy(v) : v
//             ))
//           ) ,
//           lastCmd: lastCmd ,
//         }) ;
//         const A = /** @type {(opts: { lU: () => string ; lastCmd: (ParsingState["lastCmd"] & {}) ; } ) => ParsingState } */ ({ lU: tokenBy, lastCmd }) => ({
//           buffer: (
//             prevState.buffer
//             .concat([tokenBy() ])
//           ) ,
//           lastCmd: lastCmd ,
//         }) ;

//         const throwUnexpectedInputException = () => athrow(`unexpected input`) ;
        
//         const throwLogicTodoException = () => athrow(`TODO`) ;
        
//         if (c.type === "input-char" ) {
//           const { value: token, } = c ;

//           const { lastCmd: precedingCmd = false, buffer: lastBuffer, } = prevState ;

//           if (numericChars.indexOf(token) > -1) {
//             ;
//             ;
//             if (numericChars.indexOf(token) > -1) {
//               return U({ lU: s => (s + token) , lastCmd: throwLogicTodoException() }) ;
//             }
//             if (signChars.indexOf(token) > -1)
//             {
//               // if (!command.type && !this.commands.length) {
//               //     command.type = 'L';
//               // }

//               const cmdt = precedingCmd || (
//                 // TODO 'this.commands.length'
//                 false && "L"
//               ) ;

//               if (token === '-') {
//                   if (!cmdt || lastBuffer.indexOf('-') > 0) {
//                       return throwUnexpectedInputException() ;
//                   } else if (lastBuffer.length) {
//                       return A({ lU: () => '-', lastCmd: throwLogicTodoException() }) ;
//                   } else {
//                       return U({ lU: _ => token, lastCmd: throwLogicTodoException() }) ;
//                   }
//               } else {
//                   if (!cmdt || lastBuffer.length > 0) {
//                       return throwUnexpectedInputException() ;
//                   } else {
//                       return prevState ;
//                   }
//               }
//             }
//             // if (supportedCommands.indexOf(token) > -1) {
//             //     if (command.type) {
//             //         applyCommand.apply(this);
//             //         command = { type: token };
//             //     } else {
//             //         command.type = token;
//             //     }
//             // }
//             // if (unsupportedCommands.indexOf(token) > -1) {
//             //   // TODO: try to interpolate commands not directly supported?
//             //   return athrow(`Unsupported path command: ${token }. Currently supported commands are ${supportedCommands.split('').join(', ') }.`) ;
    
//             //   ;
//             // }
//             if (' ,\t\n\r\f\v'.indexOf(token) > -1) {
//               return (
//                 A({ lU: () => '', lastCmd: throwLogicTodoException() })
//               ) ;
    
//               ;
//             }
//             if (token === '.') {
//                 if (!precedingCmd || lastBuffer.indexOf(token) > -1) {
//                     return throwUnexpectedInputException() ;
//                 } else {
//                   return U({ lU: s => (s + token) , lastCmd: throwLogicTodoException() }) ;
//                 }
//             }
//             {
//               return throwUnexpectedInputException() ;
//             }
//           }
//         }

//         return athrow(`illegal character`) ;
//       }
//     ) , /** @satisfies {ParsingState} */ (athrow() ) )
//   ) ;
// } ;

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
  }
}

const GpsbSvgDPredef = (() => {
  ;

  // TODO: a generator function could possibly increase performance and reduce memory usage,
  // but our current build process doesn't allow to use those yet.
  const numericChars = Array.from('0123456789') ;
  const supportedCommands = Array.from('MmLlQqCcZzHhVv') ;
  const unsupportedCommands = Array.from('SsTtAa') ;
  const signChars = Array.from('-+') ;

  return {
    //
    numericChars ,
    supportedCommands ,
    unsupportedCommands ,
    signChars ,

  } ;
})() ;

/**
 * Sets the path data from an SVG path element or path notation
 * 
 * @type {(this: this, ...args: Parameters<typeof GPolySplineDesc.fromSVG > ) => this }
 */
GPolySplineBuffer.prototype.fromSVG = function(pathDataArg, options = {}) {
    /** @type {string} */
    const pathData = pathDataFromArg(pathDataArg) ;

    // set/merge default options
    options = createSVGParsingOptions(options);

    this.commands = [];

    // TODO: a generator function could possibly increase performance and reduce memory usage,
    // but our current build process doesn't allow to use those yet.

    const {
      numericChars ,
      signChars ,
      supportedCommands ,
      unsupportedCommands ,
    } = GpsbSvgDPredef ;

    /** @typedef {readonly string[] } XCmFCs */

    let command = {};
    /** @type { XCmFCs } */
    let buffer = [''];

    /**
     * copy-on-write-add it as a new item, at the end, of the list.
     * @type { (addend: (typeof buffer)[number] ) => void }
     */
    const appendIntoBuffer = (token) => {
      buffer = [...buffer , token ] ;
    } ;
    /**
     * like {@link replaceLastItemOfBuffer} but here prepends the existing item, not totally replace ;
     * `[z, c, moveTo]` becomes `[z, c, moveTo<<Cubic>>]`
     * 
     * @type { (addend: (typeof buffer)[number] ) => void }
     */
    const complaceLastItemOfBuffer = (token) => {
      buffer = [...buffer.slice(0, buffer.length + -1 ) , buffer[buffer.length + -1 ] + token ] ;
    } ;
    /**
     * copy-on-write-replace the last item of the list ;
     * `[z, c, moveTo]` becomes `[z, c, <<Cubic>>]`
     * 
     * @type { (addend: (typeof buffer)[number] ) => void }
     */
    const replaceLastItemOfBuffer = (token) => {
      buffer = [...buffer.slice(0, buffer.length + -1 ) , token ] ;
    } ;

    let metUnexpected = false;

    /** @satisfies {(...args: [XCmFCs ] ) => unknown } */
    const parseBuffer = function (buffer) {
        return buffer.filter(b => b.length).map(b => {
            let float = parseFloat(b);
            if (options.decimalPlaces || options.decimalPlaces === 0) {
                float = roundDecimal(float, options.decimalPlaces);
            }
            return float;
        });
    } ;
    
    /** @satisfies {(this: GPolySplineBuffer, ...args: [Array<any> ] ) => unknown } */
    const makeRelative = function (buffer) {
        if (!this.commands.length) {
            return buffer;
        }
        const lastCommand = this.commands[this.commands.length - 1] ?? athrow() ;
        for (let i = 0; i < buffer.length; i++) {
            buffer[i] += lastCommand[i & 1 ? 'y' : 'x'];
        }
        return buffer;
    } ;

    /** @satisfies {(this: GPolySplineBuffer, ...args: [] ) => unknown } */
    const applyCommand = function () {
        // ignore empty commands
        if (command.type === undefined) {
            return;
        }

        /* see https://github.com/microsoft/TypeScript/pull/46266 and https://github.com/microsoft/TypeScript/pull/47190 . */
        
        const cParsed = (/** @satisfies {(this: GPolySplineBuffer ) => (false | object ) } */ (function () {
            ;
                
            const commandType = command.type.toUpperCase();
            const relative = commandType !== 'Z' && command.type.toUpperCase() !== command.type;
            let parsedBuffer = parseBuffer(buffer);
            buffer = [''];
            if (!parsedBuffer.length && commandType !== 'Z') {
                return false;
            }
            if (relative && commandType !== 'H' && commandType !== 'V') {
                parsedBuffer = makeRelative.apply(this, [parsedBuffer]);
            }
            
            return /** @type {{ relative: boolean ; } & ({ commandType: "Z" ; parsedBuffer: [] ; } | { commandType: "C" ; parsedBuffer: [number, number, number, number, number, number] ; } | { commandType: "Q" ; parsedBuffer: [number, number, number, number] ; } | { commandType: "M" | "L" ; parsedBuffer: [number, number] ; } | { commandType: "V" | "H" ; parsedBuffer: number[] ; }) } */ ({ 
                //
                commandType ,
                relative ,
                parsedBuffer ,
            }) ;
        })).apply(this ) ;
        if (!cParsed) { return ; }

        const {
            //
            commandType ,
            relative ,
            parsedBuffer ,
        } = cParsed ;

        const getLastCmd        = () => this.getLastCmd() ;
        const getLastXyOrZeroes = () => this.getLastXyOrZeroes() ;

        const { x: currentX, y: currentY, } = getLastXyOrZeroes() ;

        const throwSwcmdAssertionError = () => {
          return athrow(`[GPolySplineBuffer.fromSVG] [applyCommand] [switch (commandType) ] assertionFailed `) ;
        } ;
        switch (commandType) {
            /**
             * @todo
             * for consecutive `L`s the letter can be omitted, can't it?
             * 
             */
            case 'M':
                this.moveTo(...parsedBuffer);
                break; 
            case 'L':
                this.lineTo(...parsedBuffer);
                break;
            case 'V':
                // multiple values interpreted as consecutive commands
                for (let i = 0; i < parsedBuffer.length; i++) {
                    let offset = 0;
                    if (relative) {
                        offset = getLastXyOrZeroes().y ;
                    }
                    this.lineTo(currentX, (parsedBuffer[i] ?? throwSwcmdAssertionError() ) + offset);
                }
                break;
            case 'H':
                // multiple values interpreted as consecutive commands
                for (let i = 0; i < parsedBuffer.length; i++) {
                    let offset = 0;
                    if (relative) {
                        offset = getLastXyOrZeroes().x ;
                    }
                    this.lineTo((parsedBuffer[i] ?? throwSwcmdAssertionError() ) + offset, currentY);
                }
                break;
            case 'C':
                this.bezierCurveTo(...parsedBuffer);
                break;
            case 'Q':
                this.quadraticCurveTo(...parsedBuffer);
                break;
            case 'Z':
                if (this.commands.length < 1 || (this.getLastCmd() ).type !== 'Z') {
                    this.close();
                }
                break;
        }

        if (this.commands.length) {
            for (const prop in this.commands[this.commands.length - 1]) {
                if ((this.commands[this.commands.length - 1] ?? athrow() )[prop] === undefined) {
                    (this.commands[this.commands.length - 1] ?? athrow() )[prop] = 0;
                }
            }
        }
    } ;

    // const [token, i] of Array.from(pathData ).map((chr, i) => /** @type {const} */ ([chr, i]) )
    for (const [token, i] of (
      Array.from(pathData )
      .map((chr, i) => /** @type {const} */ ([chr, i]) )
    ) )
    {
      {
        const lastBuffer = buffer[buffer.length - 1] ?? athrow(`[GPolySplineBuffer.fromSVG] [lastBuffer] null-assertion failed`) ;

        if (numericChars.indexOf(token) > -1) {
          complaceLastItemOfBuffer(token ) ;
        } else if (signChars.indexOf(token) > -1) {
            if (!command.type && !this.commands.length) {
                command.type = 'L';
            }

            if (token === '-') {
                if (!command.type || lastBuffer.indexOf('-') > 0) {
                    metUnexpected = true;
                } else if (lastBuffer.length) {
                    appendIntoBuffer('-') ;
                } else {
                    replaceLastItemOfBuffer(token) ;
                }
            } else {
                if (!command.type || lastBuffer.length > 0) {
                    metUnexpected = true;
                } else {
                    continue;
                }
            }
        } else if (supportedCommands.indexOf(token) > -1) {
            if (command.type) {
                applyCommand.apply(this);
                command = { type: token };
            } else {
                command.type = token;
            }
        } else if (unsupportedCommands.indexOf(token) > -1) {
          // TODO: try to interpolate commands not directly supported?
          return athrow(`Unsupported path command: ${token }. Currently supported commands are ${supportedCommands.split('').join(', ') }.`) ;

          ;
        } else if (' ,\t\n\r\f\v'.indexOf(token) > -1) {
          appendIntoBuffer('') ;

          ;
        } else if (token === '.') {
            if (!command.type || lastBuffer.indexOf(token) > -1) {
                metUnexpected = true;
            } else {
                complaceLastItemOfBuffer(token ) ;
            }
        } else {
            metUnexpected = true;
        }

        if (metUnexpected) {
          return athrow(`unexpected character '${token }' (at offset ${i })`) ;
        }
      }
    }
    applyCommand.apply(this);

    if (options.optimize) {
        this.commands = optimizeCommands(this.commands);
    }

    const flipY = options.flipY;
    let flipYBase = options.flipYBase;
    if (flipY === true && options.flipYBase === undefined) {
        const boundingBox = this.getBoundingBox();
        flipYBase = boundingBox.y1 + boundingBox.y2;
    }
    // apply x/y offset, flipping and scaling
    for (const i in this.commands) {
        const cmd = this.commands[i];
        for (const prop in cmd) {
            if (['x', 'x1', 'x2'].includes(prop)) {
                (this.commands[i] ?? athrow() )[prop] = options.x + cmd[prop] * options.scale;
            } else if (['y', 'y1', 'y2'].includes(prop)) {
              (this.commands[i] ?? athrow() )[prop] = options.y + (flipY ? flipYBase - cmd[prop] : cmd[prop]) * options.scale;
            }
        }
    }

    return this;
};

/**
 * Generates a new GPolySplineBuffer() from an SVG path element or path notation
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
 * @param  {BoundingBox | ((GPolySplineBuffer | GpsbSplineSegmentCoord[] ) & Record<keyof (GPolySplineBuffer & GpsbSplineSegmentCoord[]) , unknown > ) } pathOrCommands - another opentype.GPolySplineBuffer, an opentype.BoundingBox, or an array of commands.
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
 * @returns {BoundingBox}
 */
GPolySplineBuffer.prototype.getBoundingBox = function() {
    const box = new BoundingBox();

    let startX = 0;
    let startY = 0;
    let prevX = 0;
    let prevY = 0;
    for (let i = 0; i < this.commands.length; i++) {
        const cmd = this.commands[i] ?? athrow() ;
        switch (cmd.type) {
            case 'M':
                box.addPoint(cmd.x, cmd.y);
                startX = prevX = cmd.x;
                startY = prevY = cmd.y;
                break;
            case 'L':
                box.addPoint(cmd.x, cmd.y);
                prevX = cmd.x;
                prevY = cmd.y;
                break;
            case 'Q':
                box.addQuad(prevX, prevY, cmd.x1, cmd.y1, cmd.x, cmd.y);
                prevX = cmd.x;
                prevY = cmd.y;
                break;
            case 'C':
                box.addBezier(prevX, prevY, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
                prevX = cmd.x;
                prevY = cmd.y;
                break;
            case 'Z':
                prevX = startX;
                prevY = startY;
                break;
            default:
                throw new Error('Unexpected path command ' + (
                  JSON.stringify(cmd)
                ));
        }
    }
    if (box.isEmpty()) {
        box.addPoint(0, 0);
    }
    return box;
};

/**
 * Draw the path to a 2D context.
 * @param {CanvasRenderingContext2D} ctx - A 2D drawing context.
 */
GPolySplineBuffer.prototype.draw = function(ctx) {
    ctx.beginPath();
    for (let i = 0; i < this.commands.length; i += 1) {
        const cmd = this.commands[i] ?? athrow(`assertion failed`) ;
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
 * Convert the GPolySplineBuffer to a string of path data instructions
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
          decimalPlaces = athrow(`'[GPolySplineBuffer.toPathData] [floatToString] [rounded] assertion failed: options.decimalPlaces not defined'`)
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
    } else {
        // @ts-expect-error
        flipYBase = Number.NaN ;
    }
    let d = '';
    for (let i = 0; i < commandsCopy.length; i += 1) {
        const cmd = commandsCopy[i] ?? athrow(`assertion failed`) ;
        if (cmd.type === 'M') {
            d += 'M' + packValues(
                cmd.x,
                flipY ? flipYBase - cmd.y : cmd.y
            );
        } else if (cmd.type === 'L') {
            d += 'L' + packValues(
                cmd.x,
                flipY ? flipYBase - cmd.y : cmd.y
            );
        } else if (cmd.type === 'C') {
            d += 'C' + packValues(
                cmd.x1,
                flipY ? flipYBase - cmd.y1 : cmd.y1,
                cmd.x2,
                flipY ? flipYBase - cmd.y2 : cmd.y2,
                cmd.x,
                flipY ? flipYBase - cmd.y : cmd.y
            );
        } else if (cmd.type === 'Q') {
            d += 'Q' + packValues(
                cmd.x1,
                flipY ? flipYBase - cmd.y1 : cmd.y1,
                cmd.x,
                flipY ? flipYBase - cmd.y : cmd.y
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
  let svg = '<path d="';
  svg += pathData;
  svg += '"';
  if (this.fill !== undefined && this.fill !== 'black') {
      if (this.fill === null) {
          svg += ' fill="none"';
      } else {
          svg += ' fill="' + this.fill + '"';
      }
  }

  if (this.stroke) {
      svg += ' stroke="' + this.stroke + '" stroke-width="' + this.strokeWidth + '"';
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
