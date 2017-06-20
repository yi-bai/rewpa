import { BUILTIN_ACTION_VALUES, BUILTIN_ACTIONS } from '../constants';

export default (state, action, initialState) => {
  if(!('path' in action)){
    return state;
  }
  if(!action.__path.length && BUILTIN_ACTION_VALUES.includes(action.__type)){
    switch(action.__type){
      case BUILTIN_ACTIONS.SET:
        return action.payload;
      case BUILTIN_ACTIONS.ASSIGN:
        return _.assign({}, state, action.payload);
      case BUILTIN_ACTIONS.MERGE:
        return _.mergeWith({}, state, action.payload, (objValue, srcValue) => {
          // for array, replace
          if(_.isArray(objValue)) return srcValue;
        });
      default:
        return state;
    }
  }
  return state;
};