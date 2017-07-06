/* eslint-disable no-constant-condition, no-loop-func */
import { delay } from 'redux-saga';
import { race, call, put, take, cancel, fork } from 'redux-saga/effects';

import {
  INITIALIZE,
  START_REFRESH,
  STOP_REFRESH,
  MANUAL_REFRESH,
} from './actionTypes';
import {
  fetchDataRequest,
  fetchDataSuccess,
  fetchDataFailure,
} from './actions';

export function* fetchData(action) {
  yield put(fetchDataRequest(action.meta.loader, {
    apiCall: action.payload.apiCall,
    props: action.payload.props,
  }));

  try {
    const data = yield call(action.payload.apiCall, action.payload.props);
    yield put(fetchDataSuccess(action.meta.loader, { data }));
  } catch (err) {
    yield put(fetchDataFailure(action.meta.loader, { error: err }));
  }
}

export function* autoRefresh(action) {
  while (true) {
    yield call(fetchData, action);

    yield race([
      call(delay, action.payload.timeout),
      take(act => act.type === MANUAL_REFRESH && act.meta.loader === action.meta.loader),
    ]);
  }
}

export function* watchManualRefresh(action) {
  while (true) {
    const manualRefreshAction = yield take(act =>
      act.type === MANUAL_REFRESH && act.meta.loader === action.meta.loader);

    yield call(fetchData, manualRefreshAction);
  }
}

export function* dataLoaderFlow() {
  const tasks = {};

  while (true) {
    const action = yield take([START_REFRESH, STOP_REFRESH, INITIALIZE]);

    const loaderTasks = tasks[action.meta.loader] || {};

    if (!tasks[action.meta.loader]) {
      tasks[action.meta.loader] = {};
    }

    if (action.type === START_REFRESH && !loaderTasks.autoRefresh) {
      if (loaderTasks.watchManualRefresh) {
        yield cancel(loaderTasks.watchManualRefresh);
        delete loaderTasks.watchManualRefresh;
      }

      tasks[action.meta.loader].autoRefresh = yield fork(autoRefresh, action);
    } else if (!loaderTasks.watchManualRefresh) {
      if (loaderTasks.autoRefresh) {
        yield cancel(loaderTasks.autoRefresh);
        delete loaderTasks.autoRefresh;
      }

      tasks[action.meta.loader].watchManualRefresh =
        yield fork(watchManualRefresh, action);
    }
  }
}

export default function* rootSaga() {
  yield fork(dataLoaderFlow);
}
