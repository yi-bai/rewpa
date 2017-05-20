// idea came from
// http://blog.scottlogic.com/2016/05/19/redux-reducer-arrays.html
// http://redux.js.org/docs/recipes/reducers/ReusingReducerLogic.html
import { assign, concat, flatten, isFunction, isArray, isObject } from 'lodash';

// lib
const SEPARATOR = '.';
const OR_SEPARATOR = '|';
const UNION_SEPARATOR = ',';
const OBJECT = {
  SET : '__set',
  ASSIGN : '__assign',
  //LIST
  APPEND : '__append', // payload: element
  INSERT : '__insert', // payload: { elem:, position: }
  EXTEND : '__extend', // payload: { elem:, position: }
  FILTER : '__filter', // payload: function || number (negative support) || [slice1, slice2] || object
  REMOVE : '__remove' // payload: function || number (negative support) || [slice1, slice2] || object
};
const OBJECT_ACTION_VALUES = Object.values(OBJECT);

// utils
const isPathMatch = (actionPath) => {
  if(typeof actionPath == 'undefined') return true;
  return actionPath.some((e) => e.length == 0);
};

const isPathContinue_ = (actionPath, path, filterPass = false) => {
  if(!actionPath.length){
    return false;
  }
  return actionPath[0] === '*' ||
    actionPath[0] === '' ||
    (actionPath[0] === '?' && filterPass) ||
    actionPath[0] === path ||
    actionPath[0].split(UNION_SEPARATOR).includes(path);
};

const isPathContinue = (actionPaths, path, filterPass = false) => {
  if(!isArray(actionPaths)) return true;
  return actionPaths.some((actionPath) => isPathContinue_(actionPath, path, filterPass));
}

const popActionPathHead_ = (path, key, filterPass) => {
  if(!path.length) return [];
  if(path[0] === '') return concat([path], popActionPathHead_(path.slice(1), key, filterPass));
  if(path[0] === '*' || (path[0] === '?' && filterPass) || path[0] === key || path[0].split(UNION_SEPARATOR).includes(key)) return [path.slice(1)];
  else return [];
};

const popActionPathHead = (action, key, filterPass = false) => {
  if(!('path' in action)){ return action; }
  let newActionPath = action.path.map((path) => popActionPathHead_(path, key, filterPass));
  newActionPath = flatten(newActionPath);
  console.log(newActionPath);
  return assign({}, action, { path: newActionPath });
}

const ensureActionPathArray = (action) => {
  if(!('path' in action) || action.path == null){ action.path = ''; }
  if(!isArray(action.path)){
    const path_array = action.path.replace(/\[(.*?)\]/, `${SEPARATOR}$1`).split(OR_SEPARATOR);
    const path_array_array = path_array.map((path) => {
      if(!path.length) return [];
      if(path[0] != '$'){
        if(path[0] == '[' || path[0] == SEPARATOR) path = '$'+path;
        else path = '$.'+path;
      }
      return path.split(SEPARATOR).slice(1);
    });
    return assign({}, action, { path: path_array_array });
  }
  return action;
};

// priminitive, object, list embeded actions
const priminitiveActionsReducer = (state, action) => {
  if(!('path' in action)){
    return state;
  }
  if(OBJECT_ACTION_VALUES.includes(action.type) && isPathMatch(action.path)){
    switch(action.type){
      case OBJECT.SET:
        return action.payload;
      case OBJECT.ASSIGN:
        return assign({}, state, action.payload);
      case OBJECT.APPEND:
        return concat(state, action.payload);
      case OBJECT.REMOVE:
        if(isFunction(action.payload)) return state.filter((elem, index) => !action.payload(elem, index));
        return state;
      default:
        return state;
    }
  }
  return state;
};

const objectActionsReducer = priminitiveActionsReducer;
const listActionsReducer = priminitiveActionsReducer;

// object/list
const objectCombinedReducer = (state, action, reducersMap) => {
  // console.log(action.path);
  const isApply = {};
  for(const key in reducersMap){
    if(key.length){
      isApply[key] = isPathContinue(action.path, key);
    }
  }
  // console.log(isApply);
  if(Object.values(isApply).some((e) => e)){
    let isChanged = false;
    for(const key in reducersMap){
      if(isApply[key]){
        const stateKey_ = reducersMap[key](state[key], popActionPathHead(action, key));
        if(stateKey_ !== state[key]){
          isChanged = true;
          state[key] = stateKey_;
        }
      }
    }
    return isChanged ? assign({}, state) : state;
  }
  return state;
};

const listMappingReducer = (state, action, reducer) => {
  // console.log(action.path);
  const isApply = state.map((elem, index) =>
    isPathContinue(action.path, index.toString(), action.filter ? action.filter(elem, index) : false) // TODO: support multiple filters
  );
  console.log(isApply);
  if(isApply.some((e) => e)){
    return state.map((elem, index) => isApply[index] ?
      reducer(state[index], popActionPathHead(action, index.toString(), action.filter ? action.filter(elem, index) : false)) : elem
    );
  }
  return state;
};

// createRewpas
const createPriminitiveRewpa = (initialState, ownReducer) => {
  const reduceForOwnReducer = (state) => (action) => {
    action = ensureActionPathArray(action);
    console.log(action.path);
    return priminitiveActionsReducer(state, action);
  };

  return (state = initialState, action) => {
    action = ensureActionPathArray(action);
    console.log(action.path);
    if(isFunction(ownReducer) && isPathMatch(action.path)){
      const state__ = ownReducer(state, action, reduceForOwnReducer(state));
      if(state__ !== state){ return state_; }
    }
    return priminitiveActionsReducer(state, action);
  };
};

const createObjectRewpa = (reducersMap, ownReducer) => {
  const reduceForOwnReducer = (state) => (action) => {
    action = ensureActionPathArray(action);
    console.log(action.path);
    let state_ = objectActionsReducer(state, action);
    if(state_ !== state) { return state_; }
    return objectCombinedReducer(state, action, reducersMap);
  };

  return (state = {}, action) => {
    action = ensureActionPathArray(action);
    console.log(action.path);
    if(isFunction(ownReducer) && isPathMatch(action.path)){
      const state__ = ownReducer(state, action, reduceForOwnReducer(state));
      if(state__ !== state){ return state__; }
    }
    let state_ = objectActionsReducer(state, action);
    if(state_ !== state) { return state_; }
    return objectCombinedReducer(state, action, reducersMap);
  };
};

const createListRewpa = (reducer, ownReducer) => {
  const reduceForOwnReducer = (state) => (action) => {
    action = ensureActionPathArray(action);
    console.log(action.path);
    let state_ = listActionsReducer(state, action);
    if(state_ !== state){ return state_; }
    return listMappingReducer(state, action, reducer);
  };

  return (state = [], action) => {
    action = ensureActionPathArray(action);
    console.log(action.path);
    if(isFunction(ownReducer) && isPathMatch(action.path)){
      const state__ = ownReducer(state, action, reduceForOwnReducer(state));
      if(state__ !== state){ return state__; }
    }
    let state_ = listActionsReducer(state, action);
    if(state_ !== state){ return state_; }
    return listMappingReducer(state, action, reducer);
  };
};

// exports
export const createRewpa = (schema, ownReducer) => {
  if(isFunction(schema)){
    return schema;
  }else if(isArray(schema)){
    return createListRewpa(createRewpa(schema[0], null), ownReducer);
  }else if(isObject(schema)){
    const reducersMap = {};
    for(const key in schema){
      if(key.length){
        reducersMap[key] = createRewpa(schema[key], null);
      }
    }
    return createObjectRewpa(reducersMap, ownReducer);
  }
  return createPriminitiveRewpa(schema, ownReducer);
};
