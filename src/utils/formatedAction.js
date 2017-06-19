import _ from 'lodash';

export default (action) => {
  let pathInType = null;
  let typeInType = action.type;
  if(action.type.indexOf('/') != -1){
    const splittedActionType = action.type.split('/');
    pathInType = splittedActionType[0];
    typeInType = splittedActionType[1];
  }

  const original = {
    path: action.path ? pathArray(action.path) : [],
    pathInType: pathInType ? pathArray(pathInType) : [],
    typeInType
  };

  const toAssign = {
    path: original.path.concat(original.pathInType),
    __path: pathString(toAssign.path),
    __type: original.typeInType
  };
  toAssign.type = [toAssign.__path, original.typeInType].join('/');

  return _.assign(action, toAssign);
};
