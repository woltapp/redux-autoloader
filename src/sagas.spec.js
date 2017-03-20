import { cancel, call, put, fork, take } from 'redux-saga/effects';
import { createMockTask } from 'redux-saga/utils';

import {
  manualRefresh,
  fetchDataRequest,
  startRefresh,
  stopRefresh,
  initialize,
} from './actions';
import {
  START_REFRESH,
  STOP_REFRESH,
  INITIALIZE,
} from './actionTypes';
import {
  fetchData,
  dataLoaderFlow,
  autoRefresh,
  watchManualRefresh,
} from './sagas';

describe('fetchData', () => {
  const fakeApi = sinon.stub().returns(Promise.resolve('testresult'));
  const mockProps = { testProp: 'test' };

  it('should call api', () => {
    const gen = fetchData(manualRefresh('test-loader', fakeApi, mockProps));

    expect(gen.next().value).to.eql(put(fetchDataRequest('test-loader', fakeApi, mockProps)));
    expect(gen.next().value).to.eql(call(fakeApi, mockProps));
  });
});

describe('dataLoaderFlow', () => {
  const fakeApi = sinon.stub().returns(Promise.resolve('testresult'));
  const mockProps = { testProp: 'test' };
  const startRefreshAction = startRefresh('test-loader', fakeApi, mockProps);
  const stopRefreshAction = stopRefresh('test-loader', fakeApi, mockProps);
  const initializeAction = initialize('test-loader');

  let gen;

  beforeEach(() => {
    gen = dataLoaderFlow();
  });

  describe('on INITIALIZE action', () => {
    it('should start watchManualRefresh', () => {
      gen.next(initializeAction);
      expect(gen.next(initializeAction).value).to.eql(fork(watchManualRefresh, 'test-loader'));
    });
  });

  describe('on START_REFRESH action', () => {
    it('should take START_REFRESH action', () => {
      expect(gen.next(startRefreshAction).value)
        .to.eql(take([START_REFRESH, STOP_REFRESH, INITIALIZE]));
    });

    it('should fork autoRefresh', () => {
      gen.next(startRefreshAction);
      expect(gen.next(startRefreshAction).value).to.eql(fork(autoRefresh, startRefreshAction));
    });

    it('should cancel existing watchManualRefresh when initialized', () => {
      const mockLoaderTask = createMockTask();
      mockLoaderTask.name = 'watchManualRefresh';
      gen.next(initializeAction);
      gen.next(initializeAction);
      gen.next(mockLoaderTask);
      expect(gen.next(startRefreshAction).value).to.eql(cancel(mockLoaderTask));
    });
  });

  describe('on STOP_REFRESH action', () => {
    it('should take STOP_REFRESH action', () => {
      expect(gen.next(startRefreshAction).value)
        .to.eql(take([START_REFRESH, STOP_REFRESH, INITIALIZE]));
    });

    it('should fork watchManualRefresh if it is not running', () => {
      gen.next(stopRefreshAction);
      expect(gen.next(stopRefreshAction).value).to.eql(fork(watchManualRefresh, 'test-loader'));
    });

    it('should not fork watchManualRefresh if it is already initialized', () => {
      const mockLoaderTask = createMockTask();
      mockLoaderTask.name = 'watchManualRefresh';
      gen.next(initializeAction);
      gen.next(initializeAction);
      gen.next(mockLoaderTask);
      gen.next(stopRefreshAction);
      expect(gen.next(stopRefreshAction).value).to.not.eql(fork(watchManualRefresh, 'test-loader'));
    });

    it('should cancel autoRefresh task it is running', () => {
      const mockLoaderTask = createMockTask();
      mockLoaderTask.name = 'autoRefresh';
      gen.next(startRefreshAction);
      gen.next(startRefreshAction);
      gen.next(mockLoaderTask);
      expect(gen.next(stopRefreshAction).value).to.eql(cancel(mockLoaderTask));
    });
  });
});
