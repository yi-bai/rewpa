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

In Redux, reducer contains several key elements:
- Schema of the data,
- (Optional) Initial State,
- Actions,
- Functions that return new state based on action and old state.

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

Value in the Object, Array and Mapping could be a enclosed schema, or another rewpa.
For an application with lots of counters, schema could be declared as:

```
import { createRewpa } from 'rewpa';
Rewpa = createRewpa({
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
  initialState: 0,
  reducer: {}
});
```

The definition of schema grammar is very intuitive.

The `initialState` is also optional, because rewpa would use default value of the schema as default `initialState`. Only define `initialState` when it is really needed (e.g. you want to place several counters by default).

Finally, sync actions (reducer) and actions with effects (effects) are defined.

### Sync Actions (Reducer)

### Async Actions (Effects)

## Compose reducers

### Standard Actions

### Standard Actions for List, Array and Mapping

### Listen to your local changes (_ON_CHANGE event)

Github repo: https://github.com/yi-bai/rewpa
