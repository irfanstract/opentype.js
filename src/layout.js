// The Layout object is the prototype of Substitution objects, and provides
// utility methods to manipulate common layout tables (GPOS, GSUB, GDEF...)

import { athrow, } from './athrow.mjs';

import { Table, ClassDef, Coverage } from './table.js';

import check from './check.js';

/**
 * Binary search an object by "tag" property
 * 
 * @instance
 * @function searchTag
 * @memberof opentype.Layout
 * @param  {ReadonlyArray} src
 * @param  {string} tag tag
 * @return {number}
 */
function searchTag(src, tag) {
    /* jshint bitwise: false */
    let imin = 0;
    let imax = src.length - 1;
    while (imin <= imax) {
        const imid = (imin + imax) >>> 1;
        const val = src[imid].tag;
        if (val === tag) {
            return imid;
        } else if (val < tag) {
            imin = imid + 1;
        } else { imax = imid - 1; }
    }
    // Not found: return -1-insertion point
    return -imin - 1;
}

/**
 * Binary search in a list of numbers
 * 
 * @instance
 * @function binSearch
 * @memberof opentype.Layout
 * @param  {ReadonlyArray} src
 * @param  {number} value value
 * @return {number}
 */
function binSearch(src, value) {
    /* jshint bitwise: false */
    let imin = 0;
    let imax = src.length - 1;
    while (imin <= imax) {
        const imid = (imin + imax) >>> 1;
        const val = src[imid];
        if (val === value) {
            return imid;
        } else if (val < value) {
            imin = imid + 1;
        } else { imax = imid - 1; }
    }
    // Not found: return -1-insertion point
    return -imin - 1;
}

// 
/**
 * binary search in a list of ranges (coverage, class definition)
 * 
 * @param  {readonly { start: number, end: number ; }[] } ranges
 * @param  {number} value value
 */
function searchRange(ranges, value)
{
    // jshint bitwise: false
    let range;
    let imin = 0;
    let imax = ranges.length + -1 ;
    while (imin <= imax) {
        const imid = (imin + imax) >>> 1;
        range = ranges[imid] ?? athrow(`[searchRange] 'ranges[imid = ${imid } ]' undefined. `) ;
        const start = range.start;
        if (start === value) {
            return range;
        } else if (start < value) {
            imin = imid + 1;
        } else { imax = imid + -1 ; }
    }
    if (imin > 0) {
        range = ranges[imin + -1 ] ?? athrow(`[searchRange] 'ranges[(imin = ${imin }) + -1 ]' undefined. `) ;
        if (value > range.end) return 0;
        return range;
    }
}

class Layout {
    //
    /**
     * @param {import("./font.js").default } font
     * @param {string} tableName table name
     */
    constructor(font, tableName) {
        this.font = font;
        this.tableName = tableName;

        /* */

        /** @type {() => Table } */
        this.createDefaultTable ;

    }

    //
    
    /**
     * Binary search an object by "tag" property
     */
    searchTag = searchTag ;

    /**
     * Binary search in a list of numbers
     */
    binSearch = binSearch ;

    /**
     * Get or create the Layout table (GSUB, GPOS etc).
     * @param  {boolean} [create] - Whether to create a new one.
     * @returns {{ scripts: XScript[] }}
     */
    getTable (create = false)
    {
        let layout = this.font.tables[this.tableName];
        if (!layout && create) {
            layout = this.font.tables[this.tableName] = this.createDefaultTable();
        }
        return layout;
    } ;

    /**
     * Returns all scripts in the substitution table.
     * @instance
     */
    getScriptNames ()
    {
        let layout = this.getTable();
        if (!layout) { return []; }
        return layout.scripts.map(function(script) {
            return script.tag;
        });
    } ;

    /**
     * Returns the best bet for a script name.
     * Returns 'DFLT' if it exists.
     * If not, returns 'latn' if it exists.
     * If neither exist, returns undefined.
     */
    getDefaultScriptName()
    {
        let layout = this.getTable();
        if (!layout) { return; }
        let hasLatn = false;
        for (const script of layout.scripts )
        {
            const name = script.tag;
            if (name === 'DFLT') return name;
            if (name === 'latn') hasLatn = true;
        }
        if (hasLatn) return 'latn';
    } ;

    /**
     * Returns all LangSysRecords in the given script.
     * @instance
     * @param {string} [script='DFLT']
     * @param {boolean} [create] - forces the creation of this script table if it doesn't exist.
     * 
     */
    getScriptTable(script, create)
    {
        const layout = this.getTable(create);
        if (layout) {
            script = script || 'DFLT';
            const scripts = layout.scripts;
            const pos = searchTag(layout.scripts, script);
            if (pos >= 0) {
                return (scripts[pos] ?? athrow(`[Layout.this.getScriptTable]  `) ).script;
            } else if (create) {
                /** @type {XScript } */
                const scr = {
                    tag: script,
                    script: {
                        defaultLangSys: {reserved: 0, reqFeatureIndex: 0xffff, featureIndexes: []},
                        langSysRecords: []
                    }
                };
                scripts.splice(-1 - pos, 0, scr);
                return scr.script;
            }
        }
    } ;

    /**
     * Returns a language system table
     * @instance
     * @param {string} [script='DFLT']
     * @param {string} [language='dlft']
     * @param {boolean} [create] - forces the creation of this langSysTable if it doesn't exist.
     * 
     */
    getLangSysTable (script, language, create)
    {
        const scriptTable = this.getScriptTable(script, create);
        if (scriptTable) {
            if (!language || language === 'dflt' || language === 'DFLT') {
                return scriptTable.defaultLangSys;
            }
            const pos = searchTag(scriptTable.langSysRecords, language);
            if (pos >= 0) {
                return (scriptTable.langSysRecords[pos] ?? athrow(`[Layout.this.getLangSysTable] not found for ${pos} `) ).langSys;
            } else if (create) {
                const langSysRecord = {
                    tag: language,
                    langSys: {reserved: 0, reqFeatureIndex: 0xffff, featureIndexes: []}
                };
                scriptTable.langSysRecords.splice(-1 - pos, 0, langSysRecord);
                return langSysRecord.langSys;
            }
        }
    } ;

    /**
     * Get a specific feature table.
     * 
     * - param {string} [script='DFLT']
     * - param {string} [language='dlft']
     * - param {string} [feature] - One of the codes listed at https://www.microsoft.com/typography/OTSPEC/featurelist.htm
     * - param {boolean} [create] - forces the creation of the feature table if it doesn't exist.
     * 
     */
    getFeatureTable = /** @satisfies {(this: Layout, ...args: [script ?: String, language?: string, ...f: [feature: String, create: boolean] | [never?, never?] ] ) => {}} */ (function(script, language, feature, create) {
        const langSysTable = this.getLangSysTable(script, language, create);
        if (langSysTable) {
            let featureRecord;
            const featIndexes = langSysTable.featureIndexes;
            const allFeatures = this.font.tables[this.tableName].features;
            // The FeatureIndex array of indices is in arbitrary order,
            // even if allFeatures is sorted alphabetically by feature tag.
            for (const featIndex of featIndexes )
            {
                featureRecord = allFeatures[featIndex];
                if (featureRecord.tag === feature) {
                    return featureRecord.feature;
                }
            }
            if (create) {
                const index = allFeatures.length;
                // Automatic ordering of features would require to shift feature indexes in the script list.
                check.assert(index === 0 || feature >= allFeatures[index - 1].tag, 'Features must be added in alphabetical order.');
                featureRecord = {
                    tag: feature,
                    feature: { params: 0, lookupListIndexes: [] }
                };
                allFeatures.push(featureRecord);
                featIndexes.push(index);
                return featureRecord.feature;
            }
        }
    }) ;

    /**
     * Get the lookup tables of a given type for a script/language/feature.
     * @instance
     * @param {string} [script='DFLT']
     * @param {string} [language='dlft']
     * @param {string} [feature] - 4-letter feature code
     * @param {number} [lookupType] - 1 to 9
     * @param {boolean} [create] - forces the creation of the lookup table if it doesn't exist, with no subtables.
     * 
     */
    getLookupTables (script, language, feature, lookupType, create)
    {
        const featureTable = this.getFeatureTable(script, language, feature, create);
        const tables = /** @type {KTOTSubtabular[] } */ ([]);
        if (featureTable) {
            let lookupTable;
            const lookupListIndexes = featureTable.lookupListIndexes;
            const allLookups = this.font.tables[this.tableName].lookups;
            // lookupListIndexes are in no particular order, so use naive search.
            for (let i = 0; i < lookupListIndexes.length; i++) {
                lookupTable = allLookups[lookupListIndexes[i]];
                if (lookupTable.lookupType === lookupType) {
                    tables.push(lookupTable);
                }
            }
            if (tables.length === 0 && create) {
                lookupTable = {
                    lookupType: lookupType,
                    lookupFlag: 0,
                    subtables: [],
                    markFilteringSet: undefined
                };
                const index = allLookups.length;
                allLookups.push(lookupTable);
                lookupListIndexes.push(index);
                return [lookupTable];
            }
        }
        return tables;
    } ;

    /**
     * Find a glyph in a class definition table
     * https://docs.microsoft.com/en-us/typography/opentype/spec/chapter2#class-definition-table
     * @param {ClassDef} classDefTable - an OpenType Layout class definition table
     * @param {number} glyphIndex - the index of the glyph to find
     * @returns number, or -1 if not found
     */
    getGlyphClass (classDefTable, glyphIndex)
    {
        switch (classDefTable.format) {
            case 1: {
                if (classDefTable.startGlyph <= glyphIndex && glyphIndex < classDefTable.startGlyph + classDefTable.classes.length) {
                    return classDefTable.classes[glyphIndex - classDefTable.startGlyph];
                }
                return 0;
            }
            case 2: {
                const range = searchRange(classDefTable.ranges, glyphIndex);
                return range ? range.classId : 0;
            }
        }
        return athrow(`unsupported format ${classDefTable.format}. `) ;
    } ;

    /**
     * Find a glyph in a coverage table
     * https://docs.microsoft.com/en-us/typography/opentype/spec/chapter2#coverage-table
     * @param {Coverage} coverageTable - an OpenType Layout coverage table
     * @param {number} glyphIndex - the index of the glyph to find
     * @returns number, or -1 if not found
     */
    getCoverageIndex (coverageTable, glyphIndex)
    {
        switch (coverageTable.format) {
            case 1: {
                const index = binSearch(coverageTable.glyphs, glyphIndex);
                return index >= 0 ? index : -1;
            }
            case 2: {
                const range = searchRange(coverageTable.ranges, glyphIndex);
                return range ? range.index + glyphIndex - range.start : -1;
            }
        }
        return athrow(`unsupported format ${coverageTable.format} `) ;
    } ;

    /**
     * Returns the list of glyph indexes of a coverage table.
     * Format 1: the list is stored raw
     * Format 2: compact list as range records.
     * @instance
     * @param  {KTKerningLookupTable["subtables"][number]["coverage"] } coverageTable
     * 
     */
    expandCoverage (coverageTable)
    {
        if (coverageTable.format === 1) {
            return coverageTable.glyphs;
        } else {
            const glyphs = [];
            const ranges = coverageTable.ranges;
            for (let i = 0; i < ranges.length; i++) {
                const range = ranges[i];
                const start = range.start;
                const end = range.end;
                for (let j = start; j <= end; j++) {
                    glyphs.push(j);
                }
            }
            return glyphs;
        }
    } ;

}

/**
 * @typedef {KTScript } XScript
 * 
 */

export default Layout;
