import formattedAction from '../utils/formattedAction';
import builtinPriminitiveReducer from '../reducer/builtinPriminitiveReducer';

import { REWPA_ACTIONS, REWPA_ACTION_VALUES } from '../constants';
import RewpaResultList from '../utils/RewpaResultList';

import _ from 'lodash';

const rewpaActions = (state, action, arg) => {
  if(action.type === REWPA_ACTIONS.GET_META) return rewpaActionGetMeta(state, action, arg);
  if(action.type === REWPA_ACTIONS.GET_META_ITERATIVE) return rewpaActionGetMetaIterative(state, action, arg);
};

const rewpaActionGetMeta = (state, action, arg) => {
  if((action.__path && !action.__path.length)){
    const thisMeta = _.get(arg, action.payload.argPath);
    return  thisMeta ? new RewpaResultList(thisMeta) : null;
  }
  return null;
};

const rewpaActionGetMetaIterative = (state, action, arg) => {
  const thisMeta = _.get(arg, action.payload.argPath) || null;
  return new RewpaResultList(thisMeta);
};

export default (arg) => {
  const defaultArg = { name: null, ownReducer: null, initialState: null, effects: null };
  Object.keys(arg).forEach(key => arg[key] === undefined && delete arg[key]); // delete undefined keys
  arg = _.assign(defaultArg, arg);
  let { name, ownReducer, initialState, effects } = arg;

  const putGenerator = (state) => (...actions) => {
    for(const i in actions){
      const action = formattedAction(actions[i]);
      state = builtinPriminitiveReducer(state, action);
    }
    return state;
  };

  const ret = (state = initialState, action) => {
    if(REWPA_ACTION_VALUES.includes(action.type)){
      return rewpaActions(state, action, arg);
    }

    // own reducer
    if(action.__path && !action.__path.length && _.isFunction(ownReducer)){
      const stateAfterOwnReducer = ownReducer(state, action, putGenerator(state));
      if(stateAfterOwnReducer && stateAfterOwnReducer !== state){ return stateAfterOwnReducer; }
    }
    // built-in reducer
    return builtinPriminitiveReducer(state, action);
  };
  ret.rewpaname = name;
  ret.type = 'Priminitive';
  return ret;
};