// idea came from
// http://blog.scottlogic.com/2016/05/19/redux-reducer-arrays.html
// http://redux.js.org/docs/recipes/reducers/ReusingReducerLogic.html
import assign from 'lodash/assign';
import isFunction from 'lodash/isFunction';
import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';

// lib
const SEPARATOR = '.';
const LIST = {
  SET_LIST : 'LIST__SET_LIST'
};
const LIST_ACTION_VALUES = Object.values(LIST);

const OBJECT = {
  SET_OBJECT : 'OBJECT__SET_OBJECT'
};
const OBJECT_ACTION_VALUES = Object.values(OBJECT);

// utils
const isPathMatch = (actionPath, path, filterPass = false) => {
  if(typeof actionPath === 'undefined'){
    return true;
  }
  if(actionPath === null){
    return false;
  }
  if(!actionPath.length){
    return true;
  }
  return actionPath[0] === '*' ||
    (actionPath[0] === '?' && filterPass) ||
    actionPath[0] === path ||
    (actionPath[0] === '' && isPathMatch(actionPath.slice(1), path));
};

const popActionHead = (action) => {
  if(!('path' in action)){
    return action;
  }
  const newAction = assign({}, action);
  if(action.path.length >= 1 && action.path[0] !== ''){
    assign(newAction, { path: action.path.slice(1) });
    return newAction;
  }
  if(action.path.length === 0){
    assign(newAction, { path: null });
    return newAction;
  }
  return newAction;
};

const ensureActionPathArray = (action) => {
  if(!('path' in action)){
    return action;
  }
  if(!isArray(action.path)){
    return assign({}, action, { path: action.path.replace(/\[(.*?)\]/, `${SEPARATOR}$1`).split(SEPARATOR) });
  }
  return action;
};

// priminitive, object, list embeded actions
const priminitiveActionsReducer = (state, action) => {
  if(!('path' in action)){
    return state;
  }
  if(OBJECT_ACTION_VALUES.includes(action.type) && action.path.length === 0){
    switch(action.type){
      case OBJECT.SET_OBJECT:
        return action.payload;
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
  action = ensureActionPathArray(action);
  // console.log(action.path);
  const isApply = {};
  for(const key in reducersMap){
    if(key.length){
      isApply[key] = isPathMatch(action.path, key);
    }
  }
  if(Object.values(isApply).some((e) => e)){
    let isChanged = false;
    for(const key in reducersMap){
      if(isApply[key]){
        const stateKey_ = reducersMap[key](state[key], popActionHead(action));
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
  action = ensureActionPathArray(action);
  // console.log(action.path);
  const isApply = state.map((elem, index) =>
    isPathMatch(action.path, index.toString(), action.filter ? action.filter(elem, index) : false)
  );
  if(isApply.some((e) => e)){
    return state.map((elem, index) => isApply[index] ?
      reducer(state[index], popActionHead(action)) : elem
    );
  }
  return state;
};

// createRewpas
const createPriminitiveRewpa = (initialState, ownReducer) => {
  return (state = initialState, action) => {
    // console.log('PriRewpa', action);
    if(isFunction(ownReducer)){
      const state__ = ownReducer(state, action); // TODO: let ownReducer can receive Rewpa
      if(state__ !== state){
        return state_;
      }
    }
    const state_ = priminitiveActionsReducer(state, action);
    if(state_ !== state){
      return state_;
    }
    return state;
  };
};

const createObjectRewpa = (reducersMap, ownReducer) => {
  return (state = {}, action) => {
    // console.log('ObjectRewpa', action);
    if(isFunction(ownReducer)){
      const state__ = ownReducer(state, action); // TODO: let ownReducer can receive Rewpa
      if(state__ !== state){
        return state__;
      }
    }
    let state_ = objectActionsReducer(state, action);
    if(state_ !== state){
      return state_;
    }
    state_ = objectCombinedReducer(state, action, reducersMap);
    if(state_ !== state){
      return state_;
    }
    return state;
  };
};

const createListRewpa = (reducer, ownReducer) => {
  return (state = [], action) => {
    // console.log('ListRewpa', action);
    if(isFunction(ownReducer)){
      const state__ = ownReducer(state, action); // TODO: let ownReducer can receive Rewpa
      if(state__ !== state){
        return state__;
      }
    }
    let state_ = listActionsReducer(state, action);
    if(state_ !== state){
      return state_;
    }
    state_ = listMappingReducer(state, action, reducer);
    if(state_ !== state){
      return state_;
    }
    return state;
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
