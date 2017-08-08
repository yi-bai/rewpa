import _ from 'lodash';

export default (state, path) => {
  if(!path) return state;
  if(_.isObject(path) && !_.isArray(path)){
    const ret = {};
    Object.keys(path).forEach((key) => _.assign(ret, { [key]: _.get(state, path[key]) }));
    return ret;
  }

  if(path.length && path[0] === '$'){
    if(path.length > 1 && path[1] === '.'){
      path = path.slice(2);
    }else{
      path = path.slice(1);
    }
  }
  if(!path) return state;

  return { data: _.get(state, path) };
};
