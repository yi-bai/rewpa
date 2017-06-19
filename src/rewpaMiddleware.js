import formatedAction from 'utils/formatedAction';
import _ from 'lodash';

export default (rewpa) => ({ dispatch, getState }) => next => action => {
  action = formatedAction(action);
  console.log(action);

  let prevState = getState();
  let result = next(action);
  let nextState = getState();

  if(prevState == nextState){
    const effectFunc = rewpa(getState(), _.assign({}, action, { __getEffectFunction: true }));
    return effectFunc(action, dispatch, getState);
  }

  return result;
};
