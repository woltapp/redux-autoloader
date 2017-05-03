/* eslint-disable react/no-unused-prop-types,
  react/prefer-stateless-function,
  react/forbid-prop-types
*/
import React, { PureComponent, PropTypes, createElement } from 'react';
import { connect } from 'react-redux';
import getDisplayName from 'react-display-name';

import { assert } from './utils';
import {
  initialize,
  manualRefresh,
  startRefresh,
  stopRefresh,
  reset,
} from './actions';
import {
  isInitialized,
  isLoading,
  isRefreshing,
  getDataReceivedAt,
  getError,
  getErrorReceivedAt,
  createMemoizedGetData,
} from './selectors';

function cacheIsStale(dataReceivedAt, expiresIn) {
  if (!dataReceivedAt || !expiresIn) {
    return true;
  }

  return Date.now() > (dataReceivedAt + expiresIn);
}

export default function reduxAutoloader({
  /* eslint-disable react/prop-types */
  name,
  apiCall,
  reloadOnMount = true,
  resetOnUnmount = true,
  cacheExpiresIn = 0,
  autoRefreshInterval = 0,
  reinitialize = () => false,
  /* eslint-enable react/prop-types */
}, mapStateToProps = state => state) {
  assert(name, 'name is required');
  assert(typeof name === 'function' || typeof name === 'string', 'name must be a function or a string');
  assert(typeof mapStateToProps === 'function', 'selector must be a function');
  assert(typeof reloadOnMount === 'boolean', 'reloadOnMount must be a boolean');

  if (apiCall) {
    assert(apiCall, 'apiCall must be a function');
  }

  const getData = createMemoizedGetData();

  const getReducerName = typeof name === 'function' ? name : () => name;

  const connector = connect((state, props) => {
    const reducerName = getReducerName(props);

    if (!isInitialized(state, reducerName)) {
      return { hasBeenInitialized: false };
    }

    return ({
      hasBeenInitialized: true,
      isLoading: isLoading(state, reducerName),
      isRefreshing: isRefreshing(state, reducerName),
      data: getData(state, reducerName),
      dataReceivedAt: getDataReceivedAt(state, reducerName),
      error: getError(state, reducerName),
      errorReceivedAt: getErrorReceivedAt(state, reducerName),
    });
  }, {
    initialize,
    manualRefresh,
    startRefresh,
    stopRefresh,
    reset,
  });

  return (WrappedComponent) => {
    class DataComponent extends PureComponent {
      static propTypes = {
        hasBeenInitialized: PropTypes.bool.isRequired,
        initialize: PropTypes.func.isRequired,
        manualRefresh: PropTypes.func.isRequired,
        startRefresh: PropTypes.func.isRequired,
        stopRefresh: PropTypes.func.isRequired,
        reset: PropTypes.func.isRequired,
        passedProps: PropTypes.object,

        // exposed props
        error: PropTypes.any,
        errorReceivedAt: PropTypes.number,
        isLoading: PropTypes.bool,
        data: PropTypes.any,
        dataReceivedAt: PropTypes.number,
        isRefreshing: PropTypes.bool,
      }

      componentWillMount() {
        this.init(this.props);
      }

      componentWillReceiveProps(nextProps) {
        if (reinitialize(this.props, nextProps) || !nextProps.hasBeenInitialized) {
          this.props.stopRefresh(getReducerName(nextProps));
          this.props.reset(getReducerName(nextProps));
          this.init(nextProps);
        }
      }

      componentWillUnmount() {
        this.props.stopRefresh(getReducerName(this.props));

        if (resetOnUnmount) {
          this.props.reset(getReducerName(this.props));
        }
      }

      getMappedProps = (props) => {
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

        return { ...props.passedProps, ...mapStateToProps(exposedProps, props.passedProps) };
      }

      refresh = () => {
        this.props.manualRefresh(
          getReducerName(this.props),
          apiCall,
          this.getMappedProps(this.props),
        );
      }

      startAutoRefresh = (newTimeout) => {
        this.props.startRefresh(
          getReducerName(this.props),
          apiCall, newTimeout || autoRefreshInterval,
          this.getMappedProps(this.props),
        );
      }

      stopAutoRefresh = () => {
        this.props.stopRefresh(getReducerName(this.props));
      }

      init = (props) => {
        const {
          hasBeenInitialized,
          dataReceivedAt,
        } = props;

        if (!hasBeenInitialized) {
          props.initialize(getReducerName(props));
        }

        const shouldReload = reloadOnMount ||
          !hasBeenInitialized ||
          (cacheExpiresIn && cacheIsStale(dataReceivedAt, cacheExpiresIn));

        if (apiCall && autoRefreshInterval) {
          props.startRefresh(
            getReducerName(props),
            apiCall,
            autoRefreshInterval,
            this.getMappedProps(props),
          );
        }

        if (apiCall && shouldReload) {
          props.manualRefresh(
            getReducerName(props),
            apiCall,
            this.getMappedProps(props),
          );
        }
      }

      render() {
        if (!this.props.hasBeenInitialized) {
          return null;
        }

        return (
          <WrappedComponent {...this.getMappedProps(this.props)} />
        );
      }
    }

    DataComponent.displayName = `reduxAutoloader-${getDisplayName(WrappedComponent)}`;
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
