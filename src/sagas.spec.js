import { cancel, call, put, fork, takeEvery } from 'redux-saga/effects';
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
  const mockProps = { testProp: 'test' };

  it('should call api', () => {
    const gen = fetchData(load('test-loader', { apiCall: fakeApi, props: mockProps }));

    expect(gen.next().value).to.eql(put(fetchDataRequest('test-loader', {
      apiCall: fakeApi,
      props: mockProps,
    })));
    expect(gen.next().value).to.eql(call(fakeApi, mockProps));
  });
});

describe('rootSaga', () => {
  let gen;

  before(() => {
    gen = rootSaga();
  });

  it('should take every START_REFRESH, STOP_REFRESH, LOAD and RESET action', () => {
    const val = gen.next().value;

    expect(val).to.include.key('FORK');
    expect(val.FORK.args[0]).to.eql([START_REFRESH, STOP_REFRESH, LOAD, RESET]);
  });
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

    it('should fork autoRefresh', () => {
      expect(gen.next().value).to.eql(fork(autoRefresh, startRefreshAction));
    });
  });

  describe('on STOP_REFRESH action', () => {
    beforeEach(() => {
      gen = dataLoaderFlow(stopRefreshAction);
    });

    it('should cancel autoRefresh task if it is running', () => {
      const mockLoaderTask = createMockTask();
      mockLoaderTask.name = 'autoRefresh';
      mockLoaderTask.meta = { loader: 'test-loader' };
      const startGen = dataLoaderFlow(startRefreshAction);
      startGen.next();
      startGen.next(mockLoaderTask);
      expect(gen.next(stopRefreshAction).value).to.eql(cancel(mockLoaderTask));
    });
  });

  describe('on LOAD action', () => {
    beforeEach(() => {
      gen = dataLoaderFlow(loadAction);
    });

    it('should call fetchData if autoRefresh is not running', () => {
      expect(gen.next().value).to.eql(call(fetchData, loadAction));
    });

    it('should not call fetchData if autoRefresh is running', () => {
      const startGen = dataLoaderFlow(startRefreshAction);
      startGen.next(startRefreshAction);
      startGen.next(startRefreshAction);

      expect(gen.next().value).to.not.eql(call(fetchData, loadAction));
    });
  });
});
