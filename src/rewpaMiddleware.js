import formattedAction from './utils/formattedAction';
import _ from 'lodash';

export default (rewpa) => ({ dispatch, getState }) => next => action => {
  action = formattedAction(action);
  // console.log(action);

  let prevState = getState();
  let result = next(action);
  let nextState = getState();

  if(prevState == nextState){
    const effectFunc = rewpa(getState(),
      _.assign({}, action, { type: '@@rewpa/GET_EFFECT_FUNC' }));
    if(_.isFunction(effectFunc)){
      return effectFunc(action, dispatch, getState);
    }else{
      console.log(`Warning: no state changed after action ${action.type}`);
      return null;
    }
  }else{
    return result;
  }
};
