
















/**
 * conjunction of the value-types of the dict
 * 
 * ```javascript
 * ArrayItemTypeConjunction<[A, B, C]>
 * // yields (A & B & C)
 * ```
 * 
 */
declare type ArrayItemTypeConjunction<out A extends readonly unknown[] > = (
  RecordValueTypeConjunction<{ [i in Pick<keyof A, `${number}` >]: A[i] }>
) ;

/**
 * conjunction of the value-types of the dict
 * 
 * ```javascript
 * RecordValueTypeConjunction<{ x: A, y: B, z: C }>
 * // yields (A & B & C)
 * ```
 * 
 */
declare type RecordValueTypeConjunction<out SrcDict extends Record<unknown, unknown> > = (
  [{ [kInSrcDict in keyof { value: SrcDict }["value"]]: (x: SrcDict[kInSrcDict] ) => void }[keyof SrcDict] ] extends [(x: infer P) => (infer R)]
  ?
  P : never
) ;

/**
 * alternation of the value-types of the dict
 * 
 * ```javascript
 * RecordValueTypeAlternation<{ x: A, y: B, z: C }>
 * // yields (theType[keyof theType] )
 * // yields (A | B | C)
 * ```
 * 
 */
declare type RecordValueTypeAlternation<out SrcDict extends Record<unknown, unknown> > = (
  SrcDict[keyof SrcDict]
) ;

/**
 * alt of the value-types of the dict
 * 
 * ```javascript
 * ArrayItemTypeAlternation<[A, B, C]>
 * // yields (A | B | C)
 * ```
 * 
 */
declare type ArrayItemTypeAlternation<out SrcDict extends Record<unknown, unknown> > = (
  RecordValueTypeAlternation<{ [i in Pick<keyof A, `${number}` >]: A[i] }>
) ;







// /**
//  * @typedef {[GPSB_MEMBERCONJUNCTION<{ [SpclCtrlSlot in keyof GpsbCoordFieldOccurenceTable]: { [SpclSegmType in GpsbCoordFieldOccurenceTable[SpclCtrlSlot] ]: { type: SpclSegmType } & { [k in SpclCtrlSlot ]: number ; } } }> ] extends [infer S] ? S : never } GPSB_CP_PRE
//  * 
//  */

// /**
//  * @typedef {[GPSB_CP_PRE[keyof GPSB_CP_PRE] | { type: "Z" }] extends [infer S] ? (S & { [k: string]: unknown ; }) : never } GPSB_CP
//  * 
//  */ 

// /** 
//  * @typedef {[{ [kInSrcDict in keyof { value: SrcDict }["value"]]: (x: SrcDict[kInSrcDict] ) => void }[keyof SrcDict] ] extends [(x: infer P) => (infer R)] ? P : never } GPSB_MEMBERCONJUNCTION<SrcDict>
//  * @template {{[key: string ] : unknown ; } } SrcDict
//  * 
//  */

/**
 * 
 * 
 */
declare type RecordFromOccurenceTable<OccTableT extends Record<unknown, unknown> > = (
  (
    [(
      RecordValueTypeConjunction<{
        [field in keyof OccTableT]: {
          [typeofStr in OccTableT[field] ]: (
            { type: typeofStr ; }
            & { [field1 in field ]: number ; }
          ) ;
        } ;
      }>
    )] extends [infer S]
    ?
    S[keyof S] : never
  )
) ;

type GPSB_MEMBERCONJUNCTION_TEST = [
  RecordValueTypeConjunction<{ k: { l: string ; } , m: { n: string ; o: number ; }, p: { e: 5, g: 5, o: { xr: 7, }, } }>,
  RecordValueTypeConjunction<{
    x1: "C" | "Q";
    y1: "C" | "Q";
    x2: "C" | "D" | "Q" ;
    y2: "C" | "D" | "Q" ;
    x: "C" | "Q" | "L" | "M";
    y: "C" | "Q" | "L" | "M";
    title: string ;
  }>,
] ;

type GPSB_OCCUDICTTRANSPOSITIONAL_TEST = {
  test1 : RecordFromOccurenceTable<{
    x1: "C" | "Q";
    y1: "C" | "Q";
    x2: "C";
    y2: "C";
    x: "C" | "Q" | "L" | "M";
    y: "C" | "Q" | "L" | "M";
  }>,
} ;








