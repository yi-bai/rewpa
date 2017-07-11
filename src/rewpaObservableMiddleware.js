import formattedAction from './utils/formattedAction';
import getPath from './utils/getPath';
import _ from 'lodash';

import { createEpicMiddleware } from 'redux-observable';

import RewpaResultList from './utils/RewpaResultList';

import Rx from 'rxjs';

const inputObservablePathMapping = {};
const outputObservablePathMapping = {};
const observableFuncPathMapping = {};
const dispatchMapping = {};
const getStateMapping = {};

const dealStream = (rewpa, action, dispatch, getState) => {
  if(!('path' in action)) return;
  const indexes = _.reverse(_.range(action.__path.length+1));
  for(let index in indexes){
    index = indexes[index];

    const thisActionPath = action.__path.slice(0, index).join('.');

    console.log(thisActionPath);

    if(!(thisActionPath in observableFuncPathMapping)){
      let observablesFunc = rewpa(getState(), {
        type: '@@rewpa/GET_META',
        __path: action.__path.slice(0, index),
        payload: { argPath: ['observables'] }
      });

      if(observablesFunc instanceof RewpaResultList){
        observablesFunc = observablesFunc.list[0];
        observablesFunc = _.isFunction(observablesFunc) ? observablesFunc : createObservableFunctionFromObject(observablesFunc);
      }else{
        observablesFunc = null;
      }

      observableFuncPathMapping[thisActionPath] = observablesFunc;
      dispatchMapping[thisActionPath] = function(_action){ return dispatch(_.assign({}, _action, { path: thisActionPath })); };
      getStateMapping[thisActionPath] = function(){ return getPath(getState(), thisActionPath) };
    
      // create a stream for this path
      if(observableFuncPathMapping[thisActionPath]){
        inputObservablePathMapping[thisActionPath] = new Rx.Subject();
        outputObservablePathMapping[thisActionPath] =
          observableFuncPathMapping[thisActionPath](
            inputObservablePathMapping[thisActionPath],
            { dispatch: dispatchMapping[thisActionPath],
              getState: getStateMapping[thisActionPath] });
        if(outputObservablePathMapping[thisActionPath].subscribe){
          outputObservablePathMapping[thisActionPath].subscribe(dispatchMapping[thisActionPath]);
        }
      }
    }

    if(_.isFunction(observableFuncPathMapping[thisActionPath])){
      inputObservablePathMapping[thisActionPath].next(action);
    }
  }
};

const createRewpaEpic = (rewpa) => {
  return (action$, { dispatch, getState }) => {
    const dispatchFormatted = (action) => dispatch(formattedAction(action));
    action$
    .do((action) => dealStream(rewpa, action, dispatchFormatted, getState))
    .subscribe();
    return Rx.Observable.empty();
  };
}

export default (rewpa) => {
  const ret = createEpicMiddleware(createRewpaEpic(rewpa));
  console.log(ret);
  return ret;
};
