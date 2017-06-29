import formattedAction from './utils/formattedAction';
import getPath from './utils/getPath';
import _ from 'lodash';

export default (rewpa) => ({ dispatch, getState }) => next => action => {
  action = formattedAction(action);
  // console.log(action);

  let prevState = getState();
  let result = next(action);
  let nextState = getState();

  if(prevState == nextState){
    const effectFunc = rewpa(nextState, _.assign({}, action, { type: '@@rewpa/GET_EFFECT_FUNC' }));
    if(_.isFunction(effectFunc)){
      return effectFunc(
        action,
        function(_action){ return dispatch(_.assign({}, _action, { path: action.path })); },
        function(){ return getPath(getState(), action.path) },
        dispatch, getState);
    }else{
      console.log(`Warning: no state changed after action ${action.type}`);
      return null;
    }
  }else if('path' in action){
    const onChangePaths = rewpa(nextState, _.assign({}, action, { type: '@@rewpa/GET_ON_CHANGE_PATH', __type: 'GET_ON_CHANGE_PATH' }));
    for(const index in onChangePaths.list){
      if(onChangePaths.list[index]){
        const thisActionPath = action.__path.slice(0, index).join('.');
        onChangePaths.list[index](
          formattedAction(
            {
              type: `${thisActionPath}/_ON_CHANGE`,
              payload: { prevState: getPath(prevState, thisActionPath), prevRootState: prevState }}),
            function(_action){ return dispatch(_.assign({}, _action, { path: thisActionPath })); },
            function(){ return getPath(getState(), thisActionPath) },
            dispatch, getState);
      }
    }
    return result;
  }else return result;
};
