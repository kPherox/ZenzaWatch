
/* eslint-disable @typescript-eslint/no-explicit-any */
type AsyncReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => PromiseLike<infer R> ? R : ReturnType<T>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export {
  AsyncReturnType,
};
