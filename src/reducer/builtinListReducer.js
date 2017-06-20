import { BUILTIN_ACTION_VALUES, BUILTIN_ACTIONS } from '../constants';

export default (state, action, elementRewpa) => {
  if(!('path' in action)){
    return state;
  }
  if(!action.__path.length && BUILTIN_ACTION_VALUES.includes(action.__type)){
    switch(action.__type){
      case BUILTIN_ACTIONS.INSERT:
        state = state.map((e) => e);
        if(!action.payload){
          state.push(elementRewpa(undefined, { type: '@@INIT' }));
          return state;
        } else if(('index' in action.payload) && ('value' in action.payload)){
          state.splice((action.payload.index > 0) ? action.payload.index : state.length - action.payload.index, 0, action.payload.value);
          return state;
        } else {
          state.push(action.payload);
          return state;
        }
      case BUILTIN_ACTIONS.CONCAT:
        return _.concat(state, action.payload);
      case BUILTIN_ACTIONS.SLICE:
        return _.isArray(action.payload) ? state.slice(action.payload[0], action.payload[1]) : state.slice(action.payload);
      case BUILTIN_ACTIONS.DELETE:
        let delete_keys = [];
        if(_.isObject(action.payload) && !_.isArray(action.payload)){
          // TODO: fix this
          _.forEach(Object.keys(state), (state_key) => {
            for(const payload_key in action.payload){
              if(action.payload[payload_key] !== state[state_key][payload_key]) return;
            }
            delete_keys.push(state_key);
          });
        } else {
          delete_keys = _.isArray(action.payload) ? action.payload : [action.payload];
        }
        // console.log(state);
        _.forEach(delete_keys, (key) => state.splice(key, 1));
        return state.map((e) => e);
      case BUILTIN_ACTIONS.CLEAR:
        return [];
      default:
        return state;
    }
  }
  return state;
};