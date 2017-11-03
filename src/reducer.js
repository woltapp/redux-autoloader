import {
  INITIALIZE,
  FETCH_DATA_REQUEST,
  FETCH_DATA_SUCCESS,
  FETCH_DATA_FAILURE,
  START_REFRESH,
  STOP_REFRESH,
  RESET,
} from './actionTypes';

const initialState = {
  refreshing: false,
  loading: false,
  data: undefined,
  error: undefined,
};

function reducer(state = {}, action) {
  switch (action.type) {
    case INITIALIZE:
      return initialState;

    case RESET:
      return undefined;

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
        errorReceivedAt: undefined,
      };

    case FETCH_DATA_FAILURE:
      return {
        ...state,
        loading: false,
        errorReceivedAt: action.payload.errorReceivedAt,
        error: action.payload.error,
      };

    case START_REFRESH:
      return {
        ...state,
        refreshing: true,
      };

    case STOP_REFRESH:
      return {
        ...state,
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

  return {
    ...state,
    [action.meta.loader]: reducer(state[action.meta.loader], action),
  };
}
