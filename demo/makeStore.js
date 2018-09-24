import { createStore, combineReducers, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';

import { reducer, saga } from '../src/index';

const makeStore = () => {
  const sagaMiddleware = createSagaMiddleware();

  const store = createStore(
    combineReducers({ reduxAutoloader: reducer }),
    applyMiddleware(sagaMiddleware)
  );
  sagaMiddleware.run(saga);
  return store;
};

export default makeStore;
