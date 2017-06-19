import _ from 'lodash';

const pathArray = (stringPath) => {
  return _.isArray(stringPath) ? stringPath : (stringPath ? stringPath.replace(/\[(.*?)\]/, '.$1').split('.') : []);
};

const pathString = (arrayPath) => {
  return _.isString(arrayPath) ? arrayPath : (arrayPath ? arrayPath.join('.') : '');
};

export default (action) => {
  if(!('path' in action) && action.type[0] === '@') return action;

  let pathInType = null;
  let typeInType = action.type;
  if(action.type.indexOf('/') != -1){
    const splittedActionType = action.type.split('/');
    pathInType = splittedActionType[0];
    typeInType = splittedActionType[1];
  }
  if(!action.path && !pathInType) return action;

  const original = {
    path: action.path ? pathArray(action.path) : [],
    pathInType: pathInType ? pathArray(pathInType) : [],
    typeInType
  };

  const toAssign = {
    path: original.path.concat(original.pathInType),
    __type: original.typeInType
  };
  toAssign.__path = pathString(toAssign.path);
  toAssign.type = [toAssign.__path, original.typeInType].join('/');

  return _.assign(action, toAssign);
};
