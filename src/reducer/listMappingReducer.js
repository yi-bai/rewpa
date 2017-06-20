export default (state, action, elementRewpa) => {
  // iterate over to determine which path to continue
  const isApply = state.map((elem, index) => !action.__path || action.__path[0] === index.toString());
  if(isApply.some((e) => e)){
    const stateAfterElementRewpa = state.map((elem, index) => isApply[index] ?
      elementRewpa(
        state[index],
        _.assign({}, action, { __path: action.__path ? action.__path.slice(1) : action.__path })
      ) : elem
    );
    // only return when some have changed
    for(const index in stateAfterElementRewpa){
      if(stateAfterElementRewpa[index] !== state[index]) return stateAfterElementRewpa;
    };
  }
  return state;
};
