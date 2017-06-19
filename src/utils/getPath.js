export default (state, path) => {
  if(!path) return state;
  if(path.length && path[0] === '$'){
    if(path.length > 1 && path[1] === '.'){
      path = path.slice(2);
    }else{
      path = path.slice(1);
    }
  }
  if(!path) return state;
  return _.get(state, path);
};
