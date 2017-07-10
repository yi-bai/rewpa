import _ from 'lodash';
import createListRewpa from './createListRewpa';
import createObjectRewpa from './createObjectRewpa';
import createPriminitiveRewpa from './createPriminitiveRewpa';

const generateReducerFromObject = (ownReducerObj) => {
  return (state, action, put) => {
    const inObject = (action.__type in ownReducerObj);
    return inObject ? ownReducerObj[action.__type](state, action, put) : state;
  }
};

const createRewpa = (arg) => {
  const defaultArg = {
    name: null,
    schema: null,
    ownReducer: null,
    effects: null
  };
  if(arg.reducer) { arg.ownReducer = arg.reducer; delete arg.reducer; }
  // console.log(arg);
  arg = _.assign(defaultArg, arg);
  let { name, schema, ownReducer, initialState, effects } = arg;
  // console.log(ownReducer);
  if(_.isObject(ownReducer)) ownReducer = generateReducerFromObject(ownReducer);
  // console.log(ownReducer);

  // case rewpa: return directly, array: createListRewpa, object: createObjectRewpa, other: createPriminitiveRewpa
  if(_.isFunction(schema)){ // schema is a rewpa
    return schema;
  }else if(_.isArray(schema)){ // schema is an array
    const elementRewpa = createRewpa({ schema: schema[0] });
    return createListRewpa(_.assign({}, arg, { elementRewpa }));
  }else if(_.isObject(schema)){ // schema is an object
    const rewpaMap = {};
    const keys = Object.keys(schema);
    for(const i in keys){
      const key = keys[i];
      rewpaMap[key] = createRewpa({ schema: schema[key] });
    }
    // console.log(rewpaMap);
    return createObjectRewpa(_.assign({}, arg, { rewpaMap }));
  }else{ // schema is other objects
    return createPriminitiveRewpa(_.assign({}, arg, { initialState: initialState || schema }));
  }
};

export default createRewpa;
