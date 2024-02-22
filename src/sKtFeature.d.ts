








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






declare interface KTKerningLookupTable
{
  subtables: (
    ReadonlyArray<{
      coverage: {} ,
      posFormat?: {} ,
      pairSets: ReadonlyArray<any>[] ,
    }>
  )
  ;
}






