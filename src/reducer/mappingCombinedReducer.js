export default (state, action, elementRewpa) => {
  // is apply
  const isApply = {};
  const keys = Object.keys(state);
  for(const i in keys){
    const key = keys[i];
    isApply[key] = !action.path || action.path[0] === key.toString();
  }
  // apply
  console.log(state, action, isApply);
  if(Object.values(isApply).some((e) => e)){
    let isChanged = false;
    let changedState = {};
    for(const key in state){
      if(isApply[key]){
        const stateKeyAfterChild = elementRewpa(
          state[key],
          _.assign({}, action, { path: action.path ? action.path.slice(1) : action.path })
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