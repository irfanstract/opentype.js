








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
  coverage: KtOtfCoverageTableFmts1[1 | 2 ] ;
}

type KtOtfCoverageTableImpl = (
  | { format: 1, glyphs: KtOtfGlyphRef[], }
  | { format: 2, ranges: { start: KtOtfGlyphRef, end: KtOtfGlyphRef, index: number, }[] }
  | { format: number ; }
)

type KtOtfCoverageTableFmts1 = {
  [k in (KtOtfCoverageTableImpl extends infer d ? d : never )["format"] ] : (Extract<KtOtfCoverageTableImpl , { format: k }> ) ;
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

type KtOtfClassDefTableImpl = (
  | { format: 1, startGlyph: KtOtfGlyphRef, classes: number[], }
  | { format: 2, ranges: ({ start: KtOtfGlyphRef, end: KtOtfGlyphRef, classId: number, })[] , }
  | { format: number ; }
)





declare interface KtOtfKerningLookupTable
extends
Object, KtOtfSubtabular
{
  subtables: (
    ReadonlyArray<KtOtfKerningLookupSubtable>
  )
  ;
}

declare interface KtOtfKerningLookupSubtable
extends
Object, KtOtfGSubtable
{
  coverage: KtOtfCoverageTableFmts1[1 | 2 ] ,
  posFormat?: {} ,
  pairSets: ReadonlyArray<any>[] ,
}





