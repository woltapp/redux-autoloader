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
  yield put(fetchDataRequest(action.meta.loader, action.payload.apiCall, action.payload.props));

  try {
    const data = yield call(action.payload.apiCall, action.payload.props);
    yield put(fetchDataSuccess(action.meta.loader, data));
  } catch (e) {
    yield put(fetchDataFailure(action.meta.loader, e));
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

export function* watchManualRefresh(loaderName) {
  while (true) {
    const action = yield take(MANUAL_REFRESH);

    if (loaderName === action.meta.loader) {
      yield call(fetchData, action);
    }
  }
}

export function* dataLoaderFlow() {
  const tasks = {};

  while (true) {
    const action = yield take([START_REFRESH, STOP_REFRESH, INITIALIZE]);

    const loaderTask = tasks[action.meta.loader];

    if (action.type === START_REFRESH && (!loaderTask || loaderTask.name !== 'autoRefresh')) {
      if (loaderTask) {
        yield cancel(loaderTask);
      }

      tasks[action.meta.loader] = yield fork(autoRefresh, action);
    } else if (!loaderTask || loaderTask.name !== 'watchManualRefresh') {
      if (loaderTask) {
        yield cancel(loaderTask);
      }

      tasks[action.meta.loader] = yield fork(watchManualRefresh, action.meta.loader);
    }
  }
}

export default function* rootSaga() {
  yield fork(dataLoaderFlow);
}
