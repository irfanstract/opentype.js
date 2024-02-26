

















// TODO
declare interface KtOtfFeature
{
  script: string ;
  tags: string[] ;
}

declare interface KtOtfScript
{
  tag: string,
  script: {
    defaultLangSys: {
      reserved: 0,
      reqFeatureIndex: number,
      featureIndexes: number[],
    },
    langSysRecords: (
      {
        langSys: {
          featureIndexes: number[] ,
        } ,
      }[]
    ),
  } ,
}




/**
 * reference to a Glyph (with)in the TTF/OTF
 * 
 * this is generally not the actual {@link String.codePointAt char-code(s) } it's assigned to.
 * 
 */
declare type KtOtfGlyphRef = (
  number
)

declare interface KtOtfSubtabular
{
  subtables : Array<KtOtfGSubtable> ;
}

declare interface KtOtfGSubtable
{
  coverage: KtOtjsSupportedOtfCoverageTableFmts1[1 | 2 ] ;
}

type KtOtjsSupportedOtfCoverageTableImpl = (
  | { format: 1, glyphs: KtOtfGlyphRef[], }
  | { format: 2, ranges: { start: KtOtfGlyphRef, end: KtOtfGlyphRef, index: number, }[] }

  // // returned for unsupported v(s)
  // | { format: number ; formatError: true ; }
)

type KtOtjsSupportedOtfCoverageTableFmts1 = {
  [k in (KtOtjsSupportedOtfCoverageTableImpl extends infer d ? d : never )["format"] ] : (Extract<KtOtjsSupportedOtfCoverageTableImpl , { format: k }> ) ;
}

// if (format === 1) {
//     return {
//         format: 1,
//         startGlyph: this.parseUShort(),
//         classes: this.parseUShortList()
//     };
// } else if (format === 2) {
//     return {
//         format: 2,
//         ranges: this.parseRecordList({
//             start: Parser.uShort,
//             end: Parser.uShort,
//             classId: Parser.uShort
//         })
//     };
// }
type KtOtjsSupportedOtfClassDefTableImpl = (
  | { format: 1, startGlyph: KtOtfGlyphRef, classes: number[], }
  | { format: 2, ranges: ({ start: KtOtfGlyphRef, end: KtOtfGlyphRef, classId: number, })[] , }

  // // returned for unsupported v(s)
  // | { format: number ; formatError: true ; }
)





declare interface KtOtjsSupportedOtfKerningLookupTable
extends
Object, KtOtfSubtabular
{
  subtables: (
    ReadonlyArray<KtOtjsSupportedOtfKerningLookupSubtable>
  )
  ;
}

declare interface KtOtjsSupportedOtfKerningLookupSubtable
extends
Object, KtOtfGSubtable
{
  coverage: KtOtjsSupportedOtfCoverageTableFmts1[1 | 2 ] ,
  posFormat?: {} ,
  pairSets: ReadonlyArray<any>[] ,
}






// if (substFormat === 1) {
//   return {
//       substFormat: 1,
//       coverage: this.parsePointer(Parser.coverage),
//       deltaGlyphId: this.parseShort()
//   };
// } else if (substFormat === 2) {
//   return {
//       substFormat: 2,
//       coverage: this.parsePointer(Parser.coverage),
//       substitute: this.parseOffset16List()
//   };
// }
declare type KtOtjsSupportedOtfGlyphSubstituteTable
= (
  | (
    //
    {
      substFormat : 1 ,
      coverage : KtOtjsSupportedOtfCoverageTableImpl ,
    }
    & KtOgstDisjointRecord<{
      deltaGlyphId : number ,
      /** sequences */
      sequences : any[] ,
      alternateSets : any[] ,
      /** ligature sets */
      ligatureSets: any[] ,
      ruleSets: any[] ,
    }>
    //     yield* table.ushortList('backtrackGlyph', chainRule.backtrack, chainRule.backtrack.length ) ;
    //     yield* table.ushortList('inputGlyph'    , chainRule.input, chainRule.input.length + 1     ) ;
    //     yield* table.ushortList('lookaheadGlyph', chainRule.lookahead, chainRule.lookahead.length ) ;
    //     yield* table.ushortList('substitution'  , [], chainRule.lookupRecords.length              ) ;
    & {
      backtrack: {}[] ,
      input    : {}[] ,
      lookahead: {}[] ,
      lookupRecords: KtOtfGSubLookupRecord[] ,
    }
  )
  | (
    {
      substFormat : 2 ,
      coverage : KtOtjsSupportedOtfCoverageTableImpl ,
    }
    & KtOgstDNEdJ<{
      1: {
        substitute : number[] ,
      } ,
      2: {
        classDef: {} ,
        classSets: {}[] ,
      } ,
    }>
  )
  | (
    {
      substFormat : 3 ,
      coverages : KtOtjsSupportedOtfCoverageTableImpl[] ,
    }
    & KtOgstDNEdJ<{
      1: {
        lookupRecords: KtOtfGSubLookupRecord[] ,
        backtrackCoverage: KtOtjsSupportedOtfCoverageTableImpl[] ,
        lookaheadCoverage: KtOtjsSupportedOtfCoverageTableImpl[] ,
        inputCoverage    : KtOtjsSupportedOtfCoverageTableImpl[] ,
      } ,
    }>
  )
)

declare type KtOtfGSubLookupRecord = { sequenceIndex: number, lookupListIndex: number } ;

type KtOgstDisjointRecord<T extends {}> = (
  KtOgstDNEdJ<{ [DefinedKey in keyof T ] -?: (Partial<T> & { [key in DefinedKey]: T[key] } ) }>
)

type KtOgstDNEdJ<T extends {}> = (
  T[keyof T]
)













