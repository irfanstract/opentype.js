// Run-time checking of preconditions.

function fail(message) {
    throw new Error(message);
}

// Precondition function that checks if the given predicate is true.
// If not, it will throw an error.
/**
 * 
 * @param {string} message what to tell abt
 * @param {boolean} predicate what to test
 * @returns {asserts predicate }
 */
function argument(predicate, message) {
    if (!predicate) {
        fail(message);
    }
}

export { fail, argument, argument as assert };
export default { fail, argument, assert: argument };
