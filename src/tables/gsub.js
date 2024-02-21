// The `GSUB` table contains ligatures, among other things.
// https://www.microsoft.com/typography/OTSPEC/gsub.htm

import { athrow, assertionFail } from '../athrow.mjs';
import check, { assert, fail, } from '../check.js';
import { reiterableBy, } from '../itertools.mjs';

import { Parser } from '../parse.js';
import table, { Table } from '../table.js';

/**
 * @type {((this: Parser ) => (KtOtjsSupportedOtfGlyphSubstituteTable extends infer S ? Partial<S> : never ) )[] }
 */
const subtableParsers = new Array(9);         // subtableParsers[0] is unused

/** @param {Parser} p */
const parseCoverageFrom = (p) => /** @type {KtOtjsSupportedOtfCoverageTableImpl } */ (
    p.parsePointer(Parser.coverage)
    ?? athrow(`error: failed to parse the coverage-table.`)
) ;

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#SS
subtableParsers[1] = function parseLookup1() {
    const start = this.offset + this.relativeOffset;
    const substFormat = this.parseUShort();
    if (substFormat === 1) {
        return {
            substFormat: 1,
            coverage: parseCoverageFrom(this) ,
            deltaGlyphId: this.parseShort()
        };
    } else if (substFormat === 2) {
        return {
            substFormat: 2,
            coverage: parseCoverageFrom(this) ,
            substitute: this.parseOffset16List()
        };
    }
    return athrow(`error at 0x${start.toString(16)}: lookup type 1 format must be 1 or 2.`);
};

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#MS
subtableParsers[2] = function parseLookup2() {
    const substFormat = this.parseUShort();
    return (substFormat === 1) ? {
        substFormat: substFormat,
        coverage: parseCoverageFrom(this),
        sequences: this.parseListOfLists()
    } : athrow(`got fmt=${substFormat} instead. GSUB Multiple Substitution Subtable identifier-format must be 1. `) ;
};

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#AS
subtableParsers[3] = function parseLookup3() {
    const substFormat = this.parseUShort();
    return (substFormat === 1) ? {
        substFormat: substFormat,
        coverage: parseCoverageFrom(this),
        alternateSets: this.parseListOfLists()
    } : athrow(`got fmt=${substFormat} instead. GSUB Alternate Substitution Subtable identifier-format must be 1`) ;
};

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#LS
subtableParsers[4] = function parseLookup4() {
    const substFormat = this.parseUShort();
    return (substFormat === 1 ) ? {
        substFormat: substFormat,
        coverage: parseCoverageFrom(this),
        ligatureSets: this.parseListOfLists(function() {
            return {
                ligGlyph: this.parseUShort(),
                components: this.parseUShortList(this.parseUShort() - 1)
            };
        })
    } : athrow(`got fmt=${substFormat} instead. GSUB ligature table identifier-format must be 1 `)  ;
};

const lookupRecordDesc = {
    sequenceIndex: Parser.uShort,
    lookupListIndex: Parser.uShort
};

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#CSF
subtableParsers[5] = function parseLookup5() {
    const start = this.offset + this.relativeOffset;
    const substFormat = this.parseUShort();

    if (substFormat === 1) {
        return {
            substFormat: substFormat,
            coverage: parseCoverageFrom(this) ,
            ruleSets: this.parseListOfLists(function() {
                const glyphCount = this.parseUShort();
                const substCount = this.parseUShort();
                return {
                    input: this.parseUShortList(glyphCount - 1),
                    lookupRecords: this.parseRecordList(substCount, lookupRecordDesc)
                };
            })
        };
    } else if (substFormat === 2) {
        return {
            substFormat: substFormat,
            coverage: parseCoverageFrom(this) ,
            classDef: this.parsePointer(Parser.classDef),
            classSets: this.parseListOfLists(function() {
                const glyphCount = this.parseUShort();
                const substCount = this.parseUShort();
                return {
                    classes: this.parseUShortList(glyphCount - 1),
                    lookupRecords: this.parseRecordList(substCount, lookupRecordDesc)
                };
            })
        };
    } else if (substFormat === 3) {
        const glyphCount = this.parseUShort();
        const substCount = this.parseUShort();
        return {
            substFormat: substFormat,
            coverages: this.parseList(glyphCount, Parser.pointer(Parser.coverage)),
            lookupRecords: this.parseRecordList(substCount, lookupRecordDesc)
        };
    }
    return athrow(`error at 0x${start.toString(16)}: lookup type 5 format must be 1, 2 or 3.`);
};

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#CC
subtableParsers[6] = function parseLookup6() {
    const start = this.offset + this.relativeOffset;
    const substFormat = this.parseUShort();
    if (substFormat === 1) {
        return {
            substFormat: 1,
            coverage: this.parsePointer(Parser.coverage),
            chainRuleSets: this.parseListOfLists(function() {
                return {
                    backtrack: this.parseUShortList(),
                    input: this.parseUShortList(this.parseShort() - 1),
                    lookahead: this.parseUShortList(),
                    lookupRecords: this.parseRecordList(lookupRecordDesc)
                };
            })
        };
    } else if (substFormat === 2) {
        return {
            substFormat: 2,
            coverage: this.parsePointer(Parser.coverage),
            backtrackClassDef: this.parsePointer(Parser.classDef),
            inputClassDef: this.parsePointer(Parser.classDef),
            lookaheadClassDef: this.parsePointer(Parser.classDef),
            chainClassSet: this.parseListOfLists(function() {
                return {
                    backtrack: this.parseUShortList(),
                    input: this.parseUShortList(this.parseShort() - 1),
                    lookahead: this.parseUShortList(),
                    lookupRecords: this.parseRecordList(lookupRecordDesc)
                };
            })
        };
    } else if (substFormat === 3) {
        return {
            substFormat: 3,
            backtrackCoverage: this.parseList(Parser.pointer(Parser.coverage)),
            inputCoverage: this.parseList(Parser.pointer(Parser.coverage)),
            lookaheadCoverage: this.parseList(Parser.pointer(Parser.coverage)),
            lookupRecords: this.parseRecordList(lookupRecordDesc)
        };
    }
    return athrow('0x' + start.toString(16) + ': lookup type 6 format must be 1, 2 or 3.');
};

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#ES
subtableParsers[7] = function parseLookup7() {
    // Extension Substitution subtable
    const substFormat = this.parseUShort();
    assert(substFormat === 1, 'GSUB Extension Substitution subtable identifier-format must be 1');
    const extensionLookupType = this.parseUShort();
    const extensionParser = new Parser(this.data, this.offset + this.parseULong());
    return {
        substFormat: 1,
        lookupType: extensionLookupType,
        extension: subtableParsers[extensionLookupType].call(extensionParser)
    };
};

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#RCCS
subtableParsers[8] = function parseLookup8() {
    const substFormat = this.parseUShort();
    assert(substFormat === 1, 'GSUB Reverse Chaining Contextual Single Substitution Subtable identifier-format must be 1');
    return {
        substFormat: substFormat,
        coverage: this.parsePointer(Parser.coverage),
        backtrackCoverage: this.parseList(Parser.pointer(Parser.coverage)),
        lookaheadCoverage: this.parseList(Parser.pointer(Parser.coverage)),
        substitutes: this.parseUShortList()
    };
};

// https://www.microsoft.com/typography/OTSPEC/gsub.htm
function parseGsubTable(data, start) {
    start = start || 0;
    const p = new Parser(data, start);
    const tableVersion = p.parseVersion(1);
    assert(tableVersion === 1 || tableVersion === 1.1, 'Unsupported GSUB table version.');
    if (tableVersion === 1) {
        return {
            version: tableVersion,
            scripts: p.parseScriptList(),
            features: p.parseFeatureList(),
            lookups: p.parseLookupList(subtableParsers)
        };
    } else {
        return {
            version: tableVersion,
            scripts: p.parseScriptList(),
            features: p.parseFeatureList(),
            lookups: p.parseLookupList(subtableParsers),
            variations: p.parseFeatureVariationsList()
        };
    }

}

// GSUB Writing //////////////////////////////////////////////
/**
 * @type {((x: KtOtjsSupportedOtfGlyphSubstituteTable ) => Table )[] }
 */
const subtableMakers = new Array(9);

subtableMakers[1] = function makeLookup1(subtable) {
    if (subtable.substFormat === 1) {
        return new table.Table('substitutionTable', [
            {name: 'substFormat', type: 'USHORT', value: 1},
            {name: 'coverage', type: 'TABLE', value: new table.CoverageEcdTable(subtable.coverage)},
            {name: 'deltaGlyphID', type: 'SHORT', value: subtable.deltaGlyphId}
        ]);
    } else if (subtable.substFormat === 2) {
        return new table.Table('substitutionTable', [
            {name: 'substFormat', type: 'USHORT', value: 2},
            {name: 'coverage', type: 'TABLE', value: new table.CoverageEcdTable(subtable.coverage)}
        ].concat(table.ushortList('substitute', subtable.substitute)));
    }
    return assertionFail('Lookup type 1 substFormat must be 1 or 2.');
};

subtableMakers[2] = function makeLookup2(subtable) {
    assert(subtable.substFormat === 1, 'Lookup type 2 substFormat must be 1.');
    return new table.Table('substitutionTable', [
        {name: 'substFormat', type: 'USHORT', value: 1},
        {name: 'coverage', type: 'TABLE', value: new table.CoverageEcdTable(subtable.coverage)}
    ].concat(table.tableList('seqSet', subtable.sequences, function(sequenceSet) {
        return new table.Table('sequenceSetTable', table.ushortList('sequence', sequenceSet));
    })));
};

subtableMakers[3] = function makeLookup3(subtable) {
    assert(subtable.substFormat === 1, 'Lookup type 3 substFormat must be 1.');
    return new table.Table('substitutionTable', [
        {name: 'substFormat', type: 'USHORT', value: 1},
        {name: 'coverage', type: 'TABLE', value: new table.CoverageEcdTable(subtable.coverage)}
    ].concat(table.tableList('altSet', subtable.alternateSets, function(alternateSet) {
        return new table.Table('alternateSetTable', table.ushortList('alternate', alternateSet));
    })));
};

subtableMakers[4] = function makeLookup4(subtable) {
    assert(subtable.substFormat === 1, 'Lookup type 4 substFormat must be 1.');
    return new table.Table('substitutionTable', [
        {name: 'substFormat', type: 'USHORT', value: 1},
        {name: 'coverage', type: 'TABLE', value: new table.CoverageEcdTable(subtable.coverage)}
    ].concat(table.tableList('ligSet', subtable.ligatureSets, function(ligatureSet) {
        return new table.Table('ligatureSetTable', table.tableList('ligature', ligatureSet, function(ligature) {
            return new table.Table('ligatureTable',
                [{name: 'ligGlyph', type: 'USHORT', value: ligature.ligGlyph}]
                    .concat(table.ushortList('component', ligature.components, ligature.components.length + 1))
            );
        }));
    })));
};

subtableMakers[5] = function makeLookup5(subtable) {
    if (subtable.substFormat === 1) {
        return new table.Table('contextualSubstitutionTable', [
            {name: 'substFormat', type: 'USHORT', value: subtable.substFormat},
            {name: 'coverage', type: 'TABLE', value: new table.CoverageEcdTable(subtable.coverage)}
        ].concat(table.tableList('sequenceRuleSet', subtable.ruleSets, function(sequenceRuleSet) {
            if (!sequenceRuleSet) {
                return new table.Table('NULL', null);
            }
            return new table.Table('sequenceRuleSetTable', table.tableList('sequenceRule', sequenceRuleSet, function(sequenceRule) {
                const tableData = [...reiterableBy(/** @return {Generator<KtOtjsAttribDescSupported> } */ function* () {
                    yield* (
                        [
                            ...table.ushortList('seqLookup', [], sequenceRule.lookupRecords.length) ,
                            ...table.ushortList('inputSequence', sequenceRule.input, sequenceRule.input.length + 1),
                        ]
                        // swap the first two elements, because inputSequenceCount
                        // ("glyphCount" in the spec) comes before seqLookupCount
                        .map((v, i, s) => {
                            switch (i) {
                                case 0 : case 1 :
                                    return s[1 - i] ?? athrow() ;
                                default :
                                    return v ;
                            }
                        } )
                    ) ;

                    for (const [i, record] of [...sequenceRule.lookupRecords ].entries() )
                    {
                        yield {name:   `sequenceIndex${i}`, type: 'USHORT', value: record.sequenceIndex} ;
                        yield {name: `lookupListIndex${i}`, type: 'USHORT', value: record.lookupListIndex} ;
                    }

                    ;
                } ) ] ;

                return new table.Table('sequenceRuleTable', tableData);
            }));
        })));
    } else if (subtable.substFormat === 2) {
        return new table.Table('contextualSubstitutionTable', [
            {name: 'substFormat', type: 'USHORT', value: subtable.substFormat},
            {name: 'coverage', type: 'TABLE', value: new table.CoverageEcdTable(subtable.coverage)},
            {name: 'classDef', type: 'TABLE', value: new table.ClassDefEcdTable(subtable.classDef)}
        ].concat(table.tableList('classSeqRuleSet', subtable.classSets, function(classSeqRuleSet) {
            if (!classSeqRuleSet) {
                return new table.Table('NULL', null);
            }
            return new table.Table('classSeqRuleSetTable', table.tableList('classSeqRule', classSeqRuleSet, function(classSeqRule) {

                const tableData = [...reiterableBy(/** @return {Generator<KtOtjsAttribDesc> } */ function* () {
                    yield* table.ushortList('classes', classSeqRule.classes, classSeqRule.classes.length + 1) ;
                    yield* table.ushortList('seqLookupCount', [], classSeqRule.lookupRecords.length) ;

                    for (const [i, record] of [...classSeqRule.lookupRecords ].entries() )
                    {
                        yield {name: `sequenceIndex${i}`  , type: 'USHORT', value: record.sequenceIndex   } ;
                        yield {name: `lookupListIndex${i}`, type: 'USHORT', value: record.lookupListIndex } ;
                    }
                } ) ] ;
                return new table.Table('classSeqRuleTable', tableData);
            }));
        })));
    } else if (subtable.substFormat === 3) {

        const tableData = [...reiterableBy(/** @return {Generator<KtOtjsAttribDesc> } */ function* () {
            // yield* table.ushortList('classes', classSeqRule.classes, classSeqRule.classes.length + 1) ;
            // yield* table.ushortList('seqLookupCount', [], classSeqRule.lookupRecords.length) ;

            yield {name: 'substFormat', type: 'USHORT', value: subtable.substFormat} ;

            yield {name: 'inputGlyphCount', type: 'USHORT', value: subtable.coverages.length} ;
            yield {name: 'substitutionCount', type: 'USHORT', value: subtable.lookupRecords.length} ;
            for (const [i, coverage] of [...subtable.coverages ].entries() )
            {
                yield {name: `inputCoverage${i}`, type: 'TABLE', value: new table.CoverageEcdTable(coverage) } ;
            }

            for (const [i, record] of [...subtable.lookupRecords ].entries() )
            {
                yield {name: `sequenceIndex${i}`  , type: 'USHORT', value: record.sequenceIndex   } ;
                yield {name: `lookupListIndex${i}`, type: 'USHORT', value: record.lookupListIndex } ;
            }
        } ) ] ;

        let returnTable = new table.Table('contextualSubstitutionTable', tableData);

        return returnTable;
    }

    return athrow('lookup type 5 format must be 1, 2 or 3.');
};

subtableMakers[6] = function makeLookup6(subtable) {
    if (subtable.substFormat === 1) {
        let returnTable = new table.Table('chainContextTable', [
            {name: 'substFormat', type: 'USHORT', value: subtable.substFormat},
            {name: 'coverage', type: 'TABLE', value: new table.CoverageEcdTable(subtable.coverage)}
        ].concat(table.tableList('chainRuleSet', subtable.chainRuleSets, function(chainRuleSet) {
            return new table.Table('chainRuleSetTable', table.tableList('chainRule', chainRuleSet, function(chainRule) {

                const tableData = [...reiterableBy(/** @return {Generator<KtOtjsAttribDesc> } */ function* () {
                    yield* table.ushortList('backtrackGlyph', chainRule.backtrack, chainRule.backtrack.length ) ;
                    yield* table.ushortList('inputGlyph'    , chainRule.input, chainRule.input.length + 1     ) ;
                    yield* table.ushortList('lookaheadGlyph', chainRule.lookahead, chainRule.lookahead.length ) ;
                    yield* table.ushortList('substitution'  , [], chainRule.lookupRecords.length              ) ;

                    for (const [i, record] of [...chainRule.lookupRecords ].entries() )
                    {
                        yield {name: `sequenceIndex${i}`  , type: 'USHORT', value: record.sequenceIndex   } ;
                        yield {name: `lookupListIndex${i}`, type: 'USHORT', value: record.lookupListIndex } ;
                    }
                } ) ] ;
                return new table.Table('chainRuleTable', tableData);
            }));
        })));
        return returnTable;
    } else if (subtable.substFormat === 2) {
        return athrow('lookup type 6 format 2 is not yet supported.');
    } else if (subtable.substFormat === 3) {
        const tableData = [...reiterableBy(/** @return {Generator<KtOtjsAttribDescSupported> } */ function* () {
        yield {name: 'substFormat', type: 'USHORT', value: subtable.substFormat} ;
        
        yield ({name: 'backtrackGlyphCount', type: 'USHORT', value: subtable.backtrackCoverage.length});
        for(const [i, coverage] of [... subtable.backtrackCoverage].entries() )
        {
            yield ({name: `backtrackCoverage${i}`, type: 'TABLE', value: new table.CoverageEcdTable(coverage)});
        }

        yield ({name: 'inputGlyphCount', type: 'USHORT', value: subtable.inputCoverage.length});
        for(const [i, coverage] of [... subtable.inputCoverage].entries() )
        {
            yield ({name: `inputCoverage${i}`, type: 'TABLE', value: new table.CoverageEcdTable(coverage)});
        }

        yield ({name: 'lookaheadGlyphCount', type: 'USHORT', value: subtable.lookaheadCoverage.length});
        for(const [i, coverage] of [... subtable.lookaheadCoverage].entries() )
        {
            yield ({name: `lookaheadCoverage${i}`, type: 'TABLE', value: new table.CoverageEcdTable(coverage)});
        }

        yield ({name: 'substitutionCount', type: 'USHORT', value: subtable.lookupRecords.length});
        for(const [i, record] of [... subtable.lookupRecords].entries() )
        {
            yield {name: `sequenceIndex${i}`, type: 'USHORT', value: record.sequenceIndex} ;
            yield {name: `lookupListIndex${i}`, type: 'USHORT', value: record.lookupListIndex} ;
        }
        
        } ) ] ;

        let returnTable = new table.Table('chainContextTable', tableData);

        return returnTable;
    }

    return athrow('lookup type 6 format must be 1, 2 or 3.');
};

function makeGsubTable(gsub) {
    return new table.Table('GSUB', [
        {name: 'version', type: 'ULONG', value: 0x10000},
        {name: 'scripts', type: 'TABLE', value: new table.ScriptListEcdTable(gsub.scripts)},
        {name: 'features', type: 'TABLE', value: new table.FeatureListEcdTable(gsub.features)},
        {name: 'lookups', type: 'TABLE', value: new table.LookupListEcdTable(gsub.lookups, subtableMakers)}
    ]);
}

export default { parse: parseGsubTable, make: makeGsubTable };
