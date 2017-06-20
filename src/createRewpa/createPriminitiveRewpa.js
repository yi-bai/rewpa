import formattedAction from '../utils/formattedAction';
import builtinPriminitiveReducer from '../reducer/builtinPriminitiveReducer';

export default (arg) => {
  const defaultArg = { name: null, ownReducer: null, initialState: null, effects: null };
  Object.keys(arg).forEach(key => arg[key] === undefined && delete arg[key]); // delete undefined keys
  arg = _.assign(defaultArg, arg);
  let { name, ownReducer, initialState, effects } = arg;

  const putGenerator = (state) => (...actions) => {
    for(const i in actions){
      const action = formattedAction(args[i]);
      state = builtinPriminitiveReducer(state, action);
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
      if(stateAfterOwnReducer && stateAfterOwnReducer !== state){ return stateAfterOwnReducer; }
    }
    // built-in reducer
    return builtinPriminitiveReducer(state, action);
  };
  ret.rewpaname = name;
  ret.type = 'Priminitive';
  return ret;
};