// Geometric objects




import { athrow, } from './athrow.mjs';
import { assert } from './check.js';

export const throwMissingConfigItemError = /** @param {string} v */ (v) => athrow(`missing '${v}'`) ;

import { reiterableBy, } from './itertools.mjs';

import { roundDecimal, } from './decimalnumbers.mjs';





import BoundingBox from './bbox.js';

import {
  // @ts-ignore
  GpsbSplineSegmentCoord, GpsbCoordFieldOccurenceTable,
} from './svgPathDataRepr.mjs';

export {
  // @ts-ignore
  GpsbSplineSegmentCoord, GpsbCoordFieldOccurenceTable } ;

import { optimizeSVgPathCommands as optimizeCommands } from './svgPathDataRepr.mjs';


export const optimizeSVgPathCommands = optimizeCommands ;




import {
  // @ts-ignore
  SVGParsingOptions ,
} from './svgPathDataRepr.mjs';

export {
  // @ts-ignore
  SVGParsingOptions
} ;

import {
  // @ts-ignore
  SVGParsingFlipBaseOptions
} from './svgPathDataRepr.mjs';

export {
  // @ts-ignore
  SVGParsingFlipBaseOptions ,
} ;

import { throwMissingFlipBaseError as throwMissingFlipBaseError1 } from './svgPathDataRepr.mjs';

export const throwMissingFlipBaseError = throwMissingFlipBaseError1 ;

import { createSVGParsingOptions } from './svgPathDataRepr.mjs';

export { createSVGParsingOptions } ;

import { flipYBaseIfNecessary } from './svgPathDataRepr.mjs';

export { flipYBaseIfNecessary } ;

/**
 * @typedef {{ [k: string]: unknown ; decimalPlaces?: number ; flipYBase ?: number ; }} SVGOutputOptions
 * 
 */
const    SVGOutputOptions = {} ;
export { SVGOutputOptions } ;

/**
 * Returns options merged with the default options for outputting SVG data
 * @param {SVGOutputOptions | number } [optionsArg] (optional)
 * @returns {SVGOutputOptions }
 */
export function createSVGOutputOptions(optionsArg)
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

  /** @satisfies {SVGOutputOptions} */
  const defaultOptions = {
    decimalPlaces: 2,
    optimize: true,
    flipY: shallByDefaultApplyFlipY(),
  };
  const newOptions = Object.assign({}, defaultOptions, options);

  return newOptions;
}

import { shallByDefaultApplyFlipY, } from './svgPathDataRepr.mjs';

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




import { GPolySplineDesc } from './svgPathDataRepr.mjs';

// TODO 
/**
 * the path data from an SVG path element or path notation .
 * 
 * @deprecated WIP
 * 
 * @type {(...args: [pathData: Required<Parameters<typeof pathDataFromArg > >[0] , options?: SVGParsingOptions ] ) => GPolySplineDesc }
 */
GPolySplineDesc.fromSVG = function (pathDataArg, optionsArg = {}) {
  ;
  
  /** @type {string} */
  const pathData = pathDataFromArg(pathDataArg) ;

  // set/merge default options
  const options = createSVGParsingOptions(optionsArg);
  
  const {
    numericChars ,
    signChars ,
    supportedCommands ,
    unsupportedCommands ,
  } = GpsbSvgDPredef ;

  /**
   * SNAPSHOT Of The Parsing State
   * 
   */
  class ParsingState
  {
    /**
     * @param {Partial<ParsingState> & Pick<ParsingState, "buffer1"> } d
     * 
     * @see https://github.com/microsoft/TypeScript/issues/38385 
     */
    constructor (d )
    {
      /** @type {readonly ({ type: GpsbSplineSegmentCoord["type"], value: readonly string[], relative: boolean; }) [] } */
      this.buffer1 ;

      Object.assign(this, d) ;
    }

    /**
     * 
     * @type {(opts: { lastItemUpdatedBy: (a: SegCmdB ) => SegCmdB ; } ) => ParsingState }
     */
    withUpdatedLastYyyto({ lastItemUpdatedBy: tokenBy }) {
      return new ParsingState({
        buffer1: (
          this.buffer1
          .toReversed()
          .map(/** @return {SegCmdB } */ (v, i) => {
            if (i === 0 ) {
              return tokenBy(v) ;
            }
            return v ;
          } )
          .toReversed()
        ) ,
      }) ;
    }

    /**
     * updating the last value in the array in-turn in the last segment ;
     * ```
     * for update-fnc `s => (s ++ "84" )`,
     * o  `[L 50 ; L 5 32       ; ]`
     * => `[L 50 ; L 5 <<3284>> ; ]`
     * ```
     * 
     * @type {(opts: { lastItemUpdatedBy: (a: SegCmdB["value"][number] ) => SegCmdB["value"][number] ; } ) => ParsingState }
     */
    withUpdatedLastCoordValue({ lastItemUpdatedBy: tokenBy })
    {
      return this.withUpdatedLastYyyto({ lastItemUpdatedBy: v => ({
        ...v,
        value: (
          v.value
          .toReversed()
          .map((v, i) => /** @satisfies {string} */ (
            i === 0 ? tokenBy(v) : v
          ) )
          .toReversed()
        ) ,
      }) }) ;
    }

    /**
     * doesn't add any new `YyyTo`, only add a coord-value onto the last `YyyTo` ;
     * ```
     * for addend `3, 8`,
     * o  `[L 5 ; L 5         ; ]`
     * => `[L 5 ; L 5 <<3 8>> ; ]`
     * ```
     * 
     * @type {(opts: { lU: () => string ; } ) => ParsingState }
     */
    withAddedSameLastYyytoCoords({ lU: tokenBy, })
    {
      return (
        this.withUpdatedLastYyyto({ lastItemUpdatedBy: v => ({
          ...v,
          value: (
            v.value
            .concat([tokenBy() ])
          ) ,
        }) })
      ) ;
    }

    /**
     * adds given `YyyTo` onto the end ;
     * ```
     * for addend `L 3 8 ;`,
     * o  `[L 5 ; L 5 ;             ]`
     * => `[L 5 ; L 5 ; <<L 3 8 ;>> ]`
     * ```
     * 
     * @type {(value: this["buffer1"][number] ) => ParsingState }
     */
    withAddedYyytoConst(v) {
      return new ParsingState({
        buffer1: this.buffer1.concat([v]) , 
      }) ; 
    }

    // getFinalPointPos()

    toSplineDrawCmdArray() {
      return this.buffer1 ;
    }
  }

  /** @typedef {ParsingState["buffer1"][number] } SegCmdB */

  /** @typedef {{ commands: readonly GpsbSplineSegmentCoord[] ; } } S2 */

  const throwSpclException = /** @type {(msg: string) => never } */ (m) => athrow(`[SplineData.fromSVG] ${m } `) ;

  const parsedCmds = ((
    (Array.from((
      reiterableBy(/** @satisfies {() => Iterable<{ type: "input-char", value: string ; } | { type: "apply-opt", value : "optimize" } | { type: "apply-setting", value : string } > } */ (function * () {
        ;

        if (0) {
          yield { type: "apply-setting" , value: athrow(`TODO`) } ;
        }
        
        for (const [token, charIndex] of (
          Array.from(pathData )
          .map((chr, i) => /** @type {[String, (ReadonlyArray<unknown>)["length"] ]} */ ([chr, i]) )
        ) )
        { yield { type: "input-char", value: token } ; }

        yield { type: "apply-opt", value: "optimize" } ;
      }) )
    )) )
    .reduce((
      /**
       * @param {ParsingState} prevState
       *  */
      (prevState, cmd) => {
        ;
        const throwSpclException = /** @type {(msg: string) => never } */ (m) => athrow(`[SplineData.fromSVG] [the parsing loop] ${m } `) ;

        const throwUnexpectedInputException = /** @type {(what: string, loc: number) => never } */ (wh, loc) => throwSpclException(`unexpected input/character '${wh }' at pos ${loc} `) ;
        
        const throwLogicTodoException = () => throwSpclException(`TODO`) ;

        const precedingCmd = (
          prevState.buffer1
          .at(-1)
          ?? null
        ) ;

        const precedingCmdType = (
          precedingCmd ?
          (precedingCmd.type || throwSpclException(`falsy 'precedingCmd.type' value `) )
          : null
        ) ;

        if (cmd.type === "input-char" ) {
          const { value: incomingInput, tokenPos, } = { ...cmd, tokenPos: Number.NaN } ;

          const { lastBuffer,   } = (() => {
            ;
            if (precedingCmd) {
              ;
              const { value: lb, type: lastCmdType, } = precedingCmd ;
              const lastBuffer = lb.at(-1) ?? throwSpclException(`ne f`) ;
              return { lastBuffer, } ;
            }
            return { lastBuffer: "",   } ;
          })() ;

          {
            ;
            ;
            if (numericChars.indexOf(incomingInput) > -1) {
              return prevState.withUpdatedLastCoordValue({ lastItemUpdatedBy: s => (s + incomingInput) }) ;
            }
            if (signChars.indexOf(incomingInput) > -1)
            {
              // if (!command.type && !this.commands.length) {
              //     command.type = 'L';
              // }

              const precedingCmdImpliedType = (
                precedingCmdType ?? "L"
              ) ;

              if (incomingInput === '-') {
                  if (!precedingCmdImpliedType || (
                    /* no idea why */

                    // lastBuffer.indexOf('-') >= 0
                    lastBuffer.indexOf('-') > 0
                  )) {
                      return throwUnexpectedInputException(incomingInput, tokenPos ) ;
                  } else if (lastBuffer.length) {
                      return prevState.withAddedSameLastYyytoCoords({ lU: () => '-', }) ;
                  } else {
                      return prevState.withUpdatedLastCoordValue({ lastItemUpdatedBy: _ => incomingInput, }) ;
                  }
              } else {
                  if (!precedingCmdImpliedType || lastBuffer.length > 0) {
                      return throwUnexpectedInputException(incomingInput, tokenPos ) ;
                  } else {
                      return prevState ;
                  }
              }
            }
            if (supportedCommands.indexOf(incomingInput) > -1) {
              {
                ;
                const relative = 0x60 <= incomingInput.charCodeAt(0) ;
                (incomingInput === "m" || incomingInput === "l" || incomingInput === "c") && (relative || throwSpclException(`assertion failed for ${JSON.stringify({ relative, incomingInput, }) }`) )
                ;
                return (
                  prevState.withAddedYyytoConst({
                    type: /** @type {GpsbSplineSegmentCoord["type"] } */ (incomingInput.toUpperCase() ) ,
                    relative: relative ,
                    value: [""] ,
                  })
                ) ;
              }
                return throwSpclException("TODO") ;
            }
            if (unsupportedCommands.indexOf(incomingInput) > -1) {
              // TODO: try to interpolate commands not directly supported?
              return athrow(`Unsupported path command: ${JSON.stringify(incomingInput) }. Currently supported commands are ${JSON.stringify(supportedCommands) }.`) ;
    
              ;
            }
            if (Array.from(' ,\t\n\r\f\v').indexOf(incomingInput) > -1) {
              return (
                prevState.withAddedSameLastYyytoCoords({ lU: () => '', })
              ) ;
    
              ;
            }
            if (incomingInput === '.') {
                if (!precedingCmd || lastBuffer.indexOf(incomingInput) > -1) {
                    return throwUnexpectedInputException(incomingInput, tokenPos) ;
                } else {
                  return prevState.withUpdatedLastCoordValue({ lastItemUpdatedBy: s => (s + incomingInput) }) ;
                }
            }
            {
              return throwUnexpectedInputException(incomingInput, tokenPos) ;
            }
          }

          return throwSpclException(`internal error. ${JSON.stringify(cmd) } `) ;
        }
        if (cmd.type === "apply-opt" ) {
          if (cmd.value === "optimize") {
            // TODO
            return prevState ;
          }
          return throwSpclException(`TODO, handling for: ${JSON.stringify(cmd) } `) ;
        }
        if (cmd.type === "apply-setting" ) {
          return throwSpclException(`TODO, handling for cmd type 'apply-setting'. ${JSON.stringify(cmd) } `) ;
        }

        return throwSpclException(`internal error, unhandled cmmand: ${JSON.stringify(cmd) } `) ;
      }
    ) , /** @satisfies {ParsingState} */ (new ParsingState({ buffer1: [], }) ) )
    .toSplineDrawCmdArray()
    /* for each segmt code, omit empty-strings from `value` */
    .map(c1 => {
      const c2 = { ...c1, value: c1.value.filter(v => (v !== "" ) ) } ;
      const c = c2 ;
      const c11 = ((c.type === "Z" && 0 ) ? (assert(c.value.length <= 1 , JSON.stringify(c) ) , { ...c, value: [] } ) : c ) ;
      return c11 ;
    } )
    /* for each segmt code, expand repeated `L` or `M`s into multiple */
    .flatMap((c) => [...reiterableBy(function* () {
      ;

      const { stringify } = JSON ;

      const { value: values, relative, type, } = c ;

      if (type === "M" || type === "L")
      {
        for (const [i1, i2] of (
          //
          Array.from((
            reiterableBy(function* () {
              var i = 0 ;
              while (i < values.length ) {
                yield /** @satisfies {[{}, {}]} */ ([i++, i++]) ;
              }
            } )
          ))
        ) )
        {
          yield { type: i1 == 0 ? type : "L" , relative, value: [
            values[i1] ?? throwSpclException(`aseertion failed`),
            values[i2] ?? throwSpclException(`internal error, malformed odd num of coord data (${stringify(c) })`) ,
          ] } ;
        }

        return ;
      }
      
      if (type === "H" || type === "V")
      {
        for (const i1 of values.keys() )
        {
          yield { type: type , relative, value: [
            values[i1] ?? throwSpclException(`aseertion failed`)
            ,
          ] } ;
        }

        return ;
      }

      {
        yield c ;
        return ;
      }
    })] )
  ) ) ;
  
  const throwINternalErrorCorruptedDataException = /** @type {(detail: string) => never } */ (m) => {
    return athrow(`internal error, corrupted data: ${m } `) ;
  } ;
  
  const parsedCmds1 = (
    parsedCmds
    .reduce((
      /**
       * @param {{ existingCms: GpsbSplineSegmentCoord[] , lastPt: { x: number, y: number, } } } existingState
       * 
       */
      (existingState, nextPreCm ) => {
        const { existingCms, lastPt } = existingState ;

        const { type: commandType, } = nextPreCm ;

        if (commandType === "Z" && (existingCms.at(-1) ?? throwSpclException(`assertion failed`) ).type === "Z" ) {
          return existingState ;
        }

        const { afterApplyPt, com: cm2, } = (
        /** @returns {{ com: (typeof existingCms )[number] , afterApplyPt: { x: number, y: number, } }} */
        () => {
          ;
          const { stringify } = JSON ;

          const coordArrayAsWritten = (
            nextPreCm.value
            .map((s, i) => {
              const s1 = +s ;
              return Number.isFinite(s1) ? s1 : throwINternalErrorCorruptedDataException(`(${s} => '${s1}') in point-list, index ${i }`) ;
            })
          ) ;
          
          // /** @type {lastPt & {} } */
          // const currentSupposedBasePt = (
          //   nextPreCm.relative ?
          //   lastPt
          //   : { x: 0, y: 0 }
          // ) ;

          const {
            coordArrayResolved,
            currentSupposedBOvr: currentSupposedBOvr ,
          } = (/** @return {{ coordArrayResolved : number[] , currentSupposedBOvr: Partial<typeof lastPt> , } } */ () => {
            ;
            /** @type {lastPt & {} } */
            const currentSupposedBasePt = (
              nextPreCm.relative ?
              lastPt
              : { x: 0, y: 0 }
            ) ;

            switch (commandType) {
              case "M":
              case "L":
              case "Q":
              case "C": {
                ;
      
                return {
                  currentSupposedBOvr: currentSupposedBasePt ,
                  coordArrayResolved: (
                    coordArrayAsWritten
                    .map((v, i) => (
                      ((0.8 <= (i % 2 ) ) ? currentSupposedBasePt.y : currentSupposedBasePt.x ) + v
                    ))
                  ) ,
                } ;
              }
              case "H":
              case "V":
                return {
                  coordArrayResolved: (
                    coordArrayAsWritten
                    .map((v, i) => (
                      ((commandType === "V" ) ? currentSupposedBasePt.y : currentSupposedBasePt.x ) + v
                    ))
                  ) ,
                  currentSupposedBOvr: (
                    commandType === "V" ? { y: currentSupposedBasePt.y } : { x: currentSupposedBasePt.x }
                  ) ,
                } ;
              case "Z" :
                return coordArrayAsWritten.length ? throwINternalErrorCorruptedDataException(JSON.stringify({ commandType, coordArrayAsWritten }) ) : {
                  coordArrayResolved: coordArrayAsWritten ,
                  currentSupposedBOvr: {} ,
                } ;
              default :
                return throwINternalErrorCorruptedDataException(JSON.stringify({ commandType, coordArrayAsWritten }) ) ;
            }
          } )() ;
          
          /** @type {lastPt & {} } */
          const currentSupposedBasePt = (
            { ...lastPt, ...(currentSupposedBOvr) }
          ) ;

          const throwNotEnoughPointsException = /** @type {(...detail: [actualN: number, when: string]) => never } */ (m, when) => {
            return throwINternalErrorCorruptedDataException(`[case ${when }] not enough coords. at ${m }. all pts: ${stringify(coordArrayAsWritten) } `) ;
          } ;
          const throwTooManyValuesException = /** @type {(...detail: [when: string]) => never } */ (when) => {
            return throwINternalErrorCorruptedDataException(`[case ${when }] too many coords. all pts: ${stringify(coordArrayAsWritten) } `) ;
          } ;

          switch (commandType) {
            case "M" :
            case "L" :
            {
              const [
                dx = throwNotEnoughPointsException(0 , `case '${commandType}'`) ,
                dy = throwNotEnoughPointsException(1 , `case '${commandType}'`) ,
                extraGivenCoord1 = null ,
              ] = coordArrayResolved ;
              extraGivenCoord1?.toFixed() && throwTooManyValuesException(commandType) ;

              return { com: { type: commandType, x: dx, y: dy } , afterApplyPt: { x: dx, y: dy } } ;
            }//

            case "H" :
            case "V" :
              {
                const [
                  d = throwNotEnoughPointsException(0 , `case '${commandType}'`) ,
                  extraGivenCoord1 = null ,
                ] = coordArrayResolved ;
                extraGivenCoord1?.toFixed() && throwTooManyValuesException(commandType) ;

                switch (commandType) {
                  case "H" : return { com: { type: "L", x: d, y: currentSupposedBasePt.y } , afterApplyPt: { x: d, y: currentSupposedBasePt.y } } ;
                  case "V" : return { com: { type: "L", y: d, x: currentSupposedBasePt.x } , afterApplyPt: { y: d, x: currentSupposedBasePt.x } } ;
                  default: return throwSpclException(`assertion failed: ${commandType }`) ;
                }
              }//
            
            case "Q" :
            {
              const [
                x1 = throwNotEnoughPointsException(0 , `case '${commandType}'`) ,
                y1 = throwNotEnoughPointsException(1 , `case '${commandType}'`) ,
                x  = throwNotEnoughPointsException(2 , `case '${commandType}'`) ,
                y  = throwNotEnoughPointsException(3 , `case '${commandType}'`) ,
                extraGivenCoord1 = null ,
              ] = coordArrayResolved ;
              extraGivenCoord1?.toFixed() && throwTooManyValuesException(commandType) ;

              return {
                com: { type: commandType, x, y, x1, y1, } ,
                afterApplyPt: { x: x, y: y }
              } ;

            }//
            case "C" :
            {
              const [
                x1 = throwNotEnoughPointsException(0 , `case '${commandType }`) ,
                y1 = throwNotEnoughPointsException(1 , `case '${commandType }`) ,
                x2 = throwNotEnoughPointsException(2 , `case '${commandType }`) ,
                y2 = throwNotEnoughPointsException(3 , `case '${commandType }`) ,
                 x = throwNotEnoughPointsException(4 , `case '${commandType }`) ,
                 y = throwNotEnoughPointsException(5 , `case '${commandType }`) ,
                 extraGivenCoord1 = null ,
              ] = coordArrayResolved ;
              extraGivenCoord1?.toFixed() && throwTooManyValuesException(commandType) ;

              return {
                com: { type: commandType, x, y, x1, y1, x2, y2 } ,
                afterApplyPt: { x: x, y: y }
              } ;

            }//
            
            case "Z" :
              coordArrayResolved.length && throwTooManyValuesException(commandType) ;
              return { com: { type: "Z" } , afterApplyPt: currentSupposedBasePt } ;

            default :
            return athrow(`for ${JSON.stringify(nextPreCm) }`) ;
          }
        })() ;

        return /** @satisfies {{ [k in keyof (typeof existingState) ] } } */ ({ existingCms: [...existingCms, cm2 ] , lastPt: afterApplyPt }) ;
      }
    ) , { existingCms: [{ type: "Z" } ] , lastPt: { x: 0, y: 0 } } )
    .existingCms
    .slice(1)
  ) ;

  if (0) {
    ;
    /* see also https://stackoverflow.com/a/886053 . */
    assert((
      JSON.stringify((
        parsedCmds
        .flatMap(function* (e) {
          SWITCH :
          switch (e.type) {
            case 'C':
            case 'Q':
            case 'L':
            case 'M':
              yield { x: e.value[0], y: e.value[1] } ;
              break SWITCH ;
            case 'H':
            case 'V':
            case 'Z':
              break SWITCH ;
          }
        } )
      ))
      ===
      JSON.stringify((
        parsedCmds1
        .flatMap(function* (e) {
          SWITCH :
          switch (e.type) {
            case 'C':
            case 'Q':
            case 'L':
            case 'M':
              yield { x: e.x, y: e.y } ;
              break SWITCH ;
            case 'H':
            case 'V':
            case 'Z':
              break SWITCH ;
          }
        } )
      ))
    ), (`inconsistency: ${JSON.stringify({ parsedCmds, parsedCmds1, pathData, }) }`) ) ;
  }

  if (0) {
    ;
    if (("flipYBase") in options && (options.flipYBase?.toFixed() ? false : true ) ) {
      return athrow(`assertion failed: option 'flipYBase' present yet ${(options.flipYBase) }/${JSON.stringify(options.flipYBase) }. ${JSON.stringify({ options, pathData, }) } `) ;
    }
  }
  
  const parsedCmds1100 = (
    options.optimize ?
    optimizeSVgPathCommands(parsedCmds1)
    : parsedCmds1
  ) ;

  const parsedCmds110 = (
    flipYBaseIfNecessary(
      parsedCmds1100,
      // @ts-ignore
      (() => {
        const {
          flipYBase = (() => {
            ;
            const boundingBox = (
              new GPolySplineDesc().derived({ commands: parsedCmds1100, })
              .getBoundingBox()
            );
            return boundingBox.y1 + boundingBox.y2;
          })() ,
          ...o
        } = options ;
        return { ...o, flipYBase } ;
      } )() )
  ) ;

  const parsedCmds11 = (
    // optimizeSVgPathCommands
      (parsedCmds110)
  ) ;

  return (
    new GPolySplineDesc()
    .derived({
      commands: (
        parsedCmds11
      ) ,
    })
  ) ;

  return athrow(`TODO`) ;
} ;

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



export { GPolySplineDesc, } ;

export { GpsbSvgDPredef, } ;









