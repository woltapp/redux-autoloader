/* eslint-disable
  react/prop-types,
  react/prefer-stateless-function,
  no-unused-expressions,
  react/require-default-props,
  prefer-destructuring,
*/
import '@babel/polyfill';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import TestUtils from 'react-addons-test-utils';
import createSagaMiddleware from 'redux-saga';
import { Provider } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';

import saga from './sagas';
import reducer from './reducer';
import reduxAutoloader from './reduxAutoloader';
import * as actionTypes from './actionTypes';
import {
  fetchDataSuccess,
  startRefresh,
} from './actions';

const makeStore = () => {
  const sagaMiddleware = createSagaMiddleware();

  const store = createStore(
    combineReducers({ reduxAutoloader: reducer }),
    applyMiddleware(sagaMiddleware),
  );
  sagaMiddleware.run(saga);
  return store;
};

const mockApi = sinon.stub().returns('mock-data');

const render = (Wrapped, store = makeStore()) => TestUtils.renderIntoDocument(
  <Provider store={store}>
    <Wrapped />
  </Provider>,
);

const renderDecorated = (Wrapped, config = {}, store) => {
  const Decorated = reduxAutoloader({ name: 'test-loader', ...config })(Wrapped);

  return render(Decorated, store);
};

const renderAndGetProps = (component, config, store) => {
  const dom = renderDecorated(component, config, store);

  const renderedComponent = TestUtils.findRenderedComponentWithType(dom, component);
  return renderedComponent.props;
};

class TestComponent extends Component {
  static propTypes = {
    className: PropTypes.string,
  }

  render() {
    return <div className={this.props.className} />;
  }
}

describe('reduxAutoloader', () => {
  beforeEach(() => {
    mockApi.reset();
  });

  it('should be a decorator function', () => {
    expect(reduxAutoloader).to.be.a('function');
  });

  it('should render without error', () => {
    expect(() => {
      renderDecorated(() => <div />);
    }).to.not.throw();
  });

  it('should expose the correct props', () => {
    const dom = renderDecorated(TestComponent);
    const props = TestUtils.findRenderedComponentWithType(dom, TestComponent).props;

    expect(Object.keys(props).sort()).to.deep.equal([
      'data',
      'dataReceivedAt',
      'isLoading',
      'refresh',
      'startAutoRefresh',
      'stopAutoRefresh',
      'isRefreshing',
      'error',
      'errorReceivedAt',
    ].sort());
  });

  it('should pass also props from parent', () => {
    const WrappedTestComponent = props => <TestComponent {...props} className="test" />;
    const dom = renderDecorated(WrappedTestComponent);
    const props = TestUtils.findRenderedComponentWithType(dom, TestComponent).props;

    expect(Object.keys(props)).to.include('className');
    expect(Object.keys(props)).to.include('data');
    expect(props.className).to.equal('test');
  });

  it('should call api on mount', () => {
    const fakeApi = sinon.stub().returns(new Promise(() => {}));
    renderDecorated(TestComponent, { apiCall: fakeApi });
    expect(fakeApi.callCount).to.equal(1);
  });

  it('should call api on re-render if reloadOnMount is true', () => {
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
      </Provider>,
    );

    TestUtils.renderIntoDocument(
      <Provider store={store}>
        <Decorated />
      </Provider>,
    );

    expect(fakeApi.callCount).to.equal(2);
  });

  it('should not call api on re-render if reloadOnMount is false', () => {
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
      </Provider>,
    );

    TestUtils.renderIntoDocument(
      <Provider store={store}>
        <Decorated />
      </Provider>,
    );

    expect(fakeApi.callCount).to.equal(1);
  });

  it('should not call api on re-render if reloadOnMount is false and cache is valid', () => {
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
      </Provider>,
    );
    store.dispatch(fetchDataSuccess('test-loader', { data: 'test-result-data' }));
    clock.tick(500);
    TestUtils.renderIntoDocument(
      <Provider store={store}>
        <Decorated />
      </Provider>,
    );

    expect(fakeApi.callCount).to.equal(1);

    clock.restore();
  });

  it('should call api on re-render if reloadOnMount is false and cache is stale', () => {
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
      </Provider>,
    );

    clock.tick(1100);

    TestUtils.renderIntoDocument(
      <Provider store={store}>
        <Decorated />
      </Provider>,
    );

    expect(mockApi.callCount).to.equal(2);

    clock.restore();
  });

  it('should not call api on re-render if reloadOnMount is false and cache is not stale', () => {
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
      </Provider>,
    );

    clock.tick(900);

    TestUtils.renderIntoDocument(
      <Provider store={store}>
        <Decorated />
      </Provider>,
    );

    expect(mockApi.callCount).to.equal(1);

    clock.restore();
  });

  describe('On initial mount', () => {
    it('should load when only apiCall is set', () => {
      const store = makeStore();
      const Decorated = reduxAutoloader({
        name: 'test-loader',
        apiCall: mockApi,
      })(TestComponent);

      TestUtils.renderIntoDocument(
        <Provider store={store}>
          <Decorated />
        </Provider>,
      );

      expect(mockApi.callCount).to.equal(1);
    });

    it('should load when autoRefreshInterval is set', () => {
      const store = makeStore();
      const Decorated = reduxAutoloader({
        name: 'test-loader',
        apiCall: mockApi,
        autoRefreshInterval: 10000,
      })(TestComponent);

      TestUtils.renderIntoDocument(
        <Provider store={store}>
          <Decorated />
        </Provider>,
      );

      expect(mockApi.callCount).to.equal(1);
    });

    it('should load when reloadOnMount=true, resetOnUnmount=true, cacheExpiresIn and autoRefreshInterval are set', () => {
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
        </Provider>,
      );

      expect(fakeApi.callCount).to.equal(1);

      clock.restore();
    });

    it('should not call api after mount if startOnMount=false, reloadOnMount=false, loadOnInitialize=false ' +
    'and autoRefreshInterval=false but should after manual start', () => {
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
        </Provider>,
      );

      store.dispatch(fetchDataSuccess('test-loader', { data: 'test-result-data' }));

      clock.tick(1100);

      TestUtils.renderIntoDocument(
        <Provider store={store}>
          <Decorated />
        </Provider>,
      );

      expect(fakeApi.callCount).to.equal(0);

      store.dispatch(startRefresh('test-loader', {
        apiCall: fakeApi,
        newAutoRefreshInterval: 1000,
        loadImmediately: true,
        props: {},
      }));

      expect(fakeApi.callCount).to.equal(1);

      clock.restore();
    });
  });

  describe('reinitialize', () => {
    it('should reset and reload when reinitialize returns true', () => {
      const renderNode = document.createElement('div');

      const fakeApi = sinon.stub().returns('somedata');
      const store = makeStore();
      const Decorated = reduxAutoloader({
        name: 'test-loader',
        apiCall: fakeApi,
        reloadOnMount: false,
        reinitialize: (props, nextProps) => props.test !== nextProps.test,
      })(TestComponent);

      ReactDOM.render((
        <Provider store={store}>
          <Decorated test="a" />
        </Provider>
      ), renderNode);

      ReactDOM.render((
        <Provider store={store}>
          <Decorated test="b" />
        </Provider>
      ), renderNode);

      expect(fakeApi.callCount).to.equal(2);
    });

    it('should not reset nor reload when reinitialize returns false', () => {
      const renderNode = document.createElement('div');

      const fakeApi = sinon.stub().returns('somedata');
      const store = makeStore();
      const Decorated = reduxAutoloader({
        name: 'test-loader',
        apiCall: fakeApi,
        reloadOnMount: false,
        reinitialize: (props, nextProps) => props.test !== nextProps.test,
      })(TestComponent);

      ReactDOM.render((
        <Provider store={store}>
          <Decorated test="a" />
        </Provider>
      ), renderNode);

      ReactDOM.render((
        <Provider store={store}>
          <Decorated test="a" />
        </Provider>
      ), renderNode);

      expect(fakeApi.callCount).to.equal(1);
    });
  });

  describe('refresh prop', () => {
    it('should fire action to reload from api', () => {
      const fakeApi = sinon.stub().returns('somedata');
      const store = makeStore();
      sinon.spy(store, 'dispatch');

      const props = renderAndGetProps(TestComponent, { apiCall: fakeApi }, store);
      store.dispatch.reset();
      fakeApi.reset();
      props.refresh();

      const dispatchedAction = store.dispatch.firstCall.returnValue;
      expect(dispatchedAction.type).to.equal(actionTypes.LOAD);
      expect(store.dispatch.callCount).to.equal(1);
      expect(fakeApi.callCount).to.equal(1);
    });
  });

  describe('isLoading prop', () => {
    it('should be "false" by default', () => {
      const props = renderAndGetProps(TestComponent);
      expect(props.isLoading).to.equal(false);
    });

    it('should be "true" when data loading is triggered', () => {
      const fakeApi = () => new Promise(() => {});
      const dom = renderDecorated(TestComponent, { apiCall: fakeApi });
      const props = TestUtils.findRenderedComponentWithType(dom, TestComponent).props;
      expect(props.isLoading).to.equal(true);
    });

    it('should be "false" when data loading is finished', () => {
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
        </Provider>,
      );

      // simulate promise resolve
      store.dispatch(fetchDataSuccess('test-loader', { data: 'test-result-data' }));

      const props = TestUtils.findRenderedComponentWithType(dom, TestComponent).props;

      expect(props.isLoading).to.equal(false);
    });
  });

  describe('data prop', () => {
    it('should be "undefined" by default', () => {
      const props = renderAndGetProps(TestComponent);
      expect(props.data).to.equal(undefined);
    });
  });

  describe('dataReceivedAt prop', () => {
    it('should be "undefined" by default', () => {
      const props = renderAndGetProps(TestComponent);
      expect(props.dataReceivedAt).to.equal(undefined);
    });
  });
});
