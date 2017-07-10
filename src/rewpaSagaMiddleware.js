import RewpaResultList from './utils/RewpaResultList';

import createSagaMiddleware from 'redux-saga';
import { channel } from 'redux-saga';
import * as sagaEffects from 'redux-saga/effects';


const channelMapping = {};
const sagaMiddleware = createSagaMiddleware();

export default sagaMiddleware;

sagaMiddleware.runRewpa = function(rewpa) {
  sagaMiddleware.run(function *(){
    yield sagaEffects.takeEvery('*', function *(action){
      if(!(action.type in channelMapping)){
        const stateNow = yield sagaEffects.select();
        let saga = rewpa(stateNow, {
          type: '@@rewpa/GET_META',
          __path: action.__path,
          payload: { argPath: ['sagas', action.__type] }
        });

        if(saga instanceof RewpaResultList){
          saga = saga.list[0];
          channelMapping[action.type] = yield sagaEffects.call(channel);
          // 模仿takeEvery, 为每一个action.type做一个Channel
          yield sagaEffects.fork(function *(){
            while(true){
              const _action = yield sagaEffects.take(channelMapping[action.type]);
              yield sagaEffects.fork(saga, _action);
            }
          });
        }
      }
      if(channelMapping[action.type]){
        yield sagaEffects.put(channelMapping[action.type], action);
      }
    });
  });
};
