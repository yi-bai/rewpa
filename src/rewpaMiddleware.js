import formattedAction from './utils/formattedAction';
import getPath from './utils/getPath';
import _ from 'lodash';

import RewpaResultList from './utils/RewpaResultList';

export default (rewpa) => ({ dispatch, getState }) => next => action => {
  action = formattedAction(action);
  // console.log(action);

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
    const onChangeFunctions = rewpa(nextState,
      { type: '@@rewpa/GET_META_ITERATIVE',
        __path: action.__path,
        payload: { argPath: ['effects', '_AFTER_ACTION']
      }});
    for(const index in onChangeFunctions.list){
      if(onChangeFunctions.list[index]){
        const thisActionPath = action.__path.slice(0, index).join('.');
        onChangeFunctions.list[index](
          formattedAction(
            {
              type: `${thisActionPath}/_AFTER_ACTION`,
              payload: { prevState: getPath(prevState, thisActionPath), prevRootState: prevState, action }}),
            function(_action){ return dispatch(_.assign({}, _action, { path: thisActionPath })); },
            function(){ return getPath(getState(), thisActionPath) },
            dispatch, getState);
      }
    }
    return result;
  }

  return result;
}