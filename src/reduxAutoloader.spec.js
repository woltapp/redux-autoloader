/* eslint-disable
  react/prop-types,
  react/prefer-stateless-function,
  no-unused-expressions,
  react/require-default-props,
  prefer-destructuring,
*/
import sinon from 'sinon';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import TestUtils from 'react-dom/test-utils';
import createSagaMiddleware from 'redux-saga';
import { Provider } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';

import saga from './sagas';
import reducer from './reducer';
import reduxAutoloader from './reduxAutoloader';
import * as actionTypes from './actionTypes';
import { fetchDataSuccess, startRefresh } from './actions';

const makeStore = () => {
  const sagaMiddleware = createSagaMiddleware();

  const store = createStore(
    combineReducers({ reduxAutoloader: reducer }),
    applyMiddleware(sagaMiddleware)
  );
  sagaMiddleware.run(saga);
  return store;
};

const mockApi = sinon.stub().returns('mock-data');

const render = (Wrapped, store = makeStore()) =>
  TestUtils.renderIntoDocument(
    <Provider store={store}>
      <Wrapped />
    </Provider>
  );

const renderDecorated = (Wrapped, config = {}, store) => {
  const Decorated = reduxAutoloader({ name: 'test-loader', ...config })(
    Wrapped
  );

  return render(Decorated, store);
};

const renderAndGetProps = (component, config, store) => {
  const dom = renderDecorated(component, config, store);

  const renderedComponent = TestUtils.findRenderedComponentWithType(
    dom,
    component
  );
  return renderedComponent.props;
};

class TestComponent extends Component {
  static propTypes = {
    className: PropTypes.string,
  };

  render() {
    return <div className={this.props.className} />;
  }
}

describe('reduxAutoloader', () => {
  beforeEach(() => {
    mockApi.reset();
  });

  test('should be a decorator function', () => {
    expect(typeof reduxAutoloader).toBe('function');
  });

  test('should render without error', () => {
    expect(() => {
      renderDecorated(() => <div />);
    }).not.toThrow();
  });

  test('should expose the correct props', () => {
    const dom = renderDecorated(TestComponent);
    const props = TestUtils.findRenderedComponentWithType(dom, TestComponent)
      .props;

    expect(Object.keys(props).sort()).toEqual(
      [
        'data',
        'dataReceivedAt',
        'isLoading',
        'refresh',
        'startAutoRefresh',
        'stopAutoRefresh',
        'isRefreshing',
        'error',
        'errorReceivedAt',
      ].sort()
    );
  });

  test('should pass also props from parent', () => {
    const WrappedTestComponent = props => (
      <TestComponent {...props} className="test" />
    );
    const dom = renderDecorated(WrappedTestComponent);
    const props = TestUtils.findRenderedComponentWithType(dom, TestComponent)
      .props;

    expect(Object.keys(props)).toContain('className');
    expect(Object.keys(props)).toContain('data');
    expect(props.className).toBe('test');
  });

  test('should call api on mount', () => {
    const fakeApi = sinon.stub().returns(new Promise(() => {}));
    renderDecorated(TestComponent, { apiCall: fakeApi });
    expect(fakeApi.callCount).toBe(1);
  });

  test('should call api on re-render if reloadOnMount is true', () => {
    const fakeApi = sinon.stub().returns('somedata');
    const store = makeStore();
    const Decorated = reduxAutoloader({
      name: 'test-loader',
      apiCall: fakeApi,
      reloadOnMount: true,
    })(TestComponent);

    TestUtils.renderIntoDocument(
      <Provider store={store}>
        <Decorated />
      </Provider>
    );

    TestUtils.renderIntoDocument(
      <Provider store={store}>
        <Decorated />
      </Provider>
    );

    expect(fakeApi.callCount).toBe(2);
  });

  test('should not call api on re-render if reloadOnMount is false', () => {
    const fakeApi = sinon.stub().returns(new Promise(() => {}));
    const store = makeStore();
    const Decorated = reduxAutoloader({
      name: 'test-loader',
      apiCall: fakeApi,
      reloadOnMount: false,
    })(TestComponent);

    TestUtils.renderIntoDocument(
      <Provider store={store}>
        <Decorated />
      </Provider>
    );

    TestUtils.renderIntoDocument(
      <Provider store={store}>
        <Decorated />
      </Provider>
    );

    expect(fakeApi.callCount).toBe(1);
  });

  test('should not call api on re-render if reloadOnMount is false and cache is valid', () => {
    const clock = sinon.useFakeTimers(Date.now());

    const fakeApi = sinon.stub().returns(new Promise(() => {}));
    const store = makeStore();
    const Decorated = reduxAutoloader({
      name: 'test-loader',
      apiCall: fakeApi,
      reloadOnMount: false,
      cacheExpiresIn: 1000,
    })(TestComponent);

    TestUtils.renderIntoDocument(
      <Provider store={store}>
        <Decorated />
      </Provider>
    );
    store.dispatch(
      fetchDataSuccess('test-loader', { data: 'test-result-data' })
    );
    clock.tick(500);
    TestUtils.renderIntoDocument(
      <Provider store={store}>
        <Decorated />
      </Provider>
    );

    expect(fakeApi.callCount).toBe(1);

    clock.restore();
  });

  test('should call api on re-render if reloadOnMount is false and cache is stale', () => {
    const clock = sinon.useFakeTimers(Date.now());

    const store = makeStore();
    const Decorated = reduxAutoloader({
      name: 'test-loader',
      apiCall: mockApi,
      reloadOnMount: false,
      cacheExpiresIn: 1000,
    })(TestComponent);

    TestUtils.renderIntoDocument(
      <Provider store={store}>
        <Decorated />
      </Provider>
    );

    clock.tick(1100);

    TestUtils.renderIntoDocument(
      <Provider store={store}>
        <Decorated />
      </Provider>
    );

    expect(mockApi.callCount).toBe(2);

    clock.restore();
  });

  test('should not call api on re-render if reloadOnMount is false and cache is not stale', () => {
    const clock = sinon.useFakeTimers(Date.now());

    const store = makeStore();
    const Decorated = reduxAutoloader({
      name: 'test-loader',
      apiCall: mockApi,
      reloadOnMount: false,
      cacheExpiresIn: 1000,
    })(TestComponent);

    TestUtils.renderIntoDocument(
      <Provider store={store}>
        <Decorated />
      </Provider>
    );

    clock.tick(900);

    TestUtils.renderIntoDocument(
      <Provider store={store}>
        <Decorated />
      </Provider>
    );

    expect(mockApi.callCount).toBe(1);

    clock.restore();
  });

  describe('On initial mount', () => {
    test('should load when only apiCall is set', () => {
      const store = makeStore();
      const Decorated = reduxAutoloader({
        name: 'test-loader',
        apiCall: mockApi,
      })(TestComponent);

      TestUtils.renderIntoDocument(
        <Provider store={store}>
          <Decorated />
        </Provider>
      );

      expect(mockApi.callCount).toBe(1);
    });

    test('should load when autoRefreshInterval is set', () => {
      const store = makeStore();
      const Decorated = reduxAutoloader({
        name: 'test-loader',
        apiCall: mockApi,
        autoRefreshInterval: 10000,
      })(TestComponent);

      TestUtils.renderIntoDocument(
        <Provider store={store}>
          <Decorated />
        </Provider>
      );

      expect(mockApi.callCount).toBe(1);
    });

    test('should load when reloadOnMount=true, resetOnUnmount=true, cacheExpiresIn and autoRefreshInterval are set', () => {
      const clock = sinon.useFakeTimers(Date.now());

      const fakeApi = sinon.stub().returns('somedata');
      const store = makeStore();
      const Decorated = reduxAutoloader({
        name: 'test-loader',
        reloadOnMount: true,
        resetOnUnmount: true,
        cacheExpiresIn: 120000,
        autoRefreshInterval: 120000,
        apiCall: fakeApi,
      })(TestComponent);

      TestUtils.renderIntoDocument(
        <Provider store={store}>
          <Decorated />
        </Provider>
      );

      expect(fakeApi.callCount).toBe(1);

      clock.restore();
    });

    test(
      'should not call api after mount if startOnMount=false, reloadOnMount=false, loadOnInitialize=false ' +
        'and autoRefreshInterval=false but should after manual start',
      () => {
        const clock = sinon.useFakeTimers(Date.now());

        const fakeApi = sinon.stub().returns('somedata');
        const store = makeStore();
        const Decorated = reduxAutoloader({
          name: 'test-loader',
          startOnMount: false,
          reloadOnMount: false,
          loadOnInitialize: false,
          autoRefreshInterval: false,
          apiCall: fakeApi,
        })(TestComponent);

        TestUtils.renderIntoDocument(
          <Provider store={store}>
            <Decorated />
          </Provider>
        );

        store.dispatch(
          fetchDataSuccess('test-loader', { data: 'test-result-data' })
        );

        clock.tick(1100);

        TestUtils.renderIntoDocument(
          <Provider store={store}>
            <Decorated />
          </Provider>
        );

        expect(fakeApi.callCount).toBe(0);

        store.dispatch(
          startRefresh('test-loader', {
            apiCall: fakeApi,
            newAutoRefreshInterval: 1000,
            loadImmediately: true,
            props: {},
          })
        );

        expect(fakeApi.callCount).toBe(1);

        clock.restore();
      }
    );
  });

  describe('reinitialize', () => {
    test('should reset and reload when reinitialize returns true', () => {
      const renderNode = document.createElement('div');

      const fakeApi = sinon.stub().returns('somedata');
      const store = makeStore();
      const Decorated = reduxAutoloader({
        name: 'test-loader',
        apiCall: fakeApi,
        reloadOnMount: false,
        reinitialize: (props, nextProps) => props.test !== nextProps.test,
      })(TestComponent);

      ReactDOM.render(
        <Provider store={store}>
          <Decorated test="a" />
        </Provider>,
        renderNode
      );

      ReactDOM.render(
        <Provider store={store}>
          <Decorated test="b" />
        </Provider>,
        renderNode
      );

      expect(fakeApi.callCount).toBe(2);
    });

    test('should not reset nor reload when reinitialize returns false', () => {
      const renderNode = document.createElement('div');

      const fakeApi = sinon.stub().returns('somedata');
      const store = makeStore();
      const Decorated = reduxAutoloader({
        name: 'test-loader',
        apiCall: fakeApi,
        reloadOnMount: false,
        reinitialize: (props, nextProps) => props.test !== nextProps.test,
      })(TestComponent);

      ReactDOM.render(
        <Provider store={store}>
          <Decorated test="a" />
        </Provider>,
        renderNode
      );

      ReactDOM.render(
        <Provider store={store}>
          <Decorated test="a" />
        </Provider>,
        renderNode
      );

      expect(fakeApi.callCount).toBe(1);
    });
  });

  describe('refresh prop', () => {
    test('should fire action to reload from api', () => {
      const fakeApi = sinon.stub().returns('somedata');
      const store = makeStore();
      sinon.spy(store, 'dispatch');

      const props = renderAndGetProps(
        TestComponent,
        { apiCall: fakeApi },
        store
      );
      store.dispatch.reset();
      fakeApi.reset();
      props.refresh();

      const dispatchedAction = store.dispatch.firstCall.returnValue;
      expect(dispatchedAction.type).toBe(actionTypes.LOAD);
      expect(store.dispatch.callCount).toBe(1);
      expect(fakeApi.callCount).toBe(1);
    });
  });

  describe('isLoading prop', () => {
    test('should be "false" by default', () => {
      const props = renderAndGetProps(TestComponent);
      expect(props.isLoading).toBe(false);
    });

    test('should be "true" when data loading is triggered', () => {
      const fakeApi = () => new Promise(() => {});
      const dom = renderDecorated(TestComponent, { apiCall: fakeApi });
      const props = TestUtils.findRenderedComponentWithType(dom, TestComponent)
        .props;
      expect(props.isLoading).toBe(true);
    });

    test('should be "false" when data loading is finished', () => {
      const store = makeStore();

      const fakeApi = () => new Promise(() => {});

      const DecoratedTestComponent = reduxAutoloader({
        name: 'test-loader',
        apiCall: fakeApi,
        reloadOnMount: false,
      })(TestComponent);

      const dom = TestUtils.renderIntoDocument(
        <Provider store={store}>
          <DecoratedTestComponent />
        </Provider>
      );

      // simulate promise resolve
      store.dispatch(
        fetchDataSuccess('test-loader', { data: 'test-result-data' })
      );

      const props = TestUtils.findRenderedComponentWithType(dom, TestComponent)
        .props;

      expect(props.isLoading).toBe(false);
    });
  });

  describe('data prop', () => {
    test('should be "undefined" by default', () => {
      const props = renderAndGetProps(TestComponent);
      expect(props.data).toBe(undefined);
    });
  });

  describe('dataReceivedAt prop', () => {
    test('should be "undefined" by default', () => {
      const props = renderAndGetProps(TestComponent);
      expect(props.dataReceivedAt).toBe(undefined);
    });
  });
});
