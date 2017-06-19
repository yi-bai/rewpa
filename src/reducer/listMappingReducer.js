export default (state, action, elementRewpa) => {
  // iterate over to determine which path to continue
  const isApply = state.map((elem, index) => !action.path || action.path[0] === index.toString());
  console.log(state, action, isApply);
  if(isApply.some((e) => e)){
    const stateAfterElementRewpa = state.map((elem, index) => isApply[index] ?
      elementRewpa(
        state[index],
        _.assign({}, action, { path: action.path ? action.path.slice(1) : action.path })
      ) : elem
    );
    // only return when some have changed
    for(const index in stateAfterElementRewpa){
      if(stateAfterElementRewpa[index] !== state[index]) return stateAfterElementRewpa;
    };
  }
  return state;
};
