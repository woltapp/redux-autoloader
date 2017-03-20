import {
  INITIALIZE,
  FETCH_DATA_REQUEST,
  FETCH_DATA_SUCCESS,
  FETCH_DATA_FAILURE,
  START_REFRESH,
  STOP_REFRESH,
  RESET,
} from './actionTypes';

function reducer(state = {}, action) {
  switch (action.type) {
    case INITIALIZE:
      return {
        ...state,
        refreshing: false,
        loading: false,
        data: undefined,
        error: undefined,
      };

    case FETCH_DATA_REQUEST:
      return {
        ...state,
        loading: true,
      };

    case FETCH_DATA_SUCCESS:
      return {
        ...state,
        loading: false,
        data: action.payload.data,
        dataReceivedAt: action.payload.dataReceivedAt,
        error: undefined,
      };

    case FETCH_DATA_FAILURE:
      return {
        ...state,
        loading: false,
        errorReceivedAt: action.payload.errorReceivedAt,
        error: action.error,
      };

    case START_REFRESH:
      return {
        ...state,
        refreshing: true,
      };

    case STOP_REFRESH:
      return {
        ...state,
        loading: false,
        refreshing: false,
      };

    default:
      return state;
  }
}

export default function (state = {}, action) {
  if (!action.meta || !action.meta.loader) {
    return state;
  }

  if (action.type === RESET) {
    const newState = { ...state };
    delete newState[action.meta.loader];
    return newState;
  }

  return {
    ...state,
    [action.meta.loader]: reducer(state[action.meta.loader], action),
  };
}
