// Table metadata

/*!
 * 
 * contrib note:
 * 
 * - the original code made those usages of `concat` of `Array` ;
 *   TS typechecker was unable to relate/connect those desc to the base-class, {@link TableFieldDescriptorByTnV },
 *   which would risk breakage from "Rename" refactorings,
 *   so
 *   I replaced those `concat` calls with the spread-operator (eg in `[item, item, ...items ]`)
 * 
 * - tried to replace ES2009-style `class`es with ES2015-style ones, but
 *   that won't play well with (devel, contrib) merges
 * 
 */





import { athrow, asNonNull } from "./athrow.mjs";
import check from './check.js';
import { strConcatOf2, } from "./athrow.mjs";





import { encode, sizeOf } from './types.js';



class Table
{
  
  /**
   * @exports opentype.Table 
   * @param {string} tableName
   * @param {TableFieldDescriptorByTnV<string, unknown > [] } fields
   * @param {{ [key: string]: unknown ; }} [options] 
   */
  constructor (tableName, fields, options)
  {
    /** @type {<T> (value: T) => asserts value is (T & { [key: string]: unknown ; }) } */ const AS_INDEXED = (v => {}) ;
    AS_INDEXED(this) ;

    if (fields && fields.length) {
      Object.assign(this, (
        Object.fromEntries(fields.map(fld => [fld.name, fld.value] ) )
      ) ) ;
    }

    this.tableName = tableName;
    this.fields = fields;
    if (options) {
      Object.assign(this, options ) ;
    }

    // TODO
    /** @type {number=} */
    this.format ;
    /** @type {number=} */
    this.coverageFormat ;
  }
}

/**
 * {@link Table }, refined according to the {@link TableFieldDescriptorByNameField}s passed
 * 
 * @type {new <T extends string>(tableName: string, f: TableFieldDescriptorByNameField<T>[] ) => Table & { [k in T]: {}, } }
 */
// @ts-ignore
const TableKky = Table ;

/**
 * Encodes the table and returns an array of bytes
 * @return {any[] }
 */
Table.prototype.encode = function() {
  return encode.TABLE(this);
};

/**
 * Get the size of the table.
 * @return {number}
 */
Table.prototype.sizeOf = function() {
  return sizeOf.TABLE(this);
};

/**
 * @private
 * 
 */
const ushortList = (
  /**
   * 
   * @satisfies {<T extends {}, const nm extends string>(...args: [...[expectedTbName: nm, srcAsArray: readonly T[], count ?: number] ] ) => ({} )[] }
   * 
   */
  (function ushortListImpl(itemName, list, count) {
    if (count === undefined) {
        count = list.length;
    }
    
    /** @typedef {(typeof list )[number] } T */
    
    // /** @type {ReturnType<typeof ushortListImpl<T> >[number] [] } */
    /** @type {(TableFieldDescriptorByNmAndTypeAndValue<`${typeof itemName }${"Count" | number }` , "USHORT" , T | (typeof count) > ) [] } */
    const fields = new Array(list.length + 1);
    fields[0] = {name: strConcatOf2(itemName, count), type: 'USHORT', value: count};
    for (let i = 0; i < list.length; i++) {
      fields[i + 1] = {name: strConcatOf2(itemName, i), type: 'USHORT', value: list[i] ?? athrow() };
    }
    return fields;
  })
) ;

/**
 * @private
 * @type {(
 * <T>(...args: [...[expectedTbName: string, srcAsArray: readonly T[]] , (item: T, i: number) => any ] )
 * => (TableFieldDescriptorByTnV<'USHORT' | 'TABLE' | 'TAG', any > )[]
 * )}
 */
function tableList(itemName, records, itemCallback) {
    const count = records.length;

    const fields = /** @satisfies {(TableFieldDescriptorByTnV<'USHORT' | 'TABLE' | 'TAG', any > ) [] } */ ([
      {name: itemName + 'Count', type: 'USHORT', value: count} ,
      .../** @satisfies {(TableFieldDescriptorByTnV<'USHORT' | 'TABLE' | 'TAG', any > ) [] } */ (
        records
        .map((rec, i) => (
          {name: itemName + i, type: 'TABLE', value: itemCallback(rec, i)}
        ))
      ) ,
    ]);
    return fields;
}

/**
 * @private
 */
const recordList = (
  /**
   * 
   * @satisfies {(
   * <T, const tbName extends string>(...args: [...[expectedTbName: tbName, srcAsArray: readonly T[]] , (item: T, i: number) => TableFieldDescriptorByNmAndTypeAndValue<string, 'TAG' | 'TABLE' | 'USHORT', any >[] ] )
   * => ({} )[] 
   * )}
   */
  (function (itemName, records, itemCallback) {
    const count = records.length;

    /** @typedef {ReturnType<typeof itemCallback>[number] } ReturnedEachRec */

    /** @type {(TableFieldDescriptorByNmAndTypeAndValue<`${typeof itemName}Count` | ReturnedEachRec["name"] , ReturnedEachRec["type"] , ReturnedEachRec["value"] > ) [] } */
    let fields = [];
    fields[0] = {name: strConcatOf2(itemName, count), type: 'USHORT', value: count};
    for (let i = 0; i < count; i++) {
        fields = [...fields, ...itemCallback(records[i] ?? athrow(), i) ] ;
    }
    return fields;
  } )
) ;

/**
 * @typedef {{name: Name, type: Type, value: Value } } TableFieldDescriptorByNmAndTypeAndValue
 * @template {string} Name
 * @template {string} Type
 * @template Value
 * 
 */

/**
 * @typedef {TableFieldDescriptorByNmAndTypeAndValue<string, Type, Value> } TableFieldDescriptorByTnV
 * 
 * @template {string} Type
 * @template Value
 * 
 */
const TableFieldDescriptorByTnV = {} ;

/**
 * @typedef {TableFieldDescriptorByNmAndTypeAndValue<Name, string, unknown> } TableFieldDescriptorByNameField
 * @template {string} Name
 * 
 */

const describeTableFieldDescriptor1 = /** @satisfies {<const nme, const value, const tpe extends string>(e: TableFieldDescriptorByNmAndTypeAndValue<nme, tpe, value> ) => typeof e } */ (
  function (e) {
    return e ;
  }
) ;

export {
  TableFieldDescriptorByTnV,
  describeTableFieldDescriptor1,
} ;



// Common Layout Tables

/* a template for declaring these `YyyTable`s */
// /** @type {new (...args: ConstructorParameters<typeof Table>) => (Table) } */
// const SbTable = Table ;

/** @type {new (...args: ConstructorParameters<typeof Table>) => (Table & KTCoverageTableFmts1[1 | 2] ) } */
const CTableBase = Table ;
// /** @type {new (...args: ConstructorParameters<typeof Table>) => (Table & KTCoverageTableFmts1[1 | 2] ) } CTable */

/**
 * 
 */
class Coverage extends CTableBase
{
  /**
   * 
   * @class
   * @param {Table & ( { format: 1 ; glyphs: any[] } | { format: 2 ; ranges: any[] } )} coverageTable
   * 
   */
  constructor(coverageTable)
  {
    super('coverageTable', (
      coverageTable.format === 1 ?
      [{name: 'coverageFormat', type: 'USHORT', value: 1} , ... ushortList('glyph', coverageTable.glyphs) ]
      :

      coverageTable.format === 2 ?
      [{name: 'coverageFormat', type: 'USHORT', value: 2} , ... recordList('rangeRecord', coverageTable.ranges, function(RangeRecord, i) {
          return [
              {name: 'startGlyphID' + i, type: 'USHORT', value: RangeRecord.start},
              {name: 'endGlyphID' + i, type: 'USHORT', value: RangeRecord.end},
              {name: 'startCoverageIndex' + i, type: 'USHORT', value: RangeRecord.index},
          ];
      }) ]
      :

      athrow(`[Coverage.new] only supporting format 1 or 2 - instead got ${coverageTable} .`)
    ) ) ;
  }
}

/** @type {new (...args: ConstructorParameters<typeof Table>) => (Table) } */
const SlTableBase = Table ;

/**
 * 
 * @class
 */
class ScriptList extends SlTableBase
{
  /**
   * 
   * @class
   * @param {Table} scriptListTable
   */  
  constructor(scriptListTable)
  {
    super('scriptListTable',
        recordList('scriptRecord', scriptListTable, function(scriptRecord, i) {
            const script = scriptRecord.script;
            let defaultLangSys = script.defaultLangSys;
            check.assert(!!defaultLangSys, 'Unable to write GSUB: script ' + scriptRecord.tag + ' has no default language system.');
            return [
                {name: 'scriptTag' + i, type: 'TAG', value: scriptRecord.tag},
                {name: 'script' + i, type: 'TABLE', value: new Table('scriptTable', [
                    {name: 'defaultLangSys', type: 'TABLE', value: new Table('defaultLangSys', [
                        {name: 'lookupOrder', type: 'USHORT', value: 0},
                        {name: 'reqFeatureIndex', type: 'USHORT', value: defaultLangSys.reqFeatureIndex},
                        ... ushortList('featureIndex', defaultLangSys.featureIndexes)]
                    )} , ... recordList('langSys', script.langSysRecords, function(langSysRecord, i) {
                    const langSys = langSysRecord.langSys;
                    return [
                        {name: 'langSysTag' + i, type: 'TAG', value: langSysRecord.tag},
                        {name: 'langSys' + i, type: 'TABLE', value: new Table('langSys', [
                            {name: 'lookupOrder', type: 'USHORT', value: 0},
                            {name: 'reqFeatureIndex', type: 'USHORT', value: langSys.reqFeatureIndex}
                            ,
                            ... ushortList('featureIndex', langSys.featureIndexes)
                            ,
                        ])},
                    ];
                }) ])},
            ];
        })
    );
  }
}

class FeatureList extends Table
{
  /**
   * 
   * @class
   * @param {Table} featureListTable
   * @constructor
   */
  constructor(featureListTable)
  {
    super('featureListTable',
        recordList('featureRecord', featureListTable, function(featureRecord, i) {
            const feature = featureRecord.feature;
            return [
                {name: 'featureTag' + i, type: 'TAG', value: featureRecord.tag},
                {name: 'feature' + i, type: 'TABLE', value: new Table('featureTable', [
                  {name: 'featureParams', type: 'USHORT', value: feature.featureParams},
                  ...ushortList('lookupListIndex', feature.lookupListIndexes)
                  ,
                ])}
            ];
        })
    );
  }
}

// TODO
/**
 * @typedef {{ [key: string]: (item: any, i: number) => any ; } } LookupListIngrSubtableMakers
 * 
 */

/** @type {new (...args: ConstructorParameters<typeof Table>) => (Table) } */
const LlTableBase = Table ;

/**
 * 
 * @class
 */
class LookupList extends LlTableBase
{
  /**
   * 
   * @class
   * @param {Table} lookupListTable
   * @param {LookupListIngrSubtableMakers} subtableMakers
   */
  constructor(lookupListTable, subtableMakers)
  {
    super('lookupListTable', tableList('lookup', lookupListTable, function(lookupTable) {
        let subtableCallback = subtableMakers[lookupTable.lookupType] ?? athrow(`[LookupList.new] [subtableCallback] nf`) ;

        check.assert(!!subtableCallback, 'Unable to write GSUB lookup type ' + lookupTable.lookupType + ' tables.');
        return new Table('lookupTable', [
            {name: 'lookupType', type: 'USHORT', value: lookupTable.lookupType},
            {name: 'lookupFlag', type: 'USHORT', value: lookupTable.lookupFlag}
            ,
            ...tableList('subtable', lookupTable.subtables, subtableCallback)
            ,
        ]);
    }));
  }
}

/** @typedef {{ format: 1 ; classes: number[] ; startGlyph: number ; } | { format: 2 ; ranges: { start: number, end: number ; }[] } } CdeTableD */

/**
 * @class
 * @constructor
 *
 * @see https://learn.microsoft.com/en-us/typography/opentype/spec/chapter2#class-definition-table
 */
class ClassDefImpl extends Table
{
  /**
   * @exports opentype.ClassDef
   * @class
   * @param {( CdeTableD )} classDefTable
   * @constructor
   *
   * @see https://learn.microsoft.com/en-us/typography/opentype/spec/chapter2#class-definition-table
   */
  constructor(classDefTable)
  {
    ;
    super(
    ...(() =>
    { const args = /** @satisfies {ConstructorParameters<typeof Table> & { 0: 'classDefTable' } } */ (
      classDefTable.format === 1 ? [
          'classDefTable' ,
          [
            describeTableFieldDescriptor1({name: 'classFormat', type: 'USHORT', value: 1}),
            describeTableFieldDescriptor1({name: 'startGlyphID', type: 'USHORT', value: classDefTable.startGlyph})
            ,
            ...ushortList('glyph', classDefTable.classes)
            ,
          ] ,
      ] :
  
      classDefTable.format === 2 ? [
        'classDefTable' ,
          [
            describeTableFieldDescriptor1({name: 'classFormat', type: 'USHORT', value: 2}),
            ...recordList('rangeRecord', classDefTable.ranges, function(RangeRecord, i) {
                return [
                    describeTableFieldDescriptor1({name: /** @satisfies {`startGlyphID${typeof i}` } */ (`startGlyphID${i}`), type: 'USHORT', value: ( RangeRecord.start  ) , }),
                    describeTableFieldDescriptor1({name: /** @satisfies {  `endGlyphID${typeof i}` } */ (  `endGlyphID${i}`), type: 'USHORT', value: ( RangeRecord.end    ) , }),
                    describeTableFieldDescriptor1({name: /** @satisfies {       `class${typeof i}` } */ (       `class${i}`), type: 'USHORT', value: ( RangeRecord.classId) , }),
                ];
            }),
          ] ,
      ] :
      
      athrow(`[ClassDef.new] only supporting format 1 or 2 - instead got ${classDefTable} .`)
    ) ; return args ; } )() ) ;

    /* (re)declaring here as work-around until this thing start working */

    /** @type {CdeTableD["format"]} */
    this.format ;
    /** @type {(CdeTableD & { format: 1 } )["startGlyph"] =} */
    this.startGlyph ;
    /** @type {(CdeTableD & { format: 2 } )["ranges"] =} */
    this.ranges ;
  }
}

/** @typedef {ClassDefImpl & CdeTableD } ClassDef */
/** @type {new (...args: ConstructorParameters<typeof Table>) => ClassDef } */
const ClassDef = ClassDefImpl ;

// Record = same as Table, but inlined (a Table has an offset and its data is further in the stream)
// Don't use offsets inside Records (probable bug), only in Tables.
export default {
    Table,
    Record: Table,
    Coverage,
    ClassDef,
    ScriptList,
    FeatureList,
    LookupList,
    ushortList,
    tableList,
    recordList,
};

export {
  //
  Table,
  Coverage,
  ClassDef,
  ScriptList,
  FeatureList,
  LookupList,
} ;
