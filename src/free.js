import { match } from "single-key";
import { compose } from "redux";

const isFreeSymbol = Symbol("free");

export const FreePrototype = {
  [isFreeSymbol]: true,

  then(f) {
    return match(this, {
      Pure: f,
      Impure: functor => FlatMap(functor, f),
      FlatMap([functor, ...fns]) {
        return FlatMap(functor, ...fns, f);
      }
    });
  },
  _expand() {
    return match(this, {
      Pure: () => this,
      Impure: () => this,
      FlatMap([functor, ...fns]) {
        return Impure(
          functor.map(val => {
            let result = val;
            for (let i = 0; i < fns.length; i++) {
              result = result.then(fns[i]);
              result = result._expand();
            }
            return result;
          })
        );
      }
    });
  },
  map(f) {
    return this.then(compose(Pure, f));
  }
};

const create = Object.create.bind(Object, FreePrototype);
const assign = Object.assign;

const Pure = val => assign(create(), { Pure: val });
const Impure = val => assign(create(), { Impure: val });
const FlatMap = (val, ...fns) => assign(create(), { FlatMap: [val, ...fns] });

const isFree = value => Object(value) === value && value[isFreeSymbol];

const liftFree = functor => Impure(functor.map(Pure));

const Do = generator => {
  const iter = generator();
  const recurr = val => {
    const { value: free, done } = iter.next(val);
    if (!done) {
      return free.then(recurr);
    } else {
      return isFree(free) ? free : Pure(null);
    }
  };
  return recurr();
};

export { Pure, Impure, isFree, liftFree, Do };
