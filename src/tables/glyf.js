// The `glyf` table describes the glyphs in TrueType outline format.
// https://learn.microsoft.com/en-us/typography/opentype/spec/glyf

import { athrow, assertionFail } from '../athrow.mjs';
import * as check from '../check.js';
import { reiterableBy, arrayByGenerator } from '../itertools.mjs';
import glyphset, { GlyphSet, OtjsTtGlyphCbk, } from '../glyphset.js';
import parse, { Parser, OtjsPrsByteBuffer, } from '../parse.js';
import { encode, sizeOf } from '../types.js';
import { EcdTable, } from '../table.js';
import Path from '../path.js';

/**
 * @typedef {import('../glyph.js').default } Glyph
 */

// 

/**
 * Parse complete payload of `glyf` table - excluding the leading tag (`"glyf"`) -
 * starting from the `glyf`-Head block.
 * Parse a TrueType glyph descr.
 * 
 * https://learn.microsoft.com/en-us/typography/opentype/spec/glyf#table-organization 
 * 
 * @type {OtjsTtGlyphCbk }
 * 
 */
function initializeGlyphByParsingGlyfTablePayload(glyph, data, start)
{
    const p = new parse.Parser(data, start);

    const parsed = parseGlyfTablePayload(p) ;

    const { numberOfContours, type, } = parsed ;

    const glyfHeaParsed = parsed ;

    glyph.numberOfContours = numberOfContours ;
    glyph._xMin = glyfHeaParsed.xMin;
    glyph._yMin = glyfHeaParsed.yMin;
    glyph._xMax = glyfHeaParsed.xMax;
    glyph._yMax = glyfHeaParsed.yMax;

    if (0 < type) {
        ;/* Simple Glyph. */;

        check.assert(type === 1 , "" ) ;

        const {
            endPointIndices ,
            instructionLength ,
            instructions ,
            numberOfCoordinates ,
            flags ,
            points ,
        } = parsed ;
        
        glyph.endPointIndices = endPointIndices ;
        glyph.instructionLength = instructionLength ;
        glyph.instructions = instructions ;

        glyph.points = [...points ] ;

        ;
    }
    if (type === 0 ) {
        ;/* Empty Glyph. */;

        glyph.points = [] ;
    }
    if (type < 0 ) {
        ;/* Compound Glyph. */;

        check.assert(type === -1, ``) ;

        glyph.isComposite = true;
        glyph.points = [];
        {
            const {
                components ,
                instructionLength ,
                instructions ,
            } = parsed ;
            glyph.components = (
                [...components ]
                .map(c0 => /** @satisfies {({} & (typeof glyph.components) )[Number] } */ ({
                    glyphIndex: c0.referredGlyphIndex ,
                    ...c0.transform ,
                    matchedPoints: c0.matchedPoints ,
                } ) )
            ) ;
            instructionLength?.toFixed && (glyph.instructionLength = instructionLength) ;
            instructions && (glyph.instructions = [...instructions ]) ;
        }
    }
}

/**
 * Parse complete payload of `glyf` table - excluding the leading tag (`"glyf"`) -
 * starting from the `glyf`-Head block.
 * Parse a TrueType glyph descr.
 * 
 * https://learn.microsoft.com/en-us/typography/opentype/spec/glyf#table-organization 
 * 
 * @param {[Parser, {}? ] } args
 * 
 */
function parseGlyfTablePayload(...[p])
{

    const glyfHeaParsed = parseGlyfHeader(p) ;

    const { numberOfContours, } = glyfHeaParsed ;

    if (numberOfContours > 0)
    {
        /* a TT Simple Glyph */

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

        return /** @type {const } */({
            type: SpclParsedGlyphType.SIMPLE ,
            ...glyfHeaParsed ,
            numberOfContours ,
            endPointIndices ,
            instructionLength ,
            instructions ,
            numberOfCoordinates ,
            flags ,
            points ,
        }) ;

        ;
    }
    if (numberOfContours === 0 ) {
        return /** @type {const } */({
            type: SpclParsedGlyphType.EMPTY ,
            ...glyfHeaParsed ,
            numberOfContours ,
            points: [] ,
        }) ;
    }
    if (numberOfContours < 0 )
    {
        /* a TT Composite Glyph */
        ;
        const {
            components ,
            instructionLength ,
            instructions ,
        } = parseInGlyfTtCompoundGlyphData(p, { numberOfContours: glyfHeaParsed.numberOfContours, } ) ;

        return /** @type {const } */ ({
            type: SpclParsedGlyphType.COMPOUND ,
            ...glyfHeaParsed ,
            numberOfContours ,
            components ,
            instructionLength ,
            instructions ,
        }) ;
    }

    return assertionFail(JSON.stringify({ numberOfContours, glyfHeaParsed, p, })) ;
}

/**
 * @enum {(typeof SpclParsedGlyphType) extends infer S ? S[keyof S] : never }
 */
const SpclParsedGlyphType = /** @type {const } */ ({
    EMPTY: 0 ,
    SIMPLE: 1 ,
    COMPOUND: -1 ,
}) ;

/* // the primitives ///////////////////////////////// */

/**
 * Parse the coordinate data for a glyph.
 * 
 * flags are necessary to determine/identify these aspects abt the actual encoding of this particular item,
 * with the other flags ignored:
 * - {@link simpleGlyphBitFlags.X_SHORT_VEC `IT_IS_SHORT_VECTOR` }
 * - `SAME_VALUE`
 * 
 * `prevValue` is necessary, since in `glyf` the coord values are each supposed to be relative to the preceding.
 * 
 * more information, on
 * "Simple Glyph Data" on https://learn.microsoft.com/en-us/typography/opentype/spec/glyf#table-organization  
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
        // The coordinate is 2 bytes long.
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
 * {@link encode encodes } as item of TT `xCoordinates` or  `yCoordinates`,
 * using given flags to determine whether `x` or `y` ;
 * essentially the inverse of {@link parseGlyphCoordinate} .
 * 
 * flags are necessary to determine/identify these aspects abt the actual encoding of this particular item,
 * with the other flags ignored:
 * - whether this is for `x` or for `y`
 * - {@link simpleGlyphBitFlags.X_SHORT_VEC `IT_IS_SHORT_VECTOR` }
 * 
 * `prevValue` is necessary, since in `glyf` the coord values are each supposed to be relative to the preceding.
 * 
 * more information, on
 * "Simple Glyph Data" on https://learn.microsoft.com/en-us/typography/opentype/spec/glyf#table-organization  
 * 
 * @param {[value: number, options: { prevValue: number, flags: KtOtjsN & number } ] } args
 */
function encodeGlyphCoordinate(...[absoluteValue, { flags, prevValue, }])
{
    ;
    /** @satisfies {"x" | "y" } */
    const dimension = (flags & (simpleGlyphBitFlags.Y_SHORT_VEC | simpleGlyphBitFlags.Y_IS_SAME_OR_POSITIVE_Y_SHORT_VEC) ) ? "y" : "x" ;

    const shortVecMode = (flags & (simpleGlyphBitFlags.X_SHORT_VEC | simpleGlyphBitFlags.Y_SHORT_VEC ) ) ;

    const relativeValue = absoluteValue - prevValue ;

    if (shortVecMode) {
        return encode.BYTE(relativeValue) ;
    }
    if (!shortVecMode) {
        return encode.SHORT(relativeValue) ;
    }
    return athrow(`error. ${JSON.stringify({ absoluteValue, relativeValue, shortVecMode, dimension, flags }) } `) ;
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

        const [xPositions = assertionFail(), yPositions = assertionFail() ] = (
            (/** @satisfies {{ shortVecNessBitMask: KtOtjsI, ttSameSignedNessMask: KtOtjsI }[] } */ ([
                { shortVecNessBitMask: simpleGlyphBitFlags.X_SHORT_VEC , ttSameSignedNessMask: simpleGlyphBitFlags.X_IS_SAME_OR_POSITIVE_X_SHORT_VEC },
                { shortVecNessBitMask: simpleGlyphBitFlags.Y_SHORT_VEC , ttSameSignedNessMask: simpleGlyphBitFlags.Y_IS_SAME_OR_POSITIVE_Y_SHORT_VEC } ,
            ]))
            .map(({ shortVecNessBitMask: svbm, ttSameSignedNessMask, }) => (
                arrayByGenerator(/** @return {Generator<Readonly<number> > } */ function* () {
                    ;
                    if (0 < endPointIndices.length ) {
                        ;
                        /* X/Y coordinates are relative to the previous point, except for the first point which is relative to 0,0. */
                        ;
                        let i = 0 ;
                        let px = 0 ;
                        LOOP:
                        for (; i < numberOfCoordinates; i += 1) {
                            ;
                            const flag = flags[i] ?? athrow() ;
                            const itemValue = parseGlyphCoordinate(p, flag, px, svbm, ttSameSignedNessMask ) ;
                            yield (px = itemValue) ;
                        }
                    }
                } )
            ) )
        ) ;
        
        /** @class */
        function MutableTtPoint() {
            /** @type { number } */ this.x ;
            /** @type { number } */ this.y ;
            /** @type {boolean} */ this.onCurve ;
            /** @type {boolean} */ this.lastPointOfContour ;
        }

        const { points, } = (/** @satisfies {() => { points: readonly {}[] }} */ (() => {
            ;

            if (endPointIndices.length > 0) {
                /** @type {ReadonlyArray<MutableTtPoint> } */
                let points = [];

                if (numberOfCoordinates > 0) {
                    for (let i = 0; i < numberOfCoordinates; i += 1) {
                        const flag = flags[i] ?? athrow() ;
                        const x = xPositions[i] ?? athrow() ;
                        const y = yPositions[i] ?? athrow() ;
                        const point = /** @satisfies {Readonly<MutableTtPoint> } */ ({
                            onCurve: !!(flag & simpleGlyphBitFlags.ON_CURVE_POINT ) ,
                            lastPointOfContour: endPointIndices.indexOf(i) >= 0 ,
                            x, y,
                        }) ;
                        points = [...points, point ] ;
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
 * 
 * WIP/TODO
 * 
 * @deprecated a WIP (work-in-progress)
 * 
 * @param {Iterable<import('../svgPathDataRepr.mjs').GpsbSplineSegmentCoord> } d
 */
/* https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/length */
function makeGlyfForTtSimpleGlyphByPathSegArray(d)
{
    ;
    return athrow(`TODO`) ;
}

/**
 * 
 * WIP/TODO
 * 
 * given a 2-dimensional-array of `{ x, y, offCurve: boolean ; }`s ,
 * interpret the inner dimension as sequence of pts in a contour, treating as 'closed' one, and
 * the outer dimension as the sequence of cts,
 * translate into `glyf` block supposed to represent equivalent,
 * 
 * @deprecated a WIP (work-in-progress)
 * 
 * @param {(Readonly<{ x: number, y: number, offCurve: boolean ; }>)[][] } d
 */
/* https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/length */
function makeGlyfForTtSimpleGlyphBy2DTtypePointArray(d)
{
    ;
    const numContours = d.length ;
    const [rangeX = assertionFail(), rangeY = assertionFail() ] = (
        //
        (/** @satisfies {(keyof d[Number][Number] )[] } */ (["x", "y"]))
        .map(k => {
            const sorted = d.flat().map(e => /** @type {const} */ ([e, e[k] ]) ).toSorted((a, b) => (a[1] - b[1]) ).map(e => e[0] ) ;
            const minv = sorted[0] ?? athrow(`no point`) ;
            const maxv = sorted[0] ?? athrow(`no point`) ;
            return { min: minv[k], max: maxv[k] } ;
        } )
    ) ;

    check.assert(0 <= numContours, JSON.stringify({ numContours, }) ) ;

    const instructions = new Uint8Array(0) ;

    return (
        new Uint8Array(reiterableBy(function* () {
            /* the header */
            {
                yield* encode.SHORT(numContours) ;
                for (const m of /** @satisfies {(keyof typeof rangeX)[] } */ (["min", "max" ])) {
                    ;
                    yield* encode.SHORT(rangeX[m] ) ;
                    yield* encode.SHORT(rangeY[m] ) ;
                }
            }

            if (0 === numContours) {
                return ;
            }

            {
                /* `endPtsOfContours` */
                for (const i of d.map(pts => (pts.length + -1 ) ) ) {
                    yield* encode.USHORT(i) ;
                }

                // TODO
                /* `instructionLength` and then `instructions`. the former to be `UInt16`, the latter `Byte` */
                {
                    yield* encode.USHORT(instructions.length) ;
                    for (const b of instructions) { yield b ; }
                }
            
                return athrow(`TODO`) ;
            }
        }) )
    ) ;
}

/** @deprecated TODO/WIP */
function makeGlyfForTtCompoundGlyph()
{
    return athrow(`TODO`) ;
}

/**
 * assumes {@link parseGlyfHeader} was just done, and that the following block represents "compound glyph" data ;
 * parse accordingly
 * 
 * @see https://learn.microsoft.com/en-us/typography/opentype/spec/glyf#composite-glyph-description 
 * 
 */
const parseInGlyfTtCompoundGlyphData = (() => {
    ;

    class ComponentInfo {
        constructor() {
            ;
            /** @readonly @type {KtOtjsI } */
            this.referredGlyphIndex ;
            /** @readonly @type {[KtOtjsN, KtOtjsN ]= } */
            this.matchedPoints ;
            /** @readonly @type {KtOtjsTransformMatrix2D } */
            this.transform ;
        }
    }
    /** @typedef {Omit<ComponentInfo, never> } ComponentInfo1 */

    return /** @satisfies {(...args: any) => { components: ReadonlyArray<ComponentInfo> ; instructionLength?: Number ; instructions?: ReadonlyArray ; } } */ (/** @param {[Parser, { numberOfContours: Number, }] } args */ function ParseInGlyfTtCompoundGlyphData(...[p]) {
        ;
        /** @type {ReadonlyArray<ComponentInfo> } */
        let components = [] ;

        /** @type {number } */
        let flags = compoundGlyphBitFlags.MORE_COMPONENTS ;

        while (flags & compoundGlyphBitFlags.MORE_COMPONENTS )
        {
            flags = p.parseUShort() ?? athrow(`parse failed (parsing 'flags')`) ;
            
            ;
            /** @type {number } */ const glyphIndex = p.parseUShort() ;

            /** @type {[KtOtjsN, KtOtjsN ]} */
            let matchedPoints ;

            /** @type {number } */ let xScale = 1 ;
            /** @type {number } */ let scale01= 0 ;
            /** @type {number } */ let scale10= 0 ;
            /** @type {number } */ let yScale = 1 ;
            /** @type {number } */ let dx= 0 ;
            /** @type {number } */ let dy= 0 ;
            
            if ((flags & compoundGlyphBitFlags.ARG_1_AND_2_ARE_WORDS) > 0) {
                // The arguments are words
                if ((flags & compoundGlyphBitFlags.ARGS_ARE_XY_VALUES) > 0) {
                    // values are offset
                    dx = p.parseShort();
                    dy = p.parseShort();
                } else {
                    // values are matched points
                    matchedPoints = [p.parseUShort(), p.parseUShort()];
                }

            }
            else {
                // The arguments are bytes
                if ((flags & compoundGlyphBitFlags.ARGS_ARE_XY_VALUES) > 0) {
                    // values are offset
                    dx = p.parseChar();
                    dy = p.parseChar();
                } else {
                    // values are matched points
                    matchedPoints = [p.parseByte(), p.parseByte()];
                }
            }
            
            if ((flags & compoundGlyphBitFlags.WE_HAVE_A_SCALE) > 0) {
                // We have a scale
                xScale = yScale = p.parseF2Dot14();
            }
            else if ((flags & compoundGlyphBitFlags.WE_HAVE_AN_X_AND_Y_SCALE) > 0) {
                // We have an X / Y scale
                xScale = p.parseF2Dot14();
                yScale = p.parseF2Dot14();
            }
            else if ((flags & compoundGlyphBitFlags.WE_HAVE_A_TWO_BY_TWO) > 0) {
                // We have a 2x2 transformation
                xScale = p.parseF2Dot14();
                scale01 = p.parseF2Dot14();
                scale10 = p.parseF2Dot14();
                yScale = p.parseF2Dot14();
            }

            components = [...components, {
                referredGlyphIndex: glyphIndex ,
                matchedPoints ,
                transform: {
                    dx, dy ,
                    xScale, yScale,
                    scale10, scale01,
                } ,
            } ] ;

        }

        /** @type {ReadonlyArray=} */
        let instructions ;
        /** @type {Number=} */
        let instructionLength ;
        
        if (flags & compoundGlyphBitFlags.WE_HAVE_INSTRUS ) {
            // We have instructions
            instructionLength = p.parseUShort();
            instructions = [];
            for (let i = 0; i < instructionLength; i += 1) {
                instructions = [...instructions, p.parseByte() ] ;
            }
        }

        return {
            components ,
            instructionLength ,
            instructions ,
        } ;
        ;
    }) ;
})() ;

const simpleGlyphBitFlags = /** @type {const} */ ({
    ON_CURVE_POINT: 1 ,
    X_SHORT_VEC: 2 ,
    Y_SHORT_VEC: 0x4 ,
    REPEAT_FLAG: 0x8 ,
    X_IS_SAME_OR_POSITIVE_X_SHORT_VEC: 0x10 ,
    Y_IS_SAME_OR_POSITIVE_Y_SHORT_VEC: 0x20 ,
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

/**
 * {@link buildPath }
 * 
 * @param {[referees: GlyphSet, main: Glyph ]} args
 */
function buildPath(...[glyphs, glyph])
{
    ;

    if (glyph.isComposite) {
        const { components = athrow(`it sets 'isComposite' yet doesn't set 'components' `) , } = glyph ;
        for (const [j, component] of components.entries() )
        {
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
                    const firstPt = glyph.points[component.matchedPoints[0]] ?? athrow(`missing 'firstPt'`) ;
                    let secondPt = componentGlyph.points[component.matchedPoints[1]] ?? athrow(`missing 'secondPt' `) ;
                    const transform = {
                        xScale: component.xScale, scale01: component.scale01,
                        scale10: component.scale10, yScale: component.yScale,
                        dx: 0, dy: 0
                    };
                    secondPt = transformPoints([secondPt], transform)[0] ?? athrow() ;
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

/**
 * {@link parseGlyfTableAll }
 * 
 * @param {[...src: [OtjsPrsByteBuffer, Uint8Array["length"] ], loca, assumedEnclosingFont: import('../font.js').Font ]} args
 */
function parseGlyfTableAll(...[data, start, loca, font]) {
    const glyphs = new glyphset.GlyphSet(font);

    // The last element of the loca table is invalid.
    for (let i = 0; i < loca.length - 1; i += 1) {
        const offset = loca[i];
        const nextOffset = loca[i + 1];
        if (offset !== nextOffset) {
            glyphs.push(i, glyphset.ttfGlyphLoader(font, i, initializeGlyphByParsingGlyfTablePayload, data, start + offset, buildPath));
        } else {
            glyphs.push(i, glyphset.glyphLoader(font, i));
        }
    }

    return glyphs;
}

/**
 * {@link parseGlyfTableOnLowMemory }
 * 
 * @param {[...src: [OtjsPrsByteBuffer, Uint8Array["length"] ], loca, assumedEnclosingFont: import('../font.js').Font ]} args
 */
function parseGlyfTableOnLowMemory(...[data, start, loca, font]) {
    const glyphs = new glyphset.GlyphSet(font);

    font._push = function(i) {
        const offset = loca[i];
        const nextOffset = loca[i + 1];
        if (offset !== nextOffset) {
            glyphs.push(i, glyphset.ttfGlyphLoader(font, i, initializeGlyphByParsingGlyfTablePayload, data, start + offset, buildPath));
        } else {
            glyphs.push(i, glyphset.glyphLoader(font, i));
        }
    };

    return glyphs;
}

/**
 * Parse all the glyphs according to the offsets from the `loca` table.
 * 
 * @param {[...src: [OtjsPrsByteBuffer, Uint8Array["length"] ], loca, assumedEnclosingFont: import('../font.js').Font, options: { lowMemory ?: boolean ; } ]} args
 */
function parseGlyfTable(...[data, start, loca, font, opt]) {
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
