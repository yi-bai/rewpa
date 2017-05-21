// idea came from
// http://blog.scottlogic.com/2016/05/19/redux-reducer-arrays.html
// http://redux.js.org/docs/recipes/reducers/ReusingReducerLogic.html
import { assign, concat, flatten, mergeWith, isFunction, isArray, isObject, isString } from 'lodash';

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

const isPathContinue_ = (actionPath, path, rewpaname, filterPass = false) => {
  if(!actionPath.length){
    return false;
  }
  return actionPath[0] === '*' ||
    actionPath[0] === '' ||
    (actionPath[0] === '?' && filterPass) ||
    actionPath[0] === path ||
    (actionPath[0][0] === '#' && actionPath[0].slice(1) === rewpaname) ||
    actionPath[0].split(UNION_SEPARATOR).includes(path);
};

const isPathContinue = (actionPaths, path, rewpaname, filterPass = false) => {
  if(!isArray(actionPaths)) return true;
  return actionPaths.some((actionPath) => isPathContinue_(actionPath, path, rewpaname, filterPass));
}

const popActionPathHead_ = (path, key, rewpaname, filterPass) => {
  if(!path.length) return [];
  if(path[0] === '') return concat([path], popActionPathHead_(path.slice(1), key, rewpaname, filterPass));
  if(path[0] === '*' ||
    (path[0] === '?' && filterPass) ||
    path[0] === key ||
    (path[0][0] === '#' && path[0].slice(1) === rewpaname) ||
    path[0].split(UNION_SEPARATOR).includes(key)) return [path.slice(1)];
  else return [];
};

const popActionPathHead = (action, key, rewpaname, filterPass = false) => {
  if(!('path' in action)){ return action; }
  let newActionPath = action.path.map((path) => popActionPathHead_(path, key, rewpaname, filterPass));
  newActionPath = flatten(newActionPath);
  // console.log(newActionPath, key, rewpaname);
  return assign({}, action, { path: newActionPath });
}

const ensureActionPathArray = (action) => {
  if(action.type[0] == '@') { return action; } // bypass special events
  if(action.type.indexOf('/') != -1) {
    const pathAndType = action.type.split('/');
    action = assign({}, action);
    action.path = pathAndType[0]; action.type = pathAndType[1];
  }
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
        return mergeWith({}, state, action.payload, (objValue, srcValue) => {
          if(isArray(objValue)) return srcValue;
        });
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
  // // console.log(action.path);
  const isApply = {};
  for(const key in reducersMap){
    if(key.length){
      isApply[key] = isPathContinue(action.path, key, reducersMap[key].rewpaname);
    }
  }
  // // console.log(isApply);
  if(Object.values(isApply).some((e) => e)){
    let isChanged = false;
    for(const key in reducersMap){
      if(isApply[key]){
        const stateKey_ = reducersMap[key](state[key], popActionPathHead(action, key, reducersMap[key].rewpaname));
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

const listMappingReducer = (state, action, elementRewpa) => {
  // // console.log(action.path);
  const isApply = state.map((elem, index) =>
    isPathContinue(action.path, index.toString(), elementRewpa.rewpaname, action.filter ? action.filter(elem, index) : false) // TODO: support multiple filters
  );
  // console.log(isApply);
  if(isApply.some((e) => e)){
    return state.map((elem, index) => isApply[index] ?
      elementRewpa(state[index], popActionPathHead(action, index.toString(), elementRewpa.rewpaname, action.filter ? action.filter(elem, index) : false)) : elem
    );
  }
  return state;
};

// createRewpas
const createPriminitiveRewpa = (rewpaname, initialState, ownReducer) => {
  const runActionsForOwnReducer = (state) => (...args) => {
    for(const i in args){
      const action = ensureActionPathArray(args[i]);
      state = priminitiveActionsReducer(state, action);
    }
    return state;
  };

  const ret = (state = initialState, action) => {
    action = ensureActionPathArray(action);
    // console.log(action.path);
    if(isFunction(ownReducer) && isPathMatch(action.path)){
      const state__ = ownReducer(state, action, runActionsForOwnReducer(state));
      if(state__ !== state){ return state_; }
    }
    return priminitiveActionsReducer(state, action);
  };
  ret.rewpaname = rewpaname;
  return ret;
};

const createObjectRewpa = (rewpaname, reducersMap, ownReducer) => {
  const runActionsForOwnReducer = (state) => (...args) => {
    for(const i in args){
      const action = ensureActionPathArray(args[i]);
      state = objectActionsReducer(state, action);
      state = objectCombinedReducer(state, action, reducersMap);
    }
    return state;
  };

  const ret = (state = {}, action) => {
    action = ensureActionPathArray(action);
    // console.log(action.path);
    if(isFunction(ownReducer) && isPathMatch(action.path)){
      const state__ = ownReducer(state, action, runActionsForOwnReducer(state));
      if(state__ !== state){ return state__; }
    }
    let state_ = objectActionsReducer(state, action);
    if(state_ !== state) { return state_; }
    return objectCombinedReducer(state, action, reducersMap);
  };
  ret.rewpaname = rewpaname;
  return ret;
};

const createListRewpa = (rewpaname, elementRewpa, ownReducer) => {
  const runActionsForOwnReducer = (state) => (...args) => {
    for(const i in args){
      const action = ensureActionPathArray(args[i]);
      state = listActionsReducer(state, action);
      state = listMappingReducer(state, action, elementRewpa);
    }
    return state;
  };

  const ret = (state = [], action) => {
    action = ensureActionPathArray(action);
    // console.log(action.path);
    if(isFunction(ownReducer) && isPathMatch(action.path)){
      const state__ = ownReducer(state, action, runActionsForOwnReducer(state));
      if(state__ !== state){ return state__; }
    }
    let state_ = listActionsReducer(state, action);
    if(state_ !== state){ return state_; }
    return listMappingReducer(state, action, elementRewpa);
  };
  ret.rewpaname = rewpaname;
  return ret;
};

// exports
export const createRewpa = (...args) => {
  // available args: (rewpaname, schema), (rewpaname, schema, ownReducer), (schema), (schema, ownReducer)
  let rewpaname = null;
  let schema = null;
  let ownReducer = null;
  if(isString(args[0]) || args[0] == null){
    rewpaname = args[0]; schema = args[1];
    if(args.length > 2) ownReducer = args[2];
  }else{
    schema = args[0];
    if(args.length > 1) ownReducer = args[1];
  }

  if(isFunction(schema)){
    return schema;
  }else if(isArray(schema)){
    return createListRewpa(rewpaname, createRewpa(null, schema[0], null), ownReducer);
  }else if(isObject(schema)){
    const reducersMap = {};
    for(const key in schema){
      if(key.length){
        reducersMap[key] = createRewpa(null, schema[key], null);
      }
    }
    return createObjectRewpa(rewpaname, reducersMap, ownReducer);
  }
  return createPriminitiveRewpa(rewpaname, schema, ownReducer);
};
