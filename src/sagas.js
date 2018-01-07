/* eslint-disable no-constant-condition, no-loop-func */
import { delay } from 'redux-saga';
import {
  takeEvery,
  race,
  call,
  put,
  take,
  cancel,
  fork,
  select,
} from 'redux-saga/effects';

import {
  START_REFRESH,
  STOP_REFRESH,
  LOAD,
  RESET,
} from './actionTypes';
import {
  fetchDataRequest,
  fetchDataSuccess,
  fetchDataFailure,
} from './actions';
import { getLoaderState } from './selectors';

export function* fetchData(action) {
  yield put(fetchDataRequest(action.meta.loader, {
    apiCall: action.payload.apiCall,
  }));

  try {
    const data = yield call(action.payload.apiCall);
    yield put(fetchDataSuccess(action.meta.loader, { data }));
  } catch (err) {
    yield put(fetchDataFailure(action.meta.loader, { error: err }));
  }
}

export function* autoRefresh(action) {
  if (action.payload.loadImmediately) {
    yield call(fetchData, action);
  }

  while (true) {
    const loaderState = yield select(getLoaderState);
    const interval = action.payload.newAutoRefreshInterval
      ? action.payload.newAutoRefreshInterval
      : loaderState[action.meta.loader].config.autoRefreshInterval;

    const {
      delayed,
      loadAction,
    } = yield race({
      delayed: call(delay, interval),
      loadAction: take(act => act.type === LOAD && act.meta.loader === action.meta.loader),
    });

    if (loadAction) {
      yield call(fetchData, loadAction);
    } else if (delayed) {
      yield call(fetchData, action);
    }
  }
}

export const createDataLoaderFlow = (taskConf = {}) => {
  const tasks = { ...taskConf };

  return function* dataLoaderFlow(action) {
    const loaderTasks = tasks[action.meta.loader] || {};

    if (!tasks[action.meta.loader]) {
      tasks[action.meta.loader] = {};
    }

    if (action.type === START_REFRESH && !loaderTasks.autoRefresh) {
      tasks[action.meta.loader].autoRefresh = yield fork(autoRefresh, action);
    }

    if ((action.type === RESET || action.type === STOP_REFRESH) && loaderTasks.autoRefresh) {
      yield cancel(loaderTasks.autoRefresh);
      delete loaderTasks.autoRefresh;
    }

    if (action.type === LOAD && !loaderTasks.autoRefresh) {
      yield call(fetchData, action);
    }
  };
};

export default function* rootSaga() {
  const dataLoaderFlow = createDataLoaderFlow();

  yield takeEvery([START_REFRESH, STOP_REFRESH, LOAD, RESET], dataLoaderFlow);
}
