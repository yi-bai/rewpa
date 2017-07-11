import RewpaResultList from './utils/RewpaResultList';

import createSagaMiddleware from 'redux-saga';
import { channel } from 'redux-saga';
import * as sagaEffects from 'redux-saga/effects';

import _ from 'lodash';

import getPath from './utils/getPath';
import formattedAction from './utils/formattedAction';

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

const actionTypeDeletePath = (type, path) => {
  return (_.startsWith(type, path)) ? type.substr(path.length) : type; 
};

const actionDeletePath = (action, path) => {
  return _.assign({}, action, { type: actionTypeDeletePath(action.type, path) });
};

const patternWithPath = (pattern, path) => {
  if(!pattern) pattern = '*';
  if(pattern === '*') return (action) => _.startsWith(action.type, path);
  if(_.isString(pattern)) return actionTypePrependPath(pattern, path);
  if(_.isFunction(pattern)) return (action) => pattern(actionDeletePath(action, path));
  if(_.isArray(pattern)) return pattern.map((patternElement) => patternWithPath(patternElement, path));
};

const actionWithPath = (action, path) => {
  return _.assign({}, action, { type: actionTypePrependPath(action.type, path) });
};

const selectorWithPath = (selector, path) => {
  return (state, ...args) => selector(getPath(state, path), ...args);
};

const createSagaFromObject = (sagaObject, sagaPathEffects) => {
  const channelMapping = {};
  return function *(action){
    if(!(action.__type in sagaObject)) return;

    if(!(action.__type in channelMapping)){
      // create channel
      channelMapping[action.__type] = yield sagaEffects.call(channel);
      // takeEvery, but saga effects as the last parameter;
      yield sagaEffects.fork(function *() {
        while(true){
          const _action = yield sagaEffects.take(channelMapping[action.__type]);
          yield sagaEffects.fork(sagaObject[action.__type], _action, sagaPathEffects);
        }
      });
    }

    yield sagaEffects.put(channelMapping[action.__type], action);
  };
};

// all saga effects are in global scope, so we have to append/delete path for them
const createPathEffects = (path) => {
  const take = (pattern) => sagaEffects.take(patternWithPath(pattern, path));
  const takeEvery = (pattern, saga, ...args) => sagaEffects.takeEvery(patternWithPath(pattern, path), (action) => saga(actionDeletePath(action, path)), ...args);
  const takeLatest = (pattern, saga, ...args) => sagaEffects.takeLatest(patternWithPath(pattern, path), (action) => saga(actionDeletePath(action, path)), ...args);
  const throttle = (ms, pattern, saga, ...args) => sagaEffects.throttle(ms, patternWithPath(pattern, path), (action) => saga(actionDeletePath(action, path)), ...args);
  const put = (action) => sagaEffects.put(formattedAction(actionWithPath(action, path)));
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
};


const channelMapping = {};
const sagaEffectsMapping = {};
const sagaMiddleware = createSagaMiddleware();

export default sagaMiddleware;

sagaMiddleware.runRewpa = function(rewpa) {
  sagaMiddleware.run(function *(){
    yield sagaEffects.takeEvery('*', function *(action){
      // the building process should be bottom-up, but only put to the leaf's channel
      if(!(action.path in channelMapping)){
        const stateNow = yield sagaEffects.select();
        let saga = rewpa(stateNow, {
          type: '@@rewpa/GET_META',
          __path: action.__path,
          payload: { argPath: ['sagas'] }
        });

        if(saga instanceof RewpaResultList){

          // create channel
          channelMapping[action.path] = yield sagaEffects.call(channel);
          sagaEffectsMapping[action.path] = createPathEffects(action.path);

          saga = saga.list[0];
          saga = _.isFunction(saga) ? saga : createSagaFromObject(saga, sagaEffectsMapping[action.path]);

          // takeEvery, but saga effects as the last parameter;
          yield sagaEffects.fork(function *() {
            while(true){
              const _action = yield sagaEffects.take(channelMapping[action.path]);
              yield sagaEffects.fork(saga, _action, sagaEffectsMapping[action.path]);
            }
          });
        }else{
          // prevent further detecting
          channelMapping[action.path] = null;
          sagaEffectsMapping[action.path] = null;
        }
      }

      if(channelMapping[action.path]){
        yield sagaEffects.put(channelMapping[action.path], action);
      }
    });
  });
};
