export const BUILTIN_ACTIONS = {
  SET : '_SET',
  INSERT: '_INSERT',
  PUSH: '_PUSH',
  CONCAT: '_CONCAT',
  ASSIGN : '_ASSIGN',
  MERGE: '_MERGE',
  SLICE: '_SLICE',
  DELETE: '_DELETE',
  CLEAR: '_CLEAR'
};

export const BUILTIN_ACTION_VALUES = Object.values(BUILTIN_ACTIONS);

export const REWPA_ACTIONS = {
  GET_META: '@@rewpa/GET_META',
  GET_META_ITERATIVE: '@@rewpa/GET_META_ITERATIVE'
};

export const REWPA_ACTION_VALUES = Object.values(REWPA_ACTIONS);
