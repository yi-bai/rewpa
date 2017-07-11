import formattedAction from './utils/formattedAction';
import getPath from './utils/getPath';
import _ from 'lodash';

import RewpaResultList from './utils/RewpaResultList';

const onChangeFunctionMapping = {};
const dispatchMapping = {};
const getStateMapping = {};

export default (rewpa) => ({ dispatch, getState }) => next => action => {
  action = formattedAction(action);
  console.log(action);

  let prevState = getState();
  let result = next(action);
  let nextState = getState();

  // effects
  if(prevState == nextState){
    let effectFunc = rewpa(nextState, { type: '@@rewpa/GET_META', __path: action.__path, payload: { argPath: ['effects', action.__type] }});
    if(effectFunc instanceof RewpaResultList){
      effectFunc = effectFunc.list[0];
      return effectFunc(
        action,
        function(_action){ return dispatch(_.assign({}, _action, { path: action.path })); },
        function(){ return getPath(getState(), action.path) },
        dispatch, getState);
    }else{
      console.log(`Warning: no state changed after action ${action.type}`);
      return null;
    }
  }

  // after action hook
  if('path' in action){
    const indexes = _.reverse(_.range(action.__path.length+1));
    for(let index in indexes){
      index = indexes[index];

      const thisActionPath = action.__path.slice(0, index).join('.');

      if(!(thisActionPath in onChangeFunctionMapping)){
        const onChangeFunc = rewpa(nextState, {
          type: '@@rewpa/GET_META',
          __path: action.__path.slice(0, index),
          payload: { argPath: ['effects', '_AFTER_ACTION'] }
        });
        onChangeFunctionMapping[thisActionPath] = (onChangeFunc instanceof RewpaResultList) ? onChangeFunc.list[0] : null;
        dispatchMapping[thisActionPath] = function(_action){ return dispatch(_.assign({}, _action, { path: thisActionPath })); };
        getStateMapping[thisActionPath] = function(){ return getPath(getState(), thisActionPath) };
      }

      if(_.isFunction(onChangeFunctionMapping[thisActionPath])){
        onChangeFunctionMapping[thisActionPath](
          formattedAction({
            type: `${thisActionPath}/_AFTER_ACTION`,
            payload: {
              prevState: getPath(prevState, thisActionPath),
              prevRootState: prevState,
              action
            }
          }, dispatchMapping[thisActionPath], getStateMapping[thisActionPath], dispatch, getState)
        );
      }
    }
  }

  return result;
}
