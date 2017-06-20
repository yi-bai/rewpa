import formattedAction from '../utils/formattedAction';
import builtinListReducer from '../reducer/builtinListReducer';
import listMappingReducer from '../reducer/listMappingReducer';

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
    // effects
    if(action.__path && !action.__path.length && action.type === '@@rewpa/GET_EFFECT_FUNC'){
      if(effects && action.__type in effects){
        return effects[action.__type];
      }
    }
    // own reducer
    if(action.__path && !action.__path.length && _.isFunction(ownReducer)){
      const stateAfterOwnReducer = ownReducer(state, action, putGenerator(state));
      if(stateAfterOwnReducer !== state){ return stateAfterOwnReducer; }
    }
    // built-in reducer
    const stateAfterBuiltInReducer = builtinListReducer(state, action, elementRewpa);
    if(stateAfterBuiltInReducer && stateAfterBuiltInReducer !== state){ return stateAfterBuiltInReducer; }
    // effects
    if(action.type === '@@rewpa/GET_EFFECT_FUNC'){
      state = listMappingReducer(state, action, elementRewpa);
      const filtered = state.filter((e) => _.isFunction(e));
      return filtered.length ? filtered[0] : null;
    }
    // combined reducer
    return listMappingReducer(state, action, elementRewpa);
  };
  ret.rewpaname = name;
  ret.effects = effects;
  ret.type = 'List';
  return ret;
};