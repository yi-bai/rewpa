import formattedAction from './utils/formattedAction';
import getPath from './utils/getPath';
import _ from 'lodash';

import RewpaResultList from './utils/RewpaResultList';

import * as sagaEffects from 'redux-saga/effects';
import {
  takeEveryHelper as takeEvery,
  takeLatestHelper as takeLatest,
  throttleHelper as throttle,
} from 'redux-saga/lib/internal/sagaHelpers';

import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/mergeMap';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';

export default (rewpa) => {

  //consts
  const pathEffectsMap = {};
  const pathParentPathsMap = {};
  const pathStoreWithPathMap = {};
  const REG_EXP = Symbol();
  const STRING = Symbol();
  const pureRegExp = /[^A-Za-z0-9 _]/;

  const pathSagasMap = {};
  const pathSagaEffectsWithPathMap = {};

  const pathEpicsMap = {};
  const pathObservableStoreWithPathMap = {};

  const defaultEffectParam = {
    name: '',
    type: 'every',
    effect: null
  };

  const defaultSagaParam = {
    name: '',
    type: 'takeEvery',
    ms: null,
    saga: null
  };

  const defaultEpicParam = {
    name: '',
    epic: null
  };

  let sagaMiddleware = null;
  let observableMiddleware = null;
  let epic$ = new Subject();
  let rootEpic = (action$, store) => epic$.mergeMap(epic => epic(action$, store));

  //utils
  const generateParentPaths = (__path) => {
    const indexes = _.reverse(_.range(__path.length+1));
    return indexes.map(index => __path.slice(0, index).join('.'));
  };

  const isPureActionName = (name) => !pureRegExp.test(name);

  const actionTypeDeletePath = (type, path) => {
    if(_.startsWith(type, path)){
      const ret = type.substr(path.length);
      return (ret[0] === '.' || ret[0] === '/') ? ret.substr(1) : ret;
    }
    return null;
  };

  const actionDeletePath = (action, path) => {
    return _.assign({}, action, { type: actionTypeDeletePath(action.type, path) });
  };

  const actionTypePrependPath = (type, path) => {
    if(!path) return type;
    if(_.includes(type, '/')){
      const origPathType = type.split('/');
      if(!origPathType[0]) return `${path}/${origPathType[1]}`;
      else return `${path}.${origPathType[0]}/${origPathType[1]}`;
    }else{
      return `${path}/${type}`;
    }
  };

  const actionWithPath = (action, path) => {
    return _.assign({}, action, { type: actionTypePrependPath(action.type, path) });
  };

  const patternWithPath = (pattern, path) => {
    if(!pattern) pattern = '*';
    if(pattern === '*') return (action) => _.startsWith(action.type, path);
    if(_.isString(pattern)) return actionTypePrependPath(pattern, path);
    if(_.isFunction(pattern)) return (action) => pattern(actionDeletePath(action, path));
    if(_.isArray(pattern)) return pattern.map((patternElement) => patternWithPath(patternElement, path));
  };

  // effects related
  const generateStoreWithPath = (path, dispatch, getState) => {
      return {
        dispatch: function(_action){ return dispatch(_.assign({}, _action, { path })); },
        getState: function(){ return getPath(getState(), path) }
      }
  };

  const generateEffects = (state, path, dispatch, getState) => {
    let effectFunc = rewpa(state, { type: '@@rewpa/GET_META', __path: path.length ? path.split('.') : [], payload: { argPath: ['effects'] }});
    if(effectFunc instanceof RewpaResultList){
      effectFunc = effectFunc.list[0];
    }else{ return { [REG_EXP]: [], [STRING]: {} }; }

    const ret = { [REG_EXP]: [], [STRING]: {} };
    Object.keys(effectFunc).forEach((key) => {
      let element = effectFunc[key];
      if(_.isFunction(element)) element = { effect: element };
      element = _.assign({}, defaultEffectParam, element, { name: key });

      if(isPureActionName(element.name)){
        //STRING
        ret[STRING][element.name] = (action, isChanged, originalResult) => {
          if(element.type != 'onChange' || isChanged){
            return element.effect(
              actionDeletePath(action, path),
              pathStoreWithPathMap[path]['dispatch'], pathStoreWithPathMap[path]['getState'],
              dispatch, getState);
          }
          return originalResult;
        }
      }else{
        //REG_EXP
        const regExp = new RegExp(element.name);
        ret[REG_EXP].push((action, isChanged, originalResult) => {
          if(element.type != 'onChange' || isChanged){
            const localAction = actionDeletePath(action, path);
            if(regExp.test(localAction.type)){
              return element.effect(localAction, pathStoreWithPathMap[path]['dispatch'], pathStoreWithPathMap['getState'],
                dispatch, getState);
            }
          }
          return originalResult;
        });
      }
    });
    return ret;
  }

  // saga related
  const selectorWithPath = (selector, path) => {
    return (state, ...args) => selector(getPath(state, path), ...args);
  };

  const generateSagaEffectsWithPath = (path) => {
    const take = (pattern) => sagaEffects.take(patternWithPath(pattern, path));
    const takeEvery = (pattern, saga, ...args) => sagaEffects.takeEvery(patternWithPath(pattern, path), (action) => saga(actionDeletePath(action, path)), ...args);
    const takeLatest = (pattern, saga, ...args) => sagaEffects.takeLatest(patternWithPath(pattern, path), (action) => saga(actionDeletePath(action, path)), ...args);
    const throttle = (ms, pattern, saga, ...args) => sagaEffects.throttle(ms, patternWithPath(pattern, path), (action) => saga(actionDeletePath(action, path)), ...args);
    const put = (action) => sagaEffects.put(actionWithPath(action, path));
    const select = function *(selector, ...args) {
      if(selector){
        const stateAfterSelector = yield sagaEffects.select(selectorWithPath(selector, path), ...args);
        return stateAfterSelector;
      }
      const state = yield sagaEffects.select();
      return getPath(state, path);
    }
    //take, put, select, takeEvery, takeLatest, throttle
    return _.assign({}, sagaEffects, { take, takeEvery, takeLatest, throttle, put, select });
  }

  const generateSagas = (state, path) => {
    let sagaFunc = rewpa(state, { type: '@@rewpa/GET_META', __path: path.length ? path.split('.') : [], payload: { argPath: ['sagas'] }});
    if(sagaFunc instanceof RewpaResultList){
      sagaFunc = sagaFunc.list[0];
    }else{ return {}; }

    const ret = {};
    Object.keys(sagaFunc).forEach((key) => {
      let element = sagaFunc[key];
      if(_.isFunction(element)) element = { saga: element };
      element = _.assign({}, defaultSagaParam, element, { name: key });

      let pattern = null;
      if(isPureActionName(element.name)){
        pattern = actionTypePrependPath(element.name, path);
      }else{
        const nameRegExp = new RegExp(element.name);
        pattern = (_action) => {
          const type = actionTypeDeletePath(_action.type, path);
          return nameRegExp.test(type);
        }
      }

      let saga = null;
      if(element.type === 'takeEvery'){ saga = function*() { yield takeEvery(pattern, (_action) => element.saga(_action, pathSagaEffectsWithPathMap[path])); }}
      else if(element.type === 'takeLatest'){ saga = function*(){ yield takeLatest(pattern, (_action) => element.saga(_action, pathSagaEffectsWithPathMap[path])); }}
      else if(element.type === 'throttle'){ saga = function*(){ yield throttle(element.ms, pattern, (_action) => element.saga(_action, pathSagaEffectsWithPathMap[path])); }}
      
      console.log(pattern, saga);

      ret[key] = sagaMiddleware.run(saga);
    });

    return ret;
  }

  // observable related
  const generateEpics = (state, path, dispatch, getState) => {
    let epicFunc = rewpa(state, { type: '@@rewpa/GET_META', __path: path.length ? path.split('.') : [], payload: { argPath: ['epics'] }});
    if(epicFunc instanceof RewpaResultList){
      epicFunc = epicFunc.list[0];
    }else{ return {}; }

    const ret = {};
    Object.keys(epicFunc).forEach((key) => {
      let element = epicFunc[key];
      if(_.isFunction(element)) element = { epic: element };
      element = _.assign({}, defaultEpicParam, element, { name: key });

      let epicFilter = null;
      if(isPureActionName(element.name)){
        const actionType = actionTypePrependPath(element.name, path);
        epicFilter = (_action) => (_action.type === actionType);
      }else{
        const nameRegExp = new RegExp(element.name);
        epicFilter = (_action) =>{
          console.log(actionTypeDeletePath(_action.type, path), nameRegExp);
          return nameRegExp.test(actionTypeDeletePath(_action.type, path));
        }
      }

      console.log(epicFilter);

      const epic = (action$, store) => {
        const filteredAction$ = action$.filter(epicFilter).map(_action => actionDeletePath(_action, path));
        if(!(path in pathObservableStoreWithPathMap)) pathObservableStoreWithPathMap[path] = generateStoreWithPath(path, store.dispatch, store.getState);
        const ret = element.epic(filteredAction$, pathObservableStoreWithPathMap[path]);
        if(ret) return ret.map(_action => actionWithPath(_action, path));
        else return Observable.of();
      }

      epic$.next(epic);
      ret[key] = epic;
    });

    return ret;
  }

  const middleware = ({ dispatch, getState }) => next => action => {
    action = formattedAction(action);

    let prevState = getState();
    let result = next(action);
    let nextState = getState();

    if(!('path' in action)) return result; // not in scope of Rewpa

    // put Effects cache
    if(!(action.thisActionPath in pathEffectsMap)){
      const parentPaths = generateParentPaths(action.__path);
      parentPaths.forEach((path, index) => {
        if(path in pathEffectsMap) return;
        pathParentPathsMap[path] = parentPaths.slice(index);
        pathStoreWithPathMap[path] = generateStoreWithPath(path, dispatch, getState);
        pathEffectsMap[path] = generateEffects(nextState, path, dispatch, getState);
      });
    }

    // put Saga cache
    if(sagaMiddleware && !(action.thisActionPath in pathSagasMap)){
      const parentPaths = generateParentPaths(action.__path);
      parentPaths.forEach((path, index) => {
        if(path in pathSagasMap) return;
        pathParentPathsMap[path] = parentPaths.slice(index);
        pathSagaEffectsWithPathMap[path] = generateSagaEffectsWithPath(path);
        pathSagasMap[path] = generateSagas(nextState, path);
        console.log(pathSagasMap);
      })
    }

    // put Observable cache
    if(observableMiddleware && !(action.thisActionPath in pathEpicsMap)){
      const parentPaths = generateParentPaths(action.__path);
      parentPaths.forEach((path, index) => {
        if(path in pathEpicsMap) return;
        pathParentPathsMap[path] = parentPaths.slice(index);
        pathEpicsMap[path] = generateEpics(nextState, path, dispatch, getState);
      })
    }

    // execute Effects cache
    if(action.__type in pathEffectsMap[action.path][STRING]) result = pathEffectsMap[action.path][STRING][action.__type](action, prevState !== nextState, result);
    pathParentPathsMap[action.path].forEach(path => pathEffectsMap[path][REG_EXP].forEach(effect => effect(action, prevState !== nextState, result)));
    return result;
  };

  middleware.setSagaMiddleware = (_sagaMiddleware) => {
    sagaMiddleware = _sagaMiddleware;
  };

  middleware.setObservableMiddleware = (_observableMiddleware) => {
    observableMiddleware = _observableMiddleware;
    observableMiddleware.replaceEpic(rootEpic);
  };

  return middleware;
};
