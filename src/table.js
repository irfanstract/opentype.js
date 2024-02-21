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
import check, { assert } from './check.js';
import { strConcatOf2, } from "./athrow.mjs";





import { encode, sizeOf } from './types.js';



class EcdTable
{
  
  /**
   * @exports opentype.Table 
   * @param {string} tableName
   * @param {readonly TableFieldDescriptorByTnV<string, unknown > [] | null } fields
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

  }
}

/**
 * create new
 * sub-class of {@link EcdTable} with given (term-level) title and (type-level) field-descriptor-array,
 * to be used in manner how {@link CoverageEcdTable} subclasses {@link CoverageEcdTableBase} (itself obtained from this method.)
 * 
 */
const otjsPreShapedTableConstructorVersioned = (
  /**
   * 
   * @param vh  the version-to-desc map
   * @param ivt you should leave this unset ; internally this is auxiliary
   * @type {<const tableNameT extends string, const definedTableFields extends TableFieldDescriptorByNameField<string>[] >(clsName: tableNameT , ivt ?: { DefinedFields: definedTableFields[] } ) => (new (fields: readonly [...definedTableFields ] ) => EcdTable & OtscByFieldNameArrayAsDict<definedTableFields[number]> ) }
   */
  function createTableClass(clsName, ivt = { DefinedFields: [] } ) {
    // clsName, fields
    const C = class extends EcdTable {
      get [Symbol.toStringTag]() { return clsName + "Table" ; }
      /**
       * @param {(typeof ivt)["DefinedFields"][number]} fields 
       */
      constructor(fields) {
        super(clsName, fields) ;
      }
    } ;
    return C ;
  }
) ;

/**
 * from field-desc-list `definedTableFields`, describe the regular, conforming record-type.
 * 
 * TODO when finally ES Records And Tuples comes out, try use those instead of plain object literal types
 * 
 * `<const tableNameT extends string, const definedTableFields extends TableFieldDescriptorByNameField<string>[] >`
 * 
 * @typedef { definedTableFields[number] extends infer D ? IThisParameterType<(D extends infer fieldDesc ? (this: FromEcdFieldDesc<TableFieldDescriptorByNameField<string> & fieldDesc> ) => void : never )> : never } FromEcdFieldList
 * 
 * @template {TableFieldDescriptorByNameField<string>[]} definedTableFields
 * 
 * @template {string} [tableNameT=string]
 * 
 */
const FromEcdFieldList = {} ;

(
  /**
   * @template {FromEcdFieldList<[{name: `${string}Count`, type: 'USHORT', value: number, }, {name: `${string}Tag`, type: 'TAG', value: string, }]> } FromEcdFieldListTest1
   * @param {FromEcdFieldList<[{name: `${string}Count`, type: 'USHORT', value: number, }, {name: `${string}Tag`, type: 'TAG', value: string, }, {name: "END", type: 'TAG', value: string, }]> } arg
   * 
   */
  (arg ) => {
    return /** @type {((typeof arg)[`${"string"}Count` ] )[] } */ ([]) ;
  }
) ;

/**
 * from field-desc `D`, describe the regular, conforming record-type.
 * 
 * in general
 * the resulting dict cannot be guaranteed to be single-field
 * unless `(any D).name` is monomorphic string literal type
 * (eg `"name"`, rather than `interpolateStringTemplate"glyph${i}Name"` )
 * 
 * `<const tableNameT extends string, const definedTableFields extends TableFieldDescriptorByNameField<string>[] >`
 * 
 * @typedef { { [key in D["name"] ]: D["value"] } } FromEcdFieldDesc
 * 
 * @template {TableFieldDescriptorByNameField<string> } D
 * 
 * @template {string} [tableNameT=string]
 * 
 */
const FromEcdFieldDesc = {} ;

/**
 * 
 * `<const tableNameT extends string, const definedTableFields extends TableFieldDescriptorByNameField<string>[] >`
 * 
 * @typedef { definedTableFields[number] } EcdFieldT
 * 
 * @template {TableFieldDescriptorByNameField<string>[]} definedTableFields
 * 
 * @template {string} [tableNameT=string]
 * 
 */

/**
 * @typedef {{ fieldDescs: TableFieldDescriptorByNameField<DefinedFieldName>[] } } OtscTbdsc
 * 
 * @property fieldDescs
 * 
 * @template {string } [DefinedFieldName=string]
 * 
 */

/**
 * @typedef {{ readonly [v in SupportedVersionNumber]: OtscTbdsc<DefinedFieldName> ; } } OtscVersionalTbdsc
 * 
 * @template {string | number | symbol } SupportedVersionNumber
 * 
 * @template {string } [DefinedFieldName=string]
 * 
 */

/**
 * @typedef {{ readonly [v in fieldDescs[number]["name"] ]: fieldDescs[number]["value"] ; } } OtscByFieldNameArrayAsDict
 * 
 * @template { TableFieldDescriptorByNameField<string>[] } fieldDescs
 * 
 */

/**
 * {@link EcdTable }, refined according to the {@link TableFieldDescriptorByNameField}s passed
 * 
 * @type {new <const tblName extends string, const flds extends TableFieldDescriptorByNameField<string>[]>(tableName: tblName, f: readonly [...flds] ) => EcdTable & FromEcdFieldList<flds> }
 */
// @ts-ignore
const IndexableEcdTable = EcdTable ;

/**
 * Encodes the table and returns an array of bytes
 * @return {any[] }
 */
EcdTable.prototype.encode = function() {
  return encode.TABLE(this);
};

/**
 * Get the size of the table.
 * @return {number}
 */
EcdTable.prototype.sizeOf = function() {
  return sizeOf.TABLE(this);
};

/**
 * @private
 * 
 */
const ushortList = (
  /**
   * 
   * @template {string } nm
   * @template T
   * 
   * @param {[...[expectedTbName: nm, srcAsArray: readonly T[], count ?: number] ] } args
   * 
   */
  function ushortListImpl(...[itemName, list, count]) {
    if (count === undefined) {
        count = list.length;
    }
    
    // /** @typedef {(typeof list )[number] } T */
    
    return /** @type {const} */ ([
      /** @satisfies {(TableFieldDescriptorByNmAndTypeAndValue<`${typeof itemName }${"Count" | number }` , "USHORT" , T | (typeof count) > ) } */ (
        {name: strConcatOf2(itemName, count), type: 'USHORT', value: count}
      ) ,
      ...(
        list
        .map((listItem, i) => /** @satisfies {(TableFieldDescriptorByNmAndTypeAndValue<`${typeof itemName }${"Count" | number }` , "USHORT" , T | (typeof count) > ) } */ (
          {name: strConcatOf2(itemName, i), type: 'USHORT', value: list[i] ?? athrow() }
        ) )
      ) ,
    ]) ;
  }
) ;

/**
 * @private
 * 
 */
const tableList = (
  /**
   * 
   * @template {string } tableTitleT
   * @template T
   * @template FnRT
   * @param {[...[expectedTbName: tableTitleT, srcAsArray: readonly T[]] , (item: T, i: number) => FnRT ] } args
   */
  function (...[itemName, records, itemCallback]) {
    const count = records.length;

    // /** @typedef {(typeof records )[keyof typeof records] } T */
    // /** @typedef {ReturnType<typeof itemCallback> } FnRT */
    
    return /** @type {const} */ ([
      /** @satisfies {(TableFieldDescriptorByNmAndTypeAndValue<`${typeof itemName }${"Count" | number }` , "USHORT" , T | (typeof count) > ) } */ (
        {name: `${itemName}Count`, type: 'USHORT', value: count}
      ) ,
      ...(
        records
        .map((rec, i) => /** @satisfies {(TableFieldDescriptorByNmAndTypeAndValue<string , string , FnRT > ) } */ (
          {name: `${itemName}${i}`, type: 'TABLE', value: itemCallback(rec, i)}
        ) )
      ) ,
    ]) ;
  }
) ;

/**
 * @private
 */
const recordList = (
  /**
   * 
   * @template T
   * @template {string } tbName
   * 
   * @param {[...[expectedTbName: tbName, srcAsArray: readonly T[]] , (item: T, i: number) => readonly TableFieldDescriptorByNmAndTypeAndValue<string, 'TAG' | 'TABLE' | 'USHORT', any >[] ] } args
   * 
   */
  function (...[itemName, records, itemCallback]) {
    const count = records.length;

    // /** @typedef {(typeof records )[keyof typeof records] } T */
    
    /** @typedef {ReturnType<typeof itemCallback>[number] } ReturnedEachRec */

    return /** @type {const} */ ([
      /** @satisfies {(TableFieldDescriptorByNmAndTypeAndValue<`${typeof itemName }${"Count" | number }` , "USHORT" , T | (typeof count) > ) } */ (
        {name: strConcatOf2(itemName, count), type: 'USHORT', value: count}
      ) ,
      ...(
        records.slice(0, count)
        .flatMap((listItem, i) => /** @satisfies {(TableFieldDescriptorByNmAndTypeAndValue<string , string , T | (typeof count) > )[] } */ (
          [...itemCallback(listItem ?? athrow(), i) ]
        ) )
      ) ,
    ]) ;
  } 
) ;

/**
 * @typedef {{name: Name, } & TableFieldDescriptorSubpartTypeAndValue<Type, Value> } TableFieldDescriptorByNmAndTypeAndValue
 * @template {string} Name
 * @template {string} Type
 * @template Value
 * 
 */
const TableFieldDescriptorByNmAndTypeAndValue = {} ;

/**
 * @typedef {{name: Name, } & TableFieldDescriptorSubpartTypeAndOptionalValue<Type, Value> } TableFieldDescriptorByNmAndTypeAndOptionalValue
 * @template {string} Name
 * @template {string} Type
 * @template Value
 * 
 */
const TableFieldDescriptorByNmAndTypeAndOptionalValue = {} ;

/**
 * @typedef {Required<TableFieldDescriptorSubpartTypeAndOptionalValue<Type, Value > > } TableFieldDescriptorSubpartTypeAndValue
 * @template {string} Type
 * @template Value
 * 
 */
const TableFieldDescriptorSubpartTypeAndValue = {} ;

/**
 * @typedef {{ type: Type, value?: Value, } } TableFieldDescriptorSubpartTypeAndOptionalValue
 * @template {string} Type
 * @template Value
 * 
 */
const TableFieldDescriptorSubpartTypeAndOptionalValue = {} ;

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

const CoverageEcdTableBase = (
  otjsPreShapedTableConstructorVersioned('coverageTable' , {
    DefinedFields: 
    /**
     * @type {(
     *   | [(TableFieldDescriptorByNmAndTypeAndValue<'coverageFormat', 'USHORT', 1> ) , ...(TableFieldDescriptorByNmAndTypeAndValue<`glyph${number}` | "glyphCount", "USHORT", {}> )[] ]
     *   | [(TableFieldDescriptorByNmAndTypeAndValue<'coverageFormat', 'USHORT', 2> ) , ...(TableFieldDescriptorByNmAndTypeAndValue<string, "TAG" | "TABLE" | "USHORT", {}>        )[] ]
     * )[] }
     *  */ ([]) ,
  } )
) ;

/**
 * 
 */
class CoverageEcdTable extends CoverageEcdTableBase
{
  /**
   * 
   * @class
   * @param {KtOtjsSupportedOtfCoverageTableImpl } coverageTable
   * 
   */
  constructor(coverageTable)
  {
    super((
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

      athrow(`[CoverageEcdTable.new] only supporting format 1 or 2 - instead got ${coverageTable} .`)
    ) ) ;

  }
}

/** @type {new (...args: ConstructorParameters<typeof EcdTable>) => (EcdTable) } */
const SlTableBase = EcdTable ;

/**
 * 
 * @class
 */
class ScriptListEcdTable extends SlTableBase
{
  /**
   * 
   * @class
   * @param {EcdTable} scriptListTable
   */  
  constructor(scriptListTable)
  {
    super('scriptListTable',
        recordList('scriptRecord', scriptListTable, function(scriptRecord, i) {
            const script = scriptRecord.script;
            let defaultLangSys = script.defaultLangSys;
            assert(!!defaultLangSys, 'Unable to write GSUB: script ' + scriptRecord.tag + ' has no default language system.');
            return [
                {name: 'scriptTag' + i, type: 'TAG', value: scriptRecord.tag},
                {name: 'script' + i, type: 'TABLE', value: new EcdTable('scriptTable', [
                    {name: 'defaultLangSys', type: 'TABLE', value: new EcdTable('defaultLangSys', [
                        {name: 'lookupOrder', type: 'USHORT', value: 0},
                        {name: 'reqFeatureIndex', type: 'USHORT', value: defaultLangSys.reqFeatureIndex},
                        ... ushortList('featureIndex', defaultLangSys.featureIndexes)]
                    )} , ... recordList('langSys', script.langSysRecords, function(langSysRecord, i) {
                    const langSys = langSysRecord.langSys;
                    return [
                        {name: 'langSysTag' + i, type: 'TAG', value: langSysRecord.tag},
                        {name: 'langSys' + i, type: 'TABLE', value: new EcdTable('langSys', [
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

class FeatureListEcdTable extends EcdTable
{
  /**
   * 
   * @class
   * @param {{}[]} featureListTable
   * @constructor
   */
  constructor(featureListTable)
  {
    super('featureListTable',
        recordList('featureRecord', featureListTable, function(featureRecord, i) {
            const feature = featureRecord.feature;
            return [
                {name: 'featureTag' + i, type: 'TAG', value: featureRecord.tag},
                {name: 'feature' + i, type: 'TABLE', value: new EcdTable('featureTable', [
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
 * @typedef {((item: any, i: number) => any )[] } LookupListIngrSubtableMakers
 * 
 */

const LookupListEcdTableBase = (
  otjsPreShapedTableConstructorVersioned('lookupListTable' , {
    DefinedFields: 
    // /**
    //  * @type {(
    //  *   | [(TableFieldDescriptorByNmAndTypeAndValue<'coverageFormat', 'USHORT', 1> ) , ...(TableFieldDescriptorByNmAndTypeAndValue<`glyph${number}` | "glyphCount", "USHORT", {}> )[] ]
    //  *   | [(TableFieldDescriptorByNmAndTypeAndValue<'coverageFormat', 'USHORT', 2> ) , ...(TableFieldDescriptorByNmAndTypeAndValue<string, "TAG" | "TABLE" | "USHORT", {}>        )[] ]
    //  * )[] }
    //  *  */ ([])
    /**
     * @type {(
     *   | TableFieldDescriptorByNameField<string>[]
     * )[] }
     *  */ ([])
     ,
  } )
) ;

/**
 * 
 * @class
 */
class LookupListEcdTable extends LookupListEcdTableBase
{
  /**
   * 
   * @class
   * @param {{}[]} lookupListTable
   * @param {LookupListIngrSubtableMakers} subtableMakers
   */
  constructor(lookupListTable, subtableMakers)
  {
    super(tableList('lookup', lookupListTable, function(lookupTable) {
        let subtableCallback = subtableMakers[lookupTable.lookupType] ?? athrow(`[LookupListEcdTable.new] [subtableCallback] nf`) ;

        assert(!!subtableCallback, 'Unable to write GSUB lookup type ' + lookupTable.lookupType + ' tables.');
        return new EcdTable('lookupTable', [
            {name: 'lookupType', type: 'USHORT', value: lookupTable.lookupType},
            {name: 'lookupFlag', type: 'USHORT', value: lookupTable.lookupFlag}
            ,
            ...tableList('subtable', lookupTable.subtables, subtableCallback)
            ,
        ]);
    }));
  }
}

/** @typedef {KtOtjsSupportedOtfClassDefTableImpl } CdeTableD */

/**
 * @class
 * @constructor
 *
 * @see https://learn.microsoft.com/en-us/typography/opentype/spec/chapter2#class-definition-table
 */
class ClassDefImpl extends EcdTable
{
  /**
   * @exports opentype.ClassDefEcdTable
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
    { const args = /** @satisfies {ConstructorParameters<typeof EcdTable> & { 0: 'classDefTable' } } */ (
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
      
      athrow(`[ClassDefEcdTable.new] only supporting format 1 or 2 - instead got ${classDefTable} .`)
    ) ; return args ; } )() ) ;

    /* (re)declaring here as work-around until this thing start working */

  }
}

/** @typedef {ClassDefImpl & CdeTableD } ClassDefEcdTable */
/** @type {new (...args: ConstructorParameters<typeof EcdTable>) => ClassDefEcdTable } */
const ClassDefEcdTable = ClassDefImpl ;

/**
 * {@link EcdTable }, refined according to the {@link TableFieldDescriptorByNameField}s passed
 * 
 * @type {new <const tblName extends string, const flds extends readonly Partial<TableFieldDescriptorByNmAndTypeAndOptionalValue<string, string, unknown> >[]>(tableName: tblName, f: flds ) => EcdTable & FromEcdFieldList<[...flds]> }
 */
// @ts-ignore
const IndexableHalfBuiltEcdTable = EcdTable ;

/**
 * {@link EcdTable }, refined according to the {@link TableFieldDescriptorByNameField}s passed
 * 
 * @type {new <const tblName extends string, const DefinedFld extends TableFieldDescriptorByNmAndTypeAndOptionalValue<string, string, unknown> >(tableName: tblName, f: readonly DefinedFld[] ) => EcdTable & FromEcdFieldList<(DefinedFld)[] > }
 */
// @ts-ignore
const IndexableHalfBuiltEcdTableAlt = EcdTable ;

// Record = same as Table, but inlined (a Table has an offset and its data is further in the stream)
// Don't use offsets inside Records (probable bug), only in Tables.
export default {
    EcdTable ,
    IndexableEcdTable ,
    /** @deprecated alias of {@link EcdTable} you should directly refer instead. */
    Table: EcdTable ,
    Record: IndexableEcdTable,
    IndexableHalfBuiltEcdTable ,
    IndexableHalfBuiltEcdTableAlt ,
    CoverageEcdTable,
    ClassDefEcdTable,
    ScriptListEcdTable,
    FeatureListEcdTable,
    LookupListEcdTable,
    ushortList,
    tableList,
    recordList,
};

export {
  //
  EcdTable ,
  IndexableEcdTable ,
  /** @deprecated alias of {@link EcdTable} you should directly refer instead. */
  EcdTable as Table,
  IndexableHalfBuiltEcdTable ,
  FromEcdFieldList ,
  FromEcdFieldDesc ,
  otjsPreShapedTableConstructorVersioned ,
  CoverageEcdTable,
  ClassDefEcdTable,
  ScriptListEcdTable,
  FeatureListEcdTable,
  LookupListEcdTable,
} ;
export {
  //
  TableFieldDescriptorByNmAndTypeAndValue ,
  TableFieldDescriptorSubpartTypeAndValue ,
  TableFieldDescriptorByNmAndTypeAndOptionalValue ,
} ;
