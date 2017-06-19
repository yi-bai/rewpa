import { BUILTIN_ACTION_VALUES, BUILTIN_ACTIONS } from '../constants';

export default (state, action, elementRewpa) => {
  if(!action.__path){
    return state;
  }
  if(!action.path.length && BUILTIN_ACTION_VALUES.includes(action.__type)){
    switch(action.__type){
      case BUILTIN_ACTIONS.SET:
        if(('key' in action.payload) && !('value' in action.payload)){
          return elementRewpa ?
            _.assign({}, state, { [action.payload.key]: elementRewpa(undefined, { type: '@@INIT' }) }) :
            state;
        } else if(('key' in action.payload) && ('value' in action.payload)){
          return _.assign({}, state, { [action.payload.key]: action.payload.value });
        } else {
          return action.payload;
        }
      case BUILTIN_ACTIONS.ASSIGN:
        return _.assign({}, state, action.payload);
      case BUILTIN_ACTIONS.MERGE:
        return _.mergeWith({}, state, action.payload, (objValue, srcValue) => {
          // for array, replace
          if(_.isArray(objValue)) return srcValue;
        });
      case BUILTIN_ACTIONS.DELETE:
        let delete_keys = [];
        if(_.isObject(action.payload) && !_.isArray(action.payload)){
          _.forEach(Object.keys(state), (state_key) => {
            for(const payload_key in action.payload){
              if(action.payload[payload_key] !== state[state_key][payload_key]) return;
            }
            delete_keys.push(state_key);
          });
        } else {
          delete_keys = _.isArray(action.payload) ? action.payload : [action.payload];
        }
        console.log(delete_keys);
        _.forEach(delete_keys, (key) => _.unset(state, key));
        return _.assign({}, state);
      case BUILTIN_ACTIONS.CLEAR:
        return {};
      default:
        return state;
    }
  }
};