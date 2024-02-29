

import { athrow, assertionFail } from "../athrow.mjs";

import { reiterableBy, arrayByGenerator } from "../itertools.mjs";



/** @type {(constraint: [number, number], x: number) => number } */
function clamp([lwb, rghtb], value) {
  value = Math.max(lwb, value) ;
  value = Math.min(rghtb, value) ;
  return value ;
}

/** @type {(constraint: [number, number], x: number) => number } */
function absValueBasedClamp([lwb, rghtb], scl0) {
  return Math.sign(scl0) * clamp([lwb, rghtb], Math.abs(scl0 ) ) ;
}



export {
  clamp ,
  absValueBasedClamp ,
} ;





import {
  GPolySplineDesc,
  // @ts-ignore
  GpsbSplineSegmentCoord ,
} from "../svgPathDataRepr.mjs";

import GPolySplineBuffer from "../path.js";







export const analyseSpline = /** @satisfies {(x: GPolySplineDesc) => object } */ ((path) => {
  ;
  const segms = (
    path.commands
  ) ;

  const analysis1 = analyseDrawtoSeq(segms) ;

  return {
    ...analysis1 ,
    originalPathData: path ,
  } ;
}) ;

export const analyseDrawtoSeq = /** @satisfies {(x: GPolySplineDesc["commands"], pathClosed: Boolean ) => object } */ ((allDrawtoCmds, pathClosed) => {
  ;

  const allSegments = (
    getSegmentsByDrawtoSeq(allDrawtoCmds, pathClosed)
  ) ;

  const allPts = (
    allSegments
    .flatMap(s => s.nodes )
  ) ;
  
  /**
   * {@link allOnCurvePts }.
   * 
   * not all on-curve pt(s) are edge-end-pt(s).
   * 
   */
  const allOnCurvePts = (
    allPts
    .filter(p => !(p.offCurve) )
  ) ;

  /**
   * {@link allSegmtStartEndPts },
   * 
   * not all on-curve pt(s) are edge-end-pt(s).
   * 
   */
  const allSegmtStartEndPts = (
    allSegments
    .flatMap(s => arrayByGenerator(function* () { if (s.contourState === 1 ) { yield s.startPt ; } yield s.endNode ?? athrow() ; } ) )
    .toSorted((a, b) => a.id.localeCompare(b.id) )
  ) ;
  /**
   * {@link allSegmtStartEndPts },
   * 
   * not all on-curve pt(s) are edge-end-pt(s).
   * 
   */
  const allEdgePtIds = (
    allSegmtStartEndPts
    .map(p => p.id )
  ) ;

  /**
   * all nodes, including the off-curve ones
   */
  const allSubsegmentInternodePseudoEdges = (
    allSegments
    .flatMap(s => (
      s.allInternodeEdges
      .map(s1 => ({
        startPt: s1.start,
        endPt: s1.end ,
        enclosingArcId: s.id ,
      }) )
    ) )
  ) ;

  const allOnCurvePseudoEdges = (
    consecutivelySE(allOnCurvePts)
  ) ;

  return {
    allDrawtoCmds ,
    allSegments ,
    allPts ,
    allOnCurvePts,
    allSegmtStartEndPts ,
    allEdgePtIds ,
    allSubsegmentInternodePseudoEdges ,
    allOnCurvePseudoEdges ,
  } ;
}) ;

export const getSegmentsByDrawtoSeq = /** @satisfies {(p: GPolySplineDesc["commands"], pathClosed: Boolean ) => {} } */ (segms, pathClosed) => {
  return (
    spcllyAnnotateDrawtoSeqWithIds(segms)
    .map((sgmt, i, sgmtSeq) => {
      const prevSgmt = sgmtSeq[i + -1] ;
      const prevNode = prevSgmt && (prevSgmt.linetoType !== "Z" ) && prevSgmt.endNode ;
      return (prevNode ? /** @type {const} */ ({ startPt: prevNode, ...sgmt, contourState: 1, }) : /** @type {const} */ ({ ...sgmt,  contourState: 0, })) ;
    } )
    .filter(s => !(s.linetoType === "M" ) )
  ) ;
} ;

// export
export const spcllyAnnotateDrawtoSeqWithIds = /** @satisfies {(p: GPolySplineDesc["commands"] ) => {} } */ (segms) => {
  return (
    segms
    .map((s, i) => {
      const mstId = `segmt${i }` ;

      /**
       * @typedef {Object } InsidernessOpsDocs
       * 
       * @property {boolean} [beingIntraEdge] `true` if-and-only-if it's in middle of edge/spline-segmt rather than being the end(s) of
       * @property {boolean} [offCurve] `true` if-and-only-if being physically outside the spline
       * 
       */

      const m = /** @satisfies {() => Generator<{ id: Number | String, } & InsidernessOpsDocs & { [k in keyof { x, y } ]: Number ; }> } */ (function* () {
        ;
        if (s.type === "Z" ) {
          return ;
        } else {
          yield { id: `${mstId }_endp`, x: s.x, y: s.y, offCurve: false, } ;
          if (s.type === "Q" || s.type === "C" ) {
            yield { id: `${i }_cp1`, beingIntraEdge: true, x: s.x1, y: s.y1, offCurve: true, } ;
          }
          if (s.type === "C" ) {
            yield { id: `${mstId }_cp17`, beingIntraEdge: true, x: s.x2, y: s.y2, offCurve: true, } ;
          }
        }
      }) ;

      /**
       * all nodes, including the off-curve ones
       */
      const allNodes = arrayByGenerator(/** @satisfies {() => Generator<{ id: Number | String, } & InsidernessOpsDocs & { [k in keyof { x, y } ]: Number ; }> } */ (function* () {
        ;
        if (s.type === "Z" ) {
          return ;
        } else {
          yield { id: `${mstId }_endp`, x: s.x, y: s.y, offCurve: false, } ;
          if (s.type === "Q" || s.type === "C" ) {
            yield { id: `${i }_cp1`, beingIntraEdge: true, x: s.x1, y: s.y1, offCurve: true, } ;
          }
          if (s.type === "C" ) {
            yield { id: `${mstId }_cp17`, beingIntraEdge: true, x: s.x2, y: s.y2, offCurve: true, } ;
          }
        }
      }) ) ;
      /**
       * consecutive pair between all nodes, including the off-curve ones
       */
      const allInternodeEdges = (
        consecutivelySE(allNodes)
      ) ;

      return {
        id: mstId ,
        nodes: allNodes ,
        allInternodeEdges ,
        endNode: allNodes.at(-1) ,
        linetoType: s.type,
      } ;
    })
  ) ;
} ;

/**
 * consecutive pairs :
 * ```
 * for (let i=1; i<allNodes.length; ++i )
 * { yield { start: allNodes[0] ?? assertionFail(), end: allNodes[1] ?? assertionFail() } ; }
 * ```
 */
const consecutivelySE = (/** @template {{}} E @param {ReadonlyArray<E> } allNodes */ (allNodes) => (
  //
  arrayByGenerator(/** @satisfies {() => Generator<{ start: allNodes[Number] , end: allNodes[Number] }> } */ function* () {
    for (let i=1; i<allNodes.length; ++i ) {
      yield { start: allNodes[0] ?? assertionFail(), end: allNodes[1] ?? assertionFail() } ;
    }
  })
)) ;









