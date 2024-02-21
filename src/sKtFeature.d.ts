








// TODO
declare interface KTFeature
{
  script: string ;
  tags: string[] ;
}

declare interface KTScript
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




declare interface KTOTSubtabular
{
  subtables : Array<KTOTGSubtable> ;
}

declare interface KTOTGSubtable
{
  coverage: KTCoverageTableFmts1[1 | 2 ] ;
}

type KTCoverageTableImpl = (
  | { format: 1, glyphs: number[], }
  | { format: 2, ranges: { start: number, end: number, index: number, }[] }
)

type KTCoverageTableFmts1 = {
  [k in (KTCoverageTableImpl extends infer d ? d : never )["format"] ] : (KTCoverageTableImpl & { format: k } ) ;
}





declare interface KTKerningLookupTable
extends
Object, KTOTSubtabular
{
  subtables: (
    ReadonlyArray<KTKerningLookupSubtable>
  )
  ;
}

declare interface KTKerningLookupSubtable
extends
Object, KTOTGSubtable
{
  coverage: KTCoverageTableFmts1[1 | 2 ] ,
  posFormat?: {} ,
  pairSets: ReadonlyArray<any>[] ,
}





