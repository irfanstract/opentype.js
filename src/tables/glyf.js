// The `glyf` table describes the glyphs in TrueType outline format.
// https://learn.microsoft.com/en-us/typography/opentype/spec/glyf

import { athrow, assertionFail } from '../athrow.mjs';
import * as check from '../check.js';
import { reiterableBy, arrayByGenerator } from '../itertools.mjs';
import glyphset, { OtjsTtGlyphCbk, } from '../glyphset.js';
import parse, { Parser } from '../parse.js';
import Path from '../path.js';
import { EcdTable, } from '../table.js';

// 
/**
 * Parse the coordinate data for a glyph.
 * 
 * @param {Parser} p 
 * @param {Uint32Array[number] } flag
 * @param {number } previousValue
 * @param {Uint32Array[number] } shortVectorBitMask
 * @param {Uint32Array[number] } sameBitMask
 * 
 */
function parseGlyphCoordinate(p, flag, previousValue, shortVectorBitMask, sameBitMask) {
    let v;
    if ((flag & shortVectorBitMask) > 0) {
        // The coordinate is 1 byte long.
        v = p.parseByte();
        // The `same` bit is re-used for short values to signify the sign of the value.
        if ((flag & sameBitMask) === 0) {
            v = -v;
        }

        v = previousValue + v;
    } else {
        //  The coordinate is 2 bytes long.
        // If the `same` bit is set, the coordinate is the same as the previous coordinate.
        if ((flag & sameBitMask) > 0) {
            v = previousValue;
        } else {
            // Parse the coordinate as a signed 16-bit delta value.
            v = previousValue + p.parseShort();
        }
    }

    return v;
}

/**
 * pulls the next few bytes and interpret them as `glyf`-Header:
 * 
 * ```
 * 1) Int16           : numberOfContours
 * 2) Int16 , Int16   : xMin, yMin
 * 3) Int16 , Int16   : xMax, yMax
 * ```
 * 
 * @see https://learn.microsoft.com/en-us/typography/opentype/spec/glyf#glyph-headers 
 * 
 * @param {Parser } p
 */
function parseGlyfHeader(p)
{
  ;
  const numberOfContours = p.parseShort();
  const xMin = p.parseShort();
  const yMin = p.parseShort();
  const xMax = p.parseShort();
  const yMax = p.parseShort();
  return /** @type {const} */ ({
      numberOfContours ,
      xMin,
      yMin,
      xMax,
      yMax,
  }) ;
}

/**
 * constructs `glyf`-Header from the given struct
 * 
 * @param {ReturnType<typeof parseGlyfHeader > & {} } d
 * 
 */
function makeGlyfHeadEcdTable(d)
{
  /* note: `Int16` specified as `USHORT` until there's one for signed ones */
  return arrayByGenerator(/** @satisfies {() => Generator<KtOtjsAttribDesc >} */ (function* () {
    ;
    yield { name: "numberOfContours", type: "USHORT", value: d.numberOfContours } ;

    for (const k of /** @satisfies {(keyof typeof d)[] } */ (["xMin", "yMin", "xMax", "yMax"]) ) {
      yield { name: k, type: "USHORT", value: d[k], } ;
    }
  }) ) ;
}

/**
 * assumes {@link parseGlyfHeader} was just done, and that the following block represents "simple glyph" data ;
 * parse accordingly
 * 
 * @see https://learn.microsoft.com/en-us/typography/opentype/spec/glyf#table-organization  
 * 
 */
const parseInGlyfTtSimpleGlyphData = (() => {
    return /** @param {[Parser, { numberOfContours: Number, }] } args */ (...[p, { numberOfContours, } ]) => {
        ;
        
        // for (let i = 0; i < glyph.numberOfContours; i += 1) {
        //     endPointIndices.push(p.parseUShort());
        // }
        const endPointIndices = (
            arrayByGenerator(function* () {
              for (let i = 0; i < numberOfContours; i += 1) {
                  yield p.parseUShort() ;
              }
            } )
        ) ;
  
        const instructionLength = p.parseUShort();
        const instructions = (
          arrayByGenerator(function* () {
            for (let i = 0; i < instructionLength; i += 1) {
                yield p.parseByte() ;
            }
          } )
        ) ;
  
        const numberOfCoordinates = endPointIndices[endPointIndices.length - 1] + 1;
  
        const flags = arrayByGenerator(function* () {
          ;
          for (let i = 0; i < numberOfCoordinates; i += 1) {
            const flag = p.parseByte();
            yield flag ;

            /* If bit 3 is set, we repeat this flag n times, where n is the next byte. */
            if ((flag & simpleGlyphBitFlags.REPEAT_FLAG) > 0) {
                const repeatCount = p.parseByte();
                for (let j = 0; j < repeatCount; j += 1) {
                    yield flag ;
                    i += 1;
                }
            }
          }
        } ) ;
  
        check.argument(flags.length === numberOfCoordinates, 'flags length and points count disagrees.');

        const { points, } = (/** @satisfies {() => { points: readonly {}[] }} */ (() => {
            ;

            /** @class */
            function MutableTtPoint() {
                /** @type { number } */ this.x ;
                /** @type { number } */ this.y ;
                /** @type {boolean} */ this.onCurve ;
                /** @type {boolean} */ this.lastPointOfContour ;
            }

            if (endPointIndices.length > 0) {
                /** @type {ReadonlyArray<MutableTtPoint> } */
                let points = [];
                let point;
                // X/Y coordinates are relative to the previous point, except for the first point which is relative to 0,0.
                if (numberOfCoordinates > 0) {
                    for (let i = 0; i < numberOfCoordinates; i += 1) {
                        const flag = flags[i] ?? athrow() ;
                        const point = new MutableTtPoint ;
                        point.onCurve = !!(flag & 1);
                        point.lastPointOfContour = endPointIndices.indexOf(i) >= 0;
                        points = [...points, point ] ;
                    }
    
                    let px = 0;
                    for (let i = 0; i < numberOfCoordinates; i += 1)
                    {
                        const flag = flags[i] ?? athrow() ;
                        const point = points[i] ?? athrow() ;
                        point.x = parseGlyphCoordinate(p, flag, px, 2, 16);
                        px = point.x;
                    }
    
                    let py = 0;
                    for (let i = 0; i < numberOfCoordinates; i += 1)
                    {
                        const flag = flags[i] ?? athrow() ;
                        const point = points[i] ?? athrow() ;
                        point.y = parseGlyphCoordinate(p, flag, py, 4, 32);
                        py = point.y;
                    }
                }
    
                return { points, } ;
            } else {
                return { points: [] } ;
            }
        }) )() ;

        return {
            numberOfContours ,
            endPointIndices ,
            instructionLength ,
            instructions ,
            numberOfCoordinates ,
            flags ,
            points ,
        } ;
        ;
    } ;
})() ;

/**
 * Parse a TrueType glyph.
 * 
 * https://learn.microsoft.com/en-us/typography/opentype/spec/glyf#table-organization 
 * 
 * @type {OtjsTtGlyphCbk }
 * 
 */
function parseGlyph(glyph, data, start) {
    const p = new parse.Parser(data, start);

    const glyfHeaParsed = parseGlyfHeader(p) ;

    glyph.numberOfContours = glyfHeaParsed.numberOfContours ;
    glyph._xMin = glyfHeaParsed.xMin;
    glyph._yMin = glyfHeaParsed.yMin;
    glyph._xMax = glyfHeaParsed.xMax;
    glyph._yMax = glyfHeaParsed.yMax;

    let flags;
    let flag;

    if (glyph.numberOfContours > 0) {
        /* This glyph is not a composite. */

        const {
            endPointIndices ,
            instructionLength ,
            instructions ,
            numberOfCoordinates ,
            flags ,
            points ,
        } = (
            parseInGlyfTtSimpleGlyphData(p, { numberOfContours: glyfHeaParsed.numberOfContours } )
        ) ;

        glyph.endPointIndices = endPointIndices ;
        glyph.instructionLength = instructionLength ;
        glyph.instructions = instructions ;

        glyph.points = [...points ] ;

        // // for (let i = 0; i < glyph.numberOfContours; i += 1) {
        // //     endPointIndices.push(p.parseUShort());
        // // }
        // const endPointIndices = glyph.endPointIndices = (
        //   arrayByGenerator(function* () {
        //     for (let i = 0; i < glyph.numberOfContours; i += 1) {
        //         yield p.parseUShort() ;
        //     }
        //   } )
        // ) ;

        // glyph.instructionLength = p.parseUShort();
        // glyph.instructions = (
        //   arrayByGenerator(function* () {
        //     for (let i = 0; i < glyph.instructionLength; i += 1) {
        //         yield p.parseByte() ;
        //     }
        //   } )
        // ) ;

        // const numberOfCoordinates = endPointIndices[endPointIndices.length - 1] + 1;

        // flags = arrayByGenerator(function* () {
        //   ;
        //   for (let i = 0; i < numberOfCoordinates; i += 1) {
        //     flag = p.parseByte();
        //     yield flag ;

        //     /* If bit 3 is set, we repeat this flag n times, where n is the next byte. */
        //     if ((flag & simpleGlyphBitFlags.REPEAT_FLAG) > 0) {
        //         const repeatCount = p.parseByte();
        //         for (let j = 0; j < repeatCount; j += 1) {
        //             yield flag ;
        //             i += 1;
        //         }
        //     }
        //   }
        // } ) ;

        // check.argument(flags.length === numberOfCoordinates, 'flags length and points count disagrees.');

        // if (endPointIndices.length > 0) {
        //     const points = [];
        //     let point;
        //     // X/Y coordinates are relative to the previous point, except for the first point which is relative to 0,0.
        //     if (numberOfCoordinates > 0) {
        //         for (let i = 0; i < numberOfCoordinates; i += 1) {
        //             flag = flags[i];
        //             point = {};
        //             point.onCurve = !!(flag & 1);
        //             point.lastPointOfContour = endPointIndices.indexOf(i) >= 0;
        //             points.push(point);
        //         }

        //         let px = 0;
        //         for (let i = 0; i < numberOfCoordinates; i += 1) {
        //             flag = flags[i];
        //             point = points[i];
        //             point.x = parseGlyphCoordinate(p, flag, px, 2, 16);
        //             px = point.x;
        //         }

        //         let py = 0;
        //         for (let i = 0; i < numberOfCoordinates; i += 1) {
        //             flag = flags[i];
        //             point = points[i];
        //             point.y = parseGlyphCoordinate(p, flag, py, 4, 32);
        //             py = point.y;
        //         }
        //     }

        //     glyph.points = points;
        // } else {
        //     glyph.points = [];
        // }
    } else if (glyph.numberOfContours === 0) {
        glyph.points = [];
    } else {
        glyph.isComposite = true;
        glyph.points = [];
        glyph.components = [];
        let moreComponents = true;
        while (moreComponents) {
            flags = p.parseUShort() ?? athrow(`parse failed (parsing 'flags')`) ;
            const component = {
                glyphIndex: p.parseUShort(),
                xScale: 1,
                scale01: 0,
                scale10: 0,
                yScale: 1,
                dx: 0,
                dy: 0
            };
            if ((flags & compoundGlyphBitFlags.ARG_1_AND_2_ARE_WORDS) > 0) {
                // The arguments are words
                if ((flags & compoundGlyphBitFlags.ARGS_ARE_XY_VALUES) > 0) {
                    // values are offset
                    component.dx = p.parseShort();
                    component.dy = p.parseShort();
                } else {
                    // values are matched points
                    component.matchedPoints = [p.parseUShort(), p.parseUShort()];
                }

            } else {
                // The arguments are bytes
                if ((flags & compoundGlyphBitFlags.ARGS_ARE_XY_VALUES) > 0) {
                    // values are offset
                    component.dx = p.parseChar();
                    component.dy = p.parseChar();
                } else {
                    // values are matched points
                    component.matchedPoints = [p.parseByte(), p.parseByte()];
                }
            }

            if ((flags & compoundGlyphBitFlags.WE_HAVE_A_SCALE) > 0) {
                // We have a scale
                component.xScale = component.yScale = p.parseF2Dot14();
            } else if ((flags & compoundGlyphBitFlags.WE_HAVE_AN_X_AND_Y_SCALE) > 0) {
                // We have an X / Y scale
                component.xScale = p.parseF2Dot14();
                component.yScale = p.parseF2Dot14();
            } else if ((flags & compoundGlyphBitFlags.WE_HAVE_A_TWO_BY_TWO) > 0) {
                // We have a 2x2 transformation
                component.xScale = p.parseF2Dot14();
                component.scale01 = p.parseF2Dot14();
                component.scale10 = p.parseF2Dot14();
                component.yScale = p.parseF2Dot14();
            }

            glyph.components.push(component);
            moreComponents = !!(flags & compoundGlyphBitFlags.MORE_COMPONENTS );
        }
        if (flags & compoundGlyphBitFlags.WE_HAVE_INSTRUS ) {
            // We have instructions
            glyph.instructionLength = p.parseUShort();
            glyph.instructions = [];
            for (let i = 0; i < glyph.instructionLength; i += 1) {
                glyph.instructions.push(p.parseByte());
            }
        }
    }
}

// const parseInGlyfTtSimpleGlyphData = (() => {
//     return /** @param {[Parser, { numberOfContours: Number, }] } args */ (...[p, { numberOfContours, } ]) => {
//         ;
// const parseInGlyfTtCompoundGlyphData = (() => {
//     ;
//     class MutableComponentInfo {
//         constructor() {
//             ;
//             /** @type {KtOtjsI } */ this.glyphIndex ;
//             /** @type {number } */ this.xScale ;
//             /** @type {number } */ this.scale01 ;
//             /** @type {number } */ this.scale10 ;
//             /** @type {number } */ this.yScale ;
//             /** @type {number } */ this.dx ;
//             /** @type {number } */ this.dy ;
//         }
//     }
//     return /** @param {[Parser, { numberOfContours: Number, }] } args */ function ParseInGlyfTtCompoundGlyphData(...[p]) {
//         ;
//     } ;
// })() ;

const simpleGlyphBitFlags = /** @type {const} */ ({
    ON_CURVE_POINT: 1 ,
    X_SHORT_VEC: 2 ,
    Y_SHORT_VEC: 0x4 ,
    REPEAT_FLAG: 0x8 ,
    X_IS_SAME_OR_POSITIVE_X_SHORT_VEC: 0x10 ,
    Y_IS_SAME_OR_POSITIVE_X_SHORT_VEC: 0x20 ,
    OVERLAP_SIMPLE: 0x40 ,
}) ;

const compoundGlyphBitFlags = /** @type {const} */ ({
    ARG_1_AND_2_ARE_WORDS: 1 ,
    ARGS_ARE_XY_VALUES: 2 ,
    ROUND_XY_TO_GRID: 0x4 ,
    WE_HAVE_A_SCALE: 0x8 ,
    MORE_COMPONENTS: 0x20 ,
    WE_HAVE_AN_X_AND_Y_SCALE: 0x40 ,
    WE_HAVE_A_TWO_BY_TWO: 0x80 ,
    WE_HAVE_INSTRUS: 0x100 ,
    USE_MY_METRICS: 0x200 ,
    OVERLAP_COMPOUND: 0x400 ,
    SCALED_COMPONENT_OFFSET: 0x800 ,
    UNSCALED_COMPONENT_OFFSET: 0x1000 ,
}) ;

/**
 * Transform an array of points and return a new array.
 * 
 * @param {readonly OtjsTtCtp[] } points
 * @param {KtOtjsTransformMatrix2D } transform
 * 
 */
function transformPoints(points, transform) {
    return (
        points
        .map(pt => {
            ;
            const newPt = {
                x: transform.xScale * pt.x + transform.scale10 * pt.y + transform.dx,
                y: transform.scale01 * pt.x + transform.yScale * pt.y + transform.dy,
                onCurve: pt.onCurve,
                lastPointOfContour: pt.lastPointOfContour
            };
            return newPt ;
        })
    ) ;
}

/**
 * 
 * @param {readonly OtjsTtCtp[] } points
 * 
 */
function getContours(points) {
    const contours = [];
    let currentContour = [];
    for (const pt of points ) {
        currentContour.push(pt);
        if (pt.lastPointOfContour) {
            contours.push(currentContour);
            currentContour = [];
        }
    }

    check.argument(currentContour.length === 0, `there are still points left in the current contour. check your input. ${JSON.stringify({ currentContour }) } `);
    return contours;
}

/**
 * Convert the TrueType glyph outline to a {@link Path}.
 * 
 * @param {readonly OtjsTtCtp[] } points
 * 
 */
function getPath(points) {
    const p = new Path();
    if (!points) {
        return p;
    }

    const contours = getContours(points);

    for (const [contourIndex, contour] of contours.entries() )
    {

        let curr = contour[contour.length - 1] ?? athrow() ;
        let next = contour[0] ?? athrow() ;

        if (curr.onCurve) {
            p.moveTo(curr.x, curr.y);
        } else {
            if (next.onCurve) {
                p.moveTo(next.x, next.y);
            } else {
                // If both first and last points are off-curve, start at their middle.
                const start = {x: (curr.x + next.x) * 0.5, y: (curr.y + next.y) * 0.5};
                p.moveTo(start.x, start.y);
            }
        }

        for (let i = 0; i < contour.length; ++i) {
            curr = next;
            next = contour[(i + 1) % contour.length] ?? athrow() ;

            if (curr.onCurve) {
                // This is a straight line.
                p.lineTo(curr.x, curr.y);
            } else {
                let next2 = next;

                if (!next.onCurve) {
                    next2 = { x: (curr.x + next.x) * 0.5, y: (curr.y + next.y) * 0.5 };
                }

                p.quadraticCurveTo(curr.x, curr.y, next2.x, next2.y);
            }
        }

        p.closePath();
    }
    return p;
}

function buildPath(glyphs, glyph) {
    if (glyph.isComposite) {
        for (let j = 0; j < glyph.components.length; j += 1) {
            const component = glyph.components[j];
            const componentGlyph = glyphs.get(component.glyphIndex);
            // Force the ttfGlyphLoader to parse the glyph.
            componentGlyph.getPath();
            if (componentGlyph.points) {
                let transformedPoints;
                if (component.matchedPoints === undefined) {
                    // component positioned by offset
                    transformedPoints = transformPoints(componentGlyph.points, component);
                } else {
                    // component positioned by matched points
                    if ((component.matchedPoints[0] > glyph.points.length - 1) ||
                        (component.matchedPoints[1] > componentGlyph.points.length - 1)) {
                        return athrow(`Matched points out of range in ${glyph.name}`);
                    }
                    const firstPt = glyph.points[component.matchedPoints[0]];
                    let secondPt = componentGlyph.points[component.matchedPoints[1]];
                    const transform = {
                        xScale: component.xScale, scale01: component.scale01,
                        scale10: component.scale10, yScale: component.yScale,
                        dx: 0, dy: 0
                    };
                    secondPt = transformPoints([secondPt], transform)[0];
                    transform.dx = firstPt.x - secondPt.x;
                    transform.dy = firstPt.y - secondPt.y;
                    transformedPoints = transformPoints(componentGlyph.points, transform);
                }
                glyph.points = glyph.points.concat(transformedPoints);
            }
        }
    }

    return getPath(glyph.points);
}

function parseGlyfTableAll(data, start, loca, font) {
    const glyphs = new glyphset.GlyphSet(font);

    // The last element of the loca table is invalid.
    for (let i = 0; i < loca.length - 1; i += 1) {
        const offset = loca[i];
        const nextOffset = loca[i + 1];
        if (offset !== nextOffset) {
            glyphs.push(i, glyphset.ttfGlyphLoader(font, i, parseGlyph, data, start + offset, buildPath));
        } else {
            glyphs.push(i, glyphset.glyphLoader(font, i));
        }
    }

    return glyphs;
}

function parseGlyfTableOnLowMemory(data, start, loca, font) {
    const glyphs = new glyphset.GlyphSet(font);

    font._push = function(i) {
        const offset = loca[i];
        const nextOffset = loca[i + 1];
        if (offset !== nextOffset) {
            glyphs.push(i, glyphset.ttfGlyphLoader(font, i, parseGlyph, data, start + offset, buildPath));
        } else {
            glyphs.push(i, glyphset.glyphLoader(font, i));
        }
    };

    return glyphs;
}

// Parse all the glyphs according to the offsets from the `loca` table.
function parseGlyfTable(data, start, loca, font, opt) {
    if (opt.lowMemory)
        return parseGlyfTableOnLowMemory(data, start, loca, font);
    else
        return parseGlyfTableAll(data, start, loca, font);
}

export default { getPath, parse: parseGlyfTable};

/* for testing and refactoring */
export {
    parseGlyfHeader ,
    makeGlyfHeadEcdTable ,
} ;
