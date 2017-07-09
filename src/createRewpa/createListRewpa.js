import formattedAction from '../utils/formattedAction';
import builtinListReducer from '../reducer/builtinListReducer';
import listMappingReducer from '../reducer/listMappingReducer';

import { REWPA_ACTIONS, REWPA_ACTION_VALUES } from '../constants';
import RewpaResultList from '../utils/RewpaResultList';

import _ from 'lodash';

const rewpaActions = (state, action, arg, elementRewpa) => {
  if(action.type === REWPA_ACTIONS.GET_META) return rewpaActionGetMeta(state, action, arg, elementRewpa);
  if(action.type === REWPA_ACTIONS.GET_META_ITERATIVE) return rewpaActionGetMetaIterative(state, action, arg, elementRewpa);
};

const rewpaActionGetMeta = (state, action, arg, elementRewpa) => {
  if((action.__path && !action.__path.length)){
    const thisMeta = _.get(arg, action.payload.argPath);
    return  thisMeta ? new RewpaResultList(thisMeta) : null;
  }
  state = listMappingReducer(state, action, elementRewpa);
  const filtered = state.filter((e) => e instanceof RewpaResultList);
  return filtered.length ? filtered[0] : null;
};

const rewpaActionGetMetaIterative = (state, action, arg, elementRewpa) => {
  const thisMeta = _.get(arg, action.payload.argPath) || null;
  if((action.__path && !action.__path.length)){
    return new RewpaResultList(thisMeta);
  }else{
    state = listMappingReducer(state, action, elementRewpa);
    const filtered = state.filter((e) => e instanceof RewpaResultList);
    return filtered[0].unshift(thisMeta);
  }
};

export default (arg) => {
  const defaultArg = { name: null, elementRewpa: null, ownReducer: null, initialState: [], effects: null };
  Object.keys(arg).forEach(key => arg[key] === undefined && delete arg[key]); // delete undefined keys
  arg = _.assign(defaultArg, arg);
  let { name, elementRewpa, ownReducer, initialState, effects } = arg;

  if(!name && elementRewpa.name) name = `List<${elementRewpa.name}>`;

  const putGenerator = (state) => (...args) => {
    for(const i in args){
      const action = formattedAction(args[i]);
      state = builtinListReducer(state, action, elementRewpa);
      state = listMappingReducer(state, action, elementRewpa);
    }
    return state;
  };

  const ret = (state = initialState, action) => {
    if(REWPA_ACTION_VALUES.includes(action.type)){
      return rewpaActions(state, action, arg, elementRewpa);
    }

    // own reducer
    if(action.__path && !action.__path.length && _.isFunction(ownReducer)){
      const stateAfterOwnReducer = ownReducer(state, action, putGenerator(state));
      if(stateAfterOwnReducer !== state){ return stateAfterOwnReducer; }
    }
    // built-in reducer
    const stateAfterBuiltInReducer = builtinListReducer(state, action, elementRewpa);
    if(stateAfterBuiltInReducer && stateAfterBuiltInReducer !== state){ return stateAfterBuiltInReducer; }
    // combined reducer
    return listMappingReducer(state, action, elementRewpa);
  };
  ret.rewpaname = name;
  ret.type = 'List';
  return ret;
};