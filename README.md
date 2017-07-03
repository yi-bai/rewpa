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

### Standard Actions

## Async Actions (Effects)

### Listen to your local changes (_ON_CHANGE event)

## Organize your component

### Passing only path among your components

### Entity, Data and UI

## Using rewpa with other middlewares

### React-Redux-Router, Redux-form ...

Github repo: https://github.com/yi-bai/rewpa
