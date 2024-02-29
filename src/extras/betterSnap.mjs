

import { athrow, assertionFail } from "../athrow.mjs";

import { reiterableBy, arrayByGenerator } from "../itertools.mjs";

import { clamp, absValueBasedClamp, } from "./splineAutoHintBasics.mjs";

import { GPolySplineDesc, GpsbSplineSegmentCoord } from "../svgPathDataRepr.mjs";

import GPolySplineBuffer from "../path.js";








/** @type {(opts: { refLen0: number, refLen2: number, subjectedLen0: number, }) => number } */
const spcllySafeExtrapolate = function ({ refLen0, refLen2, subjectedLen0, }) {
  ;
  if (0.38 < Math.abs(refLen0 / refLen2) ) {
    const scl0 = (refLen2 / refLen0 ) ;
    return subjectedLen0 * absValueBasedClamp([1E-5, 3], scl0 ) ;
  } else {
    ;
  }
  return subjectedLen0 ;
} ;

import { analyseSpline, spcllyAnnotateDrawtoSeqWithIds, } from "./splineAutoHintBasics.mjs";

const expandIntoTtAlikeSpline = /** @satisfies {(p: GPolySplineBuffer ) => {} } */ ((path) => {
  /** @typedef {GpsbSplineSegmentCoord extends infer S0 ? (S0 extends infer S ? { readonly type: (S & GpsbSplineSegmentCoord )["type"], state: S } : never ) : never } SD */

  /** @typedef {{ moveTo?: (newPos: { x: number ; y: number ; }) => void ; } & Readonly<{ x: number ; y: number ; }>} NdOps */

  const CMDW = /** @satisfies {<const cmdT extends SD >(cmd: cmdT, options: { [k in keyof { kx, ky } ]: keyof cmdT["state"] ; }) => NdOps } */ (function (cmd, { kx, ky, } ) {
    ;
    return {
      get x() { return cmd.state[kx] ; } ,
      get y() { return cmd.state[ky] ; } ,
      /** @param {number} newValue  */ set x(newValue) { cmd.state[kx] = newValue ; } ,
      /** @param {number} newValue  */ set y(newValue) { cmd.state[ky] = newValue ; } ,
      // moveTo: ({ x, y, }) => { cmd.state = { ...cmd.state, [kx]: x, [ky]: y, } ; } ,
    } ;
  }) ;

  const segmts = (
    (  (path.commands))
    .map(/** @return {SD } */ (d, i, srcList) => (
      ({ type: d.type, get state() { return d } , /** **setter** */ set state(newS) { srcList[i] = newS ; } })
    ) )
    .map((cmd, i, srcList) => {
      if (cmd.type !== "Z") {
        const endPt = CMDW(cmd, { kx: "x", ky: "y" }) ;
        const ctrls = [.../** @satisfies {() => Generator<NdOps> } */ (function* () {
          {
            yield endPt ;
          }
          if (cmd.type === 'Q' || cmd.type === 'C') {
            const { kx, ky } = /** @type {const} */ ({ kx: "x1", ky: "y1" }) ;
            yield CMDW(cmd, { kx, ky }) ;
          }
          if (cmd.type === 'C') {
            const { kx, ky } = /** @type {const} */ ({ kx: "x2", ky: "y2" }) ;
            yield CMDW(cmd, { kx, ky }) ;
          }
        })() ] ;
        if (cmd.type === "M") {
          ;
          return ({
            cmdType: cmd.type ,
            ctrls  ,
            // endPt: { get x() { return cmd.x ; }, get y() { return cmd.y ; } } ,
            endPt: endPt ,
            type: /** @type {const} */ (1) ,
          }) ;
        } else {
          ;
          const startPt = (srcList[i + -1] ?? athrow(`nothing to be startPt`) ) ;
          const forCmprePtsList = [startPt.state, ...ctrls ] ;
          const reSorted = () => {
            ;
            const coordsXSorted = forCmprePtsList.map(e => /** @type {const} */ ([ e, e.x ]) ).sort((a, b) => (a[1] - b[1] ) ).map(e => e[1] ?? athrow() ) ;
            const coordsYSorted = forCmprePtsList.map(e => /** @type {const} */ ([ e, e.y ]) ).sort((a, b) => (a[1] - b[1] ) ).map(e => e[1] ?? athrow() ) ;
            return {
              coordsXSorted,
              coordsYSorted,
            } ;
          } ;
          const moveEndPtToNewPosAndInterpolate = /** @satisfies {(...a: [{ x: Number, y: Number }] ) => void } */ ((newEndPos) => {
            if (0) return ;
            const existingStartPos = { ...(forCmprePtsList.at(0) ?? athrow()) } ;
            const existingEndPos   = { ...(forCmprePtsList.at(-1) ?? athrow()) } ;
            // const s = {
            //   /* caveat we need to limit the value to outrule numerical overflows. */
            //   x: spcllySafeExtrapolate( (newEndPos.x - existingStartPos.x) / (existingEndPos.x - existingStartPos.x )) ,
            //   y: spcllySafeExtrapolate( (newEndPos.y - existingStartPos.y) / (existingEndPos.y - existingStartPos.y )) ,
            // } ;
            for (const p of ctrls ) {
              for (const k of /** @type {const} */ (["x", "y"])) {
                ;
                /** @type {number} */
                let pos = p[k] ;
                pos -= existingStartPos[k] ;
                pos = spcllySafeExtrapolate({ refLen2: newEndPos[k] - existingStartPos[k] , refLen0: existingEndPos[k] - existingStartPos[k], subjectedLen0: pos }) ;
                pos += existingStartPos[k] ;
                p[k] = pos ;
              }
            }
            ;
          }) ;
          return ({
            cmdType: cmd.type ,
            ctrls  ,
            // endPt: { get x() { return cmd.x ; }, get y() { return cmd.y ; } } ,
            endPt: {
              get x() { return cmd.state.x ; } ,
              get y() { return cmd.state.y ; } ,
              /** @param {number} newValue  */ set x(newValue) { moveEndPtToNewPosAndInterpolate({ x: newValue, y: cmd.state.y }) ; } ,
              /** @param {number} newValue  */ set y(newValue) { moveEndPtToNewPosAndInterpolate({ x: cmd.state.x, y: newValue }) ; } ,
              // moveTo: ({ x, y, }) => { } ,
            } ,
            startPt ,
            type: /** @type {const} */ (1) ,
          }) ;
        }
      } else {
        return {
          ctrls: [] ,
          type: /** @type {const} */ (-1) ,
        } ;
      }
    } )
  ) ;

  const allPts = (
    segmts
    .flatMap(s => s.ctrls )
  ) ;
  
  const hintablePts = (
    segmts
    .flatMap(s => {
      if (s.type === 1 ) {
        return [s.endPt] ;
      } else {
        return [] ;
      }
    } )
  ) ;

  return {
    segmts,
    /** @deprecated alias of {@link allPts}. */
    pts: allPts,
    allPts ,
    hintablePts ,
  } ;
})  ;









export { expandIntoTtAlikeSpline, } ;


