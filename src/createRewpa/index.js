import _ from 'lodash';

const generateReducerFromObject = (ownReducerObj) => {
  return (state, action, put) => {
    for(const key in ownReducerObj){
      console.log('generateReducerFromObject', key, action.type);
      if(key === action.type){
        console.log('matches', ownReducerObj[key], state, action, put);
        console.log(ownReducerObj[key](state, action, put));
        return ownReducerObj[key](state, action, put);
      }
    }
    return state;
  }
};

export default (arg) => {
  const defaultArg = {
    name: null,
    schema: null,
    ownReducer: null,
    initialState: null,
    effects: null
  };
  arg = _.assign(defaultArg, arg);
  let { name, schema, ownReducer, initialState, effects } = arg;
  if(_.isObject(ownReducer)) ownReducer = generateReducerFromObject(ownReducer);

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
    return createObjectRewpa({ name, rewpaMap, ownReducer, initialState, schema, effects });
  }else{ // schema is other objects
    return createPriminitiveRewpa({ name, initialState: initialState || schema, ownReducer, effects });
  }
};
