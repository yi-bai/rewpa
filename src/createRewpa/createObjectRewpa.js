import formattedAction from '../utils/formattedAction';
import builtinObjectReducer from '../reducer/builtinObjectReducer';
import objectCombinedReducer from '../reducer/objectCombinedReducer';
import mappingCombinedReducer from '../reducer/mappingCombinedReducer';

export default (arg) => {
  const defaultArg = { name: null, schema: null, rewpaMap: null, ownReducer: null, initialState: {}, effects: null };
  Object.keys(arg).forEach(key => arg[key] === undefined && delete arg[key]); // delete undefined keys
  arg = _.assign(defaultArg, arg);
  // console.log(arg);
  let { name, schema, rewpaMap, ownReducer, initialState, effects } = arg;

  const rewpaKeys = Object.keys(rewpaMap);
  const type = (rewpaKeys.length === 1 && rewpaKeys[0] === '*') ? 'Map' : 'Object';
  if(!name && type==='Map' && rewpaMap['*'].name) name = `Map<${rewpaMap['*'].name}>`;

  const putGenerator = (state) => (...args) => {
    for(const i in args){
      const action = formattedAction(args[i]);
      state = builtinObjectReducer(state, action, type==='Map' ? rewpaMap['*'] : null);
      state = objectCombinedReducer(state, action, rewpaMap);
    }
    return state;
  };

  const ret = (state = initialState, action) => {
    // effects
    if(action.__path && !action.__path.length && action.type === '@@rewpa/GET_EFFECT_FUNC'){
      if(effects && action.__type in effects){
        return effects[action.__type];
      }
    }
    // own reducer
    // console.log(arg);
    if(action.__path && !action.__path.length && _.isFunction(ownReducer)){
      const stateAfterOwnReducer = ownReducer(state, action, putGenerator(state));
      if(stateAfterOwnReducer && stateAfterOwnReducer !== state){ return stateAfterOwnReducer; }
    }
    // built-in reducer
    const stateAfterBuiltInReducer = builtinObjectReducer(state, action, type==='Map' ? rewpaMap['*'] : null);
    if(stateAfterBuiltInReducer && stateAfterBuiltInReducer !== state){ return stateAfterBuiltInReducer; }
    // effects
    if(action.type === '@@rewpa/GET_EFFECT_FUNC'){
      state = (type === 'Object') ?
      objectCombinedReducer(state, action, rewpaMap) :
      mappingCombinedReducer(state, action, rewpaMap['*']);
      const filteredKeys = Object.keys(state).filter((key) => _.isFunction(state[key]));
      return filteredKeys.length ? state[filteredKeys[0]] : null;
    }
    // combined reducer
    return (type === 'Object') ?
      objectCombinedReducer(state, action, rewpaMap) :
      mappingCombinedReducer(state, action, rewpaMap['*']);
  };
  ret.rewpaname = name;
  ret.effects = effects;
  ret.type = type;
  return ret;
};