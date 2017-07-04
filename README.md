# Rewpa

Rewpa (Redux Reducer with Path) is a library works with Redux that makes composition of Recucers possible and saves your day.

Rewpa has two basic APIs of Rewpa is `createRewpa` and `rewpaMiddleware`.

With Rewpa, these tasks could be easily achieved:
- Declare reducer states,
- Compose and reuse reducer logics via Object, Array or Mapping,
- `Dispatch()` your action to a specific part of your states,
- Using standard actions to avoid boilerplates in your code,
- Adding async actions (effects),
- Connect to your Redux everywhere in your components,
- Putting all your local states into Reducer

This guide assumes readers having basic knowledges about React and Redux.

#### Connect Reducer to your React root component

Though Rewpa is not limited to React, we take React-Redux as example. You connect your Rewpa Reducer to store via:

```
import { rewpaMiddleware } from 'rewpa';
const store = createStore(reducer, composeEnhancers(applyMiddleware(rewpaMiddleware(reducer))));
```

The reducer is the root instance of Rewpa, please notice that to make Rewpa work, you have to pass in reducer once again in the rewpaMiddleware, because of the limitation that middleware has no access to reducer now in redux.

In root component, we inject store as usual.

```
const render = () => ReactDOM.render(
	<Provider store={store}>
		<App history={history}/>
	</Provider>,
	rootEl
);
```

## Declare your reducer

In Redux, a reducer module contains several key elements:
- Schema of the data,
- (Optional) Initial State,
- Actions,
- Reducers, a function that returns new state based on action and old state.

In Rewpa, we made it declarative to declare a reducer.

```
import { createRewpa } from 'rewpa';
Counter = createRewpa({
  name: 'Counter',
  schema: 0,
  initialState: 0,
  reducer: {
    INCREMENT: (state, action) => state+1,
    DECREMENT: (state, action) => state-1
  }
});
```

A rewpa is defined by:

An optional name which is only used in debugging.

A schema, must be one of the:
- Object, a key-value object,
- Array, with one element,
- Mapping, declare as {'*': value},
- String, Number, Boolean or Null.

Value in the Object, Array and Mapping could be another schema, or another rewpa.
For an application with lots of counters, schema could be declared as:

```
import { createRewpa } from 'rewpa';
const Rewpa = createRewpa({
  schema: { // schema is a Object
    singleCounter: Counter, // declare a single counter
    counterListA: [Counter], // a List, each element is a counter
    counterListB: [Counter], // you can declare same thing again
    counterMapping: {'*': Counter}, // declare Counter mapping, which is useful in normalized schema
    user: { // enclosed object
      id: null,
      name: ''
    },
    countCounter: 0
  }
  reducer: {}
});

const Counter = createRewpa({
  schema: 0,
  reducer: ... // see below
});
```

This example shows how you can easily declare your store structure. The definition of schema grammar is intuitive, and could organize arbitary data format.

The `initialState` is also optional, because rewpa would use default value of the schema as default `initialState`. Only define `initialState` when it is really needed (e.g. you want to place several counters by default). The initial state of the schema above will look like:

```
{
  singleCounter: 0,
  counterListA: [],
  counterListB: [],
  counterMapping: {},
  user: {
    id: null,
    name: '',
  },
  countCounter: 0
}
```

Finally, sync actions (reducer) and actions with effects (effects) are defined.

### Sync Actions (Reducer)

In Redux, we write reducer, a function with the sign `(oldState, action) => newState`. Usually we use a `switch-case` to deal with different actions separately.

```
const Counter = createRewpa({
  schema: 0,
  reducer: (state, action) => {
    switch(action.type){
      case 'INCREMENT':
        return state+1;
      case 'DECREMENT':
        return state-1;
      default:
        return state;
    }
  }
});
```

If `switch-case` is not your cup of tea, try an object-like reducer (which is available in many Flux variables), which makes life easier:

```
const Counter = createRewpa({
  schema: 0,
  reducer: {
    INCREMENT: (state, action) => state+1;
    DECREMENT: (state, action) => state-1;
  }
});
```

and a third variable, `put(...actions)`, returns the state after the action in executed.

```
const Date = createRewpa({
  schema: {
    year: 1970,
    month: 1,
    day: 1
  },
  reducer: {
    SET_YEAR: (state, { payload }, put) => put({ type: 'year/_SET', payload }),
    SET_MONTH: (state, { payload }, put) => put({ type: 'month/_SET', payload }),
    SET_DAY: (state, { payload }, put) => put({ type: 'day/_SET', payload })
  }
};
```

Inside the `put`, we use a action type with `'${path}/${action}'` format. The first part of action type, path, is the most important concept in rewpa. Unlike native Redux, rather than dispatching to the global state, we can dispatch to a specific part of state. The `_SET` action type is a standard action in Rewpa, a library that reduces boilerplate in your code drastically.

## Compose reducers

### Dispatch action with path

In Rewpa, action is dispatched with standard Json path:

```
dispatch({ type: 'singleCounter/INCREMENT' });
dispatch({ type: 'counterListA[1]/INCREMENT' });
dispatch({ type: 'counterMapping[36]/INCREMENT' });
```

will only modify the state of `state.singleCounter`, `state.counterListA[1]` and `state.counterMapping[36]` respectively. By doing this, counter reducer can be reused.
When dispatching to the root reducer, no path is prepended. Like `dispatch({ type: 'INCREMENT' })`.

### Standard Actions

To avoid boilerplate, Rewpa offer several standard actions for Priminitive (String, Number, Boolean or any Json object), Object, List and Mapping rewpa. Standard actions always start with an underscore. Custom action should avoid starting with an underscore.

| Rewpa Object | Type | Payload and effects |
| ------| ------ | ------ |
| All types | _SET | new value (For mapping types there're some extended usage, see below) |
|  | _ASSIGN | value to be assigned |
|  | _MERGE | value to be merged |
| List | _INSERT | If payload is left empty, a new element with initial state will be pushed to the list. If payload is an object that exactly contains `index` and `value`, a new element with the `value` will be inserted into the position of `index`. Otherwise, a new element with value of `payload` will be pushed to the list. |
| | _CONCAT | Concat the payload with the current list. |
| | _SLICE | If payload is a number `x`, slice the state into `list.slice(x)`. If payload is an array of two numbers `[x, y]`, return `list.slice(x, y)`. |
| | _DELETE | Number, Array or Object. If a string is given, delete the element in that position. Several indexes can be deleted at one time by giving an array. Negative index is supported. If an object is given, all the key-value pair will be tested against all element, and the matched elements will be deleted. |
| | _CLEAR | Set the mapping to [] |
| Mapping | _SET | Key and optional value. If value is absent the new state of key will be the initial state of the value element |
| | _DELETE | String, Array or Object. If a string is given, iterating over the mapping and delete element with the key. Several keys can be deleted at one time by giving an array. If an object is given, all the key-value pair will be tested against all element, and the matched elements will be deleted. |
| | _CLEAR | Set the mapping to {} |

## Async Actions (Effects)

According to the basic restriction of redux, to keep reducer predicable, reducer should be a stateless function without effects (e.g. calling API) or using stateful or random functions. Actions that call API or do other asynchronized tasks should be put outside of reducer. To accomplish that, lots of middlewares are invented, Redux-Thunk, Redux-Saga and Redux-Observable are some of the most popular ones.

Rewpa could work properly with Redux-Thunk and Redux-Saga, but you should always be aware of the existance of path, because Redux-Thunk and Redux-Saga works in the global state of reducer. Rewpa provides `effects` key as its effects solution.

Like `reducer`, `effects` is written as an object, and each object is a funciton with signature of `(action, dispatchLocal, getStateLocal, dispatchRoot, getStateRoot)`. The following effect increase counter with a random value.

```
const Counter = createRewpa({
  schema: 0,
  reducer: {
    INCREMENT: (state, action) => state+1;
    DECREMENT: (state, action) => state-1;
  },
  effects: {
    INCREMENT_RANDOM: ({ payload }, dispatch, getState) => {
      dispatch({ type: 'INCREMENT', payload: Math.random() });
    }
  }
});
```

Here, in the `INCREMENT_RANDOM`, it dispatch `INCREMENT` action inside. Please note that the dispatch here is not dispatching to the global state, and to keep the low coupling among reducers, use of `dispatchRoot` should be limited. Dispatching effect is exactly the same as dispatching an action:

```
dispatch({ type: 'singleCounter/INCREMENT_RANDOM' });
dispatch({ type: 'counterListA[1]/INCREMENT_RANDOM' });
dispatch({ type: 'counterMapping[36]/INCREMENT_RANDOM' });
```

This makes our components with consistent behavior: almost all the things component does is receiving states and dispatching actions or effects.

The return value of your effects functions will be the return value of `dispatch`, which enables more convenient asynchronous control flow (like async/await a dispatch with return value of Promise to be finished).

### Listen to your local changes (_ON_CHANGE event)

## Organize your component

### Passing only path among your components

### Using rewpa with React-Redux

### Entity, Data and UI

## Using rewpa with other middlewares

### React-Redux-Router, Redux-form ...

Github repo: https://github.com/yi-bai/rewpa
