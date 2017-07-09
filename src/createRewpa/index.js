import _ from 'lodash';
import createListRewpa from './createListRewpa';
import createObjectRewpa from './createObjectRewpa';
import createPriminitiveRewpa from './createPriminitiveRewpa';

const generateReducerFromObject = (ownReducerObj) => {
  return (state, action, put) => {
    for(const key in ownReducerObj){
      if(key === action.__type){
        return ownReducerObj[key](state, action, put);
      }
    }
    return state;
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
    return createListRewpa({ name, elementRewpa, ownReducer, initialState, effects });
  }else if(_.isObject(schema)){ // schema is an object
    const rewpaMap = {};
    const keys = Object.keys(schema);
    for(const i in keys){
      const key = keys[i];
      rewpaMap[key] = createRewpa({ schema: schema[key] });
    }
    // console.log(rewpaMap);
    return createObjectRewpa({ name, rewpaMap, ownReducer, initialState, schema, effects });
  }else{ // schema is other objects
    return createPriminitiveRewpa({ name, initialState: initialState || schema, ownReducer, effects });
  }
};

export default createRewpa;
