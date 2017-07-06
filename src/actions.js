import {
  INITIALIZE,
  FETCH_DATA_REQUEST,
  FETCH_DATA_SUCCESS,
  FETCH_DATA_FAILURE,
  START_REFRESH,
  STOP_REFRESH,
  MANUAL_REFRESH,
  RESET,
} from './actionTypes';

export const initialize = loader =>
  ({ type: INITIALIZE, meta: { loader } });

export const fetchDataRequest = (loader, { apiCall, props }) =>
  ({ type: FETCH_DATA_REQUEST, meta: { loader }, payload: { apiCall, props } });

export const fetchDataSuccess = (loader, { data }) =>
  ({ type: FETCH_DATA_SUCCESS, meta: { loader }, payload: { data, dataReceivedAt: Date.now() } });

export const fetchDataFailure = (loader, { error }) => ({
  type: FETCH_DATA_FAILURE,
  meta: { loader },
  payload: { error, errorReceivedAt: Date.now() },
  error: true,
});

export const startRefresh = (loader, { apiCall, timeout, props }) =>
  ({ type: START_REFRESH, meta: { loader }, payload: { apiCall, timeout, props } });

export const stopRefresh = loader =>
  ({ type: STOP_REFRESH, meta: { loader } });

export const manualRefresh = (loader, { apiCall, props }) =>
  ({ type: MANUAL_REFRESH, meta: { loader }, payload: { apiCall, props } });

export const reset = loader =>
  ({ type: RESET, meta: { loader } });
