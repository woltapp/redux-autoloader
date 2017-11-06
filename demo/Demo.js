/* eslint-disable react/prop-types, no-console, react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';

import makeStore from './makeStore';
import { reduxAutoloader } from '../src/index';

const store = makeStore();

const demoApi = () => new Promise(resolve => setTimeout(() => {
  const data = new Date();
  resolve(data);
  console.info(`demoApi request: ${JSON.stringify(data)}`);
}, 1000));

const LoaderView = ({
  style,
  data,
  isLoading,
  isRefreshing,
  refresh,
  stopAutoRefresh,
  startAutoRefresh,
}) => (
  <div style={style}>
    {JSON.stringify(data)} {!!isLoading && 'Updating...'}

    <pre style={{ marginTop: 20 }}>
      <div>isLoading: {JSON.stringify(isLoading)}</div>
      <div>isRefreshing: {JSON.stringify(isRefreshing)}</div>
    </pre>

    <div style={{ marginTop: 20 }}>
      <button onClick={refresh}>
        Refresh
      </button>

      <button onClick={() => startAutoRefresh(2000)}>
        Start refresh
      </button>

      <button onClick={stopAutoRefresh}>
        Stop refresh
      </button>
    </div>
  </div>
);

LoaderView.propTypes = {
  data: PropTypes.object,
  isLoading: PropTypes.bool.isRequired,
  isRefreshing: PropTypes.bool.isRequired,
  style: PropTypes.object,
  refresh: PropTypes.func.isRequired,
  stopAutoRefresh: PropTypes.func.isRequired,
  startAutoRefresh: PropTypes.func.isRequired,
};

const createMounter = (name, Wrapped) => class MountedComponent extends Component {
  state = { mounted: true }

  render() {
    const { mounted } = this.state;

    return (
      <div style={{ border: '1px solid lightgrey', padding: 20, ...this.props.style }}>
        <div style={{ borderBottom: '1px solid lightgrey', paddingBottom: 10 }}>
          <span style={{ marginRight: 20 }}>
            {name}
          </span>

          <button onClick={() => this.setState({ mounted: !mounted })}>
            {mounted ? 'Unmount' : 'Mount'}
          </button>
        </div>

        <div style={{ marginTop: 20 }}>
          {!!mounted && (
            <Wrapped {...this.props} />
          )}
        </div>
      </div>
    );
  }
};

const LoaderView1 = createMounter('Loader 1 (auto refresh in 2000ms)', reduxAutoloader({
  name: 'demo-loader-1',
  autoRefreshInterval: 2000,
  reloadOnMount: true,
  resetOnUnmount: true,
  cacheExpiresIn: 10000,
  apiCall: demoApi,
})(LoaderView));

const LoaderView2 = createMounter('Loader 2 (no reload on mount)', reduxAutoloader({
  name: 'demo-loader-2',
  autoRefreshInterval: 3000,
  reloadOnMount: false,
  resetOnUnmount: false,
  cacheExpiresIn: 20000,
  apiCall: demoApi,
})(LoaderView));

const LoaderView3 = createMounter('Loader 3 (no initial auto refresh)', reduxAutoloader({
  name: 'demo-loader-3',
  autoRefreshInterval: false,
  apiCall: demoApi,
})(LoaderView));

const LoaderView4 = createMounter('Loader 4 (autorefresh start and load prevented on mount)', reduxAutoloader({
  name: 'demo-loader-4',
  autoRefreshInterval: 1000,
  loadOnInitialize: false,
  startOnMount: false,
  apiCall: demoApi,
})(LoaderView));

const MainView = () => (
  <Provider store={store}>
    <div>
      <h1 style={{ marginTop: 0 }}>redux-autoloader demo</h1>
      <LoaderView1 />
      <LoaderView2 style={{ marginTop: 20 }} />
      <LoaderView3 style={{ marginTop: 20 }} />
      <LoaderView4 style={{ marginTop: 20 }} />
    </div>
  </Provider>
);

export default MainView;
