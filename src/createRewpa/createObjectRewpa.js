import formattedAction from '../utils/formattedAction';
import builtinObjectReducer from '../reducer/builtinObjectReducer';
import objectCombinedReducer from '../reducer/objectCombinedReducer';
import mappingCombinedReducer from '../reducer/mappingCombinedReducer';

import { REWPA_ACTIONS, REWPA_ACTION_VALUES } from '../constants';
import RewpaResultList from '../utils/RewpaResultList';

import _ from 'lodash';

const rewpaActions = (state, action, arg, rewpaMap) => {
  if(action.type === REWPA_ACTIONS.GET_META) return rewpaActionGetMeta(state, action, arg, rewpaMap);
  if(action.type === REWPA_ACTIONS.GET_META_ITERATIVE) return rewpaActionGetMetaIterative(state, action, arg, rewpaMap);
};

const rewpaActionGetMeta = (state, action, arg, rewpaMap) => {
  if((action.__path && !action.__path.length)){
    const thisMeta = _.get(arg, action.payload.argPath);
    return  thisMeta ? new RewpaResultList(thisMeta) : null;
  }
  state = ('*' in rewpaMap) ?
    mappingCombinedReducer(state, action, rewpaMap['*']) :
    objectCombinedReducer(state, action, rewpaMap);
  const filteredKeys = Object.keys(state).filter((key) => state[key] instanceof RewpaResultList);
  return filteredKeys.length ? state[filteredKeys[0]] : null;
};

const rewpaActionGetMetaIterative = (state, action, arg, rewpaMap) => {
  const thisMeta = _.get(arg, action.payload.argPath) || null;
  if((action.__path && !action.__path.length)){
    return new RewpaResultList(thisMeta);
  }else{
    state = ('*' in rewpaMap) ?
      mappingCombinedReducer(state, action, rewpaMap['*']) :
      objectCombinedReducer(state, action, rewpaMap);
    const filteredKeys = Object.keys(state).filter((key) => state[key] instanceof RewpaResultList);
    return state[filteredKeys[0]].unshift(thisMeta);
  }
};

const pathString = (arrayPath) => {
  return _.isString(arrayPath) ? arrayPath : (arrayPath ? arrayPath.join('.') : '');
};

export default (arg) => {
  const defaultArg = { name: null, schema: null, rewpaMap: null, ownReducer: null, initialState: {}, effects: null };
  Object.keys(arg).forEach(key => arg[key] === undefined && delete arg[key]); // delete undefined keys
  arg = _.assign(defaultArg, arg);
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
    if(REWPA_ACTION_VALUES.includes(action.type)){
      return rewpaActions(state, action, arg, rewpaMap);
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
    // combined reducer
    return (type === 'Object') ?
      objectCombinedReducer(state, action, rewpaMap) :
      mappingCombinedReducer(state, action, rewpaMap['*']);
  };
  ret.rewpaname = name;
  ret.type = type;
  return ret;
};
