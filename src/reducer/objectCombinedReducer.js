export default (state, action, reducersMap) => {
  // console.log(state, action, reducersMap);
  // is apply
  const isApply = {};
  const keys = Object.keys(reducersMap);
  for(const i in keys){
    const key = keys[i];
    isApply[key] = !action.__path || action.__path[0] === key.toString();
  }
  // apply
  if(Object.values(isApply).some((e) => e)){
    let isChanged = false;
    let changedState = {};
    for(const key in reducersMap){
      if(isApply[key]){
        const stateKeyAfterChild = reducersMap[key](
          state[key],
          _.assign({}, action, { __path: action.__path ? action.__path.slice(1) : action.__path })
        );
        if(stateKeyAfterChild !== state[key]){
          isChanged = true;
          changedState[key] = stateKeyAfterChild;
        }
      }
    }
    return isChanged ? _.assign({}, state, changedState) : state;
  }
  return state;
};
