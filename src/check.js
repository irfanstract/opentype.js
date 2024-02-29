// Run-time checking of preconditions.

import { athrow, assertionFail, } from "./athrow.mjs";

/**
 * 
 * @param {string} [message]
 * 
 * @deprecated
 * consider switching to {@link athrow} or {@link assertionFail} (from `./athrow.mjs` ).
 * the name {@link fail} merely says "failure" ;
 * it doesn't specifically mention whether it's "argument error", or "assertion error" (including "data corruption") ,
 * which the latter two all do;
 * here we cannot narrow it to something more specific (eg `TypeError`, for "argument error" ) as
 * the caller's thing could have been the more-critical "assertion error" (including "data corruption") .
 * 
 */
function fail(message) {
    throw new Error(message);
}

/**
 * Precondition function that checks if the given predicate is true.
 * If not, it will throw an error.
 * 
 * @callback AssertsAlikeFunction
 * 
 * @param {boolean} predicate what to test
 * @param {string} message what to tell abt
 * @returns {asserts predicate }
 */

/**
 * boolean-checks on function arguments
 * 
 * @type {AssertsAlikeFunction }
 */
function argument(predicate, message) {
    if (!predicate) {
        throw new TypeError(message) ;
    }
}

/**
 * boolean-checks as assertions,
 * for use when "whoops, something behaves unexpectedly"
 * 
 * @type {AssertsAlikeFunction }
 */
function assert(predicate, message) {
    if (!predicate) {
        throw new Error(message) ;
    }
}

export { fail, argument, assert };
export default { fail, argument, assert };
