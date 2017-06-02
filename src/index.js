// idea came from
// http://blog.scottlogic.com/2016/05/19/redux-reducer-arrays.html
// http://redux.js.org/docs/recipes/reducers/ReusingReducerLogic.html
import _ from 'lodash';

// lib
const SEPARATOR = '.';
const OR_SEPARATOR = '|';
const UNION_SEPARATOR = ',';
const BUILTIN_ACTIONS = {
  SET : '_SET',
  ASSIGN : '_ASSIGN',
  MERGE: '_MERGE',
  //LIST
  APPEND : '_APPEND', // payload: element
  INSERT : '_INSERT', // payload: { elem:, position: }
  EXTEND : '_EXTEND', // payload: { elem:, position: }
  FILTER : '_FILTER', // payload: function || number (negative support) || [slice1, slice2] || object
  REMOVE : '_REMOVE' // payload: function || number (negative support) || [slice1, slice2] || object
};
const BUILTIN_ACTION_VALUES = Object.values(BUILTIN_ACTIONS);
const FILTER_RE = /\(.*\)/;

// utils
// determine if current path matches the node
const isPathMatch = (actionPath) => {
  if(typeof actionPath == 'undefined') return true;
  return actionPath.some((e) => e.length == 0);
};

const isFilterPass = (state, filter) => {
  if(!filter) return false;
  const rawStateFilter = _.pick(state, Object.keys(filter));
  const stateFilter = {};
  Object.keys(rawStateFilter).map((key) => {
    if(!_.isString(rawStateFilter[key]) && !_.isNumber(rawStateFilter[key])) return false;
    stateFilter[key] = _.isString(rawStateFilter[key]) ? rawStateFilter[key] : rawStateFilter[key].toString();
  })
  return _.isEqual(stateFilter, filter);
};

const isPathContinue_ = (actionPath, key, rewpaname, state) => {
  if(!actionPath.length){ return false; }
  const otherPass = (actionPath[0].any || actionPath[0].deep || actionPath[0].key.includes(key) || rewpaname && actionPath[0].name === rewpaname);
  return actionPath[0].filter ? (isFilterPass(state, actionPath[0].filter) && otherPass) : otherPass;
};

// determine if actions should be dilivered to children
const isPathContinue = (actionPaths, key, rewpaname, state) => {
  if(!_.isArray(actionPaths)) return true;
  console.log(actionPaths, key, rewpaname, state);
  return actionPaths.some((actionPath) => isPathContinue_(actionPath, key, rewpaname, state));
}

const popActionPathHead_ = (path, key, rewpaname, state) => {
  if(!path.length) return [];
  if(path[0].deep) return _.concat([path], popActionPathHead_(path.slice(1), key, rewpaname, state));
  const otherPass = (path[0].any || path[0].key.includes(key) || rewpaname && path[0].name === rewpaname);
  return (path[0].filter ? (isFilterPass(state, path[0].filter) && otherPass) : otherPass) ? [path.slice(1)] : [];
};

// delete the head of action to pass to children
const popActionPathHead = (action, key, rewpaname, state) => {
  if(!('path' in action)){ return action; }
  let newActionPath = action.path.map((path) => popActionPathHead_(path, key, rewpaname, state));
  newActionPath = _.flatten(newActionPath);
  console.log(newActionPath, state);
  return _.assign({}, action, { path: newActionPath });
}

// convert action string to array of path objects
// supporting type:
// [0]|*|#Rewpaname|name, optional (key:value,key:value)
// { key: null, name: null, deep: boolean, any: boolean, filter: {} } 
const convertActionStringToPathObjects = (action) => {
  if(action.type[0] == '@') { return action; } // bypass special events
  // split the action type into path and type
  if(action.type.indexOf('/') != -1) {
    const pathAndType = action.type.split('/');
    action = _.assign({}, action);
    action.path = pathAndType[0]; action.type = pathAndType[1];
  }
  if(!('path' in action) || action.path == null){ action.path = ''; }
  if(!_.isArray(action.path)){
    // replace [something] into .something
    const path_array = action.path.replace(/\[(.*?)\]/, `${SEPARATOR}$1`).split(OR_SEPARATOR);
    // change into paths
    const path_array_array = path_array.map((path) => {
      if(!path.length) return [];
      if(path[0] != '$'){
        if(path[0] == SEPARATOR) path = '$'+path;
        else path = '$.'+path;
      }
      const paths = path.split(SEPARATOR).slice(1);
      return paths.map((path) => {
        let filter = FILTER_RE.exec(path);
        console.log(filter);
        if(filter){
          filter = filter[0].replace('(','').replace(')','');
          const filterObject = {};
          filter.split(',').map((keyValue) => {
            keyValue = keyValue.split(':');
            filterObject[keyValue[0]] = keyValue[1];
          });
          path = path.replace(FILTER_RE, '');
          filter = filterObject;
        }
        pathObject = { filter };
        pathObject.any = path === '*';
        pathObject.deep = (path === '' && !filter);
        pathObject.name = path[0] === '#' ? path.substr(1) : null;
        if(!pathObject.any && !pathObject.deep && !pathObject.name && path.length) pathObject.key = path.split(UNION_SEPARATOR);
        else pathObject.key = [];
        return pathObject;
      });
    });
    console.log(_.assign({}, action, { path: path_array_array }));
    return _.assign({}, action, { path: path_array_array });
  }

  return action;
};

// priminitive, object, list embeded actions
const builtinPriminitiveReducer = (state, action, elementRewpa) => {
  if(!('path' in action)){
    return state;
  }
  if(BUILTIN_ACTION_VALUES.includes(action.type) && isPathMatch(action.path)){
    switch(action.type){
      case BUILTIN_ACTIONS.SET:
        return action.payload;
      case BUILTIN_ACTIONS.ASSIGN:
        if(!_.isArray(state)) return _.assign({}, state, action.payload);
        return action.payload.map((element) => _.assign({}, elementRewpa(undefined, { type: '@@INIT' }), element));
      case BUILTIN_ACTIONS.MERGE:
        return _.mergeWith({}, state, action.payload, (objValue, srcValue) => {
          // for array, replace
          if(_.isArray(objValue)) return srcValue;
        });
      case BUILTIN_ACTIONS.APPEND:
        if(typeof action.payload === 'undefined'){
          return _.concat(state.slice(), elementRewpa(undefined, { type: '@@INIT' }));
        }
        return _.concat(state.slice(), action.payload);
      case BUILTIN_ACTIONS.REMOVE:
        if(_.isFunction(action.payload)) return state.filter((elem, index) => !action.payload(elem, index));
        else{
          state.splice(action.payload, 1)
          return state.slice();
        }
        return state;
      default:
        return state;
    }
  }
  return state;
};

const builtinObjectReducer = builtinPriminitiveReducer;
const builtinListReducer = builtinPriminitiveReducer;

// combined reducer
const objectCombinedReducer = (state, action, reducersMap) => {
  // is apply
  const isApply = {};
  const keys = Object.keys(reducersMap);
  for(const i in keys){
    const key = keys[i];
    isApply[key] = isPathContinue(action.path, key.toString(), reducersMap[key].rewpaname, state[key]);
  }
  console.log(isApply);
  // apply
  if(Object.values(isApply).some((e) => e)){
    let isChanged = false;
    for(const key in reducersMap){
      if(isApply[key]){
        const stateKeyAfterChild = reducersMap[key](state[key], popActionPathHead(action, key.toString(), reducersMap[key].rewpaname, state[key]));
        if(stateKeyAfterChild !== state[key]){
          isChanged = true;
          state[key] = stateKeyAfterChild;
        }
      }
    }
    return isChanged ? _.assign({}, state) : state;
  }
  return state;
};

// list reducer
const listMappingReducer = (state, action, elementRewpa) => {
  // iterate over to determine which path to continue
  const isApply = state.map((elem, index) =>
    isPathContinue(action.path, index.toString(), elementRewpa.rewpaname, state[index])
  );
  if(isApply.some((e) => e)){
    return state.map((elem, index) => isApply[index] ?
      elementRewpa(
        state[index],
        popActionPathHead(action, index.toString(), elementRewpa.rewpaname, state[index])
      ) : elem
    );
  }
  return state;
};

// createRewpas
const createPriminitiveRewpa = (arg) => {
  let rewpaname    = ('name' in arg)         ? arg.name         : null;
  let initialState = ('initialState' in arg) ? arg.initialState : null;
  let ownReducer   = ('ownReducer' in arg)   ? arg.ownReducer   : null;

  const putGenerator = (state) => (...args) => {
    for(const i in args){
      const action = convertActionStringToPathObjects(args[i]);
      state = builtinPriminitiveReducer(state, action);
    }
    return state;
  };

  const ret = (state = initialState, action) => {
    action = convertActionStringToPathObjects(action);
    // own reducer
    if(_.isFunction(ownReducer) && isPathMatch(action.path)){
      const stateAfterOwnReducer = ownReducer(state, action, putGenerator(state));
      if(stateAfterOwnReducer && stateAfterOwnReducer !== state){ return stateAfterOwnReducer; }
    }
    // built-in reducer
    return builtinPriminitiveReducer(state, action);
  };
  ret.rewpaname = rewpaname;
  return ret;
};

const createObjectRewpa = (arg) => {
  let rewpaname  = ('name' in arg)       ? arg.name       : null;
  let rewpaMap   = ('rewpaMap' in arg)   ? arg.rewpaMap   : null;
  let ownReducer = ('ownReducer' in arg) ? arg.ownReducer : null;

  const putGenerator = (state) => (...args) => {
    for(const i in args){
      const action = convertActionStringToPathObjects(args[i]);
      state = builtinObjectReducer(state, action);
      state = objectCombinedReducer(state, action, rewpaMap);
    }
    return state;
  };

  const ret = (state = {}, action) => {
    action = convertActionStringToPathObjects(action);
    // own reducer
    if(_.isFunction(ownReducer) && isPathMatch(action.path)){
      const stateAfterOwnReducer = ownReducer(state, action, putGenerator(state));
      if(stateAfterOwnReducer && stateAfterOwnReducer !== state){ return stateAfterOwnReducer; }
    }
    // built-in reducer
    const stateAfterBuiltInReducer = builtinObjectReducer(state, action);
    if(stateAfterBuiltInReducer && stateAfterBuiltInReducer !== state) { return stateAfterBuiltInReducer; }
    // "combined" reducer
    return objectCombinedReducer(state, action, rewpaMap);
  };
  ret.rewpaname = rewpaname;
  return ret;
};

const createListRewpa = (arg) => {
  let rewpaname    = ('name' in arg)         ? arg.name          : null;
  let elementRewpa = ('elementRewpa' in arg) ? arg.elementRewpa  : null;
  let ownReducer   = ('ownReducer' in arg)   ? arg.ownReducer    : null;

  const putGenerator = (state) => (...args) => {
    for(const i in args){
      const action = convertActionStringToPathObjects(args[i]);
      state = builtinListReducer(state, action, elementRewpa);
      state = listMappingReducer(state, action, elementRewpa);
    }
    return state;
  };

  const ret = (state = [], action) => {
    action = convertActionStringToPathObjects(action);
    // own reducer
    if(_.isFunction(ownReducer) && isPathMatch(action.path)){
      const stateAfterOwnReducer = ownReducer(state, action, putGenerator(state));
      if(stateAfterOwnReducer !== state){ return stateAfterOwnReducer; }
    }
    // built-in reducer
    const stateAfterBuiltInReducer = builtinListReducer(state, action, elementRewpa);
    if(stateAfterBuiltInReducer && stateAfterBuiltInReducer !== state){ return stateAfterBuiltInReducer; }
    // iterate over all elements
    return listMappingReducer(state, action, elementRewpa);
  };
  ret.rewpaname = rewpaname;
  return ret;
};

// exports
export const createRewpa = (arg) => {
  let rewpaname  = ('name' in arg)    ? arg.name    : null;
  let schema     = ('schema' in arg)  ? arg.schema  : null;
  let ownReducer = ('reducer' in arg) ? arg.reducer : null;

  if(_.isFunction(schema)){ // schema is a rewpa
    return schema;
  }else if(_.isArray(schema)){ // schema is an array
    const elementRewpa = createRewpa({ schema: schema[0] });
    return createListRewpa({ name: rewpaname, elementRewpa, ownReducer });
  }else if(_.isObject(schema)){ // schema is an object
    const rewpaMap = {};
    const keys = Object.keys(schema);
    for(const i in keys){
      const key = keys[i];
      rewpaMap[key] = createRewpa({ schema: schema[key] });
    }
    return createObjectRewpa({ name: rewpaname, rewpaMap, ownReducer });
  }else{ // schema is other objects
  return createPriminitiveRewpa({ name: rewpaname, initialState: schema, ownReducer });
  }
};

// utils export
export const joinPath = (arg1, arg2) => {
  if(_.isString(arg2) && arg2[0] == '$') return arg2;
  if(_.isNumber(arg1)) arg1 = `[${arg1}]`;
  if(_.isNumber(arg2)) arg2 = `[${arg2}]`;
  if(!arg1) return arg2;
  const isExtraSepartor = arg2[0] === '[' ? '' : '.';
  return `${arg1}${isExtraSepartor}${arg2}`;
}

// utils for react-redux
export const connectWithPath = (connect) => (mapStateToProps, mapDispatchToProps, mergeProps, options = {}) => {
  let mapStateToProps_ = mapStateToProps;
  let mapDispatchToProps_ = mapDispatchToProps;

  if(_.isFunction(mapStateToProps)){
    mapStateToProps_ = (state, ownProps) => {
      try{
        let storeState = eval('state.'+ownProps.path);
        if(typeof storeState === 'undefined') return mapStateToProps(state, ownProps);
        storeState = (_.isObject(storeState) && !_.isArray(storeState)) ? storeState : (_.isArray(storeState) ? { __list: storeState } : { __state: storeState });
        let afterStoreStateJoin = _.assign(mapStateToProps(state, ownProps), storeState);
        return afterStoreStateJoin;
      }catch(Err){
        return mapStateToProps(state, ownProps);
      }
    };
  }

  if(_.isFunction(mapDispatchToProps)){
    mapDispatchToProps_ = (dispatch, ownProps) => {
      if(!_.isString(ownProps.path)) return mapDispatchToProps(dispatch, ownProps);
      const dispatch_ = (action) => {
        if(action.path){
          action.path = joinPath(ownProps.path, action.path);
        }else{
          if(action.type.indexOf('/') !== -1){
            const pathType = action.type.split('/');
            pathType[0] = joinPath(ownProps.path, pathType[0]);
            action.type = pathType.join('/');
          }else{
            action.type = [ownProps.path, action.type].join('/');
          }
        }
        dispatch(action);
      }
      return mapDispatchToProps(dispatch_, ownProps);
    }
  }

  return connect(mapStateToProps_, mapDispatchToProps_, mergeProps, options);
}
