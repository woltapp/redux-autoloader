/* eslint-disable react/no-unused-prop-types,
  react/prefer-stateless-function,
  react/forbid-prop-types
*/
import React, { PureComponent, createElement } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import getDisplayName from 'react-display-name';

import { assert } from './utils';
import * as actions from './actions';
import {
  isInitialized,
  isLoading,
  isRefreshing,
  getDataReceivedAt,
  getError,
  getErrorReceivedAt,
  getUpdatedAt,
  createMemoizedGetData,
} from './selectors';

const REDUX_AUTOLOADER_DEBUG = process.env.REDUX_AUTOLOADER_DEBUG === 'true';

function cacheIsStale(dataReceivedAt, expiresIn) {
  if (!dataReceivedAt || !expiresIn) {
    return true;
  }

  return Date.now() > dataReceivedAt + expiresIn;
}

export default function reduxAutoloader(
  {
    /* eslint-disable react/prop-types */
    debug,
    name,
    apiCall,
    loadOnInitialize = true,
    startOnMount = true,
    reloadOnMount = true,
    resetOnUnmount = true,
    cacheExpiresIn = 0,
    autoRefreshInterval = 0,
    reinitialize = () => false,
    reload = () => false,
    pureConnect = true,
    renderUninitialized = false,
    /* eslint-enable react/prop-types */
  },
  mapStateToProps = state => state
) {
  assert(name, 'name is required');
  assert(
    typeof name === 'function' || typeof name === 'string',
    'name must be a function or a string'
  );
  assert(typeof mapStateToProps === 'function', 'selector must be a function');
  assert(typeof startOnMount === 'boolean', 'startOnMount must be a boolean');
  assert(typeof reloadOnMount === 'boolean', 'reloadOnMount must be a boolean');
  assert(
    typeof resetOnUnmount === 'boolean',
    'resetOnUnmount must be a boolean'
  );
  assert(typeof pureConnect === 'boolean', 'pureConnect must be a boolean');
  assert(typeof reinitialize === 'function', 'reinitialize must be a boolean');
  assert(typeof reload === 'function', 'reload must be a boolean');

  if (autoRefreshInterval) {
    assert(
      typeof autoRefreshInterval === 'function' ||
        typeof autoRefreshInterval === 'number',
      'autoRefreshInterval must be a function or a number'
    );
  }

  if (apiCall) {
    assert(apiCall, 'apiCall must be a function');
  }

  const getData = createMemoizedGetData();

  const getReducerName = typeof name === 'function' ? name : () => name;
  const getAutoRefreshInterval =
    typeof autoRefreshInterval === 'function'
      ? autoRefreshInterval
      : () => autoRefreshInterval;

  const connector = connect(
    (state, props) => {
      const reducerName = getReducerName(props);

      if (!isInitialized(state, reducerName)) {
        return { hasBeenInitialized: false };
      }

      return {
        hasBeenInitialized: true,
        isLoading: isLoading(state, reducerName),
        isRefreshing: isRefreshing(state, reducerName),
        data: getData(state, reducerName),
        dataReceivedAt: getDataReceivedAt(state, reducerName),
        error: getError(state, reducerName),
        errorReceivedAt: getErrorReceivedAt(state, reducerName),
        updatedAt: getUpdatedAt(state, reducerName),
      };
    },
    {
      initialize: actions.initialize,
      load: actions.load,
      startRefresh: actions.startRefresh,
      stopRefresh: actions.stopRefresh,
      reset: actions.reset,
      setConfig: actions.setConfig,
    },
    null,
    { pure: pureConnect }
  );

  return WrappedComponent => {
    class DataComponent extends PureComponent {
      static propTypes = {
        hasBeenInitialized: PropTypes.bool.isRequired,
        initialize: PropTypes.func.isRequired,
        load: PropTypes.func.isRequired,
        startRefresh: PropTypes.func.isRequired,
        stopRefresh: PropTypes.func.isRequired,
        reset: PropTypes.func.isRequired,
        setConfig: PropTypes.func.isRequired,
        passedProps: PropTypes.object,
        updatedAt: PropTypes.number,

        // exposed props
        error: PropTypes.any,
        errorReceivedAt: PropTypes.number,
        isLoading: PropTypes.bool,
        data: PropTypes.any,
        dataReceivedAt: PropTypes.number,
        isRefreshing: PropTypes.bool,
      };

      /* eslint-disable no-console */
      debugLog =
        REDUX_AUTOLOADER_DEBUG || debug
          ? msg => console.info(`${getReducerName(this.props)} | ${msg}`)
          : () => {};
      /* eslint-enable no-console */

      componentWillMount() {
        if (!this.props.hasBeenInitialized) {
          this.debugLog('initialize: on mount');
          this.props.initialize(getReducerName(this.props), {
            autoRefreshInterval: getAutoRefreshInterval(this.props),
          });
        }

        if (
          this.props.hasBeenInitialized &&
          reloadOnMount &&
          !this.props.isLoading
        ) {
          this.debugLog('reload: on mount');
          this.refresh();
        } else if (
          cacheExpiresIn &&
          this.props.updatedAt &&
          !this.props.isLoading &&
          cacheIsStale(this.props.updatedAt, cacheExpiresIn)
        ) {
          this.debugLog('reload: cache is stale');
          this.refresh();
        }

        if (
          this.props.hasBeenInitialized &&
          startOnMount &&
          getAutoRefreshInterval(this.props)
        ) {
          this.debugLog('startRefresh: on mount with autoRefreshInterval');
          this.props.startRefresh(getReducerName(this.props), {
            apiCall: () => apiCall(this.getMappedProps(this.props)),
            loadImmediately:
              (this.props.updatedAt && reloadOnMount) ||
              (!this.props.updatedAt && loadOnInitialize),
          });
        }
      }

      componentWillReceiveProps(nextProps) {
        /* config setting */

        if (
          getAutoRefreshInterval(this.props) !==
          getAutoRefreshInterval(nextProps)
        ) {
          this.debugLog('setConfig: autoRefreshInterval changed');
          this.props.setConfig(getReducerName(nextProps), {
            autoRefreshInterval: getAutoRefreshInterval(nextProps),
          });
        }

        /* initialization, startRefresh and load */

        if (
          !this.props.hasBeenInitialized &&
          nextProps.hasBeenInitialized &&
          loadOnInitialize &&
          !nextProps.isLoading &&
          !autoRefreshInterval
        ) {
          this.debugLog('load: on initialization without autoRefresh');
          nextProps.load(getReducerName(nextProps), {
            apiCall: () => apiCall(this.getMappedProps(nextProps)),
          });
        } else if (
          !this.props.hasBeenInitialized &&
          nextProps.hasBeenInitialized &&
          autoRefreshInterval &&
          startOnMount
        ) {
          this.debugLog('startRefresh: after initialized');
          nextProps.startRefresh(getReducerName(nextProps), {
            apiCall: () => apiCall(this.getMappedProps(nextProps)),
            loadImmediately: loadOnInitialize,
          });
        } else if (
          this.props.hasBeenInitialized &&
          !nextProps.hasBeenInitialized
        ) {
          this.debugLog('initialize: was unitialized');
          nextProps.initialize(getReducerName(nextProps), {
            autoRefreshInterval: getAutoRefreshInterval(nextProps),
          });
        } else if (!this.props.hasBeenInitialized) {
          return;
        } else if (reload(this.props, nextProps)) {
          this.debugLog('load: reload');
          nextProps.load(getReducerName(nextProps), {
            apiCall: () => apiCall(this.getMappedProps(nextProps)),
          });
        } else if (
          cacheExpiresIn &&
          nextProps.updatedAt &&
          !nextProps.isLoading &&
          cacheIsStale(nextProps.updatedAt, cacheExpiresIn)
        ) {
          this.debugLog('load: cache is stale');
          nextProps.load(getReducerName(nextProps), {
            apiCall: () => apiCall(this.getMappedProps(nextProps)),
          });
        } else if (reinitialize(this.props, nextProps)) {
          this.debugLog('reset: reinitialize');
          nextProps.reset(getReducerName(nextProps));
        }

        if (getReducerName(this.props) !== getReducerName(nextProps)) {
          this.debugLog('stopRefresh: name changed');
          this.stopAutoRefresh(this.props);
        }
      }

      componentWillUnmount() {
        if (this.props.isRefreshing) {
          this.debugLog('stopRefresh: was refreshing and unmounted');
          this.props.stopRefresh(getReducerName(this.props));
        }

        if (resetOnUnmount) {
          this.debugLog('reset: on unmount');
          this.props.reset(getReducerName(this.props));
        }
      }

      getMappedProps = props => {
        const exposedProps = {
          isLoading: props.isLoading,
          isRefreshing: props.isRefreshing,
          data: props.data,
          dataReceivedAt: props.dataReceivedAt,
          error: props.error,
          errorReceivedAt: props.errorReceivedAt,
          refresh: this.refresh,
          startAutoRefresh: this.startAutoRefresh,
          stopAutoRefresh: this.stopAutoRefresh,
        };

        return {
          ...props.passedProps,
          ...mapStateToProps(exposedProps, props.passedProps),
        };
      };

      refresh = () => {
        this.props.load(getReducerName(this.props), {
          apiCall: () => apiCall(this.getMappedProps(this.props)),
        });
      };

      startAutoRefresh = (newInterval, opts = {}) => {
        const loadImmediately = opts.loadImmediately || true;

        this.props.startRefresh(getReducerName(this.props), {
          apiCall: () => apiCall(this.getMappedProps(this.props)),
          newAutoRefreshInterval: newInterval,
          loadImmediately,
        });
      };

      stopAutoRefresh = () => {
        this.props.stopRefresh(getReducerName(this.props));
      };

      render() {
        if (this.props.hasBeenInitialized || renderUninitialized) {
          return <WrappedComponent {...this.getMappedProps(this.props)} />;
        }

        return null;
      }
    }

    DataComponent.displayName = `reduxAutoloader-${getDisplayName(
      WrappedComponent
    )}`;
    DataComponent.WrappedComponent = WrappedComponent;

    const ConnectedDataloader = connector(DataComponent);

    return class ReduxAutoloader extends PureComponent {
      render() {
        return createElement(ConnectedDataloader, {
          ...this.props,
          passedProps: this.props,
        });
      }
    };
  };
}
