import sinon from 'sinon';
import { cancel, call, put, fork } from 'redux-saga/effects';
import { createMockTask } from 'redux-saga/utils';

import {
  load,
  fetchDataRequest,
  startRefresh,
  stopRefresh,
} from './actions';
import {
  START_REFRESH,
  STOP_REFRESH,
  LOAD,
  RESET,
} from './actionTypes';
import rootSaga, {
  createDataLoaderFlow,
  fetchData,
  autoRefresh,
} from './sagas';

describe('fetchData', () => {
  const fakeApi = sinon.stub().returns(Promise.resolve('testresult'));

  test('should call api', () => {
    const gen = fetchData(load('test-loader', { apiCall: fakeApi }));

    expect(gen.next().value).toEqual(put(fetchDataRequest('test-loader', {
      apiCall: fakeApi,
    })));
    expect(gen.next().value).toEqual(call(fakeApi));
  });
});

describe('rootSaga', () => {
  let gen;

  beforeAll(() => {
    gen = rootSaga();
  });

  test(
    'should take every START_REFRESH, STOP_REFRESH, LOAD and RESET action',
    () => {
      const val = gen.next().value;

      expect(val).toHaveProperty('FORK');
      expect(val.FORK.args[0]).toEqual([START_REFRESH, STOP_REFRESH, LOAD, RESET]);
    }
  );
});

describe('dataLoaderFlow', () => {
  const fakeApi = sinon.stub().returns(Promise.resolve('testresult'));
  const mockProps = { testProp: 'test' };
  const startRefreshAction = startRefresh('test-loader', { apiCall: fakeApi, props: mockProps });
  const stopRefreshAction = stopRefresh('test-loader', { apiCall: fakeApi, props: mockProps });
  const loadAction = load('test-loader', { apiCall: fakeApi, props: mockProps });

  let gen;
  let dataLoaderFlow;

  beforeEach(() => {
    dataLoaderFlow = createDataLoaderFlow();
  });

  describe('on START_REFRESH action', () => {
    beforeEach(() => {
      gen = dataLoaderFlow(startRefreshAction);
    });

    test('should fork autoRefresh', () => {
      expect(gen.next().value).toEqual(fork(autoRefresh, startRefreshAction));
    });
  });

  describe('on STOP_REFRESH action', () => {
    beforeEach(() => {
      gen = dataLoaderFlow(stopRefreshAction);
    });

    test('should cancel autoRefresh task if it is running', () => {
      const mockLoaderTask = createMockTask();
      mockLoaderTask.name = 'autoRefresh';
      mockLoaderTask.meta = { loader: 'test-loader' };
      const startGen = dataLoaderFlow(startRefreshAction);
      startGen.next();
      startGen.next(mockLoaderTask);
      expect(gen.next(stopRefreshAction).value).toEqual(cancel(mockLoaderTask));
    });
  });

  describe('on LOAD action', () => {
    beforeEach(() => {
      gen = dataLoaderFlow(loadAction);
    });

    test('should call fetchData if autoRefresh is not running', () => {
      expect(gen.next().value).toEqual(call(fetchData, loadAction));
    });

    test('should not call fetchData if autoRefresh is running', () => {
      const startGen = dataLoaderFlow(startRefreshAction);
      startGen.next(startRefreshAction);
      startGen.next(startRefreshAction);

      expect(gen.next().value).not.toEqual(call(fetchData, loadAction));
    });
  });
});
