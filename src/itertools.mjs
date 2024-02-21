










/**
 * 
 * 
 * @type {<E>(c: () => Generator<E, void, void> ) => Iterable<E> }
 */
export function reiterableBy(s) {
  return { [Symbol.iterator]: s, } ;
}









