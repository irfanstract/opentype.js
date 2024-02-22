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





import { encode, sizeOf } from './types.js';



/**
 * @exports opentype.Table
 * @class
 * @param {string} tableName
 * @param {TableFieldDescriptorByTnV<string, unknown > [] } fields
 * @param {{ [key: string]: unknown ; }} [options]
 * @constructor
 */
function Table(tableName, fields, options)
{
  {
    /** @type {<T> (value: T) => asserts value is (T & { [key: string]: unknown ; }) } */ const AS_INDEXED = (v => {}) ;
    AS_INDEXED(this) ;

    if (fields && fields.length) {
        for (let i = 0; i < fields.length; i += 1) {
            const field = fields[i] ?? athrow(`assertion failed`) ;
            this[field.name] = field.value;
        }
    }

    this.tableName = tableName;
    this.fields = fields;
    if (options) {
        const optionKeys = Object.keys(options);
        for (let i = 0; i < optionKeys.length; i += 1) {
            const k = optionKeys[i] ?? athrow(`assertion failed`) ;
            const v = options[k];
            if (this[k] !== undefined) {
                this[k] = v;
            }
        }
    }

    // TODO
    /** @type {number=} */
    this.format ;
    /** @type {number=} */
    this.coverageFormat ;
  }
}

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
 * @type {<T extends {}>(...args: [...[expectedTbName: string, srcAsArray: readonly T[], count ?: number] ] ) => (TableFieldDescriptorByTnV<"USHORT", number | T > )[] }
 * 
 */
function ushortList(itemName, list, count) {
    if (count === undefined) {
        count = list.length;
    }
    
    /** @typedef {(typeof list )[number] } T */
    
    /** @type {ReturnType<typeof ushortList<T> >[number] [] } */
    const fields = new Array(list.length + 1);
    fields[0] = {name: itemName + 'Count', type: 'USHORT', value: count};
    for (let i = 0; i < list.length; i++) {
      fields[i + 1] = {name: itemName + i, type: 'USHORT', value: list[i] ?? athrow() };
    }
    return fields;
}

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
 * @type {(
 * <T>(...args: [...[expectedTbName: string, srcAsArray: readonly T[]] , (item: T, i: number) => TableFieldDescriptorByTnV<'TAG' | 'TABLE' | 'USHORT', any >[] ] )
 * => (ReturnType<(typeof args)[2] >[number] )[] 
 * )}
 */
function recordList(itemName, records, itemCallback) {
    const count = records.length;

    /** @type {(ReturnType<typeof itemCallback >[number] ) [] } */
    let fields = [];
    fields[0] = {name: itemName + 'Count', type: 'USHORT', value: count};
    for (let i = 0; i < count; i++) {
        fields = [...fields, ...itemCallback(records[i] ?? athrow(), i) ] ;
    }
    return fields;
}

/**
 * @typedef {{name: string, type: Type, value: Value } } TableFieldDescriptorByTnV
 * @template {string} Type
 * @template Value
 * 
 */
const TableFieldDescriptorByTnV = {} ;

export { TableFieldDescriptorByTnV, } ;



// Common Layout Tables

/**
 * 
 * @class
 * @param {Table & ( { format: 1 ; glyphs: any[] } | { format: 2 ; ranges: any[] } )} coverageTable
 * @constructor
 * @extends Table
 */
function Coverage(coverageTable)
{
    if (coverageTable.format === 1) {
        Table.call(this, 'coverageTable',
            [{name: 'coverageFormat', type: 'USHORT', value: 1} , ... ushortList('glyph', coverageTable.glyphs) ]
        );
    } else if (coverageTable.format === 2) {
        Table.call(this, 'coverageTable',
            [{name: 'coverageFormat', type: 'USHORT', value: 2} , ... recordList('rangeRecord', coverageTable.ranges, function(RangeRecord, i) {
              return [
                  {name: 'startGlyphID' + i, type: 'USHORT', value: RangeRecord.start},
                  {name: 'endGlyphID' + i, type: 'USHORT', value: RangeRecord.end},
                  {name: 'startCoverageIndex' + i, type: 'USHORT', value: RangeRecord.index},
              ];
          }) ]
        );
    } else {
        athrow(`[Coverage.new] only supporting format 1 or 2 - instead got ${coverageTable} .`);
    }
}
Coverage.prototype = Object.create(Table.prototype);
Coverage.prototype.constructor = Coverage;

/**
 * 
 * @class
 * @param {Table} scriptListTable
 * @extends {Table}
 */
function ScriptList(scriptListTable)
{
    Table.call(this, 'scriptListTable',
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
ScriptList.prototype = Object.create(Table.prototype);
ScriptList.prototype.constructor = ScriptList;

/**
 * 
 * @class
 * @param {Table} featureListTable
 * @constructor
 * @extends Table
 */
function FeatureList(featureListTable)
{
    Table.call(this, 'featureListTable',
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
FeatureList.prototype = Object.create(Table.prototype);
FeatureList.prototype.constructor = FeatureList;

// TODO
/**
 * @typedef {{ [key: string]: (item: any, i: number) => any ; } } LookupListIngrSubtableMakers
 * 
 */

/**
 * 
 * @class
 * @param {Table} lookupListTable
 * @param {LookupListIngrSubtableMakers} subtableMakers
 * @constructor
 * @extends Table
 */
function LookupList(lookupListTable, subtableMakers)
{
    Table.call(this, 'lookupListTable', tableList('lookup', lookupListTable, function(lookupTable) {
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
LookupList.prototype = Object.create(Table.prototype);
LookupList.prototype.constructor = LookupList;

/**
 * @exports opentype.ClassDef
 * @class
 * @param {Table & ( { format: 1 ; classes: any[] ; startGlyph: number ; } | { format: 2 ; ranges: any[] } )} classDefTable
 * @constructor
 * @extends Table
 *
 * @see https://learn.microsoft.com/en-us/typography/opentype/spec/chapter2#class-definition-table
 */
function ClassDef(classDefTable)
{
    if (classDefTable.format === 1) {
        Table.call(this, 'classDefTable',
            [
                {name: 'classFormat', type: 'USHORT', value: 1},
                {name: 'startGlyphID', type: 'USHORT', value: classDefTable.startGlyph}
                ,
                ...ushortList('glyph', classDefTable.classes)
                ,
              ]
        );
    } else if (classDefTable.format === 2) {
        Table.call(this, 'classDefTable',
            [{name: 'classFormat', type: 'USHORT', value: 2},
                ...recordList('rangeRecord', classDefTable.ranges, function(RangeRecord, i) {
                    return [
                        {name: 'startGlyphID' + i, type: 'USHORT', value: RangeRecord.start},
                        {name: 'endGlyphID' + i, type: 'USHORT', value: RangeRecord.end},
                        {name: 'class' + i, type: 'USHORT', value: RangeRecord.classId},
                    ];
                }) ]
        );
    } else {
        check.assert(false, 'Class format must be 1 or 2.');
    }
}
ClassDef.prototype = Object.create(Table.prototype);
ClassDef.prototype.constructor = ClassDef;

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
